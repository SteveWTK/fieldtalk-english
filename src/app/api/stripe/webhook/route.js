// src/app/api/stripe/webhook/route.js
//
// Stripe webhook — the only path that writes subscription / one-time
// purchase grants into player_edition_access. Seat-license redemptions
// write their own row via the redeem_seat_license() Postgres function.
//
// Events we listen for:
//   - checkout.session.completed       → first-time grant after payment
//                                        (handles BOTH 'payment' mode
//                                        for one-offs and 'subscription'
//                                        mode for recurring).
//   - customer.subscription.updated    → renewals, price/interval
//                                        changes from Customer Portal,
//                                        status transitions to past_due
//                                        / active / trialing / etc.
//   - customer.subscription.deleted    → mark access canceled
//   - invoice.payment_failed           → mark access past_due
//
// All paths converge on `grantOfferingAccess()` — the single place
// that writes player_edition_access — keyed on (player_id, edition).
// Re-deliveries are safe because the upsert overwrites with the
// latest status.

import { NextResponse } from "next/server";
import { getStripeClient } from "@/lib/stripe/client";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import {
  getOfferingByPriceId,
  getOffering,
  getEdition,
} from "@/lib/editions/editions";

// App Router needs the raw body for signature verification.
export const dynamic = "force-dynamic";

function mapStripeStatus(status) {
  if (!status) return "incomplete";
  if (status === "incomplete_expired" || status === "unpaid") return "canceled";
  return status;
}

export async function POST(request) {
  const sig = request.headers.get("stripe-signature");
  const body = await request.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[stripe-webhook] STRIPE_WEBHOOK_SECRET missing");
    return new NextResponse("Webhook secret not configured", { status: 500 });
  }

  let event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    console.error(
      "[stripe-webhook] signature verification failed:",
      err.message
    );
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();
  const stripe = getStripeClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        // Resolve the user-facing promo code text (and its prefix)
        // BEFORE granting, so the grant function can stamp them onto
        // player_edition_access in the same upsert. We retrieve the
        // Checkout Session with `expand=['discounts']` because the
        // base session object only carries discount IDs.
        const promoAttribution = await resolvePromoAttribution(stripe, session);
        if (session.mode === "subscription" && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription
          );
          await grantFromSubscription(supabase, subscription, {
            fallbackPlayerId: session.metadata?.supabase_id || null,
            fallbackOfferingId: session.metadata?.offering || null,
            promoAttribution,
          });
        } else if (session.mode === "payment") {
          await grantFromOneTimeSession(supabase, session, promoAttribution);
        } else {
          console.log(
            "[stripe-webhook] checkout.session.completed in unhandled mode:",
            session.mode
          );
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object;
        await grantFromSubscription(supabase, subscription);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const { error } = await supabase
          .from("player_edition_access")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);
        if (error) {
          console.error("[stripe-webhook] cancel mark error:", error);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        if (!invoice.subscription) break;
        const { error } = await supabase
          .from("player_edition_access")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", invoice.subscription);
        if (error) {
          console.error("[stripe-webhook] past_due mark error:", error);
        }
        break;
      }

      default:
        console.log("[stripe-webhook] unhandled event:", event.type);
    }
  } catch (err) {
    console.error(`[stripe-webhook] handler error for ${event.type}:`, err);
    // 500 makes Stripe retry — most handler errors are transient.
    return new NextResponse(`Handler failed: ${err.message}`, { status: 500 });
  }

  return new NextResponse(null, { status: 200 });
}

/**
 * Look up the promotion code the user applied at checkout (if any).
 * Returns { promotion_code, promo_code_prefix } or null when no
 * discount was used.
 *
 * We retrieve the session with expanded discounts because the base
 * webhook payload only carries discount IDs (not the user-facing
 * code text). The prefix is everything before the last hyphen —
 * matches the format produced by /api/admin/promo-codes/bulk-generate
 * (e.g. "CC-CEARA-2026A-X9K3F2" → "CC-CEARA-2026A").
 */
async function resolvePromoAttribution(stripe, session) {
  try {
    const expanded = await stripe.checkout.sessions.retrieve(session.id, {
      expand: ["discounts", "discounts.promotion_code"],
    });
    const discounts = expanded?.discounts || [];
    if (discounts.length === 0) return null;
    // Take the first discount that has a promotion code attached.
    // Coupon-only discounts (no promotion code) don't help with
    // partner attribution, so we ignore them.
    for (const d of discounts) {
      const pc = d.promotion_code;
      if (pc && typeof pc === "object" && pc.code) {
        const code = pc.code;
        const lastDash = code.lastIndexOf("-");
        const prefix = lastDash > 0 ? code.substring(0, lastDash) : code;
        return { promotion_code: code, promo_code_prefix: prefix };
      }
    }
    return null;
  } catch (err) {
    console.warn(
      "[stripe-webhook] resolvePromoAttribution failed:",
      err?.message
    );
    return null;
  }
}

/**
 * One-time purchase grant. session.mode === 'payment'.
 *
 * No subscription record exists, so we resolve the offering from
 * session.metadata.offering (set at checkout) and grant each edition
 * in the offering with current_period_end = NULL (= no expiry).
 */
async function grantFromOneTimeSession(supabase, session, promoAttribution) {
  const playerId = session.metadata?.supabase_id || null;
  const offeringId = session.metadata?.offering || null;
  if (!playerId || !offeringId) {
    console.error(
      "[stripe-webhook] one-time session missing metadata",
      session.id,
      session.metadata
    );
    return;
  }
  const offering = getOffering(offeringId);
  if (!offering) {
    console.error(
      "[stripe-webhook] one-time session references unknown offering",
      offeringId
    );
    return;
  }

  for (const editionId of offering.editionsGranted) {
    // Edition-specific access cutoff for one-off purchases.
    // WC2026 ends 31 Aug 2026; future editions can configure their
    // own oneTimeAccessEnd or leave it null for permanent access.
    const targetEdition = getEdition(editionId);
    const periodEnd = targetEdition?.oneTimeAccessEnd || null;

    const { error } = await supabase
      .from("player_edition_access")
      .upsert(
        {
          player_id: playerId,
          edition: editionId,
          status: "active",
          source: "one_time_purchase",
          stripe_subscription_id: null,
          stripe_price_id: offering.priceId,
          stripe_checkout_session_id: session.id,
          current_period_end: periodEnd,
          // Partner attribution — null if no promo was used.
          promotion_code: promoAttribution?.promotion_code || null,
          promo_code_prefix: promoAttribution?.promo_code_prefix || null,
        },
        { onConflict: "player_id,edition" }
      );
    if (error) {
      console.error(
        "[stripe-webhook] one-time upsert error for edition",
        editionId,
        error
      );
      throw error;
    }
  }
}

/**
 * Subscription grant. Resolves (player_id, editions) from metadata
 * first, falling back to stripe_customer_id + offering-by-price-id
 * lookup so portal-managed changes still route to the right rows.
 *
 * One subscription can unlock multiple editions (e.g. a library
 * subscription) — we write one access row per edition the offering
 * grants.
 */
async function grantFromSubscription(
  supabase,
  subscription,
  {
    fallbackPlayerId = null,
    fallbackOfferingId = null,
    promoAttribution = null,
  } = {}
) {
  // Resolve player.
  let playerId =
    subscription.metadata?.supabase_id || fallbackPlayerId || null;
  if (!playerId) {
    const { data: byCustomer } = await supabase
      .from("players")
      .select("id")
      .eq("stripe_customer_id", subscription.customer)
      .maybeSingle();
    playerId = byCustomer?.id || null;
  }
  if (!playerId) {
    console.error(
      "[stripe-webhook] cannot resolve player for subscription",
      subscription.id,
      "customer",
      subscription.customer
    );
    return;
  }

  // Resolve offering — metadata first, price-id fallback.
  const priceId = subscription.items?.data?.[0]?.price?.id || null;
  let offering = null;
  const offeringId =
    subscription.metadata?.offering || fallbackOfferingId || null;
  if (offeringId) offering = getOffering(offeringId);
  if (!offering && priceId) offering = getOfferingByPriceId(priceId);
  if (!offering) {
    console.error(
      "[stripe-webhook] cannot resolve offering for subscription",
      subscription.id,
      "price",
      priceId
    );
    return;
  }

  const status = mapStripeStatus(subscription.status);
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000).toISOString()
    : null;

  for (const editionId of offering.editionsGranted) {
    const upsertRow = {
      player_id: playerId,
      edition: editionId,
      status,
      source: "subscription",
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      stripe_checkout_session_id: null,
      current_period_end: periodEnd,
    };
    // Only stamp promo attribution when we have it from the initial
    // checkout — renewal webhooks (subscription.updated) shouldn't
    // null out the original attribution captured at first payment.
    if (promoAttribution) {
      upsertRow.promotion_code = promoAttribution.promotion_code;
      upsertRow.promo_code_prefix = promoAttribution.promo_code_prefix;
    }
    const { error } = await supabase
      .from("player_edition_access")
      .upsert(upsertRow, { onConflict: "player_id,edition" });
    if (error) {
      console.error(
        "[stripe-webhook] subscription upsert error for edition",
        editionId,
        error
      );
      throw error;
    }
  }
}

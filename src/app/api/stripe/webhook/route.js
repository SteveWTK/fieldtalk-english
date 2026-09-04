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
//
// Multi-app Stripe account: this same Stripe account is also used
// by Habitat English (the founder's sole-trader UK account). We
// stamp `app: "fieldtalk"` on every Checkout Session metadata at
// checkout time; this handler ignores any event whose metadata
// (or resolved subscription's metadata) doesn't carry that tag.
// Habitat events fire into this endpoint too and are safely no-op'd.

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

// Multi-app filter. Returns true when this event is one of ours.
// Habitat (and any other product sharing the Stripe account) won't
// have `app: "fieldtalk"` on its session/subscription metadata.
//
// We're strict about UNTAGGED events on the create paths
// (checkout.session.completed, customer.subscription.created)
// because those are the only events that CAUSE a grant. For
// update/delete paths we let untagged-but-known-by-id events
// through — they can only affect FieldTalk rows because we look
// up by stripe_subscription_id, which won't match Habitat ones.
function isFieldTalkSession(session) {
  return session?.metadata?.app === "fieldtalk";
}

function isFieldTalkSubscription(subscription) {
  return subscription?.metadata?.app === "fieldtalk";
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
        // Multi-app filter — ignore Habitat (or any non-FieldTalk)
        // checkouts sharing this Stripe account. Acknowledge with
        // 200 so Stripe doesn't retry.
        if (!isFieldTalkSession(session)) {
          break;
        }
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
        // For CREATED events we must see the FieldTalk tag — these
        // can lead to a fresh grant. For UPDATED events (renewals,
        // status flips, portal-driven plan changes), the existing
        // grantFromSubscription will only touch a row that already
        // exists in player_edition_access for that subscription id,
        // so it's safe even when the tag is missing on legacy subs.
        if (
          event.type === "customer.subscription.created" &&
          !isFieldTalkSubscription(subscription)
        ) {
          break;
        }
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

  // Re-fetch the subscription fresh from Stripe rather than trusting
  // the snapshot carried in the event. Rationale: Stripe fires several
  // events for a fresh subscription (subscription.created,
  // subscription.updated, checkout.session.completed) within the same
  // second. Vercel processes them concurrently on separate function
  // instances, and each event carries a snapshot from the moment IT
  // was created — the `created` snapshot has status='incomplete',
  // while the `updated` snapshot (fired seconds later after payment
  // settled) has status='active'. If the `created` handler happens to
  // finish LAST, its stale snapshot clobbers the correct 'active'
  // state. Refreshing here means every handler sees current
  // ground-truth from Stripe regardless of race order.
  //
  // Cost: one extra Stripe API call per subscription event (~50ms).
  // Worth it to eliminate the race.
  const stripe = getStripeClient();
  let fresh = subscription;
  try {
    fresh = await stripe.subscriptions.retrieve(subscription.id);
  } catch (err) {
    console.warn(
      "[stripe-webhook] subscription refresh failed, using event snapshot:",
      err?.message ?? err
    );
  }

  const status = mapStripeStatus(fresh.status);
  const periodEnd = fresh.current_period_end
    ? new Date(fresh.current_period_end * 1000).toISOString()
    : null;
  const freshPriceId = fresh.items?.data?.[0]?.price?.id || priceId;

  for (const editionId of offering.editionsGranted) {
    // Status guard — belt-and-braces backstop for the same race the
    // refresh above already mitigates. If the current DB row already
    // reads 'active' or 'trialing' AND we're about to write
    // 'incomplete', skip: that write can only be coming from a stale
    // snapshot, since Stripe reality doesn't regress active → incomplete.
    // Legitimate transitions (active → past_due, active → canceled)
    // are NOT blocked because they don't land in the guarded set.
    const { data: existing } = await supabase
      .from("player_edition_access")
      .select("status")
      .eq("player_id", playerId)
      .eq("edition", editionId)
      .maybeSingle();

    if (
      existing &&
      ["active", "trialing"].includes(existing.status) &&
      status === "incomplete"
    ) {
      console.log(
        "[stripe-webhook] skipping stale 'incomplete' write for",
        `sub=${fresh.id}`,
        `edition=${editionId}`,
        `current=${existing.status}`
      );
      continue;
    }

    const upsertRow = {
      player_id: playerId,
      edition: editionId,
      status,
      source: "subscription",
      stripe_subscription_id: fresh.id,
      stripe_price_id: freshPriceId,
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

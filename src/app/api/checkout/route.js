// src/app/api/checkout/route.js
//
// POST /api/checkout
//
// Body: { offering: "<offering id>" }   — required
//
// Looks up the offering in editions.js, creates the Stripe Checkout
// Session in the right mode (payment for one-off, subscription for
// recurring), and returns `{ url }` for the caller to redirect to.
//
// Side effects:
//   - Creates a Stripe customer the first time a user hits checkout
//     and stores the id on players.stripe_customer_id so we reuse
//     the same customer across editions / renewals.
//   - Stamps metadata on the session (and on the subscription, for
//     recurring offerings) so the webhook can identify which player
//     and which editions to grant access to — even for events
//     triggered later via the Customer Portal.
//   - If a Rewardful referral cookie is present, the value is passed
//     as `client_reference_id` so Rewardful auto-attributes the sale.
//
// The user must be authenticated. Use this from the pricing page
// after they've signed up — if a guest needs to subscribe, send them
// through signup first.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { getStripeClient } from "@/lib/stripe/client";
import { getOffering } from "@/lib/editions/editions";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const offeringId =
      typeof body.offering === "string" ? body.offering.trim() : "";
    if (!offeringId) {
      return NextResponse.json(
        { error: "Missing 'offering' in request body" },
        { status: 400 }
      );
    }

    const offering = getOffering(offeringId);
    if (!offering) {
      return NextResponse.json(
        { error: `Unknown offering: ${offeringId}` },
        { status: 400 }
      );
    }
    if (!offering.priceId) {
      // Almost always means the env var for this offering is missing.
      return NextResponse.json(
        {
          error: `No Stripe price configured for offering '${offeringId}'`,
          hint: "Check that the corresponding STRIPE_…_PRICE_ID env var is set.",
        },
        { status: 500 }
      );
    }

    // ── Auth via Supabase session cookie ──
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user?.email) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const supabase = await getSupabaseAdmin();
    const stripe = getStripeClient();

    // ── Look up / create the Stripe customer ──
    const { data: playerRow, error: playerErr } = await supabase
      .from("players")
      .select("id, stripe_customer_id, full_name")
      .eq("id", user.id)
      .maybeSingle();
    if (playerErr) {
      console.error("[checkout] player lookup error:", playerErr);
      return NextResponse.json(
        { error: "Could not look up player" },
        { status: 500 }
      );
    }
    if (!playerRow) {
      return NextResponse.json(
        {
          error:
            "No players row for this user. Please sign out and back in to repair, then retry.",
        },
        { status: 412 }
      );
    }

    let stripeCustomerId = playerRow.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name:
          playerRow.full_name ||
          user.user_metadata?.full_name ||
          user.email.split("@")[0],
        metadata: { supabase_id: user.id },
      });
      stripeCustomerId = customer.id;
      const { error: updateErr } = await supabase
        .from("players")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);
      if (updateErr) {
        console.error(
          "[checkout] failed to persist stripe_customer_id:",
          updateErr
        );
      }
    }

    // ── Rewardful referral cookie (Phase 5) ──
    const rewardfulReferral =
      cookieStore.get("rewardful.referral")?.value || null;

    // ── Origin for success/cancel URLs ──
    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";

    // ── Build the Checkout Session ──
    // Common params first; mode-specific additions below.
    //
    // `app: "fieldtalk"` is stamped on every session so the webhook
    // can tell our events apart from any other product running in
    // the same Stripe account (e.g. Habitat English, which shares
    // this UK Stripe account as a sole-trader operation). The
    // webhook ignores anything without this tag, so a Habitat
    // checkout firing into the FieldTalk webhook endpoint is a
    // safe no-op.
    const sharedMetadata = {
      app: "fieldtalk",
      supabase_id: user.id,
      offering: offering.id,
      editions: offering.editionsGranted.join(","),
    };

    const sessionParams = {
      mode: offering.mode === "one_time" ? "payment" : "subscription",
      customer: stripeCustomerId,
      line_items: [{ price: offering.priceId, quantity: 1 }],
      metadata: sharedMetadata,
      allow_promotion_codes: true,
      client_reference_id: rewardfulReferral || undefined,
      success_url: `${origin}/dashboard?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=1`,
    };

    if (offering.mode === "subscription") {
      // Copy metadata onto the subscription itself so future
      // customer.subscription.* events (renewals, portal-managed
      // price changes) still know which offering / editions / player
      // they belong to.
      sessionParams.subscription_data = {
        metadata: sharedMetadata,
      };
    }
    // For one-off payments there's no subscription_data; the webhook
    // reads session.metadata directly when it fires.

    const session = await stripe.checkout.sessions.create(sessionParams);
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

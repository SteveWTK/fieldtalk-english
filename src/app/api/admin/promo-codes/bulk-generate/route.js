// src/app/api/admin/promo-codes/bulk-generate/route.js
//
// POST /api/admin/promo-codes/bulk-generate
//
// Generates `count` single-use Stripe Promotion Codes attached to an
// existing Stripe Coupon. Used to issue per-student discount codes
// (e.g. Cultura Ceará 50% off for "Bring a Friend" Tier 2). The
// admin downloads the result as a CSV and emails it to the partner.
//
// Body:
//   {
//     couponId: "promo_xxx",   // existing Stripe coupon id
//     count: 50,               // number of codes (1–500)
//     prefix?: "CC-CEARA-2026A",
//   }
//
// Response:
//   {
//     created: 50,
//     failed: 0,
//     codes: [{ code, id, expiresAt }],
//     errors?: [{ code, error }]
//   }
//
// We create codes in parallel batches of 10 to keep total wall time
// down without tripping Stripe's rate limits (25 req/sec in live
// mode is the documented floor).

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { getStripeClient } from "@/lib/stripe/client";
import { generateUniqueCodes } from "@/lib/admin/codes";

const MAX_BATCH = 500;
const PARALLEL = 10;

export async function POST(request) {
  // Top-level try/catch so unexpected throws (e.g. missing env vars,
  // module-load failures, SDK construction errors) return a JSON
  // error body instead of an empty 500, which leaves the client
  // calling `await res.json()` on a zero-length body and producing
  // the misleading "Unexpected end of JSON input" message.
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const couponId =
      typeof body.couponId === "string" ? body.couponId.trim() : "";
    const count = Math.floor(Number(body.count) || 0);
    const prefix = typeof body.prefix === "string" ? body.prefix.trim() : "";

    if (!couponId) {
      return NextResponse.json({ error: "Missing couponId" }, { status: 400 });
    }
    if (count < 1 || count > MAX_BATCH) {
      return NextResponse.json(
        { error: `count must be between 1 and ${MAX_BATCH}` },
        { status: 400 }
      );
    }

    let stripe;
    try {
      stripe = getStripeClient();
    } catch (err) {
      console.error(
        "[promo-codes/bulk-generate] Stripe client init failed:",
        err?.message
      );
      return NextResponse.json(
        {
          error:
            "Stripe is not configured on this deployment. " +
            "Set STRIPE_SECRET_KEY in the Vercel project env vars.",
          details: err?.message,
        },
        { status: 500 }
      );
    }

    // Fast-fail if the coupon doesn't exist — saves the round-trip on
    // every individual code creation.
    try {
      await stripe.coupons.retrieve(couponId);
    } catch (err) {
      return NextResponse.json(
        {
          error: `Coupon ${couponId} not found in Stripe`,
          details: err?.message,
        },
        { status: 400 }
      );
    }

    const codes = generateUniqueCodes({ prefix, count });
    const successes = [];
    const failures = [];

    // Stripe's promotionCodes.create is one-at-a-time. We batch in
    // groups of PARALLEL with Promise.allSettled so a single failure
    // doesn't kill the whole batch.
    for (let i = 0; i < codes.length; i += PARALLEL) {
      const batch = codes.slice(i, i + PARALLEL);
      const results = await Promise.allSettled(
        batch.map((code) =>
          stripe.promotionCodes.create({
            coupon: couponId,
            code,
            max_redemptions: 1,
            // restrictions.first_time_transaction would lock the code
            // to first-purchase customers only. Useful for tiers 1+2
            // but not strictly required since each code is single-use
            // already. Leaving it off so admins can use the same flow
            // to comp existing users if needed.
          })
        )
      );
      for (let j = 0; j < results.length; j++) {
        const r = results[j];
        const code = batch[j];
        if (r.status === "fulfilled") {
          successes.push({
            code,
            id: r.value.id,
          });
        } else {
          failures.push({
            code,
            error: r.reason?.message || "Stripe error",
          });
        }
      }
    }

    return NextResponse.json({
      created: successes.length,
      failed: failures.length,
      codes: successes,
      errors: failures.length > 0 ? failures : undefined,
    });
  } catch (err) {
    console.error("[promo-codes/bulk-generate] unhandled error:", err);
    return NextResponse.json(
      {
        error: "Server error during bulk-generate",
        details: err?.message || String(err),
      },
      { status: 500 }
    );
  }
}

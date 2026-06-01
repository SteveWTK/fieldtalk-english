// src/app/api/debug/env-check/route.js
//
// TEMPORARY diagnostic. Returns which Stripe env vars the server-side
// process can see, without leaking their values. Delete this file
// once Stripe checkout is confirmed working.
//
// Hit it with: fetch("/api/debug/env-check").then(r => r.json()).then(console.log)

import { NextResponse } from "next/server";

const STRIPE_VARS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_WC2026_BRL_PRICE_ID",
  "STRIPE_EDITIONS_MONTHLY_BRL_PRICE_ID",
  "STRIPE_EDITIONS_YEARLY_BRL_PRICE_ID",
];

export async function GET() {
  const report = {};
  for (const key of STRIPE_VARS) {
    const v = process.env[key];
    report[key] = {
      present: typeof v === "string" && v.length > 0,
      length: typeof v === "string" ? v.length : 0,
      // First 8 chars only — enough to spot a typo (e.g. "price_…" vs
      // "sk_test_…") without exposing the secret.
      prefix: typeof v === "string" ? v.slice(0, 8) : null,
    };
  }
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    cwd: process.cwd(),
    stripe: report,
  });
}

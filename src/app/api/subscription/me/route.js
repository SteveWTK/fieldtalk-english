// src/app/api/subscription/me/route.js
//
// GET /api/subscription/me
//
// Returns the caller's current subscription state for the Manage
// Subscription page. Lightweight read of player_edition_access +
// players.stripe_customer_id — no Stripe API call, so it's fast
// enough to render inline on page load.
//
// Response:
//   {
//     hasActiveSubscription: boolean,
//     hasStripeCustomer: boolean,     // whether player has any billing history at all
//     edition: string | null,
//     status: "active" | "trialing" | "past_due" | "canceled" | "incomplete" | null,
//     tier: "monthly" | "yearly" | "one_time" | null,   // inferred from source + price_id
//     source: "subscription" | "seat_redemption" | "admin_grant" | null,
//     currentPeriodEnd: ISO string | null,
//     grantedAt: ISO string | null,
//   }
//
// If the caller has multiple access rows (e.g. Pro Path + a legacy WC
// grant), we return the "best" one — active/trialing beats canceled,
// then most recent grantedAt wins. Manage Subscription page currently
// only supports one active subscription at a time; that's fine for
// now since Pro Path is the only edition with recurring billing.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

// Rough tier inference from the source + price ID. Real Stripe
// interval lookup would require a Stripe API call; for the Manage
// Subscription page we can infer from the local price-id string
// (all our IDs contain the word "monthly" or "yearly").
function inferTier(row) {
  if (!row) return null;
  if (row.source !== "subscription") return "one_time";
  const priceId = String(row.stripe_price_id || "").toLowerCase();
  if (priceId.includes("yearly") || priceId.includes("annual")) return "yearly";
  if (priceId.includes("monthly") || priceId.includes("month")) return "monthly";
  return null;
}

function pickBest(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  // Active/trialing win; then most-recent grantedAt.
  const scored = rows.map((r) => ({
    row: r,
    active: ACTIVE_STATUSES.has(r.status) ? 1 : 0,
    grantedAt: r.granted_at ? new Date(r.granted_at).getTime() : 0,
  }));
  scored.sort((a, b) => b.active - a.active || b.grantedAt - a.grantedAt);
  return scored[0].row;
}

export async function GET() {
  try {
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
      },
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const supabase = await getSupabaseAdmin();

    const [{ data: playerRow }, { data: accessRows }] = await Promise.all([
      supabase
        .from("players")
        .select("stripe_customer_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("player_edition_access")
        .select(
          "edition, status, source, stripe_subscription_id, stripe_price_id, current_period_end, granted_at",
        )
        .eq("player_id", user.id),
    ]);

    const best = pickBest(accessRows);
    const isActive =
      best &&
      ACTIVE_STATUSES.has(best.status) &&
      (!best.current_period_end ||
        new Date(best.current_period_end).getTime() > Date.now());

    return NextResponse.json({
      hasActiveSubscription: !!isActive,
      hasStripeCustomer: !!playerRow?.stripe_customer_id,
      edition: best?.edition ?? null,
      status: best?.status ?? null,
      tier: inferTier(best),
      source: best?.source ?? null,
      currentPeriodEnd: best?.current_period_end ?? null,
      grantedAt: best?.granted_at ?? null,
    });
  } catch (err) {
    console.error("[subscription/me] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

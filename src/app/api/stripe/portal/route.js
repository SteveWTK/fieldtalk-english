// src/app/api/stripe/portal/route.js
//
// POST /api/stripe/portal
//
// Returns `{ url }` for the Stripe Customer Portal — where users
// update their card, cancel a subscription, switch monthly ↔ yearly,
// download invoices, etc. The dashboard / profile page links here so
// we don't have to build any of that UI ourselves.
//
// Auth: Supabase session cookie (same pattern as the rest of the
// app — the previous Habitat-style `auth()` import was the bug that
// made the old version of this route non-functional).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { getStripeClient } from "@/lib/stripe/client";

export async function POST(request) {
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
      }
    );
    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    const supabase = await getSupabaseAdmin();
    const { data: playerRow, error: playerErr } = await supabase
      .from("players")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .maybeSingle();
    if (playerErr) {
      return NextResponse.json(
        { error: "Could not look up billing account" },
        { status: 500 }
      );
    }
    if (!playerRow?.stripe_customer_id) {
      return NextResponse.json(
        {
          error:
            "No billing account on file — you haven't made any purchases yet.",
        },
        { status: 400 }
      );
    }

    // Optional caller-supplied return URL (e.g. "/dashboard"). Falls
    // back to /dashboard which is where the link lives in the UI.
    const body = await request.json().catch(() => ({}));
    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "http://localhost:3000";
    const returnPath =
      typeof body.returnUrl === "string" && body.returnUrl.startsWith("/")
        ? body.returnUrl
        : "/dashboard";
    const returnUrl = `${origin}${returnPath}`;

    const stripe = getStripeClient();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: playerRow.stripe_customer_id,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error("[stripe-portal] unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

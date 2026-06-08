// src/app/api/onboarding/dashboard-complete/route.js
//
// POST /api/onboarding/dashboard-complete
//
// Marks players.dashboard_tour_completed = true for the signed-in
// user. Called by the dashboard arrow-tour when the user finishes
// (or dismisses) it.
//
// Idempotent — re-posting for a user who already completed is a
// no-op that returns 200.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function POST() {
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
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getSupabaseAdmin();
    const { error } = await supabase
      .from("players")
      .update({ dashboard_tour_completed: true })
      .eq("id", user.id);
    if (error) {
      console.error("[dashboard-tour] update error:", error);
      return NextResponse.json(
        { error: "Could not mark complete" },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[dashboard-tour] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

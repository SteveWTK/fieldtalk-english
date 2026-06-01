// src/app/api/onboarding/complete/route.js
//
// POST /api/onboarding/complete
//
// Flips players.onboarding_completed to true so the WelcomeOnboarding
// modal stops appearing for this user. Optional body fields let an
// older / future onboarding flow also persist preferences in the same
// call — all of them are optional and only written if provided, so
// calling with an empty body is the canonical "I finished the
// welcome modal" signal.
//
// Body (all optional):
//   { role?, level?, goals? }
//
// Idempotent — calling on an already-completed player is a no-op.
//
// Auth: Supabase session cookie. Re-arm a user by setting their
// onboarding_completed back to false in the Supabase table editor.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

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
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Body is optional — the welcome modal calls this with no body.
    // Empty-body case (the modal's path) writes only the flag itself.
    const body = await request.json().catch(() => ({}));
    const { role, level, goals } = body || {};

    const update = {
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    if (typeof role === "string" && role.trim()) {
      update.onboarding_role = role;
    }
    if (typeof level === "string" && level.trim()) {
      update.english_level = level;
    }
    if (goals !== undefined) {
      update.learning_goals = goals;
    }

    const supabase = await getSupabaseAdmin();
    const { error: updateError } = await supabase
      .from("players")
      .update(update)
      .eq("id", user.id);

    if (updateError) {
      console.error(
        "[onboarding/complete] update error:",
        updateError
      );
      return NextResponse.json(
        { error: updateError.message || "Could not update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[onboarding/complete] unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

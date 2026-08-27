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
//   { role?, level?, goals?, position?, propath_goal? }
//
// Legacy fields (role/level/goals) — written by the WC WelcomeOnboarding.
// Pro Path fields (position, propath_goal) — written by the Pro Path
// 3-slide onboarding. Any combination is fine; the endpoint writes
// whichever fields are supplied and always flips onboarding_completed
// to true. Reusing one endpoint keeps the "did the user finish
// onboarding?" gate in one place, regardless of which edition's flow
// they went through.
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
    // Empty-body case (the modal's path) writes ONLY the boolean flag.
    // Earlier versions also wrote onboarding_completed_at + updated_at
    // — those are leftovers from the Habitat schema and may not exist
    // on FieldTalk's players table; including them in the update payload
    // caused Supabase to reject the whole statement, which is what made
    // the flag stick at false even after the modal completed.
    const body = await request.json().catch(() => ({}));
    const {
      role,
      level,
      goals,
      // Pro Path fields — see route header for full doc.
      position,
      propath_goal: propathGoal,
    } = body || {};

    const update = { onboarding_completed: true };
    if (typeof role === "string" && role.trim()) {
      update.onboarding_role = role;
    }
    if (typeof level === "string" && level.trim()) {
      update.english_level = level;
    }
    if (goals !== undefined) {
      update.learning_goals = goals;
    }
    // Pro Path onboarding writes to purpose-built columns so we don't
    // overload onboarding_role (which historically meant "player /
    // coach / director") with a football position. Both are trimmed
    // + shape-checked before writing so a stray whitespace or unknown
    // goal value doesn't fail the CHECK constraint on the column.
    if (typeof position === "string" && position.trim()) {
      update.position = position.trim();
    }
    const ALLOWED_PROPATH_GOALS = ["trials", "academy", "going_pro", "general"];
    if (
      typeof propathGoal === "string" &&
      ALLOWED_PROPATH_GOALS.includes(propathGoal.trim())
    ) {
      update.propath_goal = propathGoal.trim();
      // Force edition to propath_26_27 whenever the user completes
      // Pro Path onboarding. Fixes the "user signed up as WC before,
      // now re-signs up choosing Pro Path but the dashboard still
      // routes them to WC" bug — ensure-player's UPDATE branch
      // deliberately preserves edition on repeat sign-ins, so the
      // players.edition column keeps its stale value from the first
      // signup. The completion of Pro Path onboarding is an
      // unambiguous signal that this user wants Pro Path, regardless
      // of any earlier edition assignment.
      update.edition = "propath_26_27";
    }

    const supabase = await getSupabaseAdmin();
    const { error: updateError } = await supabase
      .from("players")
      .update(update)
      .eq("id", user.id);

    if (updateError) {
      // Spread the PostgrestError so the log shows code/hint/message
      // rather than "{}". The most likely cause if this fires is the
      // onboarding_completed column not existing on the players table
      // — run PLAYERS_ONBOARDING_SCHEMA.sql in Supabase to add it.
      console.error("[onboarding/complete] update error:", {
        message: updateError.message,
        code: updateError.code,
        hint: updateError.hint,
        details: updateError.details,
      });
      return NextResponse.json(
        {
          error: updateError.message || "Could not update profile",
          hint:
            "If this references onboarding_completed, run PLAYERS_ONBOARDING_SCHEMA.sql in Supabase to add the column.",
        },
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

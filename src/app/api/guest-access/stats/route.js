// src/app/api/guest-access/stats/route.js
//
// GET /api/guest-access/stats
//
// Supabase-SSR counterpart to the older /api/guest-access/status
// endpoint. Returns the one piece of state the GuestPromptContext
// actually needs — the lessons-completed count — so the floating
// "Garanta seu XP" button, CoachTipReminder and HatTrickModal fire
// at the right thresholds for Supabase-authed guests (the status
// endpoint still uses NextAuth and 401s on our try-flow guests).
//
// Returns 200 { is_guest: false } for everyone who isn't a guest so
// the context can be a dumb consumer — no branching on error codes.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

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
    } = await supabaseAuth.auth.getUser();

    if (!user) {
      // Not signed in at all. GuestPromptContext treats this the same
      // as "not a guest" — leaves default stats + hides every prompt.
      return NextResponse.json({ is_guest: false });
    }

    // Guest detection — the same shape GuestPromptContext uses on the
    // client: user_metadata.is_guest OR an @fieldtalk.guest email.
    const isGuest =
      user.user_metadata?.is_guest === true ||
      (typeof user.email === "string" &&
        user.email.endsWith("@fieldtalk.guest"));

    if (!isGuest) {
      return NextResponse.json({ is_guest: false });
    }

    // Count completed lessons for this guest. Reading lesson_completions
    // directly is more reliable than the legacy status endpoint, which
    // required a guest_sessions row that our try-flow guests don't have.
    const supabase = await getSupabaseAdmin();
    const [progressResult, lessonsResult] = await Promise.all([
      supabase
        .from("player_progress")
        .select("total_xp, current_level")
        .eq("player_id", user.id)
        .maybeSingle(),
      supabase
        .from("lesson_completions")
        .select("id", { count: "exact", head: true })
        .eq("player_id", user.id),
    ]);

    return NextResponse.json({
      is_guest: true,
      stats: {
        xp: progressResult.data?.total_xp || 0,
        level: progressResult.data?.current_level || 1,
        lessons: lessonsResult.count || 0,
      },
    });
  } catch (err) {
    console.error("[guest-access/stats] unhandled:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

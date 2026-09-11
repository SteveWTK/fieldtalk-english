// src/app/api/mental/activities/route.js
//
// GET /api/mental/activities?type=X&mood=Y&featured=true
//
// Player-facing list of ACTIVE mental activities. Filters:
//   type    — comma-separated activity types
//   mood    — single mood key (uses tags overlap)
//   featured — 'true' to restrict to featured items
//
// Returns activities + the caller's completion state per activity
// (last_completed_at, day_key) so the hub can render "you did this
// today" checkmarks without a second round-trip.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { ACTIVITY_TYPES } from "@/lib/mental/constants";

export async function GET(request) {
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
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const typeFilter = url.searchParams.get("type");
  const moodFilter = url.searchParams.get("mood");
  const featuredOnly = url.searchParams.get("featured") === "true";

  const supabase = await getSupabaseAdmin();
  let query = supabase
    .from("mental_activities")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (typeFilter) {
    const types = typeFilter
      .split(",")
      .filter((t) => ACTIVITY_TYPES.includes(t));
    if (types.length > 0) query = query.in("activity_type", types);
  }
  if (moodFilter) {
    query = query.contains("moods", [moodFilter]);
  }
  if (featuredOnly) query = query.eq("featured", true);

  const { data: activities, error } = await query;
  if (error) {
    console.error("[mental/activities] fetch failed:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  // Bulk completion state — one query keyed by (player, activity ids).
  // Returns the most-recent completion per activity_id.
  const activityIds = (activities || []).map((a) => a.id);
  const completionsByActivity = new Map();
  if (activityIds.length > 0) {
    const { data: progressRows } = await supabase
      .from("mental_progress")
      .select("activity_id, completed_at, day_key")
      .eq("player_id", user.id)
      .in("activity_id", activityIds)
      .order("completed_at", { ascending: false });
    for (const r of progressRows || []) {
      if (!completionsByActivity.has(r.activity_id)) {
        completionsByActivity.set(r.activity_id, {
          last_completed_at: r.completed_at,
          day_key: r.day_key,
        });
      }
    }
  }

  const enriched = (activities || []).map((a) => ({
    ...a,
    completion: completionsByActivity.get(a.id) || null,
  }));

  return NextResponse.json({ activities: enriched });
}

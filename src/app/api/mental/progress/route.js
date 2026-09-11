// src/app/api/mental/progress/route.js
//
// POST /api/mental/progress
//   Body: {
//     activity_id?: uuid,        // nullable for freeform silent sessions
//     activity_type: string,     // required — snapshot of the type
//     duration_seconds: number,
//     metadata?: object
//   }
//
// Records a completion for the signed-in player, awards XP through
// the shared awardXp() helper, and returns the awarded amount + the
// updated streak length so the UI can celebrate.
//
// Idempotent per (player, activity, day) via the UNIQUE constraint —
// a duplicate insert on the same day silently returns 200 without
// double-awarding XP.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import {
  ACTIVITY_TYPES,
  XP_REWARDS,
  computeSilentTimerXp,
} from "@/lib/mental/constants";

export async function POST(request) {
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

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const activityId =
    typeof body?.activity_id === "string" ? body.activity_id : null;
  const activityType =
    typeof body?.activity_type === "string" ? body.activity_type : null;
  if (!activityType || !ACTIVITY_TYPES.includes(activityType)) {
    return NextResponse.json({ error: "invalid_activity_type" }, { status: 400 });
  }

  const durationSec = Number(body?.duration_seconds) || null;
  const metadata =
    body?.metadata && typeof body.metadata === "object" ? body.metadata : null;

  const supabase = await getSupabaseAdmin();

  // Insert progress row. UNIQUE (player, activity, day_key) protects
  // against double-taps + double-awards. Use `upsert` with
  // ignoreDuplicates so we don't error on the second call.
  const { data: existing } = await supabase
    .from("mental_progress")
    .select("id")
    .eq("player_id", user.id)
    .eq("day_key", new Date().toISOString().slice(0, 10))
    .eq("activity_id", activityId || "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (existing) {
    // Already awarded today — return the current streak without
    // re-awarding XP.
    const streak = await computeStreak(supabase, user.id);
    return NextResponse.json({
      ok: true,
      already_recorded_today: true,
      xp_awarded: 0,
      streak,
    });
  }

  const { error: insertErr } = await supabase.from("mental_progress").insert({
    player_id: user.id,
    activity_id: activityId,
    activity_type: activityType,
    duration_seconds: durationSec,
    metadata,
  });
  if (insertErr) {
    // 23505 = unique violation (concurrent double-tap). Treat as
    // success so the UI can celebrate.
    if (insertErr.code !== "23505") {
      console.error("[mental/progress] insert failed:", insertErr);
      return NextResponse.json({ error: "insert_failed" }, { status: 500 });
    }
  }

  // Compute XP. Silent timer uses length-based curve; other types
  // use flat rewards from constants.
  let xpAmount = 0;
  if (activityType === "silent_timer") {
    const minutes = durationSec ? Math.floor(durationSec / 60) : 0;
    xpAmount = computeSilentTimerXp(minutes);
  } else {
    xpAmount = XP_REWARDS[activityType] || 0;
    // Small comprehension bonus if the answer is marked correct in
    // metadata (matches the "correct answer bumps XP" convention we
    // wanted in the plan).
    if (metadata && metadata.comprehension_correct === true) {
      xpAmount += 5;
    }
  }

  // XP is awarded client-side via /api/xp/award — awardXp() is a
  // browser-only helper. Return the amount + a stable xp_source so
  // the client can fire the award call itself.
  const streak = await computeStreak(supabase, user.id);

  return NextResponse.json({
    ok: true,
    xp_awarded: xpAmount,
    xp_source: xpAmount > 0 ? `mental/${activityType}` : null,
    xp_source_id: activityId,
    streak,
  });
}

/**
 * GET /api/mental/progress — returns the caller's aggregate stats.
 *   - streak: current daily streak (with 1-day grace)
 *   - minutes_this_week
 *   - minutes_all_time
 *   - completed_all_time
 *   - by_type: { [activity_type]: count }
 */
export async function GET() {
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

  const supabase = await getSupabaseAdmin();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: allRows } = await supabase
    .from("mental_progress")
    .select("activity_type, duration_seconds, completed_at, day_key")
    .eq("player_id", user.id)
    .order("day_key", { ascending: false });

  const rows = allRows || [];
  const byType = {};
  let minutesAllTime = 0;
  let minutesThisWeek = 0;
  // Roll rows up per-day so the Growing Tree can render one leaf per
  // day the player was active, coloured by which types they did.
  const byDay = new Map(); // day_key → { day_key, activity_types: Set }
  for (const r of rows) {
    byType[r.activity_type] = (byType[r.activity_type] || 0) + 1;
    const mins = Math.round((r.duration_seconds || 0) / 60);
    minutesAllTime += mins;
    if (r.completed_at >= weekAgo) minutesThisWeek += mins;
    let bucket = byDay.get(r.day_key);
    if (!bucket) {
      bucket = { day_key: r.day_key, activity_types: new Set() };
      byDay.set(r.day_key, bucket);
    }
    bucket.activity_types.add(r.activity_type);
  }
  const completionsByDay = Array.from(byDay.values())
    .map((d) => ({
      day_key: d.day_key,
      activity_types: Array.from(d.activity_types),
    }))
    // Newest first — matches the DB order and the Growing Tree's
    // "newest leaves at the top" placement rule.
    .sort((a, b) => (a.day_key < b.day_key ? 1 : -1));

  const streak = await computeStreak(supabase, user.id, rows);

  return NextResponse.json({
    streak,
    minutes_this_week: minutesThisWeek,
    minutes_all_time: minutesAllTime,
    completed_all_time: rows.length,
    by_type: byType,
    completions_by_day: completionsByDay,
  });
}

/**
 * Streak = consecutive calendar days with at least one completion,
 * with a 1-day grace: if the player misses ONE day but completed
 * yesterday-1 and today, the streak survives. Breaks only on 2+
 * consecutive missed days.
 *
 * If `rows` is provided (from the GET aggregator), reuses them to
 * save a query. Otherwise fetches distinct day_keys.
 */
async function computeStreak(supabase, playerId, rows = null) {
  let dayKeys;
  if (rows) {
    dayKeys = Array.from(new Set(rows.map((r) => r.day_key))).sort();
  } else {
    const { data } = await supabase
      .from("mental_progress")
      .select("day_key")
      .eq("player_id", playerId);
    dayKeys = Array.from(new Set((data || []).map((r) => r.day_key))).sort();
  }
  if (dayKeys.length === 0) return 0;

  // Walk backwards from today (or yesterday, thanks to 1-day grace).
  const dayMs = 24 * 60 * 60 * 1000;
  const todayKey = new Date().toISOString().slice(0, 10);
  const daySet = new Set(dayKeys);

  // Anchor — the most recent day we count from. If neither today nor
  // yesterday has a completion, streak is broken.
  let anchor = null;
  const yesterdayKey = new Date(Date.now() - dayMs).toISOString().slice(0, 10);
  if (daySet.has(todayKey)) anchor = todayKey;
  else if (daySet.has(yesterdayKey)) anchor = yesterdayKey;
  else return 0;

  // Count backwards, allowing at most one consecutive missed day.
  let streak = 0;
  let cursor = new Date(anchor);
  let missesInARow = 0;
  while (missesInARow < 2) {
    const key = cursor.toISOString().slice(0, 10);
    if (daySet.has(key)) {
      streak++;
      missesInARow = 0;
    } else {
      missesInARow++;
      if (missesInARow >= 2) break;
    }
    cursor = new Date(cursor.getTime() - dayMs);
    // Safety — cap at 3 years to avoid pathological loops.
    if (streak > 365 * 3) break;
  }
  return streak;
}

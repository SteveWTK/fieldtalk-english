// src/app/api/coach/player/[id]/route.js
//
// GET /api/coach/player/[id]
//
// The per-player drill-in endpoint (v3 shell). Returns the same
// rolled-up shape that /api/coach/roster returns for one player,
// PLUS placeholders for the deeper data the v3 drill-in will
// eventually surface (timeline, weekly bars, skill radar snapshot,
// coach notes).
//
// This shell exists so the /coach/player/[id] page renders without
// waiting on v3's timeline / chart work. When those land, we add
// fields to this response — no route move, no client refactor.
//
// Access scoping mirrors /api/coach/roster:
//   - platform_admin → any player
//   - coach          → only players with academy_id === coach's own
//                       academy_id. 404 otherwise so we don't leak
//                       existence of a player outside their scope.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertCoach } from "@/lib/admin/gate";

const HISTORY_DAYS = 90;

export async function GET(_request, context) {
  const gate = await assertCoach();
  if (gate instanceof NextResponse) return gate;
  const { playerRow: coachRow } = gate;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "missing_id" }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();

  // Load the target player. Coaches can only see players in their
  // own academy — a 404 (not 403) if the player is outside scope, so
  // we don't leak the row's existence.
  const { data: player, error: pErr } = await supabase
    .from("players")
    .select(
      "id, full_name, avatar_url, edition, academy_id, phone_e164, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (pErr) {
    console.error("[coach/player] fetch failed:", pErr);
    return NextResponse.json({ error: "player_failed" }, { status: 500 });
  }
  if (!player) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const isPlatformAdmin = coachRow.user_type === "platform_admin";
  if (!isPlatformAdmin && player.academy_id !== coachRow.academy_id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const historyStart = new Date(nowMs - HISTORY_DAYS * dayMs).toISOString();
  const weekAgo = new Date(nowMs - 7 * dayMs).toISOString();

  // Roll up the same numbers the roster row shows, plus the raw
  // recent activity for the v3 timeline (returned as `recent_events`
  // for now — client can either use it or ignore it while the
  // timeline UI is still to build).
  const [lessonRes, mentalRes, progressRes] = await Promise.all([
    supabase
      .from("lesson_completions")
      .select("player_id, xp_earned, completed_at, lesson_id")
      .eq("player_id", id)
      .gte("completed_at", historyStart)
      .order("completed_at", { ascending: false }),
    supabase
      .from("mental_progress")
      .select("player_id, activity_type, duration_seconds, completed_at, day_key")
      .eq("player_id", id)
      .gte("completed_at", historyStart)
      .order("completed_at", { ascending: false }),
    supabase
      .from("player_progress")
      .select("total_xp")
      .eq("player_id", id)
      .maybeSingle(),
  ]);

  const lessons = lessonRes.data || [];
  const mental = mentalRes.data || [];
  const totalXp = progressRes.data?.total_xp || 0;

  let lessonsLastWeek = 0;
  let xpLastWeek = 0;
  let mentalMinutesAllTime = 0;
  let mentalMinutesLastWeek = 0;
  let lastActivityAt = null;
  const mentalDays = new Set();

  for (const row of lessons) {
    if (row.completed_at >= weekAgo) {
      lessonsLastWeek++;
      xpLastWeek += row.xp_earned || 0;
    }
    if (!lastActivityAt || row.completed_at > lastActivityAt) {
      lastActivityAt = row.completed_at;
    }
  }

  for (const row of mental) {
    const mins = Math.round((row.duration_seconds || 0) / 60);
    mentalMinutesAllTime += mins;
    if (row.completed_at >= weekAgo) mentalMinutesLastWeek += mins;
    if (row.day_key) mentalDays.add(row.day_key);
    if (!lastActivityAt || row.completed_at > lastActivityAt) {
      lastActivityAt = row.completed_at;
    }
  }

  const streak = computeMentalStreak(Array.from(mentalDays));
  const daysSinceLast =
    lastActivityAt != null
      ? Math.floor((nowMs - new Date(lastActivityAt).getTime()) / dayMs)
      : null;
  const status = bucketStatus(daysSinceLast);

  return NextResponse.json({
    player: {
      id: player.id,
      full_name: player.full_name || "—",
      avatar_url: player.avatar_url || null,
      edition: player.edition || null,
      academy_id: player.academy_id,
      phone_e164: player.phone_e164,
      created_at: player.created_at,
      total_xp: totalXp,
      lessons_completed: lessons.length,
      lessons_last_week: lessonsLastWeek,
      xp_earned_last_week: xpLastWeek,
      mental_completed_all_time: mental.length,
      mental_minutes_all_time: mentalMinutesAllTime,
      mental_minutes_last_week: mentalMinutesLastWeek,
      mental_streak: streak,
      last_activity_at: lastActivityAt,
      days_since_last: daysSinceLast,
      status,
    },
    // v3 shell — the timeline UI is still to build, but we return
    // the raw list so a client that wants to render an interim
    // "last 5 events" strip can. Order: newest first.
    recent_events: buildRecentEvents(lessons, mental),
  });
}

/**
 * Merge lessons + mental sessions into one chronologically-sorted
 * list, tagged so the client can render an icon + label per row.
 * Returns at most 25 rows — enough for a scannable timeline strip
 * without pulling the full history.
 */
function buildRecentEvents(lessons, mental) {
  const events = [];
  for (const l of lessons) {
    events.push({
      kind: "lesson",
      at: l.completed_at,
      meta: {
        lesson_id: l.lesson_id,
        xp_earned: l.xp_earned || 0,
      },
    });
  }
  for (const m of mental) {
    events.push({
      kind: "mental",
      at: m.completed_at,
      meta: {
        activity_type: m.activity_type,
        duration_seconds: m.duration_seconds || 0,
      },
    });
  }
  events.sort((a, b) => (a.at < b.at ? 1 : -1));
  return events.slice(0, 25);
}

function bucketStatus(daysSinceLast) {
  if (daysSinceLast == null) return "never";
  if (daysSinceLast <= 3) return "active";
  if (daysSinceLast <= 14) return "dormant";
  return "at_risk";
}

function computeMentalStreak(dayKeys) {
  if (!dayKeys.length) return 0;
  const daySet = new Set(dayKeys);
  const dayMs = 24 * 60 * 60 * 1000;
  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayKey = new Date(Date.now() - dayMs).toISOString().slice(0, 10);
  let anchor = null;
  if (daySet.has(todayKey)) anchor = todayKey;
  else if (daySet.has(yesterdayKey)) anchor = yesterdayKey;
  else return 0;

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
    if (streak > 365 * 3) break;
  }
  return streak;
}

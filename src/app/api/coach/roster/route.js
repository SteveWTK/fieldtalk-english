// src/app/api/coach/roster/route.js
//
// GET /api/coach/roster
//
// The coach-facing roster endpoint — same response shape as the
// admin variant at /api/admin/coach/roster, but scoped to a single
// academy per the caller's user_type:
//
//   - user_type === 'coach'          → scope to playerRow.academy_id
//   - user_type === 'platform_admin' → whole population (mirrors the
//                                       admin endpoint, so admins can
//                                       preview what a coach sees)
//
// Multi-academy support (a coach who represents players across
// several academies) is v2.5 work — will require a `player_coach_links`
// join table. Deliberately punted for now so the /coach route can
// ship this session; single-academy is the common case for MVP.
//
// The heavy lifting (players + lesson_completions + mental_progress
// rollups, streak calc, status bucketing, aggregate strip) is
// intentionally identical to /api/admin/coach/roster so both
// surfaces stay visually + numerically consistent. If the admin
// endpoint gets extended, this one should track it.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertCoach } from "@/lib/admin/gate";

const ACTIVE_DAYS = 3;
const DORMANT_DAYS = 14;
const HISTORY_DAYS = 90;

export async function GET() {
  const gate = await assertCoach();
  if (gate instanceof NextResponse) return gate;
  const { playerRow } = gate;

  const supabase = await getSupabaseAdmin();
  const nowMs = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const historyStart = new Date(nowMs - HISTORY_DAYS * dayMs).toISOString();
  const weekAgo = new Date(nowMs - 7 * dayMs).toISOString();

  // Player-set scoping. Platform admins see everyone; coaches only
  // their own academy_id.
  const isPlatformAdmin = playerRow.user_type === "platform_admin";
  const coachAcademyId = playerRow.academy_id || null;

  if (!isPlatformAdmin && !coachAcademyId) {
    // A coach with no academy_id can't be shown any roster — this is
    // an onboarding gap, not an error. Return an empty aggregate so
    // the UI can render an empty state cleanly.
    return NextResponse.json({
      players: [],
      aggregate: emptyAggregate(),
      academies: [],
      coach: {
        academy_id: null,
        needs_academy_link: true,
      },
    });
  }

  let playersQuery = supabase
    .from("players")
    .select(
      "id, full_name, avatar_url, edition, academy_id, phone_e164, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(500);

  if (isPlatformAdmin) {
    playersQuery = playersQuery.not("academy_id", "is", null);
  } else {
    playersQuery = playersQuery.eq("academy_id", coachAcademyId);
  }

  const { data: players, error: pErr } = await playersQuery;
  if (pErr) {
    console.error("[coach/roster] players fetch failed:", pErr);
    return NextResponse.json({ error: "players_failed" }, { status: 500 });
  }

  if (!players || players.length === 0) {
    return NextResponse.json({
      players: [],
      aggregate: emptyAggregate(),
      academies: isPlatformAdmin ? await fetchAcademies(supabase) : [],
      coach: {
        academy_id: coachAcademyId,
        needs_academy_link: false,
      },
    });
  }

  const playerIds = players.map((p) => p.id);

  const [lessonRes, mentalRes, progressRes, academies] = await Promise.all([
    supabase
      .from("lesson_completions")
      .select("player_id, xp_earned, completed_at")
      .in("player_id", playerIds)
      .gte("completed_at", historyStart),
    supabase
      .from("mental_progress")
      .select("player_id, activity_type, duration_seconds, completed_at, day_key")
      .in("player_id", playerIds)
      .gte("completed_at", historyStart),
    supabase
      .from("player_progress")
      .select("player_id, total_xp")
      .in("player_id", playerIds),
    isPlatformAdmin ? fetchAcademies(supabase) : Promise.resolve([]),
  ]);

  const lessons = lessonRes.data || [];
  const mental = mentalRes.data || [];
  const totalXpByPlayer = new Map(
    (progressRes.data || []).map((r) => [r.player_id, r.total_xp]),
  );

  const perPlayer = new Map();
  for (const p of players) {
    perPlayer.set(p.id, {
      id: p.id,
      full_name: p.full_name || "—",
      avatar_url: p.avatar_url || null,
      edition: p.edition || null,
      academy_id: p.academy_id || null,
      phone_e164: p.phone_e164 || null,
      created_at: p.created_at,
      total_xp: totalXpByPlayer.get(p.id) || 0,
      lessons_completed: 0,
      lessons_last_week: 0,
      xp_earned_last_week: 0,
      mental_completed_all_time: 0,
      mental_minutes_all_time: 0,
      mental_minutes_last_week: 0,
      mental_days: new Set(),
      last_activity_at: null,
    });
  }

  for (const row of lessons) {
    const stats = perPlayer.get(row.player_id);
    if (!stats) continue;
    stats.lessons_completed++;
    if (row.completed_at >= weekAgo) {
      stats.lessons_last_week++;
      stats.xp_earned_last_week += row.xp_earned || 0;
    }
    if (!stats.last_activity_at || row.completed_at > stats.last_activity_at) {
      stats.last_activity_at = row.completed_at;
    }
  }

  for (const row of mental) {
    const stats = perPlayer.get(row.player_id);
    if (!stats) continue;
    stats.mental_completed_all_time++;
    const mins = Math.round((row.duration_seconds || 0) / 60);
    stats.mental_minutes_all_time += mins;
    if (row.completed_at >= weekAgo) {
      stats.mental_minutes_last_week += mins;
    }
    if (row.day_key) stats.mental_days.add(row.day_key);
    if (!stats.last_activity_at || row.completed_at > stats.last_activity_at) {
      stats.last_activity_at = row.completed_at;
    }
  }

  const rosterRows = players.map((p) => {
    const s = perPlayer.get(p.id);
    const streak = computeMentalStreak(Array.from(s.mental_days));
    const daysSinceLast =
      s.last_activity_at != null
        ? Math.floor((nowMs - new Date(s.last_activity_at).getTime()) / dayMs)
        : null;
    const status = bucketStatus(daysSinceLast);
    return {
      id: s.id,
      full_name: s.full_name,
      avatar_url: s.avatar_url,
      edition: s.edition,
      academy_id: s.academy_id,
      total_xp: s.total_xp,
      lessons_completed: s.lessons_completed,
      lessons_last_week: s.lessons_last_week,
      xp_earned_last_week: s.xp_earned_last_week,
      mental_completed_all_time: s.mental_completed_all_time,
      mental_minutes_all_time: s.mental_minutes_all_time,
      mental_minutes_last_week: s.mental_minutes_last_week,
      mental_streak: streak,
      last_activity_at: s.last_activity_at,
      days_since_last: daysSinceLast,
      status,
    };
  });

  let activeThisWeek = 0;
  let atRisk = 0;
  let xpThisWeek = 0;
  let mentalMinutesThisWeek = 0;
  let streakSum = 0;
  let streakCount = 0;
  for (const r of rosterRows) {
    if (r.status === "active") activeThisWeek++;
    if (r.status === "at_risk") atRisk++;
    xpThisWeek += r.xp_earned_last_week;
    mentalMinutesThisWeek += r.mental_minutes_last_week;
    if (r.mental_streak > 0) {
      streakSum += r.mental_streak;
      streakCount++;
    }
  }

  const aggregate = {
    total_players: rosterRows.length,
    active_this_week: activeThisWeek,
    at_risk: atRisk,
    xp_this_week: xpThisWeek,
    mental_minutes_this_week: mentalMinutesThisWeek,
    avg_mental_streak:
      streakCount > 0 ? +(streakSum / streakCount).toFixed(1) : 0,
  };

  return NextResponse.json({
    players: rosterRows,
    aggregate,
    academies,
    coach: {
      academy_id: coachAcademyId,
      needs_academy_link: false,
    },
  });
}

/* ─── helpers ─────────────────────────────────────────────────── */

function emptyAggregate() {
  return {
    total_players: 0,
    active_this_week: 0,
    at_risk: 0,
    xp_this_week: 0,
    mental_minutes_this_week: 0,
    avg_mental_streak: 0,
  };
}

async function fetchAcademies(supabase) {
  const { data } = await supabase
    .from("academies")
    .select("id, name")
    .eq("is_active", true)
    .order("name", { ascending: true });
  return data || [];
}

function bucketStatus(daysSinceLast) {
  if (daysSinceLast == null) return "never";
  if (daysSinceLast <= ACTIVE_DAYS) return "active";
  if (daysSinceLast <= DORMANT_DAYS) return "dormant";
  return "at_risk";
}

/**
 * Streak = consecutive calendar days with at least one mental
 * activity, allowing a 1-day grace. Kept identical to
 * /api/admin/coach/roster + /api/mental/progress so streak numbers
 * are consistent across the coach view, admin view, and player's
 * own dashboard.
 */
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

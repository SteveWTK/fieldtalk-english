// src/app/api/admin/users/stats/route.js
//
// GET /api/admin/users/stats?edition=&partner=&since=&until=
//
// Single aggregation endpoint that powers the User Tracking admin
// page. Returns:
//
//   - filters       { availableEditions, availablePartners }
//   - kpis          { activeUsers7d, activeUsers30d, lessonsCompleted,
//                     totalXpEarned, packsOpened, predictionsSubmitted,
//                     avgLessonsPerActiveUser }
//   - powerUsers    [{ id, name, email, edition, partner,
//                       lastActiveAt, lessonsCompleted, totalXp,
//                       packsOpened }] — top 25 by lessonsCompleted
//   - lessonEngagement [{ id, title, pillar, started, completed,
//                          completionRate, avgTimeMs }] — sorted by
//     completion rate ascending so drop-off candidates float to top
//   - recentActivity [{ type, at, playerId, playerName, label }]
//                     — newest 30 mixed events
//
// All queries run in parallel where possible. Live data; no caching.
//
// Auth: platform_admin only.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

const POWER_USERS_LIMIT = 25;
const RECENT_ACTIVITY_LIMIT = 30;

export async function GET(request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { supabase } = guard;

  const url = new URL(request.url);
  const editionParam = url.searchParams.get("edition");
  const partnerParam = url.searchParams.get("partner");
  const sinceISO = parseISO(url.searchParams.get("since"));
  const untilISO = parseISO(url.searchParams.get("until"));
  // Default window: last 30 days.
  const now = new Date();
  const default30dAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const default7dAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sinceDate = sinceISO ? new Date(sinceISO) : default30dAgo;
  const untilDate = untilISO ? new Date(untilISO) : now;
  const since = sinceDate.toISOString();
  const until = untilDate.toISOString();
  const sevenDayCutoff = default7dAgo.toISOString();

  // ── Players first (with optional edition filter) ──
  // We need every player so we can roll up per-player aggregates.
  // The dataset is small enough that pulling them in one shot is
  // cheaper than per-aggregation joins.
  let playerQuery = supabase
    .from("players")
    .select("id, full_name, email, edition, created_at");
  if (editionParam && editionParam !== "all") {
    playerQuery = playerQuery.eq("edition", editionParam);
  }

  // ── Fan-out the heavy reads in parallel ──
  const [
    playersRes,
    completionsRes,
    xpEventsRes,
    packOpeningsRes,
    predictionsRes,
    seatLicensesRes,
    seatRedemptionsRes,
    pillarsRes,
    lessonsRes,
    progressRes,
  ] = await Promise.all([
    playerQuery,
    supabase
      .from("lesson_completions")
      .select("id, player_id, lesson_id, time_spent, xp_earned, completed_at"),
    // earned_at on player_xp_events drives "active users". If your
    // events table uses a different column, adapt here.
    supabase
      .from("player_xp_events")
      .select("id, player_id, source, source_id, amount, earned_at"),
    supabase
      .from("pack_openings")
      .select("id, player_id, opened_at"),
    supabase
      .from("predictions")
      .select("id, player_id, updated_at"),
    supabase
      .from("seat_licenses")
      .select("id, partner_name, edition"),
    supabase
      .from("seat_redemptions")
      .select("license_id, player_id, redeemed_at"),
    supabase
      .from("pillars")
      .select("id, name, display_name, edition, sort_order"),
    supabase
      .from("lessons")
      .select("id, title, pillar_id, sort_order"),
    supabase
      .from("player_progress")
      .select("player_id, total_xp, last_activity_date"),
  ]);

  for (const res of [
    playersRes,
    completionsRes,
    xpEventsRes,
    packOpeningsRes,
    predictionsRes,
    seatLicensesRes,
    seatRedemptionsRes,
    pillarsRes,
    lessonsRes,
    progressRes,
  ]) {
    if (res.error) {
      console.error("[admin/users/stats] sub-fetch error:", res.error);
      return NextResponse.json(
        { error: res.error.message || "Stats fetch failed" },
        { status: 500 }
      );
    }
  }

  const players = playersRes.data || [];
  const completions = completionsRes.data || [];
  const xpEvents = xpEventsRes.data || [];
  const packOpenings = packOpeningsRes.data || [];
  const predictions = predictionsRes.data || [];
  const seatLicenses = seatLicensesRes.data || [];
  const seatRedemptions = seatRedemptionsRes.data || [];
  const pillars = pillarsRes.data || [];
  const lessons = lessonsRes.data || [];
  const progress = progressRes.data || [];

  // license_id → partner_name lookup, then player_id → partner_name
  // via seat_redemptions. A player who redeemed multiple codes keeps
  // the most recent partner (sorted by redeemed_at desc).
  const partnerByLicense = new Map(
    seatLicenses.map((l) => [l.id, l.partner_name])
  );
  const partnerByPlayer = new Map();
  const sortedRedemptions = [...seatRedemptions].sort((a, b) => {
    const at = a.redeemed_at ? new Date(a.redeemed_at).getTime() : 0;
    const bt = b.redeemed_at ? new Date(b.redeemed_at).getTime() : 0;
    return bt - at;
  });
  for (const r of sortedRedemptions) {
    if (!partnerByPlayer.has(r.player_id)) {
      const partner = partnerByLicense.get(r.license_id);
      if (partner) partnerByPlayer.set(r.player_id, partner);
    }
  }

  // Filter the player base by ?partner if requested.
  const matchingPlayerIds = new Set(
    partnerParam && partnerParam !== "all"
      ? players
          .filter((p) => partnerByPlayer.get(p.id) === partnerParam)
          .map((p) => p.id)
      : players.map((p) => p.id)
  );

  // ── KPI aggregations ──
  const sinceTime = new Date(since).getTime();
  const untilTime = new Date(until).getTime();
  const sevenDayTime = new Date(sevenDayCutoff).getTime();

  const inWindow = (ts) => {
    if (!ts) return false;
    const t = new Date(ts).getTime();
    return t >= sinceTime && t <= untilTime;
  };

  // Active = any XP event in the window (more sensitive than last
  // lesson completion — catches users who opened a pack but didn't
  // finish a lesson).
  const activeUsers7d = new Set();
  const activeUsers30d = new Set();
  let totalXpEarned = 0;
  for (const e of xpEvents) {
    if (!matchingPlayerIds.has(e.player_id)) continue;
    const t = e.earned_at ? new Date(e.earned_at).getTime() : 0;
    if (!t) continue;
    if (t >= sevenDayTime) activeUsers7d.add(e.player_id);
    if (t >= sinceTime && t <= untilTime) {
      activeUsers30d.add(e.player_id);
      totalXpEarned += Number(e.amount) || 0;
    }
  }

  let lessonsCompletedInWindow = 0;
  for (const c of completions) {
    if (!matchingPlayerIds.has(c.player_id)) continue;
    if (inWindow(c.completed_at)) lessonsCompletedInWindow += 1;
  }

  let packsOpenedInWindow = 0;
  for (const p of packOpenings) {
    if (!matchingPlayerIds.has(p.player_id)) continue;
    if (inWindow(p.opened_at)) packsOpenedInWindow += 1;
  }

  let predictionsInWindow = 0;
  for (const p of predictions) {
    if (!matchingPlayerIds.has(p.player_id)) continue;
    if (inWindow(p.updated_at)) predictionsInWindow += 1;
  }

  const avgLessonsPerActiveUser =
    activeUsers30d.size > 0
      ? Math.round((lessonsCompletedInWindow / activeUsers30d.size) * 10) / 10
      : 0;

  // ── Power users (all-time totals, top N by lessons completed) ──
  const lessonsByPlayer = new Map();
  for (const c of completions) {
    if (!matchingPlayerIds.has(c.player_id)) continue;
    lessonsByPlayer.set(
      c.player_id,
      (lessonsByPlayer.get(c.player_id) || 0) + 1
    );
  }

  const packsByPlayer = new Map();
  for (const p of packOpenings) {
    if (!matchingPlayerIds.has(p.player_id)) continue;
    packsByPlayer.set(p.player_id, (packsByPlayer.get(p.player_id) || 0) + 1);
  }

  // most recent XP-event timestamp per player → "last active"
  const lastActiveByPlayer = new Map();
  for (const e of xpEvents) {
    if (!matchingPlayerIds.has(e.player_id)) continue;
    const t = e.earned_at ? new Date(e.earned_at).getTime() : 0;
    const prev = lastActiveByPlayer.get(e.player_id) || 0;
    if (t > prev) lastActiveByPlayer.set(e.player_id, t);
  }

  const xpByPlayer = new Map(
    progress.map((p) => [p.player_id, p.total_xp || 0])
  );

  const powerUsers = players
    .filter((p) => matchingPlayerIds.has(p.id))
    .map((p) => {
      const lastActiveMs = lastActiveByPlayer.get(p.id) || 0;
      return {
        id: p.id,
        name: p.full_name || p.email?.split("@")[0] || "Player",
        email: p.email || null,
        edition: p.edition || null,
        partner: partnerByPlayer.get(p.id) || null,
        lastActiveAt: lastActiveMs ? new Date(lastActiveMs).toISOString() : null,
        lessonsCompleted: lessonsByPlayer.get(p.id) || 0,
        totalXp: xpByPlayer.get(p.id) || 0,
        packsOpened: packsByPlayer.get(p.id) || 0,
      };
    })
    .sort((a, b) => {
      if (b.lessonsCompleted !== a.lessonsCompleted) {
        return b.lessonsCompleted - a.lessonsCompleted;
      }
      return b.totalXp - a.totalXp;
    })
    .slice(0, POWER_USERS_LIMIT);

  // ── Lesson engagement ──
  // started = distinct players with ANY xp event tied to this lesson
  // (lesson_partial OR lesson_completion). Anyone who earned XP from
  // a lesson has effectively engaged with it. completed = number of
  // lesson_completions rows for the lesson.
  const startedByLesson = new Map(); // lesson_id → Set(player_id)
  for (const e of xpEvents) {
    if (!matchingPlayerIds.has(e.player_id)) continue;
    if (e.source !== "lesson_partial" && e.source !== "lesson_completion") {
      continue;
    }
    const lessonId = e.source_id;
    if (!lessonId) continue;
    if (!startedByLesson.has(lessonId)) startedByLesson.set(lessonId, new Set());
    startedByLesson.get(lessonId).add(e.player_id);
  }

  const completionStatsByLesson = new Map();
  for (const c of completions) {
    if (!matchingPlayerIds.has(c.player_id)) continue;
    const slot =
      completionStatsByLesson.get(c.lesson_id) || { count: 0, timeSum: 0 };
    slot.count += 1;
    slot.timeSum += Number(c.time_spent) || 0;
    completionStatsByLesson.set(c.lesson_id, slot);
  }

  const pillarById = new Map(pillars.map((p) => [p.id, p]));
  // For edition filtering, only include lessons in pillars matching
  // the current edition. ?edition=all skips this filter.
  const editionPillarIds =
    editionParam && editionParam !== "all"
      ? new Set(pillars.filter((p) => p.edition === editionParam).map((p) => p.id))
      : null;

  const lessonEngagement = lessons
    .filter((l) => !editionPillarIds || editionPillarIds.has(l.pillar_id))
    .map((l) => {
      const started = startedByLesson.get(l.id)?.size || 0;
      const completionStats =
        completionStatsByLesson.get(l.id) || { count: 0, timeSum: 0 };
      const completed = completionStats.count;
      const completionRate = started > 0 ? completed / started : 0;
      const avgTimeMs =
        completed > 0 ? Math.round(completionStats.timeSum / completed) : null;
      const pillar = pillarById.get(l.pillar_id);
      return {
        id: l.id,
        title: l.title || "Untitled lesson",
        pillar: pillar?.display_name || pillar?.name || "—",
        pillarSortOrder: pillar?.sort_order ?? 999,
        lessonSortOrder: l.sort_order ?? 999,
        started,
        completed,
        completionRate,
        avgTimeMs,
      };
    })
    // Drop-off candidates first: lowest completion rate with any
    // engagement (started > 0) leads the list.
    .sort((a, b) => {
      if (a.started === 0 && b.started === 0) {
        // Both untouched — fall back to lesson order for predictability.
        if (a.pillarSortOrder !== b.pillarSortOrder) {
          return a.pillarSortOrder - b.pillarSortOrder;
        }
        return a.lessonSortOrder - b.lessonSortOrder;
      }
      if (a.started === 0) return 1;
      if (b.started === 0) return -1;
      return a.completionRate - b.completionRate;
    });

  // ── Recent activity feed (last N mixed) ──
  const playerById = new Map(players.map((p) => [p.id, p]));
  const playerLabel = (id) => {
    const p = playerById.get(id);
    if (!p) return "Unknown";
    return p.full_name || p.email?.split("@")[0] || "Player";
  };
  const lessonTitleById = new Map(
    lessons.map((l) => [l.id, l.title || "Untitled"])
  );

  const events = [];
  for (const c of completions) {
    if (!matchingPlayerIds.has(c.player_id)) continue;
    if (!c.completed_at) continue;
    events.push({
      type: "lesson_completion",
      at: c.completed_at,
      playerId: c.player_id,
      playerName: playerLabel(c.player_id),
      label: `Finished "${lessonTitleById.get(c.lesson_id) || "lesson"}" (+${c.xp_earned || 0} XP)`,
    });
  }
  for (const p of packOpenings) {
    if (!matchingPlayerIds.has(p.player_id)) continue;
    if (!p.opened_at) continue;
    events.push({
      type: "pack_open",
      at: p.opened_at,
      playerId: p.player_id,
      playerName: playerLabel(p.player_id),
      label: "Opened a sticker pack",
    });
  }
  for (const r of seatRedemptions) {
    if (!matchingPlayerIds.has(r.player_id)) continue;
    if (!r.redeemed_at) continue;
    const partner = partnerByLicense.get(r.license_id) || "—";
    events.push({
      type: "seat_redemption",
      at: r.redeemed_at,
      playerId: r.player_id,
      playerName: playerLabel(r.player_id),
      label: `Redeemed a Full Access code (${partner})`,
    });
  }
  for (const p of players) {
    if (!matchingPlayerIds.has(p.id)) continue;
    if (!p.created_at) continue;
    events.push({
      type: "signup",
      at: p.created_at,
      playerId: p.id,
      playerName: playerLabel(p.id),
      label: `Signed up (${p.edition || "?"})`,
    });
  }
  events.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const recentActivity = events.slice(0, RECENT_ACTIVITY_LIMIT);

  // ── Filter option lists for the page's dropdowns ──
  const availablePartners = [
    ...new Set(seatLicenses.map((l) => l.partner_name).filter(Boolean)),
  ].sort();
  const availableEditions = [
    ...new Set(players.map((p) => p.edition).filter(Boolean)),
  ].sort();

  return NextResponse.json({
    dateRange: { since, until },
    filters: { availableEditions, availablePartners },
    kpis: {
      activeUsers7d: activeUsers7d.size,
      activeUsers30d: activeUsers30d.size,
      lessonsCompleted: lessonsCompletedInWindow,
      totalXpEarned,
      packsOpened: packsOpenedInWindow,
      predictionsSubmitted: predictionsInWindow,
      avgLessonsPerActiveUser,
    },
    powerUsers,
    lessonEngagement,
    recentActivity,
  });
}

function parseISO(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d.toISOString() : null;
}

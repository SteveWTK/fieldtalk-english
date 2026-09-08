// src/app/api/admin/leads/metrics/route.js
//
// GET /api/admin/leads/metrics
//
// Aggregated snapshot for the leads admin dashboard. One endpoint,
// one round-trip. Rollups happen server-side in JS after ≤4 SQL
// queries — cheaper + more flexible than a bag of SQL aggregates
// each with its own PostgREST call.
//
// Response shape is stable; add new sections at the bottom rather
// than reshaping existing ones so the client can degrade gracefully
// on partial fetches.
//
// Time windows:
//   - "this week"  = last 7 days (rolling), for a "recent momentum" read.
//   - "prev week"  = the 7 days before that, so we can compute a
//                    week-over-week delta for the scoreboard arrows.
//   - "this month" = last 30 days.
//   - series.daily_new_30d — one bucket per calendar day, last 30d.
//   - series.weekly_won_12w — one bucket per ISO week, last 12w.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { LEAD_STAGES } from "@/lib/leads/constants";

const NON_TERMINAL_STAGES = new Set([
  "new",
  "contacted",
  "engaged",
  "qualified",
  "proposal",
]);
const TERMINAL_STAGES = new Set(["won", "lost", "dormant"]);

// Aging thresholds — tweakable. If these get tuned a lot, promote
// to per-org settings later.
const UNTOUCHED_NEW_DAYS = 3;
const STUCK_CONTACTED_DAYS = 7;

export async function GET() {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = await getSupabaseAdmin();
  const now = new Date();
  const nowMs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const weekAgo = new Date(nowMs - 7 * dayMs);
  const twoWeeksAgo = new Date(nowMs - 14 * dayMs);
  const monthAgo = new Date(nowMs - 30 * dayMs);
  const twelveWeeksAgo = new Date(nowMs - 12 * 7 * dayMs);

  // Fetch everything we need. Three trips, all keyed on small tables.
  const [leadsRes, activitiesRes, ownersRes] = await Promise.all([
    supabase
      .from("leads")
      .select(
        `id, stage, lead_type, source, assigned_to, phone_e164,
         estimated_value_cents, do_not_contact,
         created_at, updated_at,
         next_action_at, converted_at,
         assigned:players!leads_assigned_to_fkey (id, full_name)`,
      ),
    // Activities scope: 12 weeks covers every rollup + trend series
    // we need. Larger than 12w gets filtered client-side by the
    // dashboard if we ever add a longer window later.
    supabase
      .from("lead_activities")
      .select("lead_id, activity_type, actor_id, payload, created_at")
      .gte("created_at", twelveWeeksAgo.toISOString()),
    supabase
      .from("players")
      .select("id, full_name")
      .eq("user_type", "platform_admin"),
  ]);

  if (leadsRes.error) {
    console.error("[admin/leads/metrics] leads fetch failed:", leadsRes.error);
    return NextResponse.json({ error: "leads_fetch_failed" }, { status: 500 });
  }
  if (activitiesRes.error) {
    console.error(
      "[admin/leads/metrics] activities fetch failed:",
      activitiesRes.error,
    );
    return NextResponse.json(
      { error: "activities_fetch_failed" },
      { status: 500 },
    );
  }

  const leads = leadsRes.data || [];
  const activities = activitiesRes.data || [];
  const ownersById = new Map(
    (ownersRes.data || []).map((o) => [o.id, o.full_name || "—"]),
  );

  // ── Totals ────────────────────────────────────────────────────
  let activePipeline = 0;
  let terminalWorked = 0;
  let won = 0;
  let pipelineValueCents = 0;

  const byStage = Object.fromEntries(
    LEAD_STAGES.map((s) => [s, { count: 0, value_cents: 0 }]),
  );
  const byType = {};
  const bySourceTotals = {};

  for (const l of leads) {
    if (byStage[l.stage]) {
      byStage[l.stage].count++;
      if (Number.isFinite(l.estimated_value_cents)) {
        byStage[l.stage].value_cents += l.estimated_value_cents;
      }
    }
    if (NON_TERMINAL_STAGES.has(l.stage)) {
      activePipeline++;
      if (Number.isFinite(l.estimated_value_cents)) {
        pipelineValueCents += l.estimated_value_cents;
      }
    }
    if (TERMINAL_STAGES.has(l.stage)) terminalWorked++;
    if (l.stage === "won") won++;

    byType[l.lead_type] = (byType[l.lead_type] || 0) + 1;
    bySourceTotals[l.source] = (bySourceTotals[l.source] || 0) + 1;
  }

  const conversionRate =
    terminalWorked > 0 ? won / terminalWorked : 0;

  // ── Week / month rollups ──────────────────────────────────────
  const thisWeek = emptyWindowRollup();
  const prevWeek = emptyWindowRollup();
  const thisMonth = emptyWindowRollup();

  for (const l of leads) {
    const createdMs = new Date(l.created_at).getTime();
    if (createdMs >= weekAgo.getTime()) thisWeek.new++;
    if (createdMs >= twoWeeksAgo.getTime() && createdMs < weekAgo.getTime())
      prevWeek.new++;
    if (createdMs >= monthAgo.getTime()) thisMonth.new++;

    // Terminal-stage transitions are approximated by comparing
    // updated_at to the window. We don't have per-transition
    // timestamps, so this counts leads whose CURRENT stage sits in
    // the window's updated_at range — close enough for the
    // dashboard, and refined by the activity-based counts below.
    const updatedMs = new Date(l.updated_at).getTime();
    if (updatedMs >= weekAgo.getTime() && l.stage === "won") thisWeek.won++;
    if (
      updatedMs >= twoWeeksAgo.getTime() &&
      updatedMs < weekAgo.getTime() &&
      l.stage === "won"
    )
      prevWeek.won++;
    if (updatedMs >= monthAgo.getTime() && l.stage === "won") thisMonth.won++;
  }

  // Activity-based rollups (sends, replies, stage advances). These
  // are the authoritative counts for the "This week" strip.
  const ownerStats = new Map();
  const sourceConversions = {};
  const dailyNewMap = new Map(); // "yyyy-mm-dd" → count
  const weeklyWonMap = new Map(); // "yyyy-Wnn" → count

  for (const a of activities) {
    const createdMs = new Date(a.created_at).getTime();
    const inThisWeek = createdMs >= weekAgo.getTime();
    const inPrevWeek =
      createdMs >= twoWeeksAgo.getTime() && createdMs < weekAgo.getTime();
    const inThisMonth = createdMs >= monthAgo.getTime();

    // Per-owner rollup — attributes the activity to the actor.
    const stats = getOwnerStats(ownerStats, a.actor_id);

    if (a.activity_type === "whatsapp_outbound") {
      if (inThisWeek) thisWeek.sends++;
      if (inPrevWeek) prevWeek.sends++;
      if (inThisMonth) thisMonth.sends++;
      if (inThisWeek) stats.sends_this_week++;
    } else if (a.activity_type === "whatsapp_inbound") {
      if (inThisWeek) thisWeek.replies++;
      if (inPrevWeek) prevWeek.replies++;
      if (inThisMonth) thisMonth.replies++;
      if (inThisWeek) stats.replies_this_week++;
    } else if (a.activity_type === "stage_change") {
      const toStage = a.payload?.to;
      const fromStage = a.payload?.from;
      if (fromStage !== toStage) {
        if (inThisWeek) thisWeek.stage_advances++;
        if (inPrevWeek) prevWeek.stage_advances++;
        if (inThisMonth) thisMonth.stage_advances++;
      }
      // Refined won-this-week using the actual transition timestamp.
      // Overrides the row-level heuristic above so the number is
      // exact when activity trail is complete.
      if (toStage === "won") {
        if (inThisWeek) stats.conversions_this_week++;
      }
    } else if (a.activity_type === "converted") {
      if (inThisWeek) stats.conversions_this_week++;
    }
  }

  // Owner leaderboard — attach "leads worked" (count of leads
  // currently assigned) from the leads-level pass.
  for (const l of leads) {
    if (l.assigned_to) {
      const stats = getOwnerStats(ownerStats, l.assigned_to);
      stats.leads_worked++;
      if (l.stage === "won") stats.total_conversions++;
      // Track source → conversion count for Source ROI below.
      if (l.stage === "won") {
        sourceConversions[l.source] = (sourceConversions[l.source] || 0) + 1;
      }
    } else if (l.stage === "won") {
      sourceConversions[l.source] = (sourceConversions[l.source] || 0) + 1;
    }
  }

  const ownerLeaderboard = Array.from(ownerStats.entries())
    .filter(([id]) => id != null)
    .map(([id, s]) => ({
      id,
      full_name: ownersById.get(id) || "—",
      leads_worked: s.leads_worked,
      sends_this_week: s.sends_this_week,
      replies_this_week: s.replies_this_week,
      conversions_this_week: s.conversions_this_week,
      total_conversions: s.total_conversions,
    }))
    .sort(
      (a, b) =>
        b.conversions_this_week - a.conversions_this_week ||
        b.sends_this_week - a.sends_this_week ||
        b.leads_worked - a.leads_worked,
    );

  // ── Source ROI ────────────────────────────────────────────────
  const bySource = Object.entries(bySourceTotals)
    .map(([source, leadsIn]) => {
      const conversions = sourceConversions[source] || 0;
      return {
        source,
        leads_in: leadsIn,
        conversions,
        rate: leadsIn > 0 ? conversions / leadsIn : 0,
      };
    })
    .sort((a, b) => b.rate - a.rate || b.conversions - a.conversions);

  // ── Aging / attention needed ──────────────────────────────────
  let untouchedNew = 0;
  let stuckContacted = 0;
  let overdueNextAction = 0;
  const inboundByLead = new Map();
  for (const a of activities) {
    if (a.activity_type === "whatsapp_inbound") {
      const prev = inboundByLead.get(a.lead_id);
      const t = new Date(a.created_at).getTime();
      if (!prev || t > prev) inboundByLead.set(a.lead_id, t);
    }
  }

  for (const l of leads) {
    const createdMs = new Date(l.created_at).getTime();
    if (
      l.stage === "new" &&
      nowMs - createdMs > UNTOUCHED_NEW_DAYS * dayMs
    ) {
      untouchedNew++;
    }
    if (l.stage === "contacted") {
      const lastInbound = inboundByLead.get(l.id) || 0;
      const referenceMs = Math.max(
        lastInbound,
        new Date(l.updated_at).getTime(),
      );
      if (nowMs - referenceMs > STUCK_CONTACTED_DAYS * dayMs) {
        stuckContacted++;
      }
    }
    if (
      l.next_action_at &&
      new Date(l.next_action_at).getTime() < nowMs
    ) {
      overdueNextAction++;
    }
  }

  // ── Time series ───────────────────────────────────────────────
  // Daily new leads, last 30 days. Buckets keyed by yyyy-mm-dd in UTC
  // so a value doesn't drift when a viewer's local timezone crosses
  // midnight.
  for (let i = 29; i >= 0; i--) {
    const d = new Date(nowMs - i * dayMs);
    dailyNewMap.set(toDateKey(d), 0);
  }
  for (const l of leads) {
    const key = toDateKey(new Date(l.created_at));
    if (dailyNewMap.has(key)) {
      dailyNewMap.set(key, dailyNewMap.get(key) + 1);
    }
  }

  // Weekly won, last 12 weeks. Buckets keyed by iso year+week.
  for (let i = 11; i >= 0; i--) {
    const d = new Date(nowMs - i * 7 * dayMs);
    weeklyWonMap.set(toIsoWeekKey(d), 0);
  }
  // Won leads use converted_at where set, else updated_at as best-
  // available signal. Same trade-off as the row-level rollup.
  for (const l of leads) {
    if (l.stage !== "won") continue;
    const wonAt = l.converted_at || l.updated_at;
    if (!wonAt) continue;
    const key = toIsoWeekKey(new Date(wonAt));
    if (weeklyWonMap.has(key)) {
      weeklyWonMap.set(key, weeklyWonMap.get(key) + 1);
    }
  }

  const dailyNew30d = Array.from(dailyNewMap.entries()).map(
    ([date, count]) => ({ date, count }),
  );
  const weeklyWon12w = Array.from(weeklyWonMap.entries()).map(
    ([week, count]) => ({ week, count }),
  );

  return NextResponse.json({
    generated_at: now.toISOString(),
    totals: {
      total: leads.length,
      active_pipeline: activePipeline,
      conversion_rate: conversionRate,
      pipeline_value_cents: pipelineValueCents,
      won_all_time: won,
    },
    by_stage: LEAD_STAGES.map((s) => ({
      stage: s,
      count: byStage[s].count,
      value_cents: byStage[s].value_cents,
    })),
    by_type: Object.entries(byType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count),
    by_source: bySource,
    this_week: thisWeek,
    prev_week: prevWeek,
    this_month: thisMonth,
    owner_leaderboard: ownerLeaderboard,
    aging: {
      untouched_new: untouchedNew,
      stuck_contacted: stuckContacted,
      overdue_next_action: overdueNextAction,
    },
    series: {
      daily_new_30d: dailyNew30d,
      weekly_won_12w: weeklyWon12w,
    },
  });
}

/* ─── helpers ─────────────────────────────────────────────────── */

function emptyWindowRollup() {
  return {
    new: 0,
    contacted: 0, // reserved for future stage-in-window rollup
    engaged: 0,   // (kept in the shape so the client contract is stable)
    won: 0,
    sends: 0,
    replies: 0,
    stage_advances: 0,
  };
}

function getOwnerStats(map, id) {
  if (!id) id = "__unassigned__";
  let s = map.get(id);
  if (!s) {
    s = {
      leads_worked: 0,
      sends_this_week: 0,
      replies_this_week: 0,
      conversions_this_week: 0,
      total_conversions: 0,
    };
    map.set(id, s);
  }
  return s;
}

/** yyyy-mm-dd in UTC. */
function toDateKey(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * ISO week key "YYYY-Www". Uses the standard ISO-8601 calendar week
 * so Sunday-vs-Monday-based weeks don't split "this week" oddly.
 */
function toIsoWeekKey(date) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  // Shift to nearest Thursday: current date + 4 - current day number
  // (Sun=0 → 7, Mon=1 → 1). This is the standard ISO trick.
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

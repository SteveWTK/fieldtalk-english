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
import { computeTargetProgress } from "@/lib/leads/targets";

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

// Range picker → window length in days for the "this range" rollup
// and the daily time series. 'all' skips window-based filtering
// (uses 90d as an upper bound so the series doesn't grow unbounded).
const RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: 90,
};

export async function GET(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const rangeKey = url.searchParams.get("range") || "30d";
  const rangeDays = RANGE_DAYS[rangeKey] ?? RANGE_DAYS["30d"];
  // Optional owner filter — restricts every rollup to a single
  // assignee. 'all' / missing = no filter. 'unassigned' = leads with
  // assigned_to IS NULL.
  const ownerFilter = url.searchParams.get("owner") || "";

  const supabase = await getSupabaseAdmin();
  const now = new Date();
  const nowMs = now.getTime();
  const dayMs = 24 * 60 * 60 * 1000;

  const rangeStart = new Date(nowMs - rangeDays * dayMs);
  const prevRangeStart = new Date(nowMs - 2 * rangeDays * dayMs);
  const twelveWeeksAgo = new Date(nowMs - 12 * 7 * dayMs);

  // Fetch everything we need. Three trips, all keyed on small tables.
  // Owner filter is applied here — cheaper than filtering downstream
  // rollups in JS (Postgres does it as a partial-index scan).
  let leadsQuery = supabase
    .from("leads")
    .select(
      `id, stage, lead_type, source, assigned_to, phone_e164,
       estimated_value_cents, do_not_contact,
       created_at, updated_at,
       next_action_at, converted_at,
       assigned:players!leads_assigned_to_fkey (id, full_name)`,
    );
  let activitiesQuery = supabase
    .from("lead_activities")
    .select("lead_id, activity_type, actor_id, payload, created_at")
    .gte("created_at", twelveWeeksAgo.toISOString());

  if (ownerFilter === "unassigned") {
    leadsQuery = leadsQuery.is("assigned_to", null);
    activitiesQuery = activitiesQuery.is("actor_id", null);
  } else if (ownerFilter && ownerFilter !== "all") {
    leadsQuery = leadsQuery.eq("assigned_to", ownerFilter);
    activitiesQuery = activitiesQuery.eq("actor_id", ownerFilter);
  }

  const [leadsRes, activitiesRes, ownersRes, targetsRes] = await Promise.all([
    leadsQuery,
    activitiesQuery,
    supabase
      .from("players")
      .select("id, full_name")
      .eq("user_type", "platform_admin"),
    supabase
      .from("metrics_targets")
      .select(
        `*, owner:players!metrics_targets_owner_id_fkey (id, full_name)`,
      )
      .eq("active", true)
      .order("target_date", { ascending: true }),
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

  // Cycle time — days from created_at → won for every won lead.
  // Reported as an average, but we keep the samples so we can add
  // a median / distribution later without another pass.
  const cycleDaysSamples = [];

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
    if (l.stage === "won") {
      won++;
      // Cycle = converted_at (preferred) or updated_at (fallback) −
      // created_at. Both stored as ISO; convert to days.
      const wonAt = l.converted_at || l.updated_at;
      if (wonAt && l.created_at) {
        const days =
          (new Date(wonAt).getTime() - new Date(l.created_at).getTime()) /
          dayMs;
        if (Number.isFinite(days) && days >= 0) cycleDaysSamples.push(days);
      }
    }

    byType[l.lead_type] = (byType[l.lead_type] || 0) + 1;
    bySourceTotals[l.source] = (bySourceTotals[l.source] || 0) + 1;
  }

  const conversionRate =
    terminalWorked > 0 ? won / terminalWorked : 0;
  const avgCycleDays =
    cycleDaysSamples.length > 0
      ? cycleDaysSamples.reduce((s, d) => s + d, 0) / cycleDaysSamples.length
      : null;

  // ── Range rollups ─────────────────────────────────────────────
  // `this_range` = last N days, `prev_range` = the N days before that.
  // N comes from the ?range query param (7d / 30d / 90d / all).
  const thisRange = emptyWindowRollup();
  const prevRange = emptyWindowRollup();

  for (const l of leads) {
    const createdMs = new Date(l.created_at).getTime();
    if (createdMs >= rangeStart.getTime()) thisRange.new++;
    if (
      createdMs >= prevRangeStart.getTime() &&
      createdMs < rangeStart.getTime()
    )
      prevRange.new++;

    // Won-in-range uses converted_at (preferred) or updated_at.
    if (l.stage === "won") {
      const wonAt = l.converted_at || l.updated_at;
      const wonMs = wonAt ? new Date(wonAt).getTime() : null;
      if (wonMs != null) {
        if (wonMs >= rangeStart.getTime()) thisRange.won++;
        if (
          wonMs >= prevRangeStart.getTime() &&
          wonMs < rangeStart.getTime()
        )
          prevRange.won++;
      }
    }
  }

  // Activity-based rollups (sends, replies, stage advances). These
  // are the authoritative counts for the "This range" strip.
  const ownerStats = new Map();
  const sourceConversions = {};
  const dailyNewMap = new Map(); // "yyyy-mm-dd" → count
  const weeklyWonMap = new Map(); // "yyyy-Wnn" → count

  for (const a of activities) {
    const createdMs = new Date(a.created_at).getTime();
    const inThisRange = createdMs >= rangeStart.getTime();
    const inPrevRange =
      createdMs >= prevRangeStart.getTime() &&
      createdMs < rangeStart.getTime();

    // Per-owner rollup — attributes the activity to the actor.
    const stats = getOwnerStats(ownerStats, a.actor_id);

    if (a.activity_type === "whatsapp_outbound") {
      if (inThisRange) thisRange.sends++;
      if (inPrevRange) prevRange.sends++;
      if (inThisRange) stats.sends_this_range++;
    } else if (a.activity_type === "whatsapp_inbound") {
      if (inThisRange) thisRange.replies++;
      if (inPrevRange) prevRange.replies++;
      if (inThisRange) stats.replies_this_range++;
    } else if (a.activity_type === "stage_change") {
      const toStage = a.payload?.to;
      const fromStage = a.payload?.from;
      if (fromStage !== toStage) {
        if (inThisRange) thisRange.stage_advances++;
        if (inPrevRange) prevRange.stage_advances++;
      }
      // Refined conversions-in-range using the actual transition
      // timestamp — more accurate than the row-level heuristic above
      // when the activity trail is complete.
      if (toStage === "won" && inThisRange) {
        stats.conversions_this_range++;
      }
    } else if (a.activity_type === "converted") {
      if (inThisRange) stats.conversions_this_range++;
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
      sends_this_range: s.sends_this_range,
      replies_this_range: s.replies_this_range,
      conversions_this_range: s.conversions_this_range,
      total_conversions: s.total_conversions,
    }))
    .sort(
      (a, b) =>
        b.conversions_this_range - a.conversions_this_range ||
        b.sends_this_range - a.sends_this_range ||
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
  // Daily new leads, sized to the picker range (min 30 buckets so
  // the bar chart stays readable at the 7d setting; the 7d view
  // just renders a shorter run in the same layout). Buckets keyed
  // by yyyy-mm-dd in UTC so a value doesn't drift when a viewer's
  // local timezone crosses midnight.
  const dailyBucketCount = Math.max(rangeDays, 30);
  for (let i = dailyBucketCount - 1; i >= 0; i--) {
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

  // ── Targets progress ──────────────────────────────────────────
  // Compute per-target progress against the (owner-filtered) lead set
  // so per-owner targets automatically show that owner's number when
  // the dashboard is filtered to them. Team-level targets ignore the
  // owner filter.
  const targets = (targetsRes.data || []).map((t) => {
    // If dashboard owner filter is set, only the leads currently in
    // scope will contribute — that matches the intent of "how am I
    // doing against my target". Team targets (owner_id null) still
    // compute against whatever leads passed the query.
    const progress = computeTargetProgress(t, {
      leads,
      activities,
      now,
    });
    return { ...t, progress };
  });

  const dailyNew30d = Array.from(dailyNewMap.entries()).map(
    ([date, count]) => ({ date, count }),
  );
  const weeklyWon12w = Array.from(weeklyWonMap.entries()).map(
    ([week, count]) => ({ week, count }),
  );

  return NextResponse.json({
    generated_at: now.toISOString(),
    range: rangeKey,
    range_days: rangeDays,
    owner_filter: ownerFilter || null,
    totals: {
      total: leads.length,
      active_pipeline: activePipeline,
      conversion_rate: conversionRate,
      pipeline_value_cents: pipelineValueCents,
      won_all_time: won,
      avg_cycle_days: avgCycleDays,
      cycle_samples: cycleDaysSamples.length,
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
    this_range: thisRange,
    prev_range: prevRange,
    owner_leaderboard: ownerLeaderboard,
    aging: {
      untouched_new: untouchedNew,
      stuck_contacted: stuckContacted,
      overdue_next_action: overdueNextAction,
    },
    targets,
    series: {
      daily_new: dailyNew30d,
      weekly_won_12w: weeklyWon12w,
    },
  });
}

/* ─── helpers ─────────────────────────────────────────────────── */

function emptyWindowRollup() {
  return {
    new: 0,
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
      sends_this_range: 0,
      replies_this_range: 0,
      conversions_this_range: 0,
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

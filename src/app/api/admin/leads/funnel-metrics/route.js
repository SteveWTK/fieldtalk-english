// src/app/api/admin/leads/funnel-metrics/route.js
//
// GET /api/admin/leads/funnel-metrics?range=7d|30d|90d
//
// Aggregations for the WhatsApp funnel dashboard shown at the top of
// /admin/leads/outreach. Everything a salesperson needs to answer
// "how's the funnel doing this month?" in one round-trip.
//
// Response shape:
//   {
//     range: '30d',
//     from: '2026-08-25T00:00:00.000Z',
//     to:   '2026-09-25T00:00:00.000Z',
//     totals: {
//       outreaches: 42,
//       oi_received: 30,       // reached at least q1_sent
//       q1_answered: 28,       // reached at least q2_sent
//       q2_answered: 25,       // reached at least cta_sent
//       cta_sent: 25,          // same rows — kept for readability
//       converted: 10,
//       escalated: 3,
//       cold: 5,
//     },
//     daily: [                 // last N days, oldest first
//       { date: '2026-09-25', launched: 5, converted: 1 },
//       ...
//     ],
//     by_role: {
//       agent:            { launched: 20, converted: 5 },
//       coach:            { launched: 10, converted: 3 },
//       ...
//     },
//   }
//
// A "count" at a stage is *cumulative*: any lead that reached the stage
// counts, even if they've since advanced. So the funnel reads top to
// bottom as a monotonic decline — the natural mental model.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

const RANGE_DAYS = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

// Stage → set of stages that "count" as having reached this milestone.
// Every stage past q1_sent counts as "Oi received", every stage past
// q2_sent counts as "Q1 answered", etc.
const REACHED_OI = new Set([
  "q1_sent",
  "q2_sent",
  "cta_sent",
  "converted",
  "escalated",
  "cold",
]);
const REACHED_Q1_ANSWERED = new Set([
  "q2_sent",
  "cta_sent",
  "converted",
  "escalated",
  "cold",
]);
const REACHED_Q2_ANSWERED = new Set([
  "cta_sent",
  "converted",
]);
const REACHED_CTA = new Set(["cta_sent", "converted"]);

export async function GET(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const rangeParam = url.searchParams.get("range") || "30d";
  const days = RANGE_DAYS[rangeParam] || 30;

  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);

  const supabase = await getSupabaseAdmin();

  // Single fetch — every lead the funnel touched in the window. Small
  // per-row payload keeps this snappy up to a few thousand rows.
  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id, created_at, funnel_stage, funnel_role, funnel_q1_is_correct, funnel_q2_is_correct, converted_at",
    )
    .not("funnel_stage", "is", null)
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .limit(5000);

  if (error) {
    console.error("[funnel-metrics] fetch failed:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const list = leads || [];

  const totals = {
    outreaches: list.length,
    oi_received: 0,
    q1_answered: 0,
    q2_answered: 0,
    cta_sent: 0,
    converted: 0,
    escalated: 0,
    cold: 0,
  };

  const byRoleMap = new Map();
  const dailyMap = new Map(); // yyyy-mm-dd → { launched, converted }

  // Seed daily bins so every day in the range renders, even zeros.
  for (let i = 0; i < days; i++) {
    const d = new Date(from.getTime() + i * 24 * 60 * 60 * 1000);
    dailyMap.set(dayKey(d), { launched: 0, converted: 0 });
  }

  for (const lead of list) {
    const stage = lead.funnel_stage;

    if (REACHED_OI.has(stage)) totals.oi_received++;
    if (REACHED_Q1_ANSWERED.has(stage)) totals.q1_answered++;
    if (REACHED_Q2_ANSWERED.has(stage)) totals.q2_answered++;
    if (REACHED_CTA.has(stage)) totals.cta_sent++;
    if (stage === "converted") totals.converted++;
    if (stage === "escalated") totals.escalated++;
    if (stage === "cold") totals.cold++;

    // Per-role rollup.
    const role = lead.funnel_role || "other";
    const roleBucket = byRoleMap.get(role) || { launched: 0, converted: 0 };
    roleBucket.launched++;
    if (stage === "converted") roleBucket.converted++;
    byRoleMap.set(role, roleBucket);

    // Per-day rollup — launched on created_at day.
    const launchKey = dayKey(new Date(lead.created_at));
    const launchBucket = dailyMap.get(launchKey);
    if (launchBucket) launchBucket.launched++;

    // Converted on converted_at day (if present + in range).
    if (lead.converted_at) {
      const convKey = dayKey(new Date(lead.converted_at));
      const convBucket = dailyMap.get(convKey);
      if (convBucket) convBucket.converted++;
    }
  }

  const daily = Array.from(dailyMap.entries()).map(([date, counts]) => ({
    date,
    launched: counts.launched,
    converted: counts.converted,
  }));

  const by_role = Object.fromEntries(byRoleMap.entries());

  return NextResponse.json({
    range: rangeParam,
    from: from.toISOString(),
    to: to.toISOString(),
    totals,
    daily,
    by_role,
  });
}

function dayKey(d) {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

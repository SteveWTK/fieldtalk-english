// src/app/api/cron/match-starting/route.js
//
// Frequent Vercel cron — sends "predictions closing soon" pushes ~1
// hour before kickoff. Scans TWO sources in one pass:
//
//   1. Lesson group-finish predictions (the `predictions` table)
//      — deadline-driven via `predictions.deadline_at`.
//   2. Match Predictions Centre (the `matches` table)
//      — kickoff-driven via `matches.kickoff_at`.
//
// Both produce a `match_starting` push to subscribed players who
// haven't completed their picks yet. Dedup is per (player, ref_id)
// with ref_id = step_id OR match_id respectively — those UUIDs
// live in different namespaces, so they never collide.
//
// Schedule: every 30 min — see vercel.json. The 45–75 min window
// is wider than the schedule on purpose: a missed run never drops
// notifications, the next run catches them.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { sendToPlayer, wasRecentlyNotified } from "@/lib/push/send";

const WINDOW_START_MIN = 45;
const WINDOW_END_MIN = 75;
const DEDUP_WINDOW_HOURS = 4; // per (player, step) — short, since
// the step deadline passes within the hour anyway.
const SEND_CONCURRENCY = 10;

async function runInBatches(items, concurrency, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const settled = await Promise.allSettled(slice.map(fn));
    for (const r of settled) {
      results.push(r.status === "fulfilled" ? r.value : { error: r.reason });
    }
  }
  return results;
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getSupabaseAdmin();

    const now = Date.now();
    const windowStart = new Date(now + WINDOW_START_MIN * 60 * 1000).toISOString();
    const windowEnd = new Date(now + WINDOW_END_MIN * 60 * 1000).toISOString();

    // ── 1. Find prediction steps closing in the window ──
    // `predictions` is one row per (player, step). To dedupe to one
    // step per row, we group in JS. We also pull `data` so we can
    // extract the human title for the notification copy.
    const { data: closingRows, error: closingError } = await supabase
      .from("predictions")
      .select("step_id, deadline_at, data, resolved")
      .gte("deadline_at", windowStart)
      .lte("deadline_at", windowEnd)
      .eq("resolved", false);
    if (closingError) {
      console.error("[cron/match-starting] closingRows error:", closingError);
      return NextResponse.json(
        { error: "Failed to load upcoming deadlines" },
        { status: 500 }
      );
    }
    if (!closingRows || closingRows.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No prediction steps closing in window.",
        steps: 0,
        sent: 0,
      });
    }

    // Group into one entry per step_id with the title pulled from
    // the first row we see.
    const stepsById = new Map();
    for (const row of closingRows) {
      if (!stepsById.has(row.step_id)) {
        stepsById.set(row.step_id, {
          stepId: row.step_id,
          predictionTitle: row.data?.title || "",
        });
      }
    }
    const closingSteps = Array.from(stepsById.values());

    // ── 2. For each step, work out which subscribed players still
    //      need to predict. A player "still needs to predict" if
    //      they have a push subscription AND no row in `predictions`
    //      for this step_id. ──
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("player_id");
    if (subsError) {
      console.error("[cron/match-starting] subs query failed:", subsError);
      return NextResponse.json(
        { error: "Failed to load subscriptions" },
        { status: 500 }
      );
    }
    const subscribedIds = Array.from(
      new Set((subs || []).map((s) => s.player_id).filter(Boolean))
    );
    if (subscribedIds.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No subscribed players — nothing to do.",
        steps: closingSteps.length,
        sent: 0,
      });
    }

    let totalSent = 0;
    let totalSkipped = 0;
    const perStep = [];

    for (const step of closingSteps) {
      // Who has already submitted for this step?
      const { data: submittedRows, error: submittedError } = await supabase
        .from("predictions")
        .select("player_id")
        .eq("step_id", step.stepId);
      if (submittedError) {
        console.error(
          `[cron/match-starting] submitted query failed for ${step.stepId}:`,
          submittedError
        );
        perStep.push({ stepId: step.stepId, error: submittedError.message });
        continue;
      }
      const submittedIds = new Set(
        (submittedRows || []).map((r) => r.player_id)
      );

      // Eligible = subscribed AND not submitted.
      const eligible = subscribedIds.filter((id) => !submittedIds.has(id));
      if (eligible.length === 0) {
        perStep.push({ stepId: step.stepId, eligible: 0, sent: 0 });
        continue;
      }

      const sendResults = await runInBatches(
        eligible,
        SEND_CONCURRENCY,
        async (playerId) => {
          const dup = await wasRecentlyNotified(
            playerId,
            "match_starting",
            DEDUP_WINDOW_HOURS,
            step.stepId
          );
          if (dup) {
            return { playerId, skipped: true };
          }
          const result = await sendToPlayer({
            playerId,
            kind: "match_starting",
            refId: step.stepId,
            vars: {
              predictionTitle: step.predictionTitle,
              stepId: step.stepId,
            },
          });
          return { playerId, ...result };
        }
      );

      const sent = sendResults.reduce((acc, r) => acc + (r?.sent || 0), 0);
      const skipped = sendResults.filter((r) => r?.skipped).length;
      totalSent += sent;
      totalSkipped += skipped;
      perStep.push({
        stepId: step.stepId,
        title: step.predictionTitle,
        eligible: eligible.length,
        sent,
        skipped,
      });
    }

    // ── Second source: match Predictions Centre ──
    // Same notification kind, different table. Scan matches whose
    // kickoff is in the closing window and ping subscribed players
    // who haven't completed all three picks for them.
    const matchWindowStart = new Date(now + WINDOW_START_MIN * 60 * 1000).toISOString();
    const matchWindowEnd = new Date(now + WINDOW_END_MIN * 60 * 1000).toISOString();
    const { data: closingMatches, error: closingMatchesError } = await supabase
      .from("matches")
      .select("id, home_team, away_team, kickoff_at")
      .gte("kickoff_at", matchWindowStart)
      .lte("kickoff_at", matchWindowEnd)
      .is("resolved_at", null);

    let matchSent = 0;
    let matchSkipped = 0;
    const perMatch = [];

    if (closingMatchesError) {
      console.error("[cron/match-starting] closingMatches error:", closingMatchesError);
    } else if (closingMatches && closingMatches.length > 0) {
      for (const match of closingMatches) {
        // Players who've made at least one pick for this match.
        const { data: pickRows } = await supabase
          .from("match_predictions")
          .select("player_id, prediction_type")
          .eq("match_id", match.id);
        // Count picks per player; treat 3+ as "complete" (winner,
        // exact_score, first_scorer_team).
        const picksByPlayer = new Map();
        for (const row of pickRows || []) {
          picksByPlayer.set(
            row.player_id,
            (picksByPlayer.get(row.player_id) || 0) + 1
          );
        }
        // Eligible = subscribed AND not yet complete.
        const eligible = subscribedIds.filter(
          (id) => (picksByPlayer.get(id) || 0) < 3
        );
        if (eligible.length === 0) {
          perMatch.push({
            matchId: match.id,
            match: `${match.home_team} vs ${match.away_team}`,
            eligible: 0,
            sent: 0,
          });
          continue;
        }
        const results = await runInBatches(
          eligible,
          SEND_CONCURRENCY,
          async (playerId) => {
            const dup = await wasRecentlyNotified(
              playerId,
              "match_starting",
              DEDUP_WINDOW_HOURS,
              match.id
            );
            if (dup) return { playerId, skipped: true };
            const result = await sendToPlayer({
              playerId,
              kind: "match_starting",
              refId: match.id,
              vars: {
                predictionTitle: `${match.home_team} x ${match.away_team}`,
                stepId: match.id,
                url: "/predictions",
              },
            });
            return { playerId, ...result };
          }
        );
        const sent = results.reduce((a, r) => a + (r?.sent || 0), 0);
        const skipped = results.filter((r) => r?.skipped).length;
        matchSent += sent;
        matchSkipped += skipped;
        perMatch.push({
          matchId: match.id,
          match: `${match.home_team} vs ${match.away_team}`,
          eligible: eligible.length,
          sent,
          skipped,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      lessonSteps: {
        scanned: closingSteps.length,
        sent: totalSent,
        skipped: totalSkipped,
        perStep,
      },
      matchPredictions: {
        scanned: closingMatches?.length || 0,
        sent: matchSent,
        skipped: matchSkipped,
        perMatch,
      },
    });
  } catch (err) {
    console.error("[cron/match-starting] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

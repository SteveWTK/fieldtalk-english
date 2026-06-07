// src/app/api/cron/predictions-open/route.js
//
// Hourly Vercel cron — pings subscribed players 24h before kickoff
// so they know predictions for a match just opened up in the Centre.
//
// Window: matches with kickoff in [now+23h, now+25h]. A 2-hour band
// gives the hourly schedule slack — a missed run doesn't drop the
// notification, the next one catches it. Dedup per (player, match)
// via notification_log.ref_id prevents double-firing.
//
// The cron only fires once per (player, match) thanks to dedup, so
// it's safe to run hourly with overlapping windows.
//
// Schedule: 0 * * * * (every hour at minute 0). See vercel.json.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { sendToPlayer, wasRecentlyNotified } from "@/lib/push/send";

const WINDOW_START_HOURS = 23;
const WINDOW_END_HOURS = 25;
// Wide enough to cover any temp blip but short enough that re-using
// the same dedup row can't accidentally suppress a future kickoff
// for the same teams (matches.id is unique anyway, so per-match
// dedup is already strict).
const DEDUP_WINDOW_HOURS = 48;
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
    const windowStart = new Date(now + WINDOW_START_HOURS * 3600 * 1000).toISOString();
    const windowEnd = new Date(now + WINDOW_END_HOURS * 3600 * 1000).toISOString();

    // ── Matches kicking off in the window ──
    const { data: matches, error: matchError } = await supabase
      .from("matches")
      .select("id, home_team, away_team, kickoff_at, status")
      .gte("kickoff_at", windowStart)
      .lte("kickoff_at", windowEnd)
      .is("resolved_at", null);
    if (matchError) {
      console.error("[cron/predictions-open] matches error:", matchError);
      return NextResponse.json(
        { error: "Could not load matches" },
        { status: 500 }
      );
    }
    if (!matches || matches.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No matches in window.",
        matches: 0,
        sent: 0,
      });
    }

    // ── Subscribed players ──
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("player_id");
    if (subsError) {
      console.error("[cron/predictions-open] subs error:", subsError);
      return NextResponse.json(
        { error: "Could not load subscriptions" },
        { status: 500 }
      );
    }
    const subscribedIds = Array.from(
      new Set((subs || []).map((s) => s.player_id).filter(Boolean))
    );

    let totalSent = 0;
    let totalSkipped = 0;
    const perMatch = [];

    for (const match of matches) {
      const results = await runInBatches(
        subscribedIds,
        SEND_CONCURRENCY,
        async (playerId) => {
          const dup = await wasRecentlyNotified(
            playerId,
            "predictions_open",
            DEDUP_WINDOW_HOURS,
            match.id
          );
          if (dup) return { playerId, skipped: true };
          const result = await sendToPlayer({
            playerId,
            kind: "predictions_open",
            refId: match.id,
            vars: {
              homeTeam: match.home_team,
              awayTeam: match.away_team,
              matchId: match.id,
            },
          });
          return { playerId, ...result };
        }
      );
      const sent = results.reduce((a, r) => a + (r?.sent || 0), 0);
      const skipped = results.filter((r) => r?.skipped).length;
      totalSent += sent;
      totalSkipped += skipped;
      perMatch.push({
        matchId: match.id,
        match: `${match.home_team} vs ${match.away_team}`,
        sent,
        skipped,
      });
    }

    return NextResponse.json({
      ok: true,
      matches: matches.length,
      sent: totalSent,
      skipped: totalSkipped,
      perMatch,
    });
  } catch (err) {
    console.error("[cron/predictions-open] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

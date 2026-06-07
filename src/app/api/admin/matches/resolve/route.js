// src/app/api/admin/matches/resolve/route.js
//
// POST /api/admin/matches/resolve
//
// Admin-only. Two-step flow handled atomically here:
//
//   1. Update the match row with home_score, away_score, and
//      first_scorer_team. We allow updating these on a match
//      whose resolved_at is still null OR whose resolved_at is
//      set but needs correction (rare — covered for safety).
//   2. Call public.resolve_match(match_id) which grades every
//      pick + writes XP events + bumps player_progress + marks
//      the match status='finished'.
//
// Body:
//   {
//     matchId:          "uuid",
//     homeScore:        2,
//     awayScore:        1,
//     firstScorerTeam:  "home" | "away" | "none"   // optional
//   }
//
// After resolution, fires `match_resolved` push notifications to
// every player who earned at least 1 XP on this match. The push
// is best-effort — a failure here doesn't undo the resolution.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { sendToPlayer } from "@/lib/push/send";

export async function POST(request) {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;
    const supabase = guard.supabase;

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
    const homeScore = Number(body.homeScore);
    const awayScore = Number(body.awayScore);
    const firstScorerTeam =
      typeof body.firstScorerTeam === "string" ? body.firstScorerTeam : null;

    if (!matchId) {
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
    }
    if (
      !Number.isFinite(homeScore) ||
      !Number.isFinite(awayScore) ||
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0 ||
      homeScore > 20 ||
      awayScore > 20
    ) {
      return NextResponse.json(
        { error: "homeScore and awayScore must be integers between 0 and 20" },
        { status: 400 }
      );
    }
    if (
      firstScorerTeam !== null &&
      !["home", "away", "none"].includes(firstScorerTeam)
    ) {
      return NextResponse.json(
        {
          error:
            "firstScorerTeam must be one of 'home', 'away', 'none', or omitted",
        },
        { status: 400 }
      );
    }

    // ── 1. Write the result onto the match row ──
    const { data: matchRow, error: matchError } = await supabase
      .from("matches")
      .update({
        home_score: homeScore,
        away_score: awayScore,
        first_scorer_team: firstScorerTeam,
        updated_at: new Date().toISOString(),
      })
      .eq("id", matchId)
      .select("id, home_team, away_team")
      .maybeSingle();
    if (matchError) {
      console.error("[admin/matches/resolve] update error:", matchError);
      return NextResponse.json(
        { error: "Could not save result" },
        { status: 500 }
      );
    }
    if (!matchRow) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    // ── 2. Call the atomic grader ──
    const { data: resolveResult, error: resolveError } = await supabase.rpc(
      "resolve_match",
      { p_match_id: matchId }
    );
    if (resolveError) {
      console.error("[admin/matches/resolve] resolve_match RPC error:", resolveError);
      return NextResponse.json(
        {
          error: "Resolve function failed",
          details: { code: resolveError.code, message: resolveError.message },
        },
        { status: 500 }
      );
    }
    const summary = Array.isArray(resolveResult)
      ? resolveResult[0]
      : resolveResult;

    // ── 3. Notify earners (best-effort) ──
    // Find players whose XP on this match was > 0 and ping them.
    // Sequential per player so we can call sendToPlayer (which fans
    // out per device) without overwhelming the function timeout.
    const { data: earners } = await supabase
      .from("match_predictions")
      .select("player_id, xp_awarded")
      .eq("match_id", matchId)
      .gt("xp_awarded", 0);

    // Sum XP per player so the notification can show the total.
    const xpByPlayer = new Map();
    for (const row of earners || []) {
      xpByPlayer.set(
        row.player_id,
        (xpByPlayer.get(row.player_id) || 0) + (row.xp_awarded || 0)
      );
    }

    const notificationVars = {
      homeTeam: matchRow.home_team,
      awayTeam: matchRow.away_team,
      homeScore,
      awayScore,
    };

    const notifyResults = await Promise.allSettled(
      Array.from(xpByPlayer.entries()).map(([playerId, xpTotal]) =>
        sendToPlayer({
          playerId,
          kind: "match_resolved",
          refId: matchId,
          vars: { ...notificationVars, xpTotal },
        })
      )
    );
    const notified = notifyResults.filter(
      (r) => r.status === "fulfilled" && (r.value?.sent || 0) > 0
    ).length;

    return NextResponse.json({
      ok: true,
      predictionsResolved: summary?.predictions_resolved || 0,
      totalXpAwarded: summary?.total_xp_awarded || 0,
      earners: xpByPlayer.size,
      notified,
    });
  } catch (err) {
    console.error("[admin/matches/resolve] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

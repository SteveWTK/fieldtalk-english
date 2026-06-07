// src/app/api/match-predictions/list/route.js
//
// GET /api/match-predictions/list
//
// Returns the signed-in user's match-prediction state, grouped into
// two buckets the Centre renders as tabs:
//
//   upcoming  — predictions_open_at <= now AND resolved_at IS NULL
//               (kickoff may be past or future; the UI shows a
//               "locked" badge once kickoff has passed)
//   results   — resolved_at IS NOT NULL (most recent first)
//
// Picks for the current user are attached to each match under
// `predictions: { winner, exact_score, first_scorer_team }`. A pick
// the user hasn't made yet is null.
//
// Reads run through the service-role client because the join across
// matches + match_predictions is cleaner that way; we still scope
// strictly to the authenticated user's player_id.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const RESULTS_LIMIT = 50;

export async function GET() {
  try {
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
      }
    );
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getSupabaseAdmin();
    const nowIso = new Date().toISOString();

    // ── Upcoming matches (predictions are open) ──
    // Wide net: any match whose predictions_open_at has passed and
    // which hasn't been resolved. The UI handles the "locked at
    // kickoff" badge based on kickoff_at vs. wall clock — no need to
    // filter that here.
    const { data: upcoming, error: upcomingError } = await supabase
      .from("matches")
      .select(
        "id, edition, stage, home_team, away_team, home_team_code, away_team_code, kickoff_at, predictions_open_at, status, venue"
      )
      .lte("predictions_open_at", nowIso)
      .is("resolved_at", null)
      .order("kickoff_at", { ascending: true });
    if (upcomingError) {
      console.error("[match-predictions/list] upcoming error:", upcomingError);
      return NextResponse.json(
        { error: "Could not load upcoming matches" },
        { status: 500 }
      );
    }

    // ── Resolved matches (most recent first) ──
    const { data: results, error: resultsError } = await supabase
      .from("matches")
      .select(
        "id, edition, stage, home_team, away_team, home_team_code, away_team_code, kickoff_at, status, home_score, away_score, first_scorer_team, resolved_at"
      )
      .not("resolved_at", "is", null)
      .order("resolved_at", { ascending: false })
      .limit(RESULTS_LIMIT);
    if (resultsError) {
      console.error("[match-predictions/list] results error:", resultsError);
      return NextResponse.json(
        { error: "Could not load results" },
        { status: 500 }
      );
    }

    // ── User's picks on every match in either bucket ──
    const allMatchIds = [
      ...(upcoming || []).map((m) => m.id),
      ...(results || []).map((m) => m.id),
    ];
    let picksByMatch = new Map();
    if (allMatchIds.length > 0) {
      const { data: picks, error: picksError } = await supabase
        .from("match_predictions")
        .select(
          "match_id, prediction_type, prediction_data, correct, xp_awarded, resolved_at, updated_at"
        )
        .eq("player_id", user.id)
        .in("match_id", allMatchIds);
      if (picksError) {
        console.error("[match-predictions/list] picks error:", picksError);
        return NextResponse.json(
          { error: "Could not load your picks" },
          { status: 500 }
        );
      }
      for (const p of picks || []) {
        if (!picksByMatch.has(p.match_id)) {
          picksByMatch.set(p.match_id, {
            winner: null,
            exact_score: null,
            first_scorer_team: null,
          });
        }
        picksByMatch.get(p.match_id)[p.prediction_type] = {
          prediction_data: p.prediction_data,
          correct: p.correct,
          xp_awarded: p.xp_awarded,
          resolved_at: p.resolved_at,
          updated_at: p.updated_at,
        };
      }
    }

    const attachPicks = (m) => ({
      ...m,
      predictions: picksByMatch.get(m.id) || {
        winner: null,
        exact_score: null,
        first_scorer_team: null,
      },
    });

    return NextResponse.json({
      ok: true,
      now: nowIso,
      upcoming: (upcoming || []).map(attachPicks),
      results: (results || []).map(attachPicks),
    });
  } catch (err) {
    console.error("[match-predictions/list] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

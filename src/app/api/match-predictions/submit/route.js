// src/app/api/match-predictions/submit/route.js
//
// POST /api/match-predictions/submit
//
// Saves (or updates) a single prediction for the signed-in user on
// a specific match + prediction_type. The endpoint deliberately
// takes one pick at a time — the UI can call it in parallel for
// multiple types if needed, and per-pick auth + validation keeps
// the route logic simple.
//
// Body:
//   {
//     matchId:        "uuid",
//     predictionType: "winner" | "exact_score" | "first_scorer_team",
//     data:           { ... shape depends on type ... }
//   }
//
// Lock: server enforces that now() < matches.kickoff_at. Once
// kickoff has passed, edits return 423 Locked. Resolved matches
// likewise return 409 Conflict.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { PREDICTION_TYPES } from "@/lib/predictions/rewards";

// Per-type shape validators. Defensive: only the documented keys
// pass through to the DB. The JSONB column would happily store any
// blob, but a tight contract here makes the resolver simpler and
// removes a "what shape did the client save?" debugging surface.
function validateData(predictionType, data) {
  if (!data || typeof data !== "object") return null;
  if (predictionType === "winner") {
    const pick = data.winner;
    if (!["home", "away", "draw"].includes(pick)) return null;
    return { winner: pick };
  }
  if (predictionType === "exact_score") {
    const home = Number(data.home);
    const away = Number(data.away);
    if (
      !Number.isFinite(home) ||
      !Number.isFinite(away) ||
      home < 0 ||
      away < 0 ||
      home > 20 ||
      away > 20 ||
      !Number.isInteger(home) ||
      !Number.isInteger(away)
    ) {
      return null;
    }
    return { home, away };
  }
  if (predictionType === "first_scorer_team") {
    const pick = data.team;
    if (!["home", "away", "none"].includes(pick)) return null;
    return { team: pick };
  }
  return null;
}

export async function POST(request) {
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

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const matchId = typeof body.matchId === "string" ? body.matchId.trim() : "";
    const predictionType =
      typeof body.predictionType === "string" ? body.predictionType.trim() : "";
    if (!matchId) {
      return NextResponse.json({ error: "Missing matchId" }, { status: 400 });
    }
    if (!PREDICTION_TYPES.includes(predictionType)) {
      return NextResponse.json(
        { error: `Unsupported predictionType. Use one of: ${PREDICTION_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const cleanData = validateData(predictionType, body.data);
    if (!cleanData) {
      return NextResponse.json(
        { error: "Invalid prediction data for this type" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseAdmin();

    // ── Lock check ──
    // Read the match's kickoff + resolved status, reject if past
    // either gate. The match also needs to exist before we'll
    // accept a pick (server-side defence in case the UI passes a
    // stale id).
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, kickoff_at, predictions_open_at, resolved_at")
      .eq("id", matchId)
      .maybeSingle();
    if (matchError) {
      console.error("[match-predictions/submit] match lookup:", matchError);
      return NextResponse.json(
        { error: "Could not verify match" },
        { status: 500 }
      );
    }
    if (!match) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }
    if (match.resolved_at) {
      return NextResponse.json(
        { error: "Match is already resolved — picks are final." },
        { status: 409 }
      );
    }
    const now = Date.now();
    if (now < new Date(match.predictions_open_at).getTime()) {
      return NextResponse.json(
        {
          error: "Predictions for this match aren't open yet.",
          opens_at: match.predictions_open_at,
        },
        { status: 425 } // Too Early
      );
    }
    if (now >= new Date(match.kickoff_at).getTime()) {
      return NextResponse.json(
        {
          error: "Kickoff has passed — predictions are locked.",
          kickoff_at: match.kickoff_at,
        },
        { status: 423 } // Locked
      );
    }

    // ── Upsert the pick ──
    const { error: upsertError } = await supabase
      .from("match_predictions")
      .upsert(
        {
          player_id: user.id,
          match_id: matchId,
          prediction_type: predictionType,
          prediction_data: cleanData,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "player_id,match_id,prediction_type" }
      );
    if (upsertError) {
      console.error("[match-predictions/submit] upsert:", upsertError);
      return NextResponse.json(
        {
          error: upsertError.message || "Could not save pick",
          details: { code: upsertError.code, hint: upsertError.hint },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[match-predictions/submit] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

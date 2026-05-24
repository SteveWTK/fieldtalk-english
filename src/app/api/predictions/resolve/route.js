// src/app/api/predictions/resolve/route.js
//
// Admin-only endpoint that:
//   1. Saves the canonical answer for a step into prediction_answers.
//   2. Compares every user's prediction for that step against the answer,
//      counts matches, computes a bonus XP amount, and awards it through
//      the standard player_xp_events trail (so the dashboard's pack
//      counter and level math pick the bonus up automatically).
//
// Auth check: caller must be a platform_admin (players.user_type).
//
// Body shape:
//   {
//     step_id:           "step-...",                     // required
//     prediction_type:   "group_finish",                  // optional
//     actual:            { "brazil": "1st", ... },        // required — canonical answer
//     xp_per_correct:    10,                              // optional override
//     xp_perfect_bonus:  20                               // optional override
//   }
//
// Returns { ok, resolved_count, total_xp_awarded }.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function POST(request) {
  try {
    const body = await request.json();
    const stepId = String(body.step_id || "").trim();
    const predictionType = String(body.prediction_type || "group_finish").trim();
    const actual = body.actual;
    const xpPerCorrect = Number.isFinite(Number(body.xp_per_correct))
      ? Math.floor(Number(body.xp_per_correct))
      : 10;
    const xpPerfectBonus = Number.isFinite(Number(body.xp_perfect_bonus))
      ? Math.floor(Number(body.xp_perfect_bonus))
      : 20;

    if (!stepId) {
      return NextResponse.json({ error: "Missing step_id" }, { status: 400 });
    }
    if (!actual || typeof actual !== "object") {
      return NextResponse.json(
        { error: "Missing actual answer" },
        { status: 400 }
      );
    }

    // Auth: must be a platform_admin per players.user_type.
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
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = await getSupabaseAdmin();

    const { data: caller } = await supabase
      .from("players")
      .select("user_type")
      .eq("id", user.id)
      .maybeSingle();
    if (caller?.user_type !== "platform_admin") {
      return NextResponse.json(
        { error: "Platform admin only" },
        { status: 403 }
      );
    }

    // 1. Persist the canonical answer.
    const { error: answerError } = await supabase
      .from("prediction_answers")
      .upsert(
        {
          step_id: stepId,
          prediction_type: predictionType,
          actual,
          xp_per_correct: xpPerCorrect,
          xp_perfect_bonus: xpPerfectBonus,
          resolved_at: new Date().toISOString(),
        },
        { onConflict: "step_id" }
      );
    if (answerError) {
      console.error("[predictions/resolve] answer upsert error:", answerError);
      return NextResponse.json(
        { error: answerError.message || "Could not save answer" },
        { status: 500 }
      );
    }

    // 2. Fetch every (unresolved) prediction for this step.
    const { data: rows, error: rowsError } = await supabase
      .from("predictions")
      .select("id, player_id, data")
      .eq("step_id", stepId)
      .eq("resolved", false);
    if (rowsError) {
      console.error("[predictions/resolve] rows fetch error:", rowsError);
      return NextResponse.json(
        { error: rowsError.message || "Could not fetch predictions" },
        { status: 500 }
      );
    }

    const cardIds = Object.keys(actual);
    const maxCount = cardIds.length;

    let totalXpAwarded = 0;
    let resolvedCount = 0;

    // Per-prediction: count exact placement matches, compute XP, write
    // back resolution + bump player_progress.total_xp via /api/xp/award
    // semantics (inline here since we already have the admin client).
    for (const row of rows || []) {
      const placements = row.data?.placements || {};
      let correct = 0;
      for (const cardId of cardIds) {
        if (placements[cardId] === actual[cardId]) correct += 1;
      }
      let xp = correct * xpPerCorrect;
      if (correct === maxCount && maxCount > 0) xp += xpPerfectBonus;

      // Mark the prediction row resolved.
      await supabase
        .from("predictions")
        .update({
          resolved: true,
          correct_count: correct,
          max_count: maxCount,
          xp_bonus: xp,
          resolved_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      // Award XP if any was earned: insert audit event + bump total.
      if (xp > 0) {
        const { error: eventError } = await supabase
          .from("player_xp_events")
          .insert({
            player_id: row.player_id,
            source: "prediction",
            source_id: stepId,
            amount: xp,
            metadata: { correct, max_count: maxCount, prediction_id: row.id },
          });
        if (eventError) {
          console.error("[predictions/resolve] event insert error:", eventError);
          // Continue — the prediction is still resolved, audit can be backfilled.
        }
        // Bump the running total in the same transaction-ish flow as
        // /api/xp/award uses.
        const { data: existing } = await supabase
          .from("player_progress")
          .select("total_xp")
          .eq("player_id", row.player_id)
          .maybeSingle();
        if (existing) {
          await supabase
            .from("player_progress")
            .update({
              total_xp: (existing.total_xp || 0) + xp,
              updated_at: new Date().toISOString(),
            })
            .eq("player_id", row.player_id);
        } else {
          await supabase
            .from("player_progress")
            .insert({ player_id: row.player_id, total_xp: xp });
        }
        totalXpAwarded += xp;
      }

      resolvedCount += 1;
    }

    return NextResponse.json({
      ok: true,
      resolved_count: resolvedCount,
      total_xp_awarded: totalXpAwarded,
    });
  } catch (err) {
    console.error("[predictions/resolve] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

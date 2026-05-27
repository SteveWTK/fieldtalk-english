// src/app/api/predictions/route.js
//
// POST → Save (or update) the signed-in user's prediction for a given
//        step. If the step has already been resolved, the request is
//        rejected — predictions become read-only once the canonical
//        answer is set.
//
// Body shape:
//   {
//     step_id:        "step-1778...",   // required — id from the lesson JSON
//     prediction_type: "group_finish",  // optional, default group_finish
//     data: {                           // required
//       title:      "Predict the finish — Group A",
//       placements: { "brazil": "1st", "england": "2nd", ... },
//       cards:      [{ id, label, image_url? }, ...],
//       containers: [{ id, label }, ...]
//     }
//   }
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function POST(request) {
  try {
    const body = await request.json();
    const stepId = String(body.step_id || "").trim();
    const predictionType = String(body.prediction_type || "group_finish").trim();
    const data = body.data;

    if (!stepId) {
      return NextResponse.json({ error: "Missing step_id" }, { status: 400 });
    }
    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Missing prediction data" }, {
        status: 400,
      });
    }

    // Auth via session cookie
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

    // ── Defensive pre-check ──
    // predictions.player_id references players(id). If the auth user
    // has no players row (can happen with old test accounts predating
    // ensure-player), the upsert would 500 with a foreign-key violation.
    // Surface a clearer message so the caller knows what to fix.
    const { data: playerRow, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (playerError) {
      console.error("[predictions] player lookup error:", playerError);
      return NextResponse.json(
        {
          error: "Could not verify player record",
          details: {
            code: playerError.code,
            hint: playerError.hint,
            message: playerError.message,
          },
        },
        { status: 500 }
      );
    }
    if (!playerRow) {
      return NextResponse.json(
        {
          error:
            "No players row for this user. Sign out and back in once so /api/auth/ensure-player can create it, then retry.",
        },
        { status: 412 }
      );
    }

    // Block re-submission once a prediction has been resolved.
    const { data: existing } = await supabase
      .from("predictions")
      .select("resolved")
      .eq("player_id", user.id)
      .eq("step_id", stepId)
      .maybeSingle();
    if (existing?.resolved) {
      return NextResponse.json(
        { error: "Prediction already resolved — cannot update." },
        { status: 409 }
      );
    }

    const { error: upsertError } = await supabase.from("predictions").upsert(
      {
        player_id: user.id,
        step_id: stepId,
        prediction_type: predictionType,
        data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "player_id,step_id" }
    );
    if (upsertError) {
      console.error("[predictions] upsert error:", upsertError);
      // Return the full Postgres error shape so the browser console
      // shows code / hint / details — much faster than digging into
      // Vercel logs while iterating.
      return NextResponse.json(
        {
          error: upsertError.message || "Could not save prediction",
          details: {
            code: upsertError.code,
            hint: upsertError.hint,
            details: upsertError.details,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[predictions] unexpected error:", err);
    return NextResponse.json(
      {
        error: "Server error",
        details: { message: err?.message, stack: err?.stack?.split("\n")[0] },
      },
      { status: 500 }
    );
  }
}

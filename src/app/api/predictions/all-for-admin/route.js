// src/app/api/predictions/all-for-admin/route.js
//
// Returns every submitted prediction grouped by step_id, plus whichever
// canonical answer exists for that step. Used by the /admin/predictions
// page to render the resolution UI.
//
// Auth: platform_admin only (players.user_type).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function GET() {
  try {
    // Auth
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

    // Pull every prediction and existing canonical answers.
    const [predRes, answerRes] = await Promise.all([
      supabase
        .from("predictions")
        .select("step_id, data, resolved")
        .order("created_at", { ascending: true }),
      supabase.from("prediction_answers").select("*"),
    ]);

    if (predRes.error) {
      return NextResponse.json(
        { error: predRes.error.message },
        { status: 500 }
      );
    }
    const answerByStep = new Map();
    for (const a of answerRes.data || []) answerByStep.set(a.step_id, a);

    // Group: { step_id → { title, cards, containers, pending, resolved, answer } }
    const grouped = new Map();
    for (const row of predRes.data || []) {
      const key = row.step_id;
      if (!grouped.has(key)) {
        grouped.set(key, {
          step_id: key,
          title: row.data?.title || key,
          cards: row.data?.cards || [],
          containers: row.data?.containers || [],
          pending: 0,
          resolved: 0,
          answer: answerByStep.get(key) || null,
        });
      }
      const slot = grouped.get(key);
      if (row.resolved) slot.resolved += 1;
      else slot.pending += 1;
      // Keep the richest cards/containers list we've seen (some old rows
      // might have shorter metadata if the lesson was edited mid-flight).
      if ((row.data?.cards || []).length > slot.cards.length) {
        slot.cards = row.data.cards;
      }
      if ((row.data?.containers || []).length > slot.containers.length) {
        slot.containers = row.data.containers;
      }
    }

    return NextResponse.json({ steps: [...grouped.values()] });
  } catch (err) {
    console.error("[predictions/all-for-admin] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

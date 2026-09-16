// src/app/api/levels/route.js
//
// GET /api/levels
//
// Returns all active levels ordered by sort_order. Public — used
// by the /lesson page's Level banner + 4-Unit row layout, and by
// the admin at /admin/levels for the level-editor list.
//
// The response shape is minimal — just the fields the UI needs.
// `is_specialised` ships too so future parallel-pathway UIs can
// distinguish sequential levels from optional side-tracks without
// a schema change.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function GET() {
  try {
    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from("levels")
      .select(
        "id, sort_order, name, display_name_pt, display_name_en, description_pt, description_en, cefr_target, signal_tone, icon_name, is_active, is_specialised",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true });

    if (error) {
      console.error("[levels] fetch failed:", error);
      return NextResponse.json({ error: "levels_failed" }, { status: 500 });
    }
    return NextResponse.json({ levels: data || [] });
  } catch (err) {
    console.error("[levels] unexpected error:", err);
    return NextResponse.json({ error: "unexpected" }, { status: 500 });
  }
}

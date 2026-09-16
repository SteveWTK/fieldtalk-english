// src/app/api/admin/levels/route.js
//
// Admin CRUD for the Levels layer.
//
//   GET  /api/admin/levels
//     Returns EVERY level (including inactive) + a pillar count per
//     level so the admin UI can show "N units assigned" per row.
//
//   POST /api/admin/levels
//     Creates a new level. Body: name + display fields + optional
//     tone/icon. sort_order defaults to (max + 1).
//
// Access: platform_admin only (assertAdmin).

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

export async function GET() {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = await getSupabaseAdmin();
  const [levelsRes, pillarsRes] = await Promise.all([
    supabase
      .from("levels")
      .select(
        "id, sort_order, name, display_name_pt, display_name_en, description_pt, description_en, cefr_target, signal_tone, icon_name, is_active, is_specialised, created_at, updated_at",
      )
      .order("sort_order", { ascending: true }),
    supabase.from("pillars").select("id, level_id"),
  ]);

  if (levelsRes.error) {
    console.error("[admin/levels] fetch failed:", levelsRes.error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  // Roll up "how many pillars are assigned to each level?" so the
  // admin sees the count without an N+1 request pattern.
  const pillarsByLevel = new Map();
  for (const p of pillarsRes.data || []) {
    if (p.level_id == null) continue;
    pillarsByLevel.set(p.level_id, (pillarsByLevel.get(p.level_id) || 0) + 1);
  }

  const levels = (levelsRes.data || []).map((l) => ({
    ...l,
    pillar_count: pillarsByLevel.get(l.id) || 0,
  }));
  return NextResponse.json({ levels });
}

export async function POST(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const body = await request.json().catch(() => ({}));
  const name = (body.name || "").trim();
  const display_name_pt = (body.display_name_pt || "").trim();
  const display_name_en = (body.display_name_en || "").trim();

  if (!name || !display_name_pt || !display_name_en) {
    return NextResponse.json(
      { error: "missing_required", details: ["name", "display_name_pt", "display_name_en"] },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseAdmin();
  // Compute next sort_order — max + 1, or 1 if empty table.
  const { data: existing } = await supabase
    .from("levels")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1);
  const nextSort = existing && existing[0] ? existing[0].sort_order + 1 : 1;

  const { data, error } = await supabase
    .from("levels")
    .insert({
      name,
      display_name_pt,
      display_name_en,
      description_pt: body.description_pt || null,
      description_en: body.description_en || null,
      cefr_target: body.cefr_target || null,
      signal_tone: body.signal_tone || "accent",
      icon_name: body.icon_name || "Trophy",
      is_active: body.is_active !== false,
      is_specialised: !!body.is_specialised,
      sort_order: typeof body.sort_order === "number" ? body.sort_order : nextSort,
    })
    .select()
    .single();

  if (error) {
    console.error("[admin/levels] insert failed:", error);
    return NextResponse.json({ error: "insert_failed", details: error.message }, { status: 500 });
  }
  return NextResponse.json({ level: data });
}

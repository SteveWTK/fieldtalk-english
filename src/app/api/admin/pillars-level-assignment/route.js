// src/app/api/admin/pillars-level-assignment/route.js
//
//   GET  /api/admin/pillars-level-assignment
//     Returns every pillar with its current level_id, name, edition,
//     and sort_order. Powers the "assign pillar → level" table in
//     the admin UI.
//
//   PATCH /api/admin/pillars-level-assignment
//     Bulk-updates pillar level_id assignments. Body:
//       { assignments: [{ pillar_id: uuid, level_id: number | null }] }
//     Idempotent — each row is a straight UPDATE by primary key.
//
// Access: platform_admin only.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

export async function GET() {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("pillars")
    .select("id, name, display_name, edition, sort_order, level_id")
    .order("edition", { ascending: true })
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[admin/pillars-level-assignment] fetch failed:", error);
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ pillars: data || [] });
}

export async function PATCH(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const body = await request.json().catch(() => ({}));
  const assignments = Array.isArray(body.assignments) ? body.assignments : [];
  if (assignments.length === 0) {
    return NextResponse.json({ error: "empty_assignments" }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();
  const errors = [];
  const updated = [];
  // Sequential updates keep error attribution simple — the admin
  // caller sees exactly which pillar row failed if any do. Volume
  // here is low (max ~30 pillars across all editions).
  for (const a of assignments) {
    if (!a?.pillar_id) continue;
    const levelId =
      a.level_id === null || a.level_id === "" ? null : Number(a.level_id);
    if (levelId !== null && !Number.isFinite(levelId)) {
      errors.push({ pillar_id: a.pillar_id, error: "invalid_level_id" });
      continue;
    }
    const { data, error } = await supabase
      .from("pillars")
      .update({ level_id: levelId })
      .eq("id", a.pillar_id)
      .select("id, level_id")
      .maybeSingle();
    if (error) {
      errors.push({ pillar_id: a.pillar_id, error: error.message });
      continue;
    }
    if (data) updated.push(data);
  }
  return NextResponse.json({ updated, errors });
}

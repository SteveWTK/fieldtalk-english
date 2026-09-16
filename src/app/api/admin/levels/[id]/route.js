// src/app/api/admin/levels/[id]/route.js
//
//   PATCH  /api/admin/levels/[id] — partial update to a level row.
//   DELETE /api/admin/levels/[id] — hard delete; ON DELETE SET NULL
//                                    unassigns any pillars still
//                                    pointing at it, and ON DELETE
//                                    CASCADE removes any earned
//                                    certificates for that level.
//
// Access: platform_admin only.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

// Fields we allow the admin to update. Any other body keys are
// silently ignored so a copy-paste from GET (which returns
// created_at, pillar_count, etc.) doesn't fail with a schema error.
const EDITABLE = [
  "name",
  "display_name_pt",
  "display_name_en",
  "description_pt",
  "description_en",
  "cefr_target",
  "signal_tone",
  "icon_name",
  "is_active",
  "is_specialised",
  "sort_order",
];

export async function PATCH(request, context) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await context.params;
  const levelId = Number(id);
  if (!Number.isFinite(levelId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const body = await request.json().catch(() => ({}));
  const patch = {};
  for (const key of EDITABLE) {
    if (key in body) patch[key] = body[key];
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "empty_patch" }, { status: 400 });
  }
  patch.updated_at = new Date().toISOString();

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("levels")
    .update(patch)
    .eq("id", levelId)
    .select()
    .single();

  if (error) {
    console.error("[admin/levels PATCH] failed:", error);
    return NextResponse.json({ error: "update_failed", details: error.message }, { status: 500 });
  }
  return NextResponse.json({ level: data });
}

export async function DELETE(_request, context) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await context.params;
  const levelId = Number(id);
  if (!Number.isFinite(levelId)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();
  const { error } = await supabase.from("levels").delete().eq("id", levelId);
  if (error) {
    console.error("[admin/levels DELETE] failed:", error);
    return NextResponse.json({ error: "delete_failed", details: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

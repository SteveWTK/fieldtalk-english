// src/app/api/admin/lead-templates/[id]/route.js
//
// PATCH  /api/admin/lead-templates/[id]  — partial update
// DELETE /api/admin/lead-templates/[id]  — hard delete
//
// For soft-delete, PATCH { active: false } instead of DELETE — keeps
// the row so historical outbound sends stay traceable.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { normalizeTemplate } from "@/lib/leads/templates";

export async function PATCH(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { data: update, errors } = normalizeTemplate(body);
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "validation_failed", details: errors },
      { status: 400 },
    );
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "nothing_to_update" }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();
  const { data: template, error } = await supabase
    .from("lead_message_templates")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[admin/lead-templates/:id] update failed:", error);
    return NextResponse.json(
      { error: "update_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ template });
}

export async function DELETE(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = await getSupabaseAdmin();

  const { error } = await supabase
    .from("lead_message_templates")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[admin/lead-templates/:id] delete failed:", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

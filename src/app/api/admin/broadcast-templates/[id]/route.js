// src/app/api/admin/broadcast-templates/[id]/route.js
//
// GET    /api/admin/broadcast-templates/[id]  — full template
// PATCH  /api/admin/broadcast-templates/[id]  — update template
// DELETE /api/admin/broadcast-templates/[id]  — delete template
//
// PATCH accepts either the full validated shape (via
// validateTemplatePayload) or a partial update — currently we
// support two partial paths cheaply: `{active: bool}` for
// pause/resume, and full body-replacement for edits.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { validateTemplatePayload } from "@/lib/broadcasts/template-validation";

export async function GET(_request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("whatsapp_broadcast_templates")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ template: data });
}

export async function PATCH(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();

  // Fast path: pause/resume toggle. Doesn't require re-validating the
  // whole template body — just flip the boolean.
  if (
    Object.keys(payload).length === 1 &&
    typeof payload.active === "boolean"
  ) {
    const { error } = await supabase
      .from("whatsapp_broadcast_templates")
      .update({ active: payload.active, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      console.error("[admin/broadcast-templates/patch] toggle failed:", error);
      return NextResponse.json({ error: "update_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // Full update path: validate the whole payload same as create.
  const validated = validateTemplatePayload(payload);
  if (validated.error) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const { error } = await supabase
    .from("whatsapp_broadcast_templates")
    .update({
      ...validated.data,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("[admin/broadcast-templates/patch] update failed:", error);
    return NextResponse.json(
      { error: "update_failed", details: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = await getSupabaseAdmin();

  // Broadcasts previously generated from this template have their
  // generated_from_template_id FK set to null via ON DELETE SET NULL
  // — history preserved, template gone.
  const { error } = await supabase
    .from("whatsapp_broadcast_templates")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("[admin/broadcast-templates/delete] failed:", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

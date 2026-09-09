// src/app/api/admin/lead-sequences/[id]/steps/[stepId]/route.js
//
// PATCH  /api/admin/lead-sequences/[id]/steps/[stepId]
// DELETE /api/admin/lead-sequences/[id]/steps/[stepId]

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { normalizeStep } from "@/lib/leads/sequences";

export async function PATCH(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { stepId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { data: update, errors } = normalizeStep(body);
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
  const { data: step, error } = await supabase
    .from("lead_sequence_steps")
    .update(update)
    .eq("id", stepId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "update_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ step });
}

export async function DELETE(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { stepId } = await params;
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase
    .from("lead_sequence_steps")
    .delete()
    .eq("id", stepId);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

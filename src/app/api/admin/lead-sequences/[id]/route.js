// src/app/api/admin/lead-sequences/[id]/route.js
//
// GET    /api/admin/lead-sequences/[id]  — sequence + steps + enrollment counts
// PATCH  /api/admin/lead-sequences/[id]  — partial update
// DELETE /api/admin/lead-sequences/[id]  — hard delete; cascades to steps + enrollments

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { normalizeSequence } from "@/lib/leads/sequences";

export async function GET(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = await getSupabaseAdmin();

  const [seqRes, stepsRes, enrollRes] = await Promise.all([
    supabase
      .from("lead_sequences")
      .select("*")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("lead_sequence_steps")
      .select(
        `*, template:lead_message_templates (id, name, body)`,
      )
      .eq("sequence_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("lead_sequence_enrollments")
      .select(
        `id, status, current_step, next_step_due_at, enrolled_at,
         lead:leads (id, full_name, phone_e164, stage)`,
      )
      .eq("sequence_id", id)
      .order("enrolled_at", { ascending: false })
      .limit(200),
  ]);

  if (seqRes.error) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  if (!seqRes.data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({
    sequence: seqRes.data,
    steps: stepsRes.data || [],
    enrollments: enrollRes.data || [],
  });
}

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

  const { data: update, errors } = normalizeSequence(body);
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
  const { data: sequence, error } = await supabase
    .from("lead_sequences")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  if (error) {
    return NextResponse.json(
      { error: "update_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ sequence });
}

export async function DELETE(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase
    .from("lead_sequences")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

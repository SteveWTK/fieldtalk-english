// src/app/api/admin/leads/[id]/enrollments/route.js
//
// GET  /api/admin/leads/[id]/enrollments
//   List all sequence enrollments (active + completed + stopped) for
//   this lead. Used by the lead detail page to show the sequence
//   status in the header.
//
// POST /api/admin/leads/[id]/enrollments
//   Body: { sequence_id }
//   Enrolls a lead in the given sequence. Idempotent — if an active
//   enrollment already exists, returns 409. Computes next_step_due_at
//   from the first step's timing.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { computeStepDueAt } from "@/lib/leads/sequences";

export async function GET(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lead_sequence_enrollments")
    .select(
      `id, status, current_step, next_step_due_at, enrolled_at, stop_reason,
       sequence:lead_sequences (id, name, active)`,
    )
    .eq("lead_id", id)
    .order("enrolled_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  return NextResponse.json({ enrollments: data || [] });
}

export async function POST(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;
  const { user } = gate;

  const { id: leadId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const sequenceId =
    typeof body?.sequence_id === "string" ? body.sequence_id : "";
  if (!sequenceId) {
    return NextResponse.json({ error: "sequence_id_required" }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();

  const [seqRes, existingRes, stepsRes, leadRes] = await Promise.all([
    supabase
      .from("lead_sequences")
      .select("id, active")
      .eq("id", sequenceId)
      .maybeSingle(),
    supabase
      .from("lead_sequence_enrollments")
      .select("id, status")
      .eq("sequence_id", sequenceId)
      .eq("lead_id", leadId)
      .maybeSingle(),
    supabase
      .from("lead_sequence_steps")
      .select("position, day_offset, time_of_day_brt")
      .eq("sequence_id", sequenceId)
      .order("position", { ascending: true })
      .limit(1),
    supabase
      .from("leads")
      .select("id, do_not_contact, phone_e164")
      .eq("id", leadId)
      .maybeSingle(),
  ]);

  if (!seqRes.data)
    return NextResponse.json({ error: "sequence_not_found" }, { status: 404 });
  if (!seqRes.data.active)
    return NextResponse.json({ error: "sequence_inactive" }, { status: 409 });
  if (!leadRes.data)
    return NextResponse.json({ error: "lead_not_found" }, { status: 404 });
  if (leadRes.data.do_not_contact)
    return NextResponse.json({ error: "lead_dnc" }, { status: 409 });
  if (!leadRes.data.phone_e164)
    return NextResponse.json({ error: "lead_no_phone" }, { status: 409 });

  if (existingRes.data?.status === "active") {
    return NextResponse.json(
      { error: "already_enrolled", enrollment_id: existingRes.data.id },
      { status: 409 },
    );
  }

  const firstStep = stepsRes.data?.[0];
  if (!firstStep) {
    return NextResponse.json({ error: "sequence_has_no_steps" }, { status: 409 });
  }

  const nowIso = new Date().toISOString();
  const nextDueAt = computeStepDueAt(
    nowIso,
    firstStep.day_offset,
    firstStep.time_of_day_brt,
  );

  // If an existing (non-active) enrollment is present, re-use its row
  // by upsert-updating rather than inserting — preserves history.
  let enrollment;
  if (existingRes.data) {
    const { data, error } = await supabase
      .from("lead_sequence_enrollments")
      .update({
        status: "active",
        current_step: 0,
        next_step_due_at: nextDueAt,
        enrolled_at: nowIso,
        enrolled_by: user.id,
        stop_reason: null,
      })
      .eq("id", existingRes.data.id)
      .select("*")
      .single();
    if (error) {
      return NextResponse.json(
        { error: "reactivate_failed", message: error.message },
        { status: 500 },
      );
    }
    enrollment = data;
  } else {
    const { data, error } = await supabase
      .from("lead_sequence_enrollments")
      .insert({
        sequence_id: sequenceId,
        lead_id: leadId,
        current_step: 0,
        next_step_due_at: nextDueAt,
        enrolled_by: user.id,
      })
      .select("*")
      .single();
    if (error) {
      return NextResponse.json(
        { error: "insert_failed", message: error.message },
        { status: 500 },
      );
    }
    enrollment = data;
  }

  // Log an activity row so the timeline shows the enrollment.
  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    activity_type: "assigned", // reused activity_type — no dedicated 'sequence_enrolled' type
    actor_id: user.id,
    payload: {
      kind: "sequence_enrolled",
      sequence_id: sequenceId,
      enrollment_id: enrollment.id,
    },
    summary: `Enrolled in sequence`,
  });

  return NextResponse.json({ enrollment });
}

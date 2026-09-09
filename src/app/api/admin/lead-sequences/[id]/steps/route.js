// src/app/api/admin/lead-sequences/[id]/steps/route.js
//
// POST /api/admin/lead-sequences/[id]/steps  — create a step
//   Body: { position?, day_offset, time_of_day_brt, template_id?, body?, notes? }
//   If position is omitted, appends at the end.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { normalizeStep } from "@/lib/leads/sequences";

export async function POST(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id: sequenceId } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { data: step, errors } = normalizeStep(body, { requireContent: true });
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "validation_failed", details: errors },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseAdmin();

  // Determine position if not supplied — 1-based, after the current max.
  if (step.position == null) {
    const { data: last } = await supabase
      .from("lead_sequence_steps")
      .select("position")
      .eq("sequence_id", sequenceId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();
    step.position = (last?.position || 0) + 1;
  }

  const { data: inserted, error } = await supabase
    .from("lead_sequence_steps")
    .insert({
      sequence_id: sequenceId,
      position: step.position,
      day_offset: step.day_offset ?? 0,
      time_of_day_brt: step.time_of_day_brt ?? 10,
      template_id: step.template_id ?? null,
      body: step.body ?? null,
      notes: step.notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[admin/lead-sequences/steps] insert failed:", error);
    return NextResponse.json(
      { error: "insert_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ step: inserted });
}

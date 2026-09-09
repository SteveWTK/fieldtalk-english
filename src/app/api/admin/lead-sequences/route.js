// src/app/api/admin/lead-sequences/route.js
//
// GET  /api/admin/lead-sequences   — list all sequences with step counts
// POST /api/admin/lead-sequences   — create a new (empty) sequence
//
// Individual step + enrollment endpoints live under [id]/... paths.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { normalizeSequence } from "@/lib/leads/sequences";

export async function GET() {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = await getSupabaseAdmin();

  const [seqRes, stepCountRes, enrollCountRes] = await Promise.all([
    supabase
      .from("lead_sequences")
      .select(
        `*, creator:players!lead_sequences_created_by_fkey (id, full_name)`,
      )
      .order("updated_at", { ascending: false }),
    supabase.from("lead_sequence_steps").select("sequence_id"),
    supabase
      .from("lead_sequence_enrollments")
      .select("sequence_id, status"),
  ]);

  if (seqRes.error) {
    console.error("[admin/lead-sequences] list failed:", seqRes.error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  const stepsBySeq = new Map();
  for (const s of stepCountRes.data || []) {
    stepsBySeq.set(s.sequence_id, (stepsBySeq.get(s.sequence_id) || 0) + 1);
  }
  const activeEnrollBySeq = new Map();
  for (const e of enrollCountRes.data || []) {
    if (e.status !== "active") continue;
    activeEnrollBySeq.set(
      e.sequence_id,
      (activeEnrollBySeq.get(e.sequence_id) || 0) + 1,
    );
  }

  const sequences = (seqRes.data || []).map((s) => ({
    ...s,
    step_count: stepsBySeq.get(s.id) || 0,
    active_enrollments: activeEnrollBySeq.get(s.id) || 0,
  }));

  return NextResponse.json({ sequences });
}

export async function POST(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;
  const { user } = gate;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { data, errors } = normalizeSequence(body, { requireName: true });
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "validation_failed", details: errors },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseAdmin();
  const { data: sequence, error } = await supabase
    .from("lead_sequences")
    .insert({ ...data, created_by: user.id })
    .select("*")
    .single();

  if (error) {
    console.error("[admin/lead-sequences] insert failed:", error);
    return NextResponse.json(
      { error: "insert_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ sequence });
}

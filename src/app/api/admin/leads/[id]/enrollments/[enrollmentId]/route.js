// src/app/api/admin/leads/[id]/enrollments/[enrollmentId]/route.js
//
// DELETE /api/admin/leads/[id]/enrollments/[enrollmentId]
//   Marks the enrollment 'stopped' with reason='unenrolled_by_admin'.
//   Kept as DELETE (not PATCH) for semantic clarity — admin's intent
//   is "get this lead out of the sequence"; we soft-stop rather than
//   destroy the row so the history stays.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

export async function DELETE(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id: leadId, enrollmentId } = await params;
  const supabase = await getSupabaseAdmin();

  const { data, error } = await supabase
    .from("lead_sequence_enrollments")
    .update({
      status: "stopped",
      stop_reason: "unenrolled_by_admin",
      next_step_due_at: null,
    })
    .eq("id", enrollmentId)
    .eq("lead_id", leadId)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: "unenroll_failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}

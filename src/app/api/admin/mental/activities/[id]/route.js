// src/app/api/admin/mental/activities/[id]/route.js
//
// PATCH  /api/admin/mental/activities/[id]
// DELETE /api/admin/mental/activities/[id]

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { buildMentalActivityUpdate } from "@/lib/mental/normalize";

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

  const { data: update, errors } = buildMentalActivityUpdate(body);
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
  const { data: activity, error } = await supabase
    .from("mental_activities")
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
  return NextResponse.json({ activity });
}

export async function DELETE(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase
    .from("mental_activities")
    .delete()
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

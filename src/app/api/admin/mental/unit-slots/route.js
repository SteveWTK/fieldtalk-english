// src/app/api/admin/mental/unit-slots/route.js
//
// GET  /api/admin/mental/unit-slots
//   Returns [{ unit_id, unit_name, mental_activity_id, mental_activity_title }]
//   for every pillar. Used by the admin "unit assignments" tab.
//
// PUT  /api/admin/mental/unit-slots
//   Body: { unit_id, mental_activity_id | null }
//   Upserts a slot assignment. Sending `null` for mental_activity_id
//   deletes the slot (nothing shows on that unit).

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

export async function GET() {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = await getSupabaseAdmin();

  const [pillarsRes, slotsRes] = await Promise.all([
    supabase
      .from("pillars")
      .select("id, name, sort_order, edition")
      .order("sort_order", { ascending: true }),
    supabase.from("unit_mental_slot").select(
      `unit_id, mental_activity_id, assigned_at,
       activity:mental_activities (id, title, activity_type, active)`,
    ),
  ]);

  if (pillarsRes.error) {
    return NextResponse.json({ error: "pillars_failed" }, { status: 500 });
  }

  const slotByUnit = new Map();
  for (const s of slotsRes.data || []) {
    slotByUnit.set(s.unit_id, s);
  }

  const rows = (pillarsRes.data || []).map((p) => ({
    unit_id: p.id,
    unit_name: p.name,
    edition: p.edition,
    sort_order: p.sort_order,
    slot: slotByUnit.get(p.id) || null,
  }));

  return NextResponse.json({ rows });
}

export async function PUT(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;
  const { user } = gate;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const unitId = typeof body?.unit_id === "string" ? body.unit_id : "";
  if (!unitId) {
    return NextResponse.json({ error: "unit_id_required" }, { status: 400 });
  }
  const activityId =
    body?.mental_activity_id == null || body.mental_activity_id === ""
      ? null
      : String(body.mental_activity_id);

  const supabase = await getSupabaseAdmin();

  if (activityId == null) {
    // Delete the slot for this unit.
    const { error } = await supabase
      .from("unit_mental_slot")
      .delete()
      .eq("unit_id", unitId);
    if (error) {
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, cleared: true });
  }

  // Upsert on the primary key (unit_id).
  const { data, error } = await supabase
    .from("unit_mental_slot")
    .upsert(
      {
        unit_id: unitId,
        mental_activity_id: activityId,
        assigned_by: user.id,
        assigned_at: new Date().toISOString(),
      },
      { onConflict: "unit_id" },
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json(
      { error: "upsert_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ slot: data });
}

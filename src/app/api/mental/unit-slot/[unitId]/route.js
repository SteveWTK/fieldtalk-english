// src/app/api/mental/unit-slot/[unitId]/route.js
//
// GET /api/mental/unit-slot/[unitId]
//   Returns the mental_activity assigned to a specific unit's 7th
//   slot — nullable. Called from the lesson page when a unit expands
//   so we render the 7th card only if there's actually content
//   there.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function GET(request, { params }) {
  const { unitId } = await params;
  if (!unitId) {
    return NextResponse.json({ error: "unit_id_required" }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("unit_mental_slot")
    .select(
      `mental_activity_id, activity:mental_activities (*)`,
    )
    .eq("unit_id", unitId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ activity: null }, { status: 200 });
  }
  const activity = data?.activity;
  // Only surface if the activity is active — an admin might have
  // marked an assigned activity inactive without clearing the slot.
  if (!activity || activity.active === false) {
    return NextResponse.json({ activity: null });
  }
  return NextResponse.json({ activity });
}

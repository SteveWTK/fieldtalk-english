// src/app/api/admin/mental/activities/route.js
//
// GET  /api/admin/mental/activities   — list ALL (including inactive)
// POST /api/admin/mental/activities   — create

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { buildMentalActivityUpdate } from "@/lib/mental/normalize";

export async function GET() {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("mental_activities")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
  return NextResponse.json({ activities: data ?? [] });
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

  const { data, errors } = buildMentalActivityUpdate(body, { requireAll: true });
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "validation_failed", details: errors },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseAdmin();
  const { data: activity, error } = await supabase
    .from("mental_activities")
    .insert({ ...data, created_by: user.id })
    .select("*")
    .single();

  if (error) {
    console.error("[admin/mental/activities] insert failed:", error);
    return NextResponse.json(
      { error: "insert_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ activity });
}

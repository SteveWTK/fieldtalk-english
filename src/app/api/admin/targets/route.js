// src/app/api/admin/targets/route.js
//
// GET  /api/admin/targets?active=true — list targets
// POST /api/admin/targets              — create a target

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { normalizeTarget } from "@/lib/leads/targets";

export async function GET(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const activeOnly = url.searchParams.get("active") === "true";

  const supabase = await getSupabaseAdmin();
  let query = supabase
    .from("metrics_targets")
    .select(
      `*, owner:players!metrics_targets_owner_id_fkey (id, full_name)`,
    )
    .order("target_date", { ascending: true });
  if (activeOnly) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "list_failed" }, { status: 500 });
  return NextResponse.json({ targets: data || [] });
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

  const { data, errors } = normalizeTarget(body, { requireAll: true });
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "validation_failed", details: errors },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseAdmin();
  const { data: target, error } = await supabase
    .from("metrics_targets")
    .insert({ ...data, created_by: user.id })
    .select("*")
    .single();

  if (error) {
    console.error("[admin/targets] insert failed:", error);
    return NextResponse.json(
      { error: "insert_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ target });
}

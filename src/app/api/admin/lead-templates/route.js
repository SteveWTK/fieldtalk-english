// src/app/api/admin/lead-templates/route.js
//
// GET  /api/admin/lead-templates?type=X   — list all templates.
//                                            Optional ?type filter
//                                            returns templates for a
//                                            specific lead_type (plus
//                                            templates with lead_type=null
//                                            which apply to any type).
// POST /api/admin/lead-templates          — create a new template.
//                                            Body: { name, body:{pt,en},
//                                            lead_type?, tags? }

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { normalizeTemplate } from "@/lib/leads/templates";

export async function GET(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const typeFilter = url.searchParams.get("type");
  const includeInactive = url.searchParams.get("include_inactive") === "true";

  const supabase = await getSupabaseAdmin();

  let query = supabase
    .from("lead_message_templates")
    .select("*")
    .order("updated_at", { ascending: false });

  if (!includeInactive) query = query.eq("active", true);

  // typeFilter returns templates for this type PLUS templates with
  // no type restriction (lead_type IS NULL). One .or() clause keeps
  // it a single trip.
  if (typeFilter) {
    query = query.or(`lead_type.eq.${typeFilter},lead_type.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/lead-templates] list failed:", error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
  return NextResponse.json({ templates: data ?? [] });
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

  const { data: normalized, errors } = normalizeTemplate(body, {
    requireName: true,
    requireBody: true,
  });
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "validation_failed", details: errors },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseAdmin();
  const { data: template, error } = await supabase
    .from("lead_message_templates")
    .insert({ ...normalized, created_by: user.id })
    .select("*")
    .single();

  if (error) {
    console.error("[admin/lead-templates] insert failed:", error);
    return NextResponse.json(
      { error: "insert_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ template });
}

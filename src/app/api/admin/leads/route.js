// src/app/api/admin/leads/route.js
//
// GET  /api/admin/leads        — list leads for the admin list view.
//                                Supports filters via query string:
//                                  ?stage=new,contacted
//                                  ?type=individual_player
//                                  ?source=qr_campaign
//                                  ?owner=<uuid>
//                                  ?tag=warm
//                                  ?has_phone=true|false
//                                  ?next_action=overdue|today|week
//                                  ?q=<search substring>
//                                All filters are AND'd. Search is
//                                loose: matches full_name, organization_name,
//                                phone, email (case-insensitive prefix).
//
// POST /api/admin/leads        — create a new lead. Fires an
//                                'assigned' activity if assigned_to
//                                is set on create.
//
// Both routes admin-gated via assertAdmin().

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { buildLeadUpdate } from "@/lib/leads/normalize";

const LIST_LIMIT = 500;

export async function GET(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const supabase = await getSupabaseAdmin();

  let query = supabase
    .from("leads")
    .select(
      `
      id, full_name, email, phone_e164,
      lead_type, organization_name, role_at_org,
      stage, source, source_detail,
      assigned_to, tags, summary,
      country, state, city,
      next_action_at, next_action_note, do_not_contact,
      converted_player_id, converted_at,
      created_at, updated_at,
      assigned:players!leads_assigned_to_fkey (id, full_name)
      `,
    )
    .order("updated_at", { ascending: false })
    .limit(LIST_LIMIT);

  // Stage — supports comma-separated multi.
  const stageParam = url.searchParams.get("stage");
  if (stageParam) {
    const stages = stageParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (stages.length > 0) query = query.in("stage", stages);
  }

  const typeParam = url.searchParams.get("type");
  if (typeParam) {
    const types = typeParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (types.length > 0) query = query.in("lead_type", types);
  }

  const sourceParam = url.searchParams.get("source");
  if (sourceParam) {
    const sources = sourceParam
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (sources.length > 0) query = query.in("source", sources);
  }

  const owner = url.searchParams.get("owner");
  if (owner === "unassigned") {
    query = query.is("assigned_to", null);
  } else if (owner) {
    query = query.eq("assigned_to", owner);
  }

  const tag = url.searchParams.get("tag");
  if (tag) {
    // Overlap with a single-element array — matches any lead whose
    // tags array contains this tag.
    query = query.contains("tags", [tag.toLowerCase()]);
  }

  const hasPhone = url.searchParams.get("has_phone");
  if (hasPhone === "true") query = query.not("phone_e164", "is", null);
  if (hasPhone === "false") query = query.is("phone_e164", null);

  const nextAction = url.searchParams.get("next_action");
  if (nextAction) {
    const now = new Date();
    if (nextAction === "overdue") {
      query = query
        .not("next_action_at", "is", null)
        .lt("next_action_at", now.toISOString());
    } else if (nextAction === "today") {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);
      query = query
        .gte("next_action_at", startOfDay.toISOString())
        .lte("next_action_at", endOfDay.toISOString());
    } else if (nextAction === "week") {
      const endOfWeek = new Date(now);
      endOfWeek.setDate(endOfWeek.getDate() + 7);
      query = query
        .gte("next_action_at", now.toISOString())
        .lte("next_action_at", endOfWeek.toISOString());
    }
  }

  // Search — loose OR across the most-searchable text columns.
  const q = url.searchParams.get("q");
  if (q && q.trim()) {
    const term = q.trim().replace(/[%,]/g, "");
    // Postgrest .or takes a comma-separated list of filter clauses;
    // ilike.*term* is a case-insensitive substring match.
    query = query.or(
      `full_name.ilike.%${term}%,organization_name.ilike.%${term}%,phone_e164.ilike.%${term}%,email.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[admin/leads] list failed:", error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  return NextResponse.json({ leads: data ?? [] });
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

  const { update, errors } = buildLeadUpdate(body, { requireName: true });
  if (errors.length > 0) {
    return NextResponse.json(
      { error: "validation_failed", details: errors },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseAdmin();
  const insertPayload = {
    ...update,
    lead_type: update.lead_type || "individual_player",
    stage: update.stage || "new",
    source: update.source || "manual",
    created_by: user.id,
  };

  const { data: lead, error } = await supabase
    .from("leads")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error) {
    console.error("[admin/leads] insert failed:", error);
    return NextResponse.json(
      { error: "insert_failed", message: error.message },
      { status: 500 },
    );
  }

  // Seed the timeline with the initial state so the detail page has
  // something to render even on brand-new leads.
  const seedActivities = [];
  seedActivities.push({
    lead_id: lead.id,
    activity_type: "stage_change",
    actor_id: user.id,
    payload: { from: null, to: lead.stage },
    summary: `Lead created at stage '${lead.stage}'`,
  });
  if (lead.assigned_to) {
    seedActivities.push({
      lead_id: lead.id,
      activity_type: "assigned",
      actor_id: user.id,
      payload: { to: lead.assigned_to },
      summary: null,
    });
  }
  await supabase.from("lead_activities").insert(seedActivities);

  return NextResponse.json({ lead });
}

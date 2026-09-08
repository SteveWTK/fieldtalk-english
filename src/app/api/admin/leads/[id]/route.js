// src/app/api/admin/leads/[id]/route.js
//
// GET    /api/admin/leads/[id]   — full detail: lead row + activities +
//                                   notes + owner join. One trip so
//                                   the detail page can render without
//                                   waterfalls.
// PATCH  /api/admin/leads/[id]   — partial update. Detects stage +
//                                   owner + tag changes and inserts
//                                   corresponding lead_activities rows.
// DELETE /api/admin/leads/[id]   — hard delete. Cascade drops all
//                                   activities + notes.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { buildLeadUpdate } from "@/lib/leads/normalize";

export async function GET(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = await getSupabaseAdmin();

  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      `
      *,
      assigned:players!leads_assigned_to_fkey (id, full_name, avatar_url),
      creator:players!leads_created_by_fkey (id, full_name),
      converted:players!leads_converted_player_id_fkey (id, full_name)
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[admin/leads/:id] load failed:", error);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  if (!lead) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Timeline + notes in parallel — both keyed by lead_id.
  const [{ data: activities }, { data: notes }] = await Promise.all([
    supabase
      .from("lead_activities")
      .select(
        `id, activity_type, payload, summary, created_at,
         actor:players!lead_activities_actor_id_fkey (id, full_name)`,
      )
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("lead_notes")
      .select(
        `id, body, created_at, updated_at,
         author:players!lead_notes_author_id_fkey (id, full_name)`,
      )
      .eq("lead_id", id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  return NextResponse.json({
    lead,
    activities: activities ?? [],
    notes: notes ?? [],
  });
}

export async function PATCH(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;
  const { user } = gate;

  const { id } = await params;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { update, errors } = buildLeadUpdate(body);
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

  // Snapshot before to detect changes for activity logging.
  const { data: before } = await supabase
    .from("leads")
    .select("stage, assigned_to, tags")
    .eq("id", id)
    .maybeSingle();
  if (!before) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: after, error: updateErr } = await supabase
    .from("leads")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();

  if (updateErr) {
    console.error("[admin/leads/:id] update failed:", updateErr);
    return NextResponse.json(
      { error: "update_failed", message: updateErr.message },
      { status: 500 },
    );
  }

  // Best-effort activity logging. Failures here don't roll back the
  // update — the row is the source of truth, activities are audit.
  const activities = [];
  if (update.stage && update.stage !== before.stage) {
    activities.push({
      lead_id: id,
      activity_type: "stage_change",
      actor_id: user.id,
      payload: { from: before.stage, to: update.stage },
      summary: null,
    });
  }
  if (
    "assigned_to" in update &&
    update.assigned_to !== before.assigned_to
  ) {
    activities.push({
      lead_id: id,
      activity_type: "assigned",
      actor_id: user.id,
      payload: { from: before.assigned_to, to: update.assigned_to },
      summary: null,
    });
  }
  if (update.tags && !arraysEqual(update.tags, before.tags || [])) {
    activities.push({
      lead_id: id,
      activity_type: "tag_change",
      actor_id: user.id,
      payload: { from: before.tags || [], to: update.tags },
      summary: null,
    });
  }
  if (activities.length > 0) {
    await supabase.from("lead_activities").insert(activities);
  }

  return NextResponse.json({ lead: after });
}

export async function DELETE(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = await getSupabaseAdmin();

  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) {
    console.error("[admin/leads/:id] delete failed:", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const bs = new Set(b);
  return a.every((v) => bs.has(v));
}

// src/app/api/admin/leads/[id]/activities/route.js
//
// POST /api/admin/leads/[id]/activities
//   body: { type: 'call_logged' | 'email_logged', summary?: string, payload?: object }
//
// Manual activity logging — Paul records "I called them, they were
// interested, follow up next week" or "sent them the proposal by
// email". Doesn't touch the lead row itself; just appends to the
// timeline. Stage moves happen via PATCH /api/admin/leads/[id] with
// { stage } — this route is for record-keeping only.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

const MANUAL_TYPES = new Set(["call_logged", "email_logged"]);
const MAX_SUMMARY = 500;

export async function POST(request, { params }) {
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

  const type = body?.type;
  if (!MANUAL_TYPES.has(type)) {
    return NextResponse.json({ error: "invalid_type" }, { status: 400 });
  }

  const summary =
    typeof body?.summary === "string" && body.summary.trim()
      ? body.summary.trim().slice(0, MAX_SUMMARY)
      : null;

  const payload =
    body?.payload && typeof body.payload === "object" ? body.payload : null;

  const supabase = await getSupabaseAdmin();

  // Ensure lead exists.
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!lead) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: activity, error } = await supabase
    .from("lead_activities")
    .insert({
      lead_id: id,
      activity_type: type,
      actor_id: user.id,
      payload,
      summary,
    })
    .select(
      `id, activity_type, payload, summary, created_at,
       actor:players!lead_activities_actor_id_fkey (id, full_name)`,
    )
    .single();

  if (error) {
    console.error("[admin/leads/activities] insert failed:", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ activity });
}

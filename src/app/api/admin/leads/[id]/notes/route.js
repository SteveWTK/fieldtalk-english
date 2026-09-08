// src/app/api/admin/leads/[id]/notes/route.js
//
// POST /api/admin/leads/[id]/notes
//   body: { body: string }
//
// Adds a note to a lead. Mirrors an activity row so the timeline
// includes it inline; the separate lead_notes row is what the Notes
// tab reads (searchable / editable / deletable independently).

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

const MAX_NOTE_LEN = 5000;

export async function POST(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;
  const { user } = gate;

  const { id } = await params;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const raw = payload?.body;
  if (typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "body_required" }, { status: 400 });
  }
  const bodyText = raw.trim().slice(0, MAX_NOTE_LEN);

  const supabase = await getSupabaseAdmin();

  // Ensure lead exists (returns a clearer 404 than the FK error).
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!lead) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: note, error } = await supabase
    .from("lead_notes")
    .insert({ lead_id: id, body: bodyText, author_id: user.id })
    .select(
      `id, body, created_at, updated_at,
       author:players!lead_notes_author_id_fkey (id, full_name)`,
    )
    .single();

  if (error) {
    console.error("[admin/leads/notes] insert failed:", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  // Mirror into activities so the timeline sees it. Preview the note
  // in the summary (first 140 chars) so the timeline row is readable
  // without expanding.
  await supabase.from("lead_activities").insert({
    lead_id: id,
    activity_type: "note_added",
    actor_id: user.id,
    payload: { note_id: note.id },
    summary: bodyText.slice(0, 140) + (bodyText.length > 140 ? "…" : ""),
  });

  return NextResponse.json({ note });
}

// src/app/api/admin/broadcasts/[id]/send/route.js
//
// POST /api/admin/broadcasts/[id]/send
//
// Transitions a broadcast from 'draft' → 'sending' by fanning out
// recipient rows. Does NOT do the actual sends — the dispatcher cron
// picks up pending recipients at ~7/minute (8s effective stagger).
//
// Fan-out logic:
//   1. Load broadcast, verify status='draft'.
//   2. Query current matching recipients via segments.js.
//   3. Bulk-insert whatsapp_broadcast_recipients rows (one per
//      player). UNIQUE (broadcast_id, player_id) prevents duplicates
//      if the endpoint is somehow called twice.
//   4. Update broadcast: status='sending', recipient_count=N,
//      sent_started_at=now.
//
// The endpoint returns as soon as fan-out is done; actual sends are
// asynchronous via the cron. Client's next detail-page load will show
// increasing sent_count as the dispatcher works through the queue.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { fetchMatchingRecipients } from "@/lib/broadcasts/segments";

export async function POST(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = await getSupabaseAdmin();

  // Load + verify status.
  const { data: broadcast, error: loadErr } = await supabase
    .from("whatsapp_broadcasts")
    .select("id, status, target_filter")
    .eq("id", id)
    .maybeSingle();

  if (loadErr || !broadcast) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (broadcast.status !== "draft") {
    return NextResponse.json(
      { error: `broadcast is in status '${broadcast.status}', not 'draft'` },
      { status: 409 },
    );
  }

  // Fan out.
  const recipients = await fetchMatchingRecipients(
    supabase,
    broadcast.target_filter || {},
  );

  if (recipients.length === 0) {
    // Zero-recipient broadcasts skip straight to 'complete' — no
    // reason to leave a "sending" row that will never move.
    await supabase
      .from("whatsapp_broadcasts")
      .update({
        status: "complete",
        recipient_count: 0,
        sent_started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq("id", id);
    return NextResponse.json({ ok: true, recipient_count: 0 });
  }

  // Bulk insert. onConflict on (broadcast_id, player_id) → silent
  // ignore, so a double-call doesn't dupe rows.
  const rowsToInsert = recipients.map((r) => ({
    broadcast_id: id,
    player_id: r.id,
    phone_e164: r.phone_e164,
    language: r.preferred_language,
    status: "pending",
  }));

  const { error: insertErr } = await supabase
    .from("whatsapp_broadcast_recipients")
    .upsert(rowsToInsert, {
      onConflict: "broadcast_id,player_id",
      ignoreDuplicates: true,
    });

  if (insertErr) {
    console.error("[admin/broadcasts/send] fan-out failed:", insertErr);
    return NextResponse.json(
      { error: "fanout_failed", details: insertErr.message },
      { status: 500 },
    );
  }

  await supabase
    .from("whatsapp_broadcasts")
    .update({
      status: "sending",
      recipient_count: recipients.length,
      sent_started_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", "draft"); // guard against a race

  return NextResponse.json({
    ok: true,
    recipient_count: recipients.length,
  });
}

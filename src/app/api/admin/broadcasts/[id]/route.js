// src/app/api/admin/broadcasts/[id]/route.js
//
// GET    /api/admin/broadcasts/[id]  — full broadcast + first 200 recipients
// PATCH  /api/admin/broadcasts/[id]  — cancel a broadcast (status='cancelled')
//
// PATCH is intentionally narrow: only status transitions are allowed,
// and only to 'cancelled' (from 'draft' or 'sending'). Body content
// cannot be edited after creation to avoid a "sent one thing, remember
// something else" audit hole.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

export async function GET(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  const supabase = await getSupabaseAdmin();

  const { data: broadcast, error } = await supabase
    .from("whatsapp_broadcasts")
    .select(
      "id, name, body, target_filter, status, recipient_count, sent_count, failed_count, skipped_count, created_by, created_at, sent_started_at, completed_at, scheduled_for, interval_seconds, window_start_hour_brt, window_end_hour_brt, send_on_days, generated_from_template_id",
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !broadcast) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: recipients } = await supabase
    .from("whatsapp_broadcast_recipients")
    .select(
      "id, player_id, phone_e164, language, status, provider_message_id, error, skip_reason, sent_at, created_at, scheduled_slot",
    )
    .eq("broadcast_id", id)
    .order("scheduled_slot", { ascending: true })
    .limit(200);

  return NextResponse.json({
    broadcast,
    recipients: recipients ?? [],
  });
}

export async function PATCH(request, { params }) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const { id } = await params;
  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (payload?.status !== "cancelled") {
    return NextResponse.json(
      { error: "only status='cancelled' is supported" },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseAdmin();
  // Only 'draft' or 'sending' can be cancelled — a completed broadcast
  // has already gone out, cancellation has no meaning.
  const { data, error } = await supabase
    .from("whatsapp_broadcasts")
    .update({ status: "cancelled", completed_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["draft", "sending"])
    .select("id, status")
    .maybeSingle();

  if (error) {
    console.error("[admin/broadcasts/patch] failed:", error);
    return NextResponse.json({ error: "cancel_failed" }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json(
      { error: "broadcast not cancellable (already complete or not found)" },
      { status: 409 },
    );
  }

  return NextResponse.json({ ok: true });
}

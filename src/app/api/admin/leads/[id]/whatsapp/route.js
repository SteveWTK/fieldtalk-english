// src/app/api/admin/leads/[id]/whatsapp/route.js
//
// POST /api/admin/leads/[id]/whatsapp
//   body: { message: string }
//
// Direct 1-to-1 WhatsApp send from a lead's detail page. Uses the
// existing Z-API text sender. Respects do_not_contact + requires
// phone_e164. If the lead's stage is 'new' at send time, we auto-
// bump it to 'contacted' — Paul rarely wants to leave a lead as
// 'new' after messaging them.
//
// Logs a whatsapp_outbound activity so the timeline shows the send.
// Also inserts into whatsapp_messages so the message is captured in
// the same conversation log as player-facing messages, keyed by the
// phone number (player_id stays null — leads aren't players).

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { sendWhatsapp } from "@/lib/integrations/zapi";

const MAX_MSG = 3000;

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

  const raw = payload?.message;
  if (typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "message_required" }, { status: 400 });
  }
  const message = raw.trim().slice(0, MAX_MSG);

  const supabase = await getSupabaseAdmin();

  const { data: lead, error: loadErr } = await supabase
    .from("leads")
    .select("id, full_name, phone_e164, do_not_contact, stage")
    .eq("id", id)
    .maybeSingle();

  if (loadErr) {
    console.error("[admin/leads/whatsapp] load failed:", loadErr);
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  if (!lead) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (!lead.phone_e164) {
    return NextResponse.json({ error: "no_phone" }, { status: 400 });
  }
  if (lead.do_not_contact) {
    return NextResponse.json({ error: "do_not_contact" }, { status: 403 });
  }

  let providerMessageId = null;
  try {
    const sendResult = await sendWhatsapp({
      telefone: lead.phone_e164,
      mensagem: message,
    });
    providerMessageId = sendResult.messageId;
  } catch (err) {
    const errMsg = err?.message ?? String(err);
    return NextResponse.json(
      { error: `send_failed: ${errMsg}` },
      { status: 500 },
    );
  }

  // Log the outbound to whatsapp_messages. player_id stays null —
  // this lead hasn't converted yet, but the phone snapshot lets an
  // admin still find the thread in future conversation views.
  await supabase.from("whatsapp_messages").insert({
    player_id: null,
    phone_e164: lead.phone_e164,
    direction: "outbound",
    provider: "zapi",
    provider_message_id: providerMessageId,
    via: "admin_lead",
    body: message,
    metadata: {
      lead_id: id,
      sent_by_admin: user.id,
    },
  });

  // Log the activity for the timeline. Preview the message body in
  // the summary so the timeline is scannable without expansion.
  await supabase.from("lead_activities").insert({
    lead_id: id,
    activity_type: "whatsapp_outbound",
    actor_id: user.id,
    payload: {
      body: message,
      provider_message_id: providerMessageId,
    },
    summary: message.slice(0, 140) + (message.length > 140 ? "…" : ""),
  });

  // Auto-bump 'new' → 'contacted' — first WhatsApp send counts as
  // first contact. Also logs a stage_change activity so the timeline
  // shows why the stage moved.
  if (lead.stage === "new") {
    await supabase
      .from("leads")
      .update({ stage: "contacted" })
      .eq("id", id);
    await supabase.from("lead_activities").insert({
      lead_id: id,
      activity_type: "stage_change",
      actor_id: user.id,
      payload: {
        from: "new",
        to: "contacted",
        reason: "auto_first_whatsapp",
      },
      summary: null,
    });
  }

  return NextResponse.json({
    ok: true,
    provider_message_id: providerMessageId,
  });
}

// src/lib/integrations/zapi-processor.js
//
// Phase 3 processor — logs inbound messages, handles STOP-keyword
// opt-outs, and captures fromMe echoes as manual admin replies.
//
// What this DOES do:
//   - Parse the Z-API payload.
//   - STOP-keyword handler (PARAR / STOP / SAIR / CANCELAR):
//     flip players.whatsapp_opted_in = false. LGPD-mandated.
//   - fromMe=true: log as `atendente_manual` outbound (dedupe against
//     our own outbound sends by messageId — those are already logged
//     by the sender).
//   - Regular inbound: look up player by normalised phone, insert
//     into whatsapp_messages, bump whatsapp_last_inbound_at.
//   - Unmatched inbound (no player with that phone): still log with
//     player_id=null so an admin can review.
//
// What this DOESN'T do yet (Phase 4):
//   - Fire the AI coach agent. The processor returns without an
//     auto-reply. That is the ONE thing this file will grow when
//     Phase 4 lands.
//
// Returns { ok: true, note?: string } or { ok: false, error: string }.
// The webhook route uses the outcome to set webhook_events.status.

import { normalizeBrazilianPhone } from "@/lib/utils/phone";
import { parseZapiInbound } from "@/lib/integrations/zapi";

// Whole-message match, case-insensitive, whitespace tolerated. We do
// NOT match on substring — "SAIRAM cedo hoje" (someone talking about
// their morning) shouldn't opt them out. If it's just this keyword,
// it's an opt-out.
const STOP_KEYWORDS = new Set(["stop", "parar", "sair", "cancelar", "cancel"]);

function isStopKeyword(text) {
  if (typeof text !== "string") return false;
  const trimmed = text.trim().toLowerCase();
  return STOP_KEYWORDS.has(trimmed);
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 *   Service-role client — this function bypasses RLS.
 * @param {{ id: string, event_type: string | null, payload: unknown }} event
 * @returns {Promise<{ ok: true, note?: string } | { ok: false, error: string }>}
 */
export async function processZapiEvent(supabase, event) {
  const parsed = parseZapiInbound(event.payload);
  if (!parsed) {
    // Non-text messages (media, group, status callbacks) — nothing
    // to do at this stage. Mark processed so cron doesn't retry.
    return { ok: true, note: "skipped: non-text or group" };
  }

  const { phone, fromMe, senderName, messageId, type, text } = parsed;

  // Normalise phone so lookups are stable regardless of the format
  // Z-API returned. Un-normalisable numbers still get logged, just
  // with player_id=null (admin-review case).
  const norm = normalizeBrazilianPhone(phone);
  const phoneE164 = norm.ok ? norm.e164 : phone;

  // Look up the player. Nullable — unmatched inbounds are logged with
  // player_id=null so admins can decide what to do.
  const { data: player } = await supabase
    .from("players")
    .select("id, whatsapp_opted_in, whatsapp_agent_paused")
    .eq("phone_e164", phoneE164)
    .maybeSingle();

  // STOP keyword — flip opt-out on the matched player (no-op if
  // unmatched; nothing to unsubscribe). Still logs the inbound so
  // there's a trail of the opt-out request.
  if (!fromMe && isStopKeyword(text)) {
    if (player) {
      await supabase
        .from("players")
        .update({ whatsapp_opted_in: false })
        .eq("id", player.id);
    }
    await logMessage(supabase, {
      playerId: player?.id ?? null,
      phoneE164,
      direction: "inbound",
      via: "user",
      body: text,
      messageId,
      metadata: {
        stop_keyword: true,
        sender_name: senderName ?? null,
        event_type: type,
        webhook_event_id: event.id,
      },
    });
    return {
      ok: true,
      note: player ? "opt_out_recorded" : "opt_out_unmatched",
    };
  }

  // fromMe=true — admin typed a reply directly in WhatsApp Web on the
  // shared FieldTalk number. Log as an outbound so the conversation
  // in whatsapp_messages stays complete. Our own agent sends are
  // already logged with the same messageId by the sender, so if
  // this messageId already exists we no-op via the UNIQUE constraint.
  if (fromMe) {
    await logMessage(supabase, {
      playerId: player?.id ?? null,
      phoneE164,
      direction: "outbound",
      via: "atendente_manual",
      body: text,
      messageId,
      metadata: {
        sender_name: senderName ?? null,
        event_type: type,
        webhook_event_id: event.id,
      },
    });
    if (player) {
      await supabase
        .from("players")
        .update({ whatsapp_last_outbound_at: new Date().toISOString() })
        .eq("id", player.id);
    }
    return { ok: true, note: "atendente_manual_captured" };
  }

  // Regular inbound from a real user.
  await logMessage(supabase, {
    playerId: player?.id ?? null,
    phoneE164,
    direction: "inbound",
    via: "user",
    body: text,
    messageId,
    metadata: {
      sender_name: senderName ?? null,
      event_type: type,
      webhook_event_id: event.id,
    },
  });

  if (player) {
    await supabase
      .from("players")
      .update({ whatsapp_last_inbound_at: new Date().toISOString() })
      .eq("id", player.id);
  }

  // TODO (Phase 4): decide + execute AI coach reply here. Respect
  // player.whatsapp_agent_paused and player.whatsapp_opted_in before
  // firing. For now we just persist and return.
  return {
    ok: true,
    note: player ? "logged" : "unmatched_logged",
  };
}

/**
 * Insert into whatsapp_messages. Duplicate (provider, provider_message_id)
 * inserts are swallowed — the UNIQUE constraint gives us idempotency
 * for free when Z-API replays an event.
 */
async function logMessage(supabase, opts) {
  const {
    playerId,
    phoneE164,
    direction,
    via,
    body,
    messageId,
    metadata,
  } = opts;
  const { error } = await supabase.from("whatsapp_messages").insert({
    player_id: playerId,
    phone_e164: phoneE164,
    direction,
    provider: "zapi",
    provider_message_id: messageId || null,
    via,
    body,
    metadata: metadata ?? null,
  });
  // 23505 = duplicate on (provider, provider_message_id) — the
  // sender or a prior webhook already logged this. Not an error.
  if (error && error.code !== "23505") {
    // Swallow but log — losing a message log is bad UX but shouldn't
    // fail the whole processor and cause an infinite retry loop.
    console.error("[zapi-processor] logMessage failed:", error);
  }
}

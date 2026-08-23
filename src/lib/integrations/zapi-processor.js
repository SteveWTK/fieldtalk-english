// src/lib/integrations/zapi-processor.js
//
// Z-API inbound processor. Called from /api/zapi/webhook (after()) and
// from the cron drain safety net.
//
// What this DOES:
//   - Parse the Z-API payload.
//   - STOP-keyword handler (PARAR / STOP / SAIR / CANCELAR): flip
//     players.whatsapp_opted_in = false. LGPD-mandated.
//   - fromMe=true: log as `atendente_manual` outbound (dedupe against
//     our own outbound sends by messageId — the sender already logged
//     those with the same messageId).
//   - Regular inbound: look up player, log to whatsapp_messages, bump
//     whatsapp_last_inbound_at, then invoke the AI agent (Phase 4).
//   - Unmatched inbound (unknown phone): logged with player_id=null
//     AND fired through the agent so unknown users still get a helpful
//     reply (typically the Support persona if they mention a product
//     concern, or the Coach for a friendly hello). Escalations from
//     unmatched users go into the escalations table just the same.
//
// Agent gates — the agent is skipped when any of these are true:
//   - player.whatsapp_opted_in === false (explicit opt-out)
//   - player.whatsapp_agent_paused === true (admin took over)
// Unmatched users don't have these fields, so they DO get the agent.
//
// Returns { ok: true, note?: string } or { ok: false, error: string }.
// The webhook route uses the outcome to set webhook_events.status.

import { normalizeBrazilianPhone } from "@/lib/utils/phone";
import { parseZapiInbound } from "@/lib/integrations/zapi";
import { decideAgentAction } from "@/lib/whatsapp/agent";
import { executeAgentAction } from "@/lib/whatsapp/execute";

// Whole-message match, case-insensitive, whitespace tolerated. We do
// NOT match on substring — "SAIRAM cedo hoje" (someone talking about
// their morning) shouldn't opt them out. If it's just this keyword,
// it's an opt-out.
const STOP_KEYWORDS = new Set(["stop", "parar", "sair", "cancelar", "cancel"]);

// History context passed to the agent — cap at 10 messages (5 back-
// and-forth exchanges) to keep prompt cost bounded.
const HISTORY_LIMIT = 10;

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
    return { ok: true, note: "skipped: non-text or group" };
  }

  const { phone, fromMe, senderName, messageId, type, text } = parsed;

  const norm = normalizeBrazilianPhone(phone);
  const phoneE164 = norm.ok ? norm.e164 : phone;

  // Broader select than Phase 3 — the agent's context builder needs
  // full_name, edition, preferred_language too. Kept as a single
  // query so we don't fan out.
  const { data: player } = await supabase
    .from("players")
    .select(
      "id, full_name, edition, preferred_language, whatsapp_opted_in, whatsapp_agent_paused"
    )
    .eq("phone_e164", phoneE164)
    .maybeSingle();

  // ── STOP keyword ────────────────────────────────────────────────
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

  // ── fromMe (admin typed in WA Web) ──────────────────────────────
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

  // ── Regular inbound ─────────────────────────────────────────────
  const inboundId = await logMessage(supabase, {
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

  // Agent gates — matched players only, opted-in, not paused.
  if (player && player.whatsapp_opted_in === false) {
    return { ok: true, note: "logged:opted_out" };
  }
  if (player && player.whatsapp_agent_paused === true) {
    return { ok: true, note: "logged:agent_paused_by_admin" };
  }

  // Fire the agent. Unmatched users still get a reply — the personas
  // handle the "no player context" case gracefully.
  return runAgent(supabase, {
    player,
    phoneE164,
    inboundText: text,
    inboundId,
  });
}

/**
 * Gather the agent's context (subscription, progress, recent history),
 * call decideAgentAction, apply executeAgentAction. Any aux-query
 * failure degrades to null values rather than blocking the reply —
 * the personas are prompted to handle partial context.
 */
async function runAgent(supabase, opts) {
  const { player, phoneE164, inboundText, inboundId } = opts;

  const [subscriptionState, progress, history] = await Promise.all([
    fetchSubscription(supabase, player?.id),
    fetchProgress(supabase, player?.id),
    fetchHistory(supabase, phoneE164),
  ]);

  const agentContext = {
    inboundText,
    player,
    phoneE164,
    history,
    subscriptionState,
    progress,
  };

  const action = await decideAgentAction(supabase, agentContext);
  const result = await executeAgentAction(supabase, {
    action,
    agentContext,
    inboundMessageId: inboundId,
  });

  return result;
}

async function fetchSubscription(supabase, playerId) {
  if (!playerId) return null;
  try {
    const { data } = await supabase
      .from("player_edition_access")
      .select("edition, tier, status")
      .eq("player_id", playerId)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

async function fetchProgress(supabase, playerId) {
  if (!playerId) return null;
  try {
    const { data } = await supabase
      .from("player_progress")
      .select("total_xp")
      .eq("player_id", playerId)
      .maybeSingle();
    return data ?? null;
  } catch {
    return null;
  }
}

async function fetchHistory(supabase, phoneE164) {
  try {
    const { data, error } = await supabase
      .from("whatsapp_messages")
      .select("direction, via, body, created_at")
      .eq("phone_e164", phoneE164)
      .order("created_at", { ascending: false })
      .limit(HISTORY_LIMIT + 1); // +1 to skip the just-logged inbound
    if (error || !Array.isArray(data)) return [];
    // Newest-first from DB → drop the top (the current inbound the
    // agent is about to answer, already included in the prompt as
    // "current message") → reverse to oldest-first for the LLM.
    return data
      .slice(1)
      .reverse()
      .map((m) => ({
        role: m.direction === "outbound" ? "agent" : "user",
        body: m.body,
      }));
  } catch {
    return [];
  }
}

/**
 * Insert into whatsapp_messages. Duplicate (provider, provider_message_id)
 * inserts are swallowed — the UNIQUE constraint gives us idempotency
 * for free when Z-API replays an event. Returns the inserted row's id
 * (or null if the insert failed / was a duplicate) so the agent can
 * link the inbound message to any escalation it creates.
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
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .insert({
      player_id: playerId,
      phone_e164: phoneE164,
      direction,
      provider: "zapi",
      provider_message_id: messageId || null,
      via,
      body,
      metadata: metadata ?? null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code !== "23505") {
      // Swallow but log — losing a message log is bad UX but shouldn't
      // fail the whole processor and cause an infinite retry loop.
      console.error("[zapi-processor] logMessage failed:", error);
    }
    return null;
  }
  return data?.id ?? null;
}

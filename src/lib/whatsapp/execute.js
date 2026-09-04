// src/lib/whatsapp/execute.js
//
// Execute-side of the agent — applies the side effects an AgentAction
// prescribes: sends the WhatsApp reply, logs it as an outbound in
// whatsapp_messages, bumps player.whatsapp_last_outbound_at, and (when
// the action escalates) inserts a whatsapp_escalations row + fires
// the notification email.
//
// Every step is defensively small — a failure in one (e.g. Resend
// down) does not roll back the others. The escalation row is the
// source of truth; email is best-effort notification on top.

import { sendWhatsapp } from "@/lib/integrations/zapi";
import { notifyEscalation } from "./notify";

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase — service role
 * @param {{
 *   action: import("./agent").AgentAction,
 *   agentContext: import("./agent").AgentContext,
 *   inboundMessageId: string | null,
 * }} params
 * @returns {Promise<{ ok: true, note?: string } | { ok: false, error: string }>}
 */
export async function executeAgentAction(supabase, params) {
  const { action, agentContext, inboundMessageId } = params;
  const { player, phoneE164 } = agentContext;

  // Guard — nothing to do if the decide layer failed AND didn't provide
  // an escalation reason. Should never happen (agent.js always returns
  // a reason on ERROR) but defensive.
  if (!action.reply && !action.escalate) {
    return { ok: true, note: "no_action" };
  }

  // ── 1. Send the reply (if there is one) ────────────────────────
  let providerMessageId = null;
  let sendError = null;
  if (action.reply) {
    try {
      const sendResult = await sendWhatsapp({
        telefone: phoneE164,
        mensagem: action.reply,
      });
      providerMessageId = sendResult.messageId;
    } catch (err) {
      sendError = err?.message ?? String(err);
      console.error("[whatsapp/execute] send failed:", sendError);
    }
  }

  // ── 2. Log the outbound to whatsapp_messages ───────────────────
  if (action.reply) {
    const { error: logErr } = await supabase.from("whatsapp_messages").insert({
      player_id: player?.id ?? null,
      phone_e164: phoneE164,
      direction: "outbound",
      provider: "zapi",
      provider_message_id: providerMessageId,
      via: "agent",
      body: action.reply,
      metadata: {
        intent: action.intent,
        agent_debug: action.debug ?? null,
        send_error: sendError,
        replied_to_inbound: inboundMessageId,
      },
    });
    if (logErr && logErr.code !== "23505") {
      console.error("[whatsapp/execute] outbound log failed:", logErr);
    }
  }

  // Bump last-outbound timestamp so rate-limit / activity views stay
  // fresh. Only when we have a matched player. Also bumps the
  // shared last_whatsapp_activity_at gate that the review-quiz cron
  // reads — any agent send counts as "conversation is live", pausing
  // new quiz spawns for the next 30 min.
  if (player?.id && action.reply) {
    const nowIso = new Date().toISOString();
    await supabase
      .from("players")
      .update({
        whatsapp_last_outbound_at: nowIso,
        last_whatsapp_activity_at: nowIso,
      })
      .eq("id", player.id);
  }

  // ── 3. Escalation, if any ──────────────────────────────────────
  if (action.escalate) {
    const { data: escalationRow, error: escErr } = await supabase
      .from("whatsapp_escalations")
      .insert({
        player_id: player?.id ?? null,
        phone_e164: phoneE164,
        inbound_whatsapp_message_id: inboundMessageId,
        intent: action.intent === "ERROR" ? null : action.intent,
        reason: action.escalate,
        agent_context: {
          inbound_text: agentContext.inboundText,
          agent_debug: action.debug ?? null,
          agent_reply: action.reply || null,
          subscription: agentContext.subscriptionState ?? null,
          progress: agentContext.progress ?? null,
          player_snapshot: player
            ? {
                id: player.id,
                full_name: player.full_name ?? null,
                edition: player.edition ?? null,
                preferred_language: player.preferred_language ?? null,
              }
            : null,
        },
        status: "open",
      })
      .select("id")
      .single();

    if (escErr) {
      console.error("[whatsapp/execute] escalation insert failed:", escErr);
      return {
        ok: false,
        error: `escalation_persist_failed: ${escErr.message}`,
      };
    }

    // Fire notification — best-effort, don't block on it.
    await notifyEscalation({
      escalationId: escalationRow.id,
      playerName: player?.full_name ?? null,
      phoneE164,
      intent: action.intent,
      reason: action.escalate,
      inboundText: agentContext.inboundText,
      agentReply: action.reply,
    });

    return {
      ok: true,
      note: `escalated:${action.intent}`,
    };
  }

  if (sendError) {
    return { ok: false, error: `send_failed: ${sendError}` };
  }
  return { ok: true, note: `replied:${action.intent}` };
}

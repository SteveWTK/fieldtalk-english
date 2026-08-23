// src/lib/whatsapp/notify.js
//
// Escalation notifier. Fires an email via Resend when the agent
// escalates to a human, so the team knows there's something waiting
// in whatsapp_escalations without having to poll the table.
//
// Config:
//   RESEND_API_KEY               — already set in .env.local
//   WHATSAPP_ESCALATION_EMAIL    — comma-separated recipient list
//                                  (e.g. steve@…,david@…). Defaults to
//                                  Stephen's address per user memory.
//   WHATSAPP_ESCALATION_FROM     — sender identity Resend will use
//                                  (defaults to a FieldTalk address).
//
// Failure mode: if Resend is not configured or the send errors,
// this function logs and returns — the escalation row itself has
// already been persisted, so the human can still find it by opening
// Supabase / the admin UI. Notifications are the "push"; the DB is
// the source of truth.

import { Resend } from "resend";

let clientSingleton = null;
function getClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!clientSingleton) {
    clientSingleton = new Resend(apiKey);
  }
  return clientSingleton;
}

function getRecipients() {
  const raw =
    process.env.WHATSAPP_ESCALATION_EMAIL || "steveinspirewtk@gmail.com";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {{
 *   escalationId: string,
 *   playerName: string | null,
 *   phoneE164: string,
 *   intent: string,
 *   reason: string,
 *   inboundText: string,
 *   agentReply: string,
 * }} escalation
 */
export async function notifyEscalation(escalation) {
  const client = getClient();
  if (!client) {
    console.warn(
      "[whatsapp/notify] RESEND_API_KEY not set — skipping email; row still persisted."
    );
    return { ok: false, skipped: "resend_not_configured" };
  }

  const to = getRecipients();
  if (to.length === 0) {
    console.warn("[whatsapp/notify] no recipients configured");
    return { ok: false, skipped: "no_recipients" };
  }

  const from =
    process.env.WHATSAPP_ESCALATION_FROM ||
    "FieldTalk Alerts <alerts@fieldtalkenglish.com>";

  const who = escalation.playerName || "Unmatched user";
  const subject = `[FieldTalk] WhatsApp escalation — ${who} (${escalation.intent})`;

  const bodyText = [
    `A user needs a human on WhatsApp.`,
    ``,
    `Player: ${who}`,
    `Phone: ${escalation.phoneE164}`,
    `Intent: ${escalation.intent}`,
    `Reason: ${escalation.reason}`,
    ``,
    `User's message:`,
    `> ${escalation.inboundText || "(empty)"}`,
    ``,
    escalation.agentReply
      ? `Agent's reply to them:\n> ${escalation.agentReply}`
      : `Agent did not reply (escalated silently).`,
    ``,
    `Escalation ID: ${escalation.escalationId}`,
    `Open in Supabase: whatsapp_escalations where id = '${escalation.escalationId}'`,
  ].join("\n");

  try {
    await client.emails.send({
      from,
      to,
      subject,
      text: bodyText,
    });
    return { ok: true };
  } catch (err) {
    console.error("[whatsapp/notify] email send failed:", err);
    return {
      ok: false,
      skipped: `send_error: ${err?.message ?? String(err)}`,
    };
  }
}

// src/lib/whatsapp/notify.js
//
// Escalation notifier. Fires an email via Resend when the agent
// escalates to a human, so the team knows there's something waiting
// in whatsapp_escalations without having to poll the table.
//
// Config:
//   RESEND_API_KEY               — already set in .env.local
//   WHATSAPP_ESCALATION_EMAIL    — comma-separated recipient list for
//                                  COACH / SUPPORT intents (e.g.
//                                  steve@…,david@…). Defaults to
//                                  Stephen's address per user memory.
//   WHATSAPP_LEAD_SALES_EMAIL    — comma-separated recipient list for
//                                  LEAD_SALES escalations. When unset,
//                                  falls back to WHATSAPP_ESCALATION_EMAIL
//                                  so a single-recipient setup still
//                                  works out of the box.
//   WHATSAPP_ESCALATION_FROM     — sender identity Resend will use.
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

function getRecipients(intent) {
  // LEAD_SALES escalations route to the sales team, not tech triage.
  // If WHATSAPP_LEAD_SALES_EMAIL is unset, fall back to the general
  // escalation recipients so a solo-team setup still receives them.
  const raw =
    intent === "LEAD_SALES"
      ? process.env.WHATSAPP_LEAD_SALES_EMAIL ||
        process.env.WHATSAPP_ESCALATION_EMAIL ||
        "steveinspirewtk@gmail.com"
      : process.env.WHATSAPP_ESCALATION_EMAIL || "steveinspirewtk@gmail.com";
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

  const to = getRecipients(escalation.intent);
  if (to.length === 0) {
    console.warn("[whatsapp/notify] no recipients configured");
    return { ok: false, skipped: "no_recipients" };
  }

  const isSales = escalation.intent === "LEAD_SALES";

  const from =
    process.env.WHATSAPP_ESCALATION_FROM ||
    // Sender address on the new brand domain — Resend verifies the
    // globalplayerpro.com sending identity via SPF/DKIM/DMARC set
    // at Ionos. Inbound replies to alerts@ forward through ImprovMX
    // into the team Gmail.
    (isSales
      ? "Global Player Sales <alerts@globalplayerpro.com>"
      : "Global Player Alerts <alerts@globalplayerpro.com>");

  const who = escalation.playerName || "Unmatched user";
  const subject = isSales
    ? `[Sales lead] ${who} needs a human on WhatsApp`
    : `[Global Player] WhatsApp escalation — ${who} (${escalation.intent})`;

  const bodyText = isSales
    ? buildLeadSalesBody(escalation, who)
    : buildGenericBody(escalation, who);

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

/* ─── body builders ───────────────────────────────────────────── */

function buildGenericBody(escalation, who) {
  return [
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
}

function buildLeadSalesBody(escalation, who) {
  // Sales-facing: no "agent" jargon, no support-triage framing. The
  // reader is Paul or David deciding whether to grab their phone and
  // reply personally. Front-load who and what they said.
  return [
    `A lead just went off-script mid-funnel and needs a human reply on WhatsApp.`,
    ``,
    `Lead: ${who}`,
    `Phone: ${escalation.phoneE164}`,
    ``,
    `What they said:`,
    `> ${escalation.inboundText || "(empty)"}`,
    ``,
    `Auto-reply we sent while you catch up:`,
    `> ${escalation.agentReply || "(none)"}`,
    ``,
    `Reason code: ${escalation.reason}`,
    `Escalation ID: ${escalation.escalationId}`,
    ``,
    `The funnel is now paused for this lead. Reply from WA Web / phone as normal — inbound + outbound get logged to the CRM automatically.`,
  ].join("\n");
}

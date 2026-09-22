// src/lib/whatsapp/lead-funnel-router.js
//
// Pre-signup WhatsApp lead-funnel router. Called from zapi-processor
// on EVERY inbound (matched or unmatched player). Runs BEFORE the
// review-quiz router and BEFORE the AI agent — because a lead who has
// just sent "Oi <token>" has no players row, and a lead mid-funnel
// answering Q1/Q2 must not be routed to the coach persona.
//
// State machine (leads.funnel_stage):
//
//   pending_oi ──token match / phone match──▶ q1_sent
//              ▲                                │
//              │                                │ button/1-3/a-c
//              │                                ▼
//              │                             (grade)
//              │                                │
//              │                                ▼
//              │                              q2_sent
//              │                                │
//              │                                │ button/1-3/a-c
//              │                                ▼
//              │                             (grade + CTA)
//              │                                │
//              │                                ▼
//              │                              cta_sent
//              │                                │
//              │                                │ (signup on web)
//              │                                ▼
//              │                              converted   ── falls through to agent ──
//              │
//              └── free-text mid-Q1/Q2 ──▶ escalated (LEAD_SALES) ── falls through ──
//
// Guarantees:
//   - Never throws. Returns { handled: false } on any error path so a
//     bug here can't silence a user conversation.
//   - Matched players (existing signups) are NEVER routed as leads —
//     they can only be graded against the review-quiz router.
//   - do_not_contact = true bails out immediately.
//   - Idempotent on "duplicate Oi" — a lead who resends their Oi while
//     in q1_sent gets Q1 resent without state changing.

import { sendWhatsapp, sendWhatsappButtons } from "@/lib/integrations/zapi";
import {
  normalizeSnapshot,
  resolvePick,
  pickLangString,
} from "@/lib/whatsapp/quiz-grading";
import { parseTokenFromInbound, buildCtaLink } from "@/lib/whatsapp/lead-funnel-outreach";
import {
  buildQ1ReplyWithQ2Prompt,
  buildQ2ReplyWithCta,
  buildFreeTextEscalationReply,
} from "@/lib/whatsapp/lead-funnel-messages";
import { ctaForRole } from "@/lib/whatsapp/lead-funnel-cta";
import { notifyEscalation } from "@/lib/whatsapp/notify";

const MAX_BUTTON_LABEL_CHARS = 20;
const LEAD_STAGES_LIVE = new Set(["pending_oi", "q1_sent", "q2_sent"]);

// Test-mode whitelist. Phones on this list bypass the "existing player"
// short-circuit — so the sales team can repeat-test the funnel from
// their own WhatsApp accounts even though those numbers are already
// tied to production players rows.
//
//   WHATSAPP_TEST_PHONES="+551199999999,+551188888888"
//
// Set in .env.local (dev) and Vercel (preview/prod-if-you-must). The
// only side effect is that inbound messages from these phones route
// as leads first — their player rows and progress are untouched, and
// the review-quiz / agent path can never fire while the funnel owns
// the conversation. Leave unset in real prod for real leads.
function loadTestPhoneSet() {
  const raw = process.env.WHATSAPP_TEST_PHONES;
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase — service role
 * @param {{
 *   player: { id: string } | null,
 *   phoneE164: string,
 *   parsed: { text?: string, button?: { id: string, label: string } },
 *   senderName?: string | null,
 *   inboundMessageId: string | null,
 * }} opts
 * @returns {Promise<{ handled: boolean, note?: string }>}
 *   handled=true → processor MUST NOT call the review-quiz router or
 *   AI agent. handled=false → fall through as normal.
 */
export async function routeLeadFunnelReply(supabase, opts) {
  try {
    return await routeInner(supabase, opts);
  } catch (err) {
    console.error("[lead-funnel-router] unhandled error:", err);
    return { handled: false };
  }
}

async function routeInner(supabase, opts) {
  const { player, phoneE164, parsed, senderName, inboundMessageId } = opts;

  const testPhones = loadTestPhoneSet();
  const isTestPhone = phoneE164 && testPhones.has(phoneE164);

  // Existing signup — not a lead. Never intercept.
  // Test phones bypass this so the sales team can repeat-test using
  // their own WhatsApp accounts (see WHATSAPP_TEST_PHONES above).
  if (player?.id && !isTestPhone) return { handled: false };

  const token = parseTokenFromInbound(parsed?.text);

  // Diagnostic: if the inbound looks like an outreach attempt ("Oi ..."
  // or contains our zero-width alphabet) but we couldn't decode a
  // token, log it so a WhatsApp / URL-encoding regression doesn't hide
  // as a silent fall-through to the AI agent.
  if (!token && looksLikeOutreach(parsed?.text)) {
    console.warn(
      "[lead-funnel-router] Oi-like inbound with no decodable token — falling through",
      {
        phoneE164,
        isTestPhone,
        rawLength: (parsed?.text || "").length,
        hasZwChars: containsZeroWidthChars(parsed?.text),
      },
    );
  }

  // Try token match first (initial "Oi <token>" from a phone we may
  // not yet have on file).
  let lead = null;
  let matchedBy = null;
  if (token) {
    const { data } = await supabase
      .from("leads")
      .select(LEAD_SELECT)
      .eq("outreach_token", token)
      .maybeSingle();
    if (data) {
      lead = data;
      matchedBy = "token";
    } else {
      console.warn(
        "[lead-funnel-router] token decoded but no matching lead",
        { token, phoneE164 },
      );
    }
  }

  // No token — check if this phone matches a lead already mid-funnel.
  if (!lead && phoneE164) {
    const { data } = await supabase
      .from("leads")
      .select(LEAD_SELECT)
      .eq("phone_e164", phoneE164)
      .in("funnel_stage", [...LEAD_STAGES_LIVE])
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      lead = data;
      matchedBy = "phone";
    }
  }

  if (!lead) return { handled: false };
  if (lead.do_not_contact) return { handled: false };

  // ── Route by stage ────────────────────────────────────────────────

  // pending_oi + token OR phone match → send Q1 (first-contact).
  if (lead.funnel_stage === "pending_oi") {
    return await sendQ1(supabase, {
      lead,
      phoneE164,
      senderName,
      inboundMessageId,
    });
  }

  // Duplicate Oi during q1_sent — resend Q1 idempotently (no state change).
  if (lead.funnel_stage === "q1_sent" && matchedBy === "token") {
    return await resendCurrentQ1(supabase, {
      lead,
      phoneE164,
      inboundMessageId,
    });
  }

  // Grade Q1 → send explanation + Q2 as one bubble.
  if (lead.funnel_stage === "q1_sent") {
    return await gradeQ1AndSendQ2(supabase, {
      lead,
      parsed,
      phoneE164,
      inboundMessageId,
    });
  }

  // Grade Q2 → send explanation + CTA (text, no buttons).
  if (lead.funnel_stage === "q2_sent") {
    return await gradeQ2AndSendCta(supabase, {
      lead,
      parsed,
      phoneE164,
      inboundMessageId,
    });
  }

  // Any other stage (cta_sent, converted, escalated, cold) → let the
  // agent handle it. If the lead comes back to chat post-CTA, the coach
  // persona is a better UX than more automated funnel spam.
  return { handled: false };
}

/* ─── Q1: first-contact send ──────────────────────────────────── */

async function sendQ1(supabase, { lead, phoneE164, senderName, inboundMessageId }) {
  const activeQ1 = await loadActiveQuestion(supabase, "q1");
  if (!activeQ1) {
    // No active Q1 — funnel is misconfigured. Log + let the agent
    // handle it so the lead gets *some* reply.
    console.warn(
      "[lead-funnel-router] no active Q1 configured — lead falls through",
      { lead_id: lead.id },
    );
    return { handled: false, note: "no_active_q1" };
  }

  const snapshot = frozenSnapshot(activeQ1);
  const buttons = renderButtons(snapshot.buttons);
  const promptText = pickLangString(snapshot.prompt, "pt");

  const send = await sendButtonsSafe({
    telefone: phoneE164,
    message: promptText,
    buttons,
  });

  const nowIso = new Date().toISOString();
  const patch = {
    funnel_stage: "q1_sent",
    funnel_q1_snapshot: snapshot,
    funnel_q1_sent_at: nowIso,
    // Clear any leftover Q1 answer state (defensive — happens if the
    // lead is being re-run through the funnel).
    funnel_q1_answered_at: null,
    funnel_q1_button_id: null,
    funnel_q1_is_correct: null,
    funnel_nudged_at: null,
  };
  // Capture phone if we didn't have it before this inbound arrived.
  if (!lead.phone_e164 && phoneE164) patch.phone_e164 = phoneE164;
  // Capture name from Z-API senderName if the lead was created with a
  // generic label. Never overwrite an already-set name.
  if (senderName && (!lead.full_name || lead.full_name.trim() === "")) {
    patch.full_name = senderName.trim().slice(0, 200);
  }

  await updateLead(supabase, lead.id, patch);
  await logOutbound(supabase, {
    phoneE164,
    body: renderQuizBody(promptText, buttons),
    via: "lead_funnel_q1",
    providerMessageId: send.providerMessageId,
    metadata: {
      lead_id: lead.id,
      funnel_stage: "q1_sent",
      question_slot: "q1",
      question_id: snapshot.id,
      replied_to_inbound: inboundMessageId,
      send_error: send.error,
    },
  });

  return { handled: true, note: "q1_sent" };
}

/* ─── Q1 resend on duplicate Oi ────────────────────────────────── */

async function resendCurrentQ1(supabase, { lead, phoneE164, inboundMessageId }) {
  const snapshot = normalizeSnapshot(lead.funnel_q1_snapshot);
  if (!snapshot) {
    // Snapshot missing but stage says q1_sent — self-heal by sending
    // whatever active Q1 is now, and refresh the snapshot.
    return await sendQ1(supabase, {
      lead,
      phoneE164,
      senderName: null,
      inboundMessageId,
    });
  }
  const buttons = renderButtons(snapshot.buttons);
  const promptText = pickLangString(snapshot.prompt, "pt");

  const send = await sendButtonsSafe({
    telefone: phoneE164,
    message: promptText,
    buttons,
  });

  await logOutbound(supabase, {
    phoneE164,
    body: renderQuizBody(promptText, buttons),
    via: "lead_funnel_q1",
    providerMessageId: send.providerMessageId,
    metadata: {
      lead_id: lead.id,
      funnel_stage: "q1_sent",
      question_slot: "q1",
      question_id: snapshot.id,
      resent: true,
      replied_to_inbound: inboundMessageId,
      send_error: send.error,
    },
  });

  return { handled: true, note: "q1_resent" };
}

/* ─── Grade Q1 + send Q2 in one bubble ─────────────────────────── */

async function gradeQ1AndSendQ2(supabase, { lead, parsed, phoneE164, inboundMessageId }) {
  const q1Snapshot = normalizeSnapshot(lead.funnel_q1_snapshot);
  if (!q1Snapshot) {
    // Stage says q1_sent but no snapshot — degrade to escalation so
    // the lead isn't stranded, and a human can fix.
    return await escalateFreeText(supabase, {
      lead,
      parsed,
      phoneE164,
      inboundMessageId,
      reason: "q1_snapshot_missing",
    });
  }
  const pick = resolvePick({ parsed, buttons: q1Snapshot.buttons });
  if (!pick) {
    return await escalateFreeText(supabase, {
      lead,
      parsed,
      phoneE164,
      inboundMessageId,
      reason: "q1_free_text",
    });
  }
  const pickedButton = q1Snapshot.buttons[pick.index];
  const correctButton = q1Snapshot.buttons.find((b) => b.correct === true);
  const isCorrect = pickedButton?.correct === true;

  // Fetch active Q2. Missing config → grade Q1 but bail before Q2 send;
  // escalate so a human takes over instead of stranding the lead.
  const activeQ2 = await loadActiveQuestion(supabase, "q2");
  if (!activeQ2) {
    console.warn(
      "[lead-funnel-router] no active Q2 configured — escalating",
      { lead_id: lead.id },
    );
    return await escalateFreeText(supabase, {
      lead,
      parsed,
      phoneE164,
      inboundMessageId,
      reason: "no_active_q2",
    });
  }
  const q2Snapshot = frozenSnapshot(activeQ2);
  const q2Buttons = renderButtons(q2Snapshot.buttons);

  const message = buildQ1ReplyWithQ2Prompt({
    isCorrect,
    correctButtonLabel: correctButton
      ? pickLangString(correctButton.label, "pt")
      : null,
    q1Explanation: q1Snapshot.explanation,
    q2Prompt: q2Snapshot.prompt,
  });

  const send = await sendButtonsSafe({
    telefone: phoneE164,
    message,
    buttons: q2Buttons,
  });

  const nowIso = new Date().toISOString();
  await updateLead(supabase, lead.id, {
    funnel_stage: "q2_sent",
    funnel_q1_answered_at: nowIso,
    funnel_q1_button_id: pickedButton?.id ?? pick.buttonId,
    funnel_q1_is_correct: isCorrect,
    funnel_q2_snapshot: q2Snapshot,
    funnel_q2_sent_at: nowIso,
    funnel_q2_answered_at: null,
    funnel_q2_button_id: null,
    funnel_q2_is_correct: null,
    funnel_nudged_at: null,
  });

  await logOutbound(supabase, {
    phoneE164,
    body: renderQuizBody(message, q2Buttons),
    via: "lead_funnel_q2",
    providerMessageId: send.providerMessageId,
    metadata: {
      lead_id: lead.id,
      funnel_stage: "q2_sent",
      question_slot: "q2",
      question_id: q2Snapshot.id,
      q1_is_correct: isCorrect,
      q1_button_id: pickedButton?.id ?? pick.buttonId,
      replied_to_inbound: inboundMessageId,
      send_error: send.error,
    },
  });

  return {
    handled: true,
    note: isCorrect ? "q1_correct_q2_sent" : "q1_wrong_q2_sent",
  };
}

/* ─── Grade Q2 + send CTA ─────────────────────────────────────── */

async function gradeQ2AndSendCta(supabase, { lead, parsed, phoneE164, inboundMessageId }) {
  const q2Snapshot = normalizeSnapshot(lead.funnel_q2_snapshot);
  if (!q2Snapshot) {
    return await escalateFreeText(supabase, {
      lead,
      parsed,
      phoneE164,
      inboundMessageId,
      reason: "q2_snapshot_missing",
    });
  }
  const pick = resolvePick({ parsed, buttons: q2Snapshot.buttons });
  if (!pick) {
    return await escalateFreeText(supabase, {
      lead,
      parsed,
      phoneE164,
      inboundMessageId,
      reason: "q2_free_text",
    });
  }
  const pickedButton = q2Snapshot.buttons[pick.index];
  const correctButton = q2Snapshot.buttons.find((b) => b.correct === true);
  const isCorrect = pickedButton?.correct === true;

  const ctaLink = buildCtaLink(lead.outreach_token);
  const message = buildQ2ReplyWithCta({
    isCorrect,
    correctButtonLabel: correctButton
      ? pickLangString(correctButton.label, "pt")
      : null,
    q2Explanation: q2Snapshot.explanation,
    roleCta: ctaForRole(lead.funnel_role),
    ctaLink,
  });

  const send = await sendTextSafe({
    telefone: phoneE164,
    mensagem: message,
  });

  const nowIso = new Date().toISOString();
  await updateLead(supabase, lead.id, {
    funnel_stage: "cta_sent",
    funnel_q2_answered_at: nowIso,
    funnel_q2_button_id: pickedButton?.id ?? pick.buttonId,
    funnel_q2_is_correct: isCorrect,
    funnel_nudged_at: null,
  });

  await logOutbound(supabase, {
    phoneE164,
    body: message,
    via: "lead_funnel_cta",
    providerMessageId: send.providerMessageId,
    metadata: {
      lead_id: lead.id,
      funnel_stage: "cta_sent",
      q2_is_correct: isCorrect,
      q2_button_id: pickedButton?.id ?? pick.buttonId,
      cta_link: ctaLink,
      replied_to_inbound: inboundMessageId,
      send_error: send.error,
    },
  });

  return {
    handled: true,
    note: isCorrect ? "q2_correct_cta_sent" : "q2_wrong_cta_sent",
  };
}

/* ─── Free-text escalation ─────────────────────────────────────── */

async function escalateFreeText(supabase, opts) {
  const { lead, parsed, phoneE164, inboundMessageId, reason } = opts;

  const reply = buildFreeTextEscalationReply();
  const send = await sendTextSafe({
    telefone: phoneE164,
    mensagem: reply,
  });

  await updateLead(supabase, lead.id, {
    funnel_stage: "escalated",
  });

  await logOutbound(supabase, {
    phoneE164,
    body: reply,
    via: "lead_funnel_escalation",
    providerMessageId: send.providerMessageId,
    metadata: {
      lead_id: lead.id,
      funnel_stage: "escalated",
      escalation_reason: reason,
      inbound_text: parsed?.text ?? null,
      replied_to_inbound: inboundMessageId,
      send_error: send.error,
    },
  });

  // Timeline entry so the lead detail page reflects the escalation.
  await supabase.from("lead_activities").insert({
    lead_id: lead.id,
    activity_type: "note_added",
    actor_id: null,
    payload: {
      kind: "funnel_escalated",
      reason,
      inbound_text: parsed?.text ?? null,
      funnel_role: lead.funnel_role ?? null,
    },
    summary: "Funnel escalated — free-text mid-flow. Sales team pinged.",
  });

  // Persist the escalation record + fire the notify.
  const { data: escalation } = await supabase
    .from("whatsapp_escalations")
    .insert({
      player_id: null,
      phone_e164: phoneE164,
      inbound_whatsapp_message_id: inboundMessageId,
      intent: "LEAD_SALES",
      reason: `lead_funnel_${reason}`,
      agent_context: {
        lead_id: lead.id,
        lead_full_name: lead.full_name,
        funnel_stage_at_escalation: lead.funnel_stage,
        funnel_role: lead.funnel_role,
        inbound_text: parsed?.text ?? null,
        auto_reply_sent: reply,
      },
      status: "open",
    })
    .select("id")
    .single();

  if (escalation?.id) {
    // Fire-and-forget — send failure is logged inside notify.
    notifyEscalation({
      escalationId: escalation.id,
      playerName: lead.full_name || null,
      phoneE164,
      intent: "LEAD_SALES",
      reason: `lead_funnel_${reason}`,
      inboundText: parsed?.text ?? "",
      agentReply: reply,
    }).catch((err) => {
      console.error("[lead-funnel-router] sales notify failed:", err);
    });
  }

  // We DID reply and DID handle it — don't let the agent double-message.
  return { handled: true, note: `escalated:${reason}` };
}

/* ─── diagnostics ─────────────────────────────────────────────── */

function looksLikeOutreach(text) {
  if (typeof text !== "string") return false;
  if (/^\s*oi\b/i.test(text)) return true;
  return containsZeroWidthChars(text);
}

function containsZeroWidthChars(text) {
  if (typeof text !== "string") return false;
  return /[​‌‍⁠]/.test(text);
}

/* ─── DB helpers ──────────────────────────────────────────────── */

const LEAD_SELECT = `
  id, full_name, phone_e164, do_not_contact,
  outreach_token, funnel_stage, funnel_role,
  funnel_q1_snapshot, funnel_q2_snapshot,
  funnel_q1_answered_at, funnel_q2_answered_at,
  updated_at
`;

async function loadActiveQuestion(supabase, slot) {
  const { data, error } = await supabase
    .from("whatsapp_lead_questions")
    .select("id, slot, prompt, buttons, explanation")
    .eq("slot", slot)
    .eq("active", true)
    .maybeSingle();
  if (error) {
    console.error(
      "[lead-funnel-router] loadActiveQuestion failed:",
      error,
      { slot },
    );
    return null;
  }
  return data ?? null;
}

/**
 * Convert an active-question row into the frozen snapshot shape the
 * grading helpers expect. The `id` here is the whatsapp_lead_questions
 * row id — we persist it into the lead's funnel_q*_snapshot so audits
 * can trace which candidate was live at send-time even after admin
 * rotates the active flag.
 */
function frozenSnapshot(activeQuestion) {
  return {
    id: activeQuestion.id,
    prompt: activeQuestion.prompt,
    buttons: activeQuestion.buttons,
    explanation: activeQuestion.explanation,
  };
}

/**
 * Render the snapshot's buttons into the {id, label} shape Z-API
 * needs, using PT and enforcing the 20-char WhatsApp button cap.
 */
function renderButtons(buttons) {
  return (buttons || []).slice(0, 3).map((b) => ({
    id: String(b.id),
    label: pickLangString(b.label, "pt").slice(0, MAX_BUTTON_LABEL_CHARS),
  }));
}

/**
 * For the whatsapp_messages `body` column — human-readable preview of
 * what the lead actually saw (prompt + numbered options).
 */
function renderQuizBody(promptText, buttons) {
  const opts = buttons.map((b, i) => `${i + 1}. ${b.label}`).join("\n");
  return opts ? `${promptText}\n\n${opts}` : promptText;
}

async function updateLead(supabase, leadId, patch) {
  const { error } = await supabase
    .from("leads")
    .update(patch)
    .eq("id", leadId);
  if (error) {
    console.error("[lead-funnel-router] updateLead failed:", error);
  }
}

async function logOutbound(supabase, opts) {
  const { phoneE164, body, via, providerMessageId, metadata } = opts;
  const { error } = await supabase.from("whatsapp_messages").insert({
    player_id: null, // leads have no players.id yet
    phone_e164: phoneE164,
    direction: "outbound",
    provider: "zapi",
    provider_message_id: providerMessageId,
    via,
    body,
    metadata,
  });
  if (error && error.code !== "23505") {
    // 23505 = duplicate (idempotency on messageId), ignore.
    console.error("[lead-funnel-router] logOutbound failed:", error);
  }
}

/* ─── Send helpers — never throw ──────────────────────────────── */

async function sendButtonsSafe(args) {
  try {
    const res = await sendWhatsappButtons(args);
    return { providerMessageId: res.messageId, error: null };
  } catch (err) {
    const msg = err?.message ?? String(err);
    console.error("[lead-funnel-router] sendButtons failed:", msg);
    return { providerMessageId: null, error: msg };
  }
}

async function sendTextSafe(args) {
  try {
    const res = await sendWhatsapp(args);
    return { providerMessageId: res.messageId, error: null };
  } catch (err) {
    const msg = err?.message ?? String(err);
    console.error("[lead-funnel-router] sendText failed:", msg);
    return { providerMessageId: null, error: msg };
  }
}

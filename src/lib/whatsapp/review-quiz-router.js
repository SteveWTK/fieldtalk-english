// src/lib/whatsapp/review-quiz-router.js
//
// T+24h mini-review quiz router. Called from zapi-processor.js BEFORE
// the AI agent dispatch on every regular inbound.
//
// Job:
//   1. Look up any active (`status = 'sent'`) whatsapp_review_sessions
//      row for this player.
//   2. If present AND the inbound is a valid answer (button tap OR
//      free-text 1/2/3/a/b/c), grade it, send the explanation, mark
//      the session 'answered'. Signal to the processor: "we handled
//      this, skip the agent." Also bump XP if the answer was correct.
//   3. If present AND the inbound looks unrelated, DEFER: bump
//      defer_count, either re-queue for the next cron pass (< limit)
//      or mark 'skipped' (at limit). Signal to the processor: "let
//      the agent handle it normally."
//   4. If no active session, signal the processor: "nothing to do,
//      continue to the agent."
//
// Never throws — every error path returns { handled: false } so a
// bug here can't silence a user conversation. Errors are logged.

import { sendWhatsapp } from "@/lib/integrations/zapi";

// Two deferrals per lesson-quiz is the cap. First "unrelated reply"
// after a quiz sends: silently re-queue (defer_count → 1). Second:
// silently re-queue (defer_count → 2). If we STILL haven't been
// answered on the next round-trip, the cron marks it expired.
// (The router itself never sends a "we skipped your quiz" message —
// silent is the right behaviour for a low-priority nudge.)
const DEFER_LIMIT = 2;

// Ordered — free-text fallback maps numeric prefix to button INDEX,
// letter prefix to button id (case-insensitive). "1" → buttons[0],
// "2" → buttons[1], "3" → buttons[2]. Anything more elaborate than
// a single token counts as unrelated → defer.
const NUMERIC_MAP = { 1: 0, 2: 1, 3: 2 };
const LETTER_MAP = { a: "a", b: "b", c: "c" };

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase — service role
 * @param {{
 *   player: { id: string, preferred_language?: string } | null,
 *   phoneE164: string,
 *   parsed: {
 *     text: string,
 *     button?: { id: string, label: string }
 *   },
 *   inboundMessageId: string | null,
 * }} opts
 * @returns {Promise<{
 *   handled: boolean,
 *   note?: string
 * }>}
 *   handled=true means the processor should NOT invoke the AI agent
 *   (we already replied). handled=false means fall through to the
 *   agent as normal.
 */
export async function routeReviewQuizReply(supabase, opts) {
  const { player, phoneE164, parsed, inboundMessageId } = opts;

  // Unmatched users can't be in a quiz session (session rows are
  // player-keyed), so nothing to do.
  if (!player?.id) return { handled: false };

  // Fetch the most recent `sent` session — MVP is one active quiz at
  // a time per player, but ordering keeps us safe if that ever changes.
  const { data: session, error } = await supabase
    .from("whatsapp_review_sessions")
    .select("*")
    .eq("player_id", player.id)
    .eq("status", "sent")
    .order("sent_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[review-quiz-router] session lookup failed:", error);
    return { handled: false };
  }
  if (!session) return { handled: false };

  const snapshot = normalizeSnapshot(session.question_snapshot);
  if (!snapshot) {
    // Malformed snapshot — mark skipped defensively so it doesn't
    // block future quizzes for this lesson, then fall through.
    console.error(
      "[review-quiz-router] session has malformed snapshot:",
      session.id,
    );
    await markSkipped(supabase, session.id, "malformed_snapshot");
    return { handled: false };
  }

  // ── Resolve which button (if any) the user picked ──────────────
  const pick = resolvePick({
    parsed,
    buttons: snapshot.buttons,
  });

  if (!pick) {
    // Unrelated reply → defer.
    await deferSession(supabase, session);
    return { handled: false, note: "quiz_deferred" };
  }

  // ── Grade + reply ──────────────────────────────────────────────
  const pickedButton = snapshot.buttons[pick.index];
  const isCorrect = pickedButton?.correct === true;

  const lang = normalizeLang(player.preferred_language);
  const reply = buildAnswerReply({
    lang,
    isCorrect,
    correctButton: snapshot.buttons.find((b) => b.correct === true),
    explanation: snapshot.explanation,
  });

  // Best-effort send — logging the answer + updating session state
  // is more important than the confirmation message landing, so we
  // don't fail the whole flow on send error.
  let sendMessageId = null;
  let sendError = null;
  try {
    const sendResult = await sendWhatsapp({
      telefone: phoneE164,
      mensagem: reply,
    });
    sendMessageId = sendResult.messageId;
  } catch (err) {
    sendError = err?.message ?? String(err);
    console.error("[review-quiz-router] confirmation send failed:", sendError);
  }

  // Log the outbound so the conversation view shows it. Duplicates
  // absorbed by the UNIQUE (provider, provider_message_id) constraint.
  await supabase.from("whatsapp_messages").insert({
    player_id: player.id,
    phone_e164: phoneE164,
    direction: "outbound",
    provider: "zapi",
    provider_message_id: sendMessageId,
    via: "review_quiz",
    body: reply,
    metadata: {
      review_session_id: session.id,
      lesson_id: session.lesson_id,
      question_id: session.question_id,
      is_correct: isCorrect,
      selected_button_id: pickedButton?.id ?? pick.buttonId,
      replied_to_inbound: inboundMessageId,
      send_error: sendError,
    },
  });

  // Mark session answered.
  await supabase
    .from("whatsapp_review_sessions")
    .update({
      status: "answered",
      answered_at: new Date().toISOString(),
      selected_button_id: pickedButton?.id ?? pick.buttonId,
      is_correct: isCorrect,
    })
    .eq("id", session.id);

  return {
    handled: true,
    note: isCorrect ? "quiz_answered_correct" : "quiz_answered_wrong",
  };
}

/* ─── helpers ─────────────────────────────────────────────────── */

/** Snapshot must have prompt/buttons/explanation to be usable. */
function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const buttons = Array.isArray(snapshot.buttons) ? snapshot.buttons : null;
  if (!buttons || buttons.length === 0) return null;
  return {
    id: typeof snapshot.id === "string" ? snapshot.id : null,
    prompt: snapshot.prompt || null,
    buttons,
    explanation: snapshot.explanation || null,
  };
}

/**
 * Given the parsed inbound + snapshot buttons, decide which button
 * (if any) the user picked. Returns `{ index, buttonId }` or null.
 *
 * Priority:
 *   1. Real button-tap payload → exact match by id.
 *   2. Free-text: single token 1/2/3 → index map.
 *   3. Free-text: single token a/b/c (case-insensitive) → id map.
 *   4. Otherwise → null (defer).
 */
function resolvePick({ parsed, buttons }) {
  // 1. Real button tap
  if (parsed.button?.id) {
    const idx = buttons.findIndex(
      (b) => String(b.id).toLowerCase() === parsed.button.id.toLowerCase(),
    );
    if (idx >= 0) return { index: idx, buttonId: buttons[idx].id };
  }

  // 2/3. Free-text fallback — single token only. "1 boa!" or "a sim"
  // are ambiguous enough to treat as unrelated; user gets to defer
  // to the agent + can still answer with just "1".
  const trimmed = (parsed.text || "").trim().toLowerCase();
  if (!trimmed) return null;
  if (/\s/.test(trimmed)) return null;

  if (Object.prototype.hasOwnProperty.call(NUMERIC_MAP, trimmed)) {
    const idx = NUMERIC_MAP[trimmed];
    if (idx < buttons.length) {
      return { index: idx, buttonId: buttons[idx].id };
    }
  }

  if (Object.prototype.hasOwnProperty.call(LETTER_MAP, trimmed)) {
    const wantedId = LETTER_MAP[trimmed];
    const idx = buttons.findIndex(
      (b) => String(b.id).toLowerCase() === wantedId,
    );
    if (idx >= 0) return { index: idx, buttonId: buttons[idx].id };
  }

  return null;
}

async function deferSession(supabase, session) {
  const nowIso = new Date().toISOString();
  const nextCount = (session.defer_count || 0) + 1;
  const patch = {
    defer_count: nextCount,
    deferred_at: nowIso,
  };

  if (nextCount >= DEFER_LIMIT) {
    patch.status = "skipped";
    patch.skipped_at = nowIso;
  } else {
    // Re-queue for the next cron pass. queued_at is reset so the
    // "recently queued" ordering pushes this back behind fresh ones.
    patch.status = "queued";
    patch.queued_at = nowIso;
  }

  const { error } = await supabase
    .from("whatsapp_review_sessions")
    .update(patch)
    .eq("id", session.id);

  if (error) {
    console.error("[review-quiz-router] defer update failed:", error);
  }
}

async function markSkipped(supabase, sessionId, reason) {
  const nowIso = new Date().toISOString();
  await supabase
    .from("whatsapp_review_sessions")
    .update({
      status: "skipped",
      skipped_at: nowIso,
      metadata: { skipped_reason: reason },
    })
    .eq("id", sessionId);
}

function normalizeLang(lang) {
  if (lang === "en" || lang === "pt") return lang;
  return "pt";
}

/**
 * Build the confirmation reply the user sees after answering.
 * Warm + short. Explanation shown either way. Uses stored
 * button.label so the "correct answer was X" line reads naturally.
 */
function buildAnswerReply({ lang, isCorrect, correctButton, explanation }) {
  const isEn = lang === "en";
  const openerCorrect = isEn ? "✅ Correct!" : "✅ Certo!";
  const openerWrong = isEn ? "❌ Not quite." : "❌ Quase!";
  const correctAnswerLine = correctButton?.label
    ? isEn
      ? `The right answer is *${pickLangString(correctButton.label, lang)}*.`
      : `A resposta certa é *${pickLangString(correctButton.label, lang)}*.`
    : null;

  const explanationText = explanation
    ? pickLangString(explanation, lang)
    : null;

  const parts = [isCorrect ? openerCorrect : openerWrong];
  if (!isCorrect && correctAnswerLine) parts.push(correctAnswerLine);
  if (explanationText) parts.push(explanationText);
  return parts.join("\n\n");
}

/** { pt, en } → language-specific string, pt fallback. */
function pickLangString(bundle, lang) {
  if (typeof bundle === "string") return bundle;
  if (!bundle || typeof bundle !== "object") return "";
  return bundle[lang] || bundle.pt || bundle.en || "";
}

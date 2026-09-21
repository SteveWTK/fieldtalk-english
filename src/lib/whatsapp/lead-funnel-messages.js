// src/lib/whatsapp/lead-funnel-messages.js
//
// Portuguese-first copy templates for the WhatsApp lead-funnel replies.
// The funnel is PT-first because our primary market is Brazil; the
// English footer used elsewhere (e.g. review-quiz) is deliberately
// absent — leads reading the funnel are decision-makers being sold to,
// and mixed-language copy weakens the message.
//
// Each builder returns a fully-rendered string. The router composes
// one WhatsApp bubble per user turn — reply + explanation + next
// question all get bundled so the lead sees a single message per
// interaction, matching modern WhatsApp UX conventions.

import { pickLangString } from "@/lib/whatsapp/quiz-grading";

/**
 * Q1-answer reply that also carries Q2's prompt into the same message.
 * The router calls sendWhatsappButtons with THIS body + Q2's buttons,
 * so the lead gets one bubble containing: their result, why, and the
 * next question. Feels like a conversation, not a form.
 */
export function buildQ1ReplyWithQ2Prompt({
  isCorrect,
  correctButtonLabel,
  q1Explanation,
  q2Prompt,
}) {
  const parts = [];
  parts.push(isCorrect ? "✅ Certo!" : "❌ Quase!");
  if (!isCorrect && correctButtonLabel) {
    parts.push(`A resposta certa era *${correctButtonLabel}*.`);
  }
  if (q1Explanation) {
    parts.push(pickLangString(q1Explanation, "pt"));
  }
  parts.push(""); // blank line before Q2
  parts.push("Agora a próxima:");
  parts.push("");
  parts.push(pickLangString(q2Prompt, "pt"));
  return parts.join("\n");
}

/**
 * Q2-answer reply. No follow-up question — this closes the WhatsApp
 * arc and hands off to the web demo via the CTA link.
 *
 * `roleCta` is the role-tailored CTA line ("Adicione seu primeiro
 * jogador →", "Convide sua turma →", etc.) — see lead-funnel-cta.js.
 * `ctaLink` is the /demo/<token> URL.
 */
export function buildQ2ReplyWithCta({
  isCorrect,
  correctButtonLabel,
  q2Explanation,
  roleCta,
  ctaLink,
}) {
  const parts = [];
  parts.push(isCorrect ? "✅ Certo!" : "❌ Quase!");
  if (!isCorrect && correctButtonLabel) {
    parts.push(`A resposta certa era *${correctButtonLabel}*.`);
  }
  if (q2Explanation) {
    parts.push(pickLangString(q2Explanation, "pt"));
  }
  parts.push("");
  // Bridge line — same for every role.
  parts.push(
    "A Global Player treina jogadores para se comunicar em inglês — dentro e fora de campo.",
  );
  parts.push("");
  parts.push(roleCta);
  parts.push(ctaLink);
  return parts.join("\n");
}

/**
 * Free-text escape hatch. Mid-funnel the lead typed something that
 * isn't a valid answer — canned warm reply while we ping the sales
 * team. No further auto-sends until a human takes over.
 */
export function buildFreeTextEscalationReply() {
  return [
    "Anotado.",
    "",
    "Um da nossa equipe vai te responder por aqui em breve.",
  ].join("\n");
}

/**
 * Sent 24h after Q1 (or Q2) if the lead ghosted. Nudge cron uses this
 * (PR #4). Kept here so all funnel copy lives in one file.
 */
export function buildNudge({ stage }) {
  if (stage === "q1_sent") {
    return "Oi de novo — ficou curioso pela resposta? A pergunta ainda tá em pé aqui em cima 👆";
  }
  if (stage === "q2_sent") {
    return "Só faltando uma resposta pra você ver a demo. 30 segundos, promessa.";
  }
  return "Oi de novo — dá uma olhada quando puder.";
}

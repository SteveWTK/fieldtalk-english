// src/components/demo/DemoCta.js
//
// Final card of the demo. Hand-off back to the WhatsApp conversation
// with the salesperson who launched the outreach, so they can finalise
// the sale (plan, deal, onboarding the lead's players).
//
// The individual "join" signup flow doesn't fit this audience — an
// agent / coach / academy director needs a coach-portal that lets them
// add their players. That work sits in the Stage 6 rebrand backlog
// (Light-mode / club portal). Until it lands, every role routes to
// the salesperson chat.
//
// Deep-link priority:
//   1. Salesperson's personal WhatsApp (leads.created_by → phone_e164).
//      This lands the lead back in the SAME chat they came from —
//      warmer than starting a new thread.
//   2. Business number, when salesperson has no phone on file.
//      Not ideal but preserves the funnel; the AI agent or humans
//      watching the business account can pick it up.

"use client";

import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";

const ROLE_COPY = {
  agent: {
    headline: "Isto é o que seus jogadores fariam todo dia.",
    body: (spName) =>
      `Volta pra conversa com ${spName ? spName : "quem te chamou"} pra ver planos e como incluir seus jogadores.`,
  },
  coach: {
    headline: "Isto é o que sua turma fará todo dia.",
    body: (spName) =>
      `Volta pra conversa com ${spName ? spName : "quem te chamou"} pra combinar como incluir sua turma.`,
  },
  club_staff: {
    headline: "Isto é o que seus atletas fariam todo dia.",
    body: (spName) =>
      `Volta pra conversa com ${spName ? spName : "quem te chamou"} pra testar com um jogador e conversar sobre plano.`,
  },
  academy_director: {
    headline: "Isto é o que seu elenco fará todo dia.",
    body: (spName) =>
      `Volta pra conversa com ${spName ? spName : "quem te chamou"} pra montar a demo pro elenco e ver condições.`,
  },
  other: {
    headline: "Isto é o que os jogadores fariam todo dia.",
    body: (spName) =>
      `Volta pra conversa com ${spName ? spName : "quem te chamou"} pra combinar os próximos passos.`,
  },
};

/**
 * @param {{
 *   role: string | null,
 *   token: string,
 *   firstName: string | null,
 *   salesperson: { firstName: string | null, phoneE164: string | null } | null,
 *   businessNumber: string | null,
 * }} props
 */
export default function DemoCta({
  role,
  firstName,
  salesperson,
  businessNumber,
}) {
  const copy = ROLE_COPY[role] || ROLE_COPY.other;
  const spName = salesperson?.firstName || null;
  const bodyText = copy.body(spName);
  const buttonLabel = spName
    ? `Falar com ${spName} no WhatsApp →`
    : "Voltar pro WhatsApp →";

  const targetPhone = salesperson?.phoneE164 || businessNumber || null;
  const waLink = targetPhone ? buildHandoffLink(targetPhone, spName, firstName) : null;

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-14 h-14 rounded-full bg-accent-400/15 flex items-center justify-center mb-4">
        <CheckCircle2 className="w-7 h-7 text-accent-300" />
      </div>

      <p className="text-[10px] uppercase tracking-[0.3em] text-accent-400/80 font-semibold mb-2">
        90 segundos.
      </p>
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-primary-50 mb-3 font-display leading-tight max-w-lg">
        {firstName ? `Pronto, ${firstName}. ` : ""}
        {copy.headline}
      </h2>
      <p className="text-sm text-primary-300 leading-relaxed max-w-md mb-8">
        {bodyText}
      </p>

      {waLink ? (
        <Link
          href={waLink}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-base font-semibold transition-colors"
        >
          <MessageCircle className="w-5 h-5" />
          {buttonLabel}
        </Link>
      ) : (
        // No target phone configured — should never happen in prod
        // (we always have at least the business number), but guarded
        // so the demo doesn't render a dead button.
        <p className="text-sm text-primary-400 italic">
          Volta pra conversa no WhatsApp com quem te enviou o link para
          seguirmos.
        </p>
      )}

      <p className="text-[11px] text-primary-500 mt-6">
        Planos, condições e criação de acessos são combinados por lá.
      </p>
    </div>
  );
}

/**
 * Build the wa.me deeplink to the salesperson (or business number).
 * The pre-filled message name-drops both people so the salesperson
 * immediately knows who's coming back to them post-demo.
 */
function buildHandoffLink(targetPhone, salespersonFirstName, leadFirstName) {
  const digits = String(targetPhone).replace(/[^\d]/g, "");
  const lines = [];
  if (salespersonFirstName) {
    lines.push(`Oi ${salespersonFirstName}! `);
  } else {
    lines.push("Oi! ");
  }
  lines.push(
    leadFirstName
      ? `Aqui é ${leadFirstName}. Acabei de ver a demo da Global Player — quero entender melhor como funciona pro time.`
      : "Acabei de ver a demo da Global Player — quero entender melhor como funciona pro time.",
  );
  const text = lines.join("");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

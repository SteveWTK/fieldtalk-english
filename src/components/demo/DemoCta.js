// src/components/demo/DemoCta.js
//
// Final card of the demo. Hand-off to Paul (or whoever's on
// NEXT_PUBLIC_SALES_WHATSAPP_PHONE / _NAME) so the sale is closed by
// a human — plan, deal, onboarding, the lead's players.
//
// The individual "join" signup flow doesn't fit this audience — an
// agent / coach / academy director needs a coach-portal that lets them
// add their players. That work sits in the Stage 6 rebrand backlog
// (Light-mode / club portal). Until it lands, every role routes to
// the sales contact.
//
// Note: prior versions of this component looked up the lead's
// created_by → their players.phone_e164 to hand off to whoever launched
// the outreach. We reverted because David sends outreach but Paul
// closes; the lead already has David's chat context from the initial
// DM, and everyone converges on Paul for consistency.

"use client";

import Link from "next/link";
import { CheckCircle2, MessageCircle } from "lucide-react";
import {
  getSalesContact,
  buildSalesWhatsappLink,
} from "@/lib/sales/contact";

const ROLE_COPY = {
  agent: {
    headline: "Isto é o que seus jogadores fariam todo dia.",
    body: (spName) =>
      `Volta pra conversa com ${spName} pra ver planos e como incluir seus jogadores.`,
  },
  coach: {
    headline: "Isto é o que sua turma fará todo dia.",
    body: (spName) =>
      `Volta pra conversa com ${spName} pra combinar como incluir sua turma.`,
  },
  club_staff: {
    headline: "Isto é o que seus atletas fariam todo dia.",
    body: (spName) =>
      `Volta pra conversa com ${spName} pra testar com um jogador e conversar sobre plano.`,
  },
  academy_director: {
    headline: "Isto é o que seu elenco fará todo dia.",
    body: (spName) =>
      `Volta pra conversa com ${spName} pra montar a demo pro elenco e ver condições.`,
  },
  other: {
    headline: "Isto é o que os jogadores fariam todo dia.",
    body: (spName) =>
      `Volta pra conversa com ${spName} pra combinar os próximos passos.`,
  },
};

/**
 * @param {{
 *   role: string | null,
 *   firstName: string | null,
 *   showSelfServeCta?: boolean,   // renders the "Ver os planos" secondary link
 * }} props
 */
export default function DemoCta({
  role,
  firstName,
  showSelfServeCta = false,
}) {
  const { name: salesName } = getSalesContact();
  const copy = ROLE_COPY[role] || ROLE_COPY.other;
  const bodyText = copy.body(salesName);
  const buttonLabel = `Falar com ${salesName} no WhatsApp →`;

  const prefilledMessage = firstName
    ? `Oi ${salesName}! Aqui é ${firstName}. Acabei de ver a demo da Global Player — quero entender melhor como funciona pro time.`
    : `Oi ${salesName}! Acabei de ver a demo da Global Player — quero entender melhor como funciona pro time.`;
  const waLink = buildSalesWhatsappLink({ prefilledMessage });

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

      <Link
        href={waLink}
        target="_blank"
        rel="noopener"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-base font-semibold transition-colors"
      >
        <MessageCircle className="w-5 h-5" />
        {buttonLabel}
      </Link>

      {/* Self-serve secondary — only rendered on the direct-sample
          /demo page (not on the funnel /demo/[token] flow). Deliberately
          text-link styling so the primary "talk to Paul" action still
          dominates the eye. */}
      {showSelfServeCta && (
        <Link
          href="/pricing"
          className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary-300 hover:text-primary-50 underline-offset-4 hover:underline transition-colors"
        >
          Prefiro explorar os planos por conta própria →
        </Link>
      )}

      <p className="text-[11px] text-primary-500 mt-6">
        Planos, condições e criação de acessos são combinados por lá.
      </p>
    </div>
  );
}

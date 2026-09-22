// src/components/demo/DemoCta.js
//
// Final card of the demo. Role-tailored copy + a single lime button to
// signup. The signup link carries the outreach token as a query param
// so the LeadAttributionCapture (mounted in layout.js) can mark the
// lead as converted once the user finishes signup.

"use client";

import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

const ROLE_CTA = {
  agent: {
    headline: "Isto é o que seus jogadores fariam todo dia.",
    button: "Adicione seu primeiro jogador →",
  },
  coach: {
    headline: "Isto é o que sua turma fará todo dia.",
    button: "Convide sua turma →",
  },
  club_staff: {
    headline: "Isto é o que seus atletas fariam todo dia.",
    button: "Faça um teste com um jogador →",
  },
  academy_director: {
    headline: "Isto é o que seu elenco fará todo dia.",
    button: "Peça uma demo pro seu elenco →",
  },
  other: {
    headline: "Isto é o que seus jogadores fariam todo dia.",
    button: "Criar minha conta →",
  },
};

/**
 * @param {{ role: string | null, token: string, firstName: string | null }} props
 */
export default function DemoCta({ role, token, firstName }) {
  const copy = ROLE_CTA[role] || ROLE_CTA.other;
  const signupHref = `/auth/signup?attribution_lead_token=${encodeURIComponent(token)}`;

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
        A demo inteira cabe no bolso. Nada de agenda, nada de plataforma
        pesada — 5 minutos por dia, no celular, entre um treino e outro.
      </p>

      <Link
        href={signupHref}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-base font-semibold transition-colors"
      >
        {copy.button}
      </Link>

      <p className="text-[11px] text-primary-500 mt-6">
        Sem cartão. Sem pegadinha.
      </p>
    </div>
  );
}

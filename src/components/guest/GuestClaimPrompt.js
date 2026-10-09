// src/components/guest/GuestClaimPrompt.js
//
// Shown in place of PaywallCard when a GUEST tries to access any
// lesson other than the designated demo (Lesson 1). The paywall is
// the wrong metaphor for them — Lesson 2 is still free, they just
// need an account to save their progress and continue.
//
// Primary CTA → /claim-account (the account-creation flow with
// email+password or Google). Secondary CTA → "Talk to Paul" so
// agents/coaches who want a human path have one.

"use client";

import Link from "next/link";
import { Trophy, ArrowRight, MessageCircle } from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  getSalesContact,
  buildSalesWhatsappLink,
} from "@/lib/sales/contact";

const COPY = {
  en: {
    eyebrow: "Save your progress",
    headline: "Create a free account to continue",
    body: "You've unlocked Lesson 2 — but first, create an account so your XP from Lesson 1 doesn't vanish. Still free; no card needed.",
    cta: "Create free account",
    talkTo: (name) => `Or talk to ${name} on WhatsApp →`,
    talkPrefill: (name) =>
      `Hi ${name}! I finished Lesson 1 of Global Player — can you walk me through signing up?`,
  },
  pt: {
    eyebrow: "Salve seu progresso",
    headline: "Crie uma conta grátis pra continuar",
    body: "Você desbloqueou a Aula 2 — mas antes, crie uma conta pra não perder o XP da Aula 1. Continua grátis, sem cartão.",
    cta: "Criar conta grátis",
    talkTo: (name) => `Ou fale com ${name} no WhatsApp →`,
    talkPrefill: (name) =>
      `Oi ${name}! Terminei a Aula 1 da Global Player — pode me ajudar a criar uma conta?`,
  },
};

export default function GuestClaimPrompt() {
  const { lang } = useLanguage();
  const copy = COPY[lang === "pt" ? "pt" : "en"];
  const { name: salesName } = getSalesContact();
  const talkLink = buildSalesWhatsappLink({
    prefilledMessage: copy.talkPrefill(salesName),
  });

  return (
    <section className="max-w-2xl mx-auto">
      <div className="relative rounded-3xl bg-accent-400/[0.04] border border-accent-400/40 p-6 sm:p-10 text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-accent-400/15 flex items-center justify-center">
          <Trophy className="w-6 h-6 text-accent-300" />
        </div>
        <p className="text-[10px] sm:text-xs tracking-[0.35em] uppercase text-accent-300 font-semibold mb-2">
          {copy.eyebrow}
        </p>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3 text-primary-50">
          {copy.headline}
        </h2>
        <p className="text-sm sm:text-base text-primary-200 mb-6 max-w-md mx-auto leading-relaxed">
          {copy.body}
        </p>
        <div className="flex flex-col items-center gap-3">
          <Link
            href="/claim-account"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 font-bold text-sm tracking-wide transition-colors"
          >
            {copy.cta}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href={talkLink}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 text-sm text-primary-300 hover:text-primary-100 underline-offset-4 hover:underline transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-accent-300" />
            {copy.talkTo(salesName)}
          </Link>
        </div>
      </div>
    </section>
  );
}

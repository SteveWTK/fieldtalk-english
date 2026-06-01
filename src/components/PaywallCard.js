// src/components/PaywallCard.js
//
// Single, reusable paywall surface. Rendered when a signed-in user
// tries to access edition content they haven't paid for. Two variants:
//
//   - variant="inline"  → small banner, used at the top of the lesson
//                         list to remind unpaid users that most lessons
//                         are locked.
//   - variant="full"    → full-section card, used on the lesson page
//                         in place of the lesson content itself.
//
// Both link to /pricing?edition=<slug> so the CTA carries the right
// edition through. Dark theme matches the rest of WC2026 surfaces.
"use client";

import Link from "next/link";
import { Lock, ArrowRight, Sparkles } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const COPY = {
  en: {
    eyebrow: "Locked",
    headline: "Unlock the full edition",
    body: "You're previewing the free taster. Get full access to every lesson, sticker pack, squad slot and prediction window.",
    cta: "See plans",
    inlineBody: "Most lessons are locked — get full access to keep going.",
  },
  pt: {
    eyebrow: "Bloqueado",
    headline: "Desbloqueie a edição completa",
    body: "Você está na prévia gratuita. Tenha acesso total a todas as lições, pacotes de figurinhas, vagas do Squad e janelas de predição.",
    cta: "Ver planos",
    inlineBody:
      "A maioria das lições está bloqueada — desbloqueie para continuar.",
  },
};

export default function PaywallCard({ edition = "wc2026", variant = "full" }) {
  const { userLanguage } = useTranslation();
  const t = COPY[userLanguage === "pt" ? "pt" : "en"];
  const href = `/pricing?edition=${encodeURIComponent(edition)}`;

  if (variant === "inline") {
    return (
      <Link
        href={href}
        className="group flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-400/40 hover:border-emerald-300 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-500/25 flex items-center justify-center">
            <Lock className="w-4 h-4 text-emerald-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-emerald-200/80 font-semibold">
              {t.eyebrow}
            </p>
            <p className="text-sm sm:text-base font-bold text-white truncate">
              {t.inlineBody}
            </p>
          </div>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500 group-hover:bg-emerald-400 text-[#062013] text-xs sm:text-sm font-bold tracking-wide">
          {t.cta}
          <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </Link>
    );
  }

  return (
    <section className="max-w-2xl mx-auto">
      <div className="relative rounded-3xl bg-white/[0.04] backdrop-blur-sm border border-emerald-400/30 p-6 sm:p-10 shadow-[0_0_40px_rgba(16,185,129,0.08)] text-center">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
          <Lock className="w-6 h-6 text-emerald-300" />
        </div>
        <p className="text-[10px] sm:text-xs tracking-[0.35em] uppercase text-emerald-300/80 font-semibold mb-2">
          {t.eyebrow}
        </p>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
          {t.headline}
        </h2>
        <p className="text-sm sm:text-base text-white/65 mb-6 max-w-md mx-auto leading-relaxed">
          {t.body}
        </p>
        <Link
          href={href}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#062013] font-bold text-sm tracking-wide transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          {t.cta}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}

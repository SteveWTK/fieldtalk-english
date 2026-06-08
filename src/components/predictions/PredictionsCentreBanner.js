// src/components/predictions/PredictionsCentreBanner.js
//
// Dashboard banner — shows on the dashboard when the user has at
// least one upcoming match where one or more predictions are
// unmade and the kickoff hasn't passed yet. Tap-through to the
// Centre. Renders null otherwise (no nag for users who are fully
// caught up).
//
// Uses the same /api/match-predictions/list endpoint as the Centre
// page; small enough payload to fetch on every dashboard mount.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/contexts/LanguageContext";

const COPY = {
  en: {
    titleSingular: "1 match open for predictions",
    titlePluralPrefix: "",
    titlePluralSuffix: " matches open for predictions",
    body: "Submit your picks before kickoff to earn bonus XP.",
    cta: "Open Predictions Centre",
  },
  pt: {
    titleSingular: "1 jogo aberto para palpite",
    titlePluralPrefix: "",
    titlePluralSuffix: " jogos abertos para palpite",
    body: "Faça seus palpites antes do apito para ganhar XP bônus.",
    cta: "Abrir Central de Palpites",
  },
};

export default function PredictionsCentreBanner() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.en;
  const [openCount, setOpenCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/match-predictions/list");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const now = Date.now();
        // Count "actionable" matches: predictions open, kickoff in
        // the future, and at least one of the three picks missing.
        let count = 0;
        for (const m of json.upcoming || []) {
          const kickoffMs = m.kickoff_at
            ? new Date(m.kickoff_at).getTime()
            : 0;
          if (kickoffMs <= now) continue;
          const p = m.predictions || {};
          const missing =
            !p.winner || !p.exact_score || !p.first_scorer_team;
          if (missing) count += 1;
        }
        setOpenCount(count);
      } catch {
        // Silent — the banner is a nudge, not critical chrome.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (openCount <= 0) return null;

  const title =
    openCount === 1
      ? copy.titleSingular
      : `${copy.titlePluralPrefix}${openCount}${copy.titlePluralSuffix}`;

  return (
    <Link
      href="/predictions"
      data-tour-id="predictions"
      className="group flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-amber-300/15 via-amber-300/10 to-transparent border border-amber-300/40 hover:border-amber-300 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-9 h-9 rounded-full bg-amber-300/25 flex items-center justify-center">
          <Trophy className="w-4 h-4 text-amber-200" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-amber-200/80 font-semibold">
            {copy.cta}
          </p>
          <p className="text-sm sm:text-base font-bold text-white truncate">
            {title}
          </p>
        </div>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-300 group-hover:bg-amber-200 text-[#1a0e00] text-xs sm:text-sm font-bold tracking-wide">
        {copy.body.split(".")[0].length > 30 ? "Predict" : "Predict"}
        <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}

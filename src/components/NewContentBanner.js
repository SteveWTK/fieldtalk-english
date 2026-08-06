// src/components/NewContentBanner.js
//
// "New content available!" dashboard / lesson-list banner. Pairs
// with the push notification fired from /api/admin/announce-new-
// content — push catches users off the site, this catches them
// when they come back.
//
// Detection (client-side, no extra DB writes needed):
//   1. Fetch the current count of lessons with under_construction =
//      false via /api/lessons/open-count.
//   2. Compare to localStorage `ft.contentSeenCount.<userId>`.
//   3. If stored < current → banner lights up. Tap-through goes to
//      /lesson; on click we update the stored count so the banner
//      retires until the NEXT batch is released.
//   4. If no stored value exists yet (first-ever visit OR pre-
//      feature-ship user), we seed it to the current count silently
//      — they haven't "missed" anything yet.

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/contexts/LanguageContext";

const COPY = {
  en: {
    eyebrow: "New content available",
    body: "Fresh lessons just landed. Pick up where you left off.",
    cta: "See lessons",
  },
  pt: {
    eyebrow: "Novo conteúdo disponível",
    body: "Novas aulas chegaram. Continue de onde parou.",
    cta: "Ver aulas",
  },
};

const storageKey = (userId) => `ft.contentSeenCount.${userId}`;

export default function NewContentBanner() {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.en;
  const [show, setShow] = useState(false);
  const [currentCount, setCurrentCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/lessons/open-count");
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const count = Number(json?.count || 0);
        setCurrentCount(count);
        const stored = window.localStorage.getItem(storageKey(user.id));
        if (stored == null) {
          // First time we've seen this user — seed silently so we
          // don't false-positive on day one.
          window.localStorage.setItem(storageKey(user.id), String(count));
          return;
        }
        const seen = Number(stored);
        if (Number.isFinite(seen) && count > seen) setShow(true);
      } catch {
        // Silent — banner is a nudge, not critical.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const markSeen = () => {
    if (!user?.id) return;
    try {
      window.localStorage.setItem(
        storageKey(user.id),
        String(currentCount)
      );
    } catch {
      /* private mode — non-fatal */
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <Link
      href="/lesson"
      onClick={markSeen}
      className="group flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-accent-500/20 via-accent-500/10 to-transparent border border-accent-400/50 hover:border-accent-300 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-9 h-9 rounded-full bg-accent-500/25 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-accent-200" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-accent-200/80 font-semibold">
            {copy.eyebrow}
          </p>
          <p className="text-sm sm:text-base font-bold text-white truncate">
            {copy.body}
          </p>
        </div>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent-500 group-hover:bg-accent-400 text-[#062013] text-xs sm:text-sm font-bold tracking-wide">
        {copy.cta}
        <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}

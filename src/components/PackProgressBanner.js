// src/components/PackProgressBanner.js
//
// Discreet side-pill mounted on lesson pages. Two states:
//
//   1. Working towards a pack
//      "Only 80 XP to your next pack of stickers"
//      with a thin progress bar.
//
//   2. Pack just unlocked (effective total just crossed a multiple of
//      the pack cost — we detect this between renders).
//      "🎉 New pack unlocked!"
//      Auto-dismisses after a few seconds back into state 1.
//
// `effectiveXp` is what the lesson page knows is the user's *live* XP:
// player_progress.total_xp from when the lesson loaded, plus the
// session's accumulated `xpEarned`. The banner doesn't itself talk to
// the DB — it just visualises the running total.
//
// Position: fixed bottom-right on mobile (above the next/prev nav),
// fixed right-edge centre-vertically on lg+. Always non-blocking.
"use client";

import React, { useEffect, useRef, useState } from "react";
import { Package, Sparkles, X } from "lucide-react";

export default function PackProgressBanner({
  effectiveXp = 0,
  packXpCost = 200,
}) {
  const cost = Math.max(1, Number(packXpCost) || 200);
  const xp = Math.max(0, Number(effectiveXp) || 0);
  const packsEarned = Math.floor(xp / cost);
  const xpToNext = cost - (xp % cost);

  // Detect a "newly unlocked" pack between renders so we can flash a
  // celebratory state. Keyed on packsEarned crossing upward.
  const prevPacksRef = useRef(packsEarned);
  const [celebrating, setCelebrating] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (packsEarned > prevPacksRef.current) {
      setCelebrating(true);
      setDismissed(false);
      const tid = setTimeout(() => setCelebrating(false), 4500);
      prevPacksRef.current = packsEarned;
      return () => clearTimeout(tid);
    }
    prevPacksRef.current = packsEarned;
  }, [packsEarned]);

  if (dismissed) return null;

  // Don't render at all if we have no XP yet — keeps the lesson UI
  // uncluttered for brand-new users until they've earned something.
  if (xp <= 0) return null;

  const pctIntoNext = Math.round(((cost - xpToNext) / cost) * 100);

  return (
    <div
      className="ppb-wrap fixed z-30 right-3 sm:right-4 bottom-20 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 max-w-[16rem] pointer-events-none"
      aria-live="polite"
    >
      <div
        className={`pointer-events-auto rounded-xl shadow-lg border backdrop-blur-sm px-3 py-2.5 ppb-fade-in ${
          celebrating
            ? "bg-emerald-500/95 border-emerald-300/60 text-white"
            : "bg-blue-800/70 border-blue-300/30 text-white"
        }`}
      >
        <div className="flex items-start gap-2">
          <div className="shrink-0 mt-0.5">
            {celebrating ? (
              <Sparkles className="w-4 h-4 text-amber-200 ppb-sparkle" />
            ) : (
              <Package className="w-4 h-4 text-emerald-200" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {celebrating ? (
              <p className="text-xs sm:text-sm font-bold leading-tight">
                New pack unlocked! 🎉
                <span className="block text-[11px] font-medium opacity-90 mt-0.5">
                  Open it in your Ultimate Team
                </span>
              </p>
            ) : (
              <>
                <p className="text-[11px] sm:text-xs font-semibold leading-tight">
                  Only{" "}
                  <span className="text-emerald-200 font-bold">{xpToNext}</span>{" "}
                  XP to your next pack
                </p>
                <div className="mt-1.5 h-1 rounded-full bg-white/15 overflow-hidden">
                  <div
                    className="h-full bg-emerald-300 transition-[width] duration-500"
                    style={{ width: `${pctIntoNext}%` }}
                  />
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 text-white/60 hover:text-white -mr-1 -mt-0.5 p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes ppb-fade-in {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes ppb-sparkle {
          0%,
          100% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(10deg) scale(1.15);
          }
        }
        :global(.ppb-fade-in) {
          animation: ppb-fade-in 0.35s ease-out forwards;
        }
        :global(.ppb-sparkle) {
          animation: ppb-sparkle 1.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// src/components/stickers/PackOpeningModal.js
//
// Three states:
//   - "opening"  → spinner while POST /api/packs/open is in flight.
//   - "revealed" → 7 cards fade-in one-by-one with rarity-glow staggered
//                  by ~180ms. "New!" badge on first-time pulls.
//   - "error"    → simple message, allows retry close.
//
// Calls onClose with refetch=true after a successful reveal so the
// dashboard refreshes its pack count and collection size.
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkles, Package, ArrowRight, TrendingUp } from "lucide-react";
import StickerCard from "./StickerCard";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * resumeAction — optional `{ href, label }` set by the dashboard when
 * the user arrived here via the mid-lesson "Open" banner. Surfaces a
 * primary "Resume lesson" CTA after the reveal so they can hop back
 * to their exact step without scanning the page.
 */
export default function PackOpeningModal({ open, onClose, resumeAction }) {
  const { user } = useAuth();
  const { t } = useTranslation(user);
  const [phase, setPhase] = useState("opening"); // opening | revealed | error
  const [stickers, setStickers] = useState([]);
  const [packsRemaining, setPacksRemaining] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  // "Dynamic sticker values are now live" — one-off announcement
  // shown the first time a user opens a pack after we turned on
  // API-Football-driven recompute. Gated per-user via localStorage
  // so it appears exactly once. Sits above the revealed cards so
  // they see it WHILE looking at their new players.
  const [showDynamicValuesNotice, setShowDynamicValuesNotice] = useState(false);
  // Distinguish "the XP hasn't been written yet, try again in a sec"
  // from a real failure. The /api/packs/open route returns the
  // computed totals on a 400 so we can spot a near-miss like
  // packsEarned === packsOpened (race between awardXp and this
  // check) vs an actual zero.
  const [isSyncIssue, setIsSyncIssue] = useState(false);
  // Bumping this re-runs the open effect — used by the Try again
  // button below.
  const [attemptKey, setAttemptKey] = useState(0);

  // Trigger the open request the moment the modal mounts (and on
  // every attemptKey bump, so the retry path is a single state
  // setter away).
  useEffect(() => {
    if (!open) return;
    setPhase("opening");
    setStickers([]);
    setErrorMessage("");
    setIsSyncIssue(false);

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/packs/open", { method: "POST" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          // "No packs available" specifically usually means the
          // user crossed the threshold via mid-lesson XP that
          // hasn't fully landed yet — the partial commit can be
          // slow under flaky network. Distinguish it from generic
          // failures so the UI can offer a soft retry instead of
          // the alarming "Something went wrong" we used to show.
          const looksLikeSyncIssue =
            data?.error === "No packs available" ||
            res.status === 425; // Too Early (future-proofing)
          setIsSyncIssue(looksLikeSyncIssue);
          setErrorMessage(data.error || "Could not open pack");
          setPhase("error");
          return;
        }
        setStickers(data.stickers || []);
        setPacksRemaining(data.packsRemaining || 0);
        setPhase("revealed");
      } catch {
        if (!cancelled) {
          setErrorMessage("Network error. Please try again.");
          setPhase("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, attemptKey]);

  // Decide whether to render the dynamic-values notice each time the
  // modal opens. Only flips to true when:
  //   - we know the user (auth has resolved)
  //   - they haven't dismissed it before (localStorage flag absent)
  // Once dismissed, the localStorage write below keeps it hidden
  // on every future pack open.
  useEffect(() => {
    if (!open || !user?.id) return;
    try {
      const key = `ft.dynamicValuesNotice.${user.id}`;
      if (window.localStorage.getItem(key) === "1") {
        setShowDynamicValuesNotice(false);
        return;
      }
    } catch {
      /* private mode — show it; dismissal will fail silently too */
    }
    setShowDynamicValuesNotice(true);
  }, [open, user]);

  const dismissDynamicValuesNotice = () => {
    setShowDynamicValuesNotice(false);
    if (!user?.id) return;
    try {
      window.localStorage.setItem(`ft.dynamicValuesNotice.${user.id}`, "1");
    } catch {
      /* private mode — non-fatal */
    }
  };

  if (!open) return null;

  return (
    <div
      // overflow-y-auto on the outer backdrop lets the user scroll the
      // 7 revealed cards on tall phones without trapping content above
      // the fold. items-start + py-* gives the modal a comfortable top
      // anchor instead of dead-centring an overflowing block.
      className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-sm"
      onClick={() => phase !== "opening" && onClose?.({ refetch: phase === "revealed" })}
      role="dialog"
      aria-modal="true"
    >
      {/* Viewport-fixed close affordance so users on mobile always have
          a clear way back to Ultimate Team — icon-only is too easy to
          miss after scrolling through the cards. Sits above the modal
          via z-[60] so the X stays clickable regardless of scroll. */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClose?.({ refetch: phase === "revealed" });
        }}
        disabled={phase === "opening"}
        aria-label="Back to Ultimate Team"
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[60] inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs sm:text-sm font-semibold border border-white/20 shadow-lg disabled:opacity-30 transition-colors"
      >
        <X className="w-4 h-4" />
        <span>Close</span>
      </button>
      <div className="min-h-full flex items-start sm:items-center justify-center p-4 py-12 sm:py-8">
      <div
        className="relative w-full max-w-3xl rounded-2xl bg-[#0b0b0b] border border-white/10 p-5 sm:p-7 text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >

        {phase === "opening" && (
          <div className="py-16 flex flex-col items-center text-center gap-4">
            <div className="relative">
              <Package className="w-16 h-16 text-emerald-300 pack-pulse" />
              <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-amber-300 sparkle-spin" />
            </div>
            <p className="text-lg font-semibold tracking-wide">
              Opening your pack…
            </p>
            <p className="text-sm text-white/50">Picking 7 stickers</p>
          </div>
        )}

        {phase === "error" && (
          <div className="py-16 text-center px-6">
            {isSyncIssue ? (
              <>
                <p className="text-lg font-semibold mb-2">
                  Your XP is still syncing
                </p>
                <p className="text-sm text-white/60 mb-5 max-w-sm mx-auto leading-relaxed">
                  The pack you earned hasn&apos;t finished saving yet. Give
                  it a second and try again.
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold mb-2">
                  Something went wrong
                </p>
                <p className="text-sm text-white/60 mb-5">{errorMessage}</p>
              </>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setAttemptKey((k) => k + 1)}
                className="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#062013] font-bold text-sm tracking-wide transition-colors"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => onClose?.({ refetch: false })}
                className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {phase === "revealed" && (
          <>
            {showDynamicValuesNotice && (
              <div className="mb-5 sm:mb-6 rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-300/[0.08] via-amber-300/[0.04] to-transparent p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-300/15 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-bold text-amber-100">
                      {t("dynamic_sticker_values_title")}
                    </p>
                    <p className="text-xs sm:text-sm text-white/75 mt-1 leading-relaxed">
                      {t("dynamic_sticker_values_body")}
                    </p>
                    <button
                      type="button"
                      onClick={dismissDynamicValuesNotice}
                      className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-amber-300/20 hover:bg-amber-300/30 text-amber-100 text-xs font-bold tracking-wide transition-colors"
                    >
                      {t("dynamic_sticker_values_cta")}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4 sm:mb-6 text-center">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                Pack opened
              </h2>
              <p className="text-sm text-white/50">
                {packsRemaining > 0
                  ? `${packsRemaining} more pack${packsRemaining === 1 ? "" : "s"} ready`
                  : "Earn more XP to unlock another pack"}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 sm:gap-4 justify-center">
              {stickers.map((sticker, idx) => (
                <div
                  key={`${sticker.id}-${idx}`}
                  className="relative reveal-stagger"
                  style={{ animationDelay: `${idx * 180}ms` }}
                >
                  <StickerCard sticker={sticker} owned glow size="md" />
                  {sticker.is_new_for_user && (
                    <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[10px] font-bold text-white shadow ring-2 ring-[#0b0b0b]">
                      NEW
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 items-center justify-center">
              {resumeAction?.href ? (
                <>
                  {/* Resume becomes the *primary* action when the user
                      came from a mid-lesson pack unlock — that's the
                      flow they're most likely to want to continue. */}
                  <Link
                    href={resumeAction.href}
                    onClick={() => onClose?.({ refetch: true })}
                    className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#062013] font-bold text-sm tracking-wide transition-colors order-1 sm:order-2"
                  >
                    {resumeAction.label || "Resume lesson"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <button
                    type="button"
                    onClick={() => onClose?.({ refetch: true })}
                    className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold text-sm tracking-wide transition-colors order-2 sm:order-1"
                  >
                    Stay in Ultimate Team
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onClose?.({ refetch: true })}
                  className="px-6 py-2.5 rounded-full bg-white text-[#070707] font-bold text-sm tracking-wide hover:scale-[1.02] transition-transform"
                >
                  Done
                </button>
              )}
            </div>
          </>
        )}

        <style jsx>{`
          @keyframes pack-pulse {
            0%, 100% { transform: scale(1); opacity: 0.85; }
            50%       { transform: scale(1.08); opacity: 1; }
          }
          @keyframes sparkle-spin {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
          @keyframes reveal-stagger {
            0%   { opacity: 0; transform: translateY(12px) scale(0.92); }
            60%  { opacity: 1; transform: translateY(-2px) scale(1.04); }
            100% { opacity: 1; transform: translateY(0)   scale(1);     }
          }
          :global(.pack-pulse) {
            animation: pack-pulse 1.4s ease-in-out infinite;
          }
          :global(.sparkle-spin) {
            animation: sparkle-spin 3s linear infinite;
          }
          :global(.reveal-stagger) {
            opacity: 0;
            animation: reveal-stagger 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}</style>
      </div>
      </div>
    </div>
  );
}

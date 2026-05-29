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
import { X, Sparkles, Package, ArrowRight } from "lucide-react";
import StickerCard from "./StickerCard";

/**
 * resumeAction — optional `{ href, label }` set by the dashboard when
 * the user arrived here via the mid-lesson "Open" banner. Surfaces a
 * primary "Resume lesson" CTA after the reveal so they can hop back
 * to their exact step without scanning the page.
 */
export default function PackOpeningModal({ open, onClose, resumeAction }) {
  const [phase, setPhase] = useState("opening"); // opening | revealed | error
  const [stickers, setStickers] = useState([]);
  const [packsRemaining, setPacksRemaining] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  // Trigger the open request the moment the modal mounts.
  useEffect(() => {
    if (!open) return;
    setPhase("opening");
    setStickers([]);
    setErrorMessage("");

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/packs/open", { method: "POST" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
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
  }, [open]);

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
          <div className="py-16 text-center">
            <p className="text-lg font-semibold mb-2">Something went wrong</p>
            <p className="text-sm text-white/60">{errorMessage}</p>
          </div>
        )}

        {phase === "revealed" && (
          <>
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

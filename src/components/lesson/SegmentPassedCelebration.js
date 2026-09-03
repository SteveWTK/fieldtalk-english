// src/components/lesson/SegmentPassedCelebration.js
//
// Celebration toast + sound for the moment a user crosses the lesson's
// XP pass threshold (== 80% of max_xp, the same threshold that fills
// the Skill Radar segment). Fires ONCE per lesson session, on the
// false→true transition of the `lessonPassed` prop.
//
// Design intent:
//   - Pro Path only (WC uses stickers for its "you did it" moment).
//   - Loud enough to be noticed even by a user focused on the current
//     step, but non-blocking — the user should be able to keep tapping
//     Next while the celebration fades. So: fixed overlay, no backdrop
//     lock, auto-dismiss after 2.8s.
//   - Sound: playCheerSound() from soundEffects.js — richer ascending
//     fanfare + sparkle trill. Distinct from playSuccessSound() which
//     fires per-answer in gap-fills, so the user's ear can tell them
//     apart. Respects the app-wide mute preference.
//   - Visual: lime-accent card sliding down from the top with a
//     sparkle-burst behind the trophy icon. Uses only Tailwind +
//     CSS keyframes (no confetti library, no bundle bloat).
"use client";

import { useEffect, useRef, useState } from "react";
import { Trophy, Sparkles } from "lucide-react";
import { playCheerSound } from "@/lib/soundEffects";
import { useSoundPreference } from "@/lib/hooks/useSoundPreference";

/**
 * @param {{
 *   passed: boolean,
 *   bonusXp: number,
 *   lang?: 'en' | 'pt',
 * }} props
 */
export default function SegmentPassedCelebration({
  passed,
  bonusXp,
  lang = "pt",
}) {
  const [visible, setVisible] = useState(false);
  const [outroing, setOutroing] = useState(false);
  const firedOnceRef = useRef(false);
  const { isMuted } = useSoundPreference();

  useEffect(() => {
    // Only fire on the FIRST false→true transition per mount. Prevents
    // re-firing when the user, say, refreshes an answer that briefly
    // dips xpEarned below the threshold and then back above it.
    if (!passed) return;
    if (firedOnceRef.current) return;
    firedOnceRef.current = true;

    setVisible(true);
    if (!isMuted) {
      try {
        playCheerSound();
      } catch {
        // Audio context blocked / suspended — ignore silently. The
        // visual celebration still fires.
      }
    }

    // Outro starts at 2.3s, fully unmounts at 2.8s (matches the
    // exit transition duration below).
    const outro = setTimeout(() => setOutroing(true), 2300);
    const unmount = setTimeout(() => {
      setVisible(false);
      setOutroing(false);
    }, 2800);

    return () => {
      clearTimeout(outro);
      clearTimeout(unmount);
    };
  }, [passed, isMuted]);

  if (!visible) return null;

  const isPt = lang === "pt";
  const title = isPt ? "🎯 Segmento concluído!" : "🎯 Segment passed!";
  const subtitle =
    isPt
      ? `Você desbloqueou este segmento no seu Radar${bonusXp > 0 ? ` · +${bonusXp} XP extra` : ""}`
      : `You unlocked this segment on your Radar${bonusXp > 0 ? ` · +${bonusXp} XP bonus` : ""}`;

  return (
    <div
      className={`fixed inset-x-0 top-4 sm:top-6 z-[80] flex justify-center px-4 pointer-events-none ${
        outroing ? "seg-passed-outro" : "seg-passed-intro"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="relative pointer-events-auto rounded-2xl bg-[#0b1f0a] border border-accent-400/60 shadow-[0_0_44px_rgba(163,230,53,0.35)] px-4 sm:px-5 py-3 flex items-center gap-3 max-w-md w-full">
        {/* Sparkle burst behind the trophy — pure CSS pseudo-elements */}
        <div className="relative w-10 h-10 rounded-xl bg-accent-400/20 flex items-center justify-center shrink-0">
          <Trophy className="w-5 h-5 text-accent-300" />
          <Sparkles
            className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 text-accent-200 seg-passed-sparkle"
            aria-hidden
          />
          <Sparkles
            className="absolute -bottom-1 -left-1 w-3 h-3 text-accent-300/80 seg-passed-sparkle-delay"
            aria-hidden
          />
        </div>
        <div className="min-w-0">
          <p className="font-black text-white text-sm sm:text-base leading-tight">
            {title}
          </p>
          <p className="text-[11px] sm:text-xs text-accent-200/90 leading-tight mt-0.5">
            {subtitle}
          </p>
        </div>
      </div>

      <style jsx global>{`
        @keyframes seg-passed-intro {
          0% {
            opacity: 0;
            transform: translateY(-24px) scale(0.96);
          }
          70% {
            transform: translateY(4px) scale(1.02);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        @keyframes seg-passed-outro {
          0% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          100% {
            opacity: 0;
            transform: translateY(-16px) scale(0.98);
          }
        }
        @keyframes seg-passed-sparkle {
          0%,
          100% {
            opacity: 0.4;
            transform: scale(0.8) rotate(0deg);
          }
          50% {
            opacity: 1;
            transform: scale(1.2) rotate(20deg);
          }
        }
        .seg-passed-intro {
          animation: seg-passed-intro 0.55s cubic-bezier(0.16, 1, 0.3, 1)
            forwards;
        }
        .seg-passed-outro {
          animation: seg-passed-outro 0.5s ease-in forwards;
        }
        .seg-passed-sparkle {
          animation: seg-passed-sparkle 1.4s ease-in-out infinite;
        }
        .seg-passed-sparkle-delay {
          animation: seg-passed-sparkle 1.4s ease-in-out infinite 0.5s;
        }
      `}</style>
    </div>
  );
}

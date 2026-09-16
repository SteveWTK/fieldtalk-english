// src/components/lesson/LevelEarnedModal.js
//
// Celebration overlay that fires once when the player has just
// completed all Units in a Level — the moment they've unlocked
// their Certificate for that Level.
//
// Trigger contract: the parent inspects
// `player_level_completions` rows returned from
// /api/player-level-completions and mounts this modal when a
// row's `newly_awarded === true`. The modal is display-only —
// the certificate row is already persisted server-side, so a
// user closing without interacting doesn't lose the award.
//
// Content:
//   - Trophy icon over an accent-tinted disc
//   - "Level N complete" eyebrow
//   - Level display name (large)
//   - Short congratulatory line + a hint at the next level
//   - Primary CTA: "Keep going" → dismisses to /lesson
//   - Secondary link: "See my journey" → /dashboard (once we have
//     a certificate showcase surface there)

"use client";

import { Trophy, ArrowRight, Sparkles } from "lucide-react";
import Button from "@/components/ui/button";

export default function LevelEarnedModal({
  earnedLevel,     // the level row that was just completed
  nextLevel,       // the next level in the ladder (or null if end)
  onClose,         // dismisses the modal
  lang = "pt",
}) {
  if (!earnedLevel) return null;

  const isPt = lang === "pt";
  const name = isPt
    ? earnedLevel.display_name_pt || earnedLevel.display_name_en
    : earnedLevel.display_name_en || earnedLevel.display_name_pt;
  const nextName = nextLevel
    ? isPt
      ? nextLevel.display_name_pt || nextLevel.display_name_en
      : nextLevel.display_name_en || nextLevel.display_name_pt
    : null;

  return (
    <div
      className="fixed inset-0 bg-primary-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-primary-panel border border-accent-400/40 rounded-panel p-6 sm:p-8 max-w-md w-full relative overflow-hidden">
        {/* Lime wash — subtle, deliberately not a two-stop gradient
            (single accent-400 with an opacity fade + blur is on-brand
            per the DS "no gradients on UI surfaces" rule; atmospheric
            glow is a distinct concept from a gradient). */}
        <div
          className="absolute -top-24 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-accent-400/25 blur-3xl pointer-events-none"
          aria-hidden="true"
        />

        <div className="relative flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-accent-400 text-primary-900 flex items-center justify-center mb-4">
            <Trophy className="w-8 h-8" strokeWidth={2.25} />
          </div>

          <p className="text-[11px] uppercase tracking-label font-bold text-accent-400 mb-1 inline-flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            {isPt ? "Nível concluído" : "Level complete"}
          </p>
          <h2 className="text-2xl sm:text-3xl font-display font-black text-primary-50 leading-tight mb-2">
            {name}
          </h2>
          <p className="text-sm text-primary-300 leading-relaxed max-w-sm">
            {isPt
              ? "Você concluiu todas as Unidades deste nível e conquistou o Certificado. Continue firme — o próximo nível te espera."
              : "You've finished every Unit in this Level and earned the Certificate. Keep going — the next Level is waiting."}
          </p>

          {nextName && (
            <p className="mt-4 text-xs text-primary-400 inline-flex items-center gap-1.5">
              {isPt ? "Próximo:" : "Next up:"}
              <span className="font-semibold text-primary-100">{nextName}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </p>
          )}

          <div className="mt-6 w-full flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <Button
              variant="primary"
              size="md"
              IconTrailing={ArrowRight}
              onClick={onClose}
              className="w-full sm:w-auto sm:flex-1"
            >
              {isPt ? "Continuar treinando" : "Keep training"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

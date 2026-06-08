// src/components/DashboardTour.js
//
// Lightweight arrow-style guided tour for first-time dashboard
// visitors. Renders a darkening overlay with a single "spotlight"
// cut-out around the current target element, plus a tooltip card
// pointing at it.
//
// Targets are looked up by `data-tour-id="<key>"` on the actual
// dashboard elements (so the tour doesn't have to know any CSS
// classnames). Steps are ordered; user can Next, Back or Skip.
//
// Completion is persisted via /api/onboarding/dashboard-complete,
// which flips players.dashboard_tour_completed to true. Re-arm a
// user manually by toggling that column back to false in Supabase.

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const COPY = {
  en: {
    skip: "Skip tour",
    back: "Back",
    next: "Next",
    finish: "Got it",
    stepOf: (i, n) => `${i} of ${n}`,
    steps: [
      {
        target: "xp-bar",
        title: "Your XP & packs",
        body: "Every lesson + correct prediction adds XP. Hit 200 XP and you unlock a sticker pack.",
      },
      {
        target: "squad-pitch",
        title: "Build your Ultimate Team",
        body: "Tap any slot to place a player from your collection. Higher-rated stickers lift your squad value.",
      },
      {
        target: "leaderboard",
        title: "Check the ranking",
        body: "See where you sit against players from across Brazil — sort by XP, squad value or album completion.",
      },
      {
        target: "predictions",
        title: "Good at predictions?",
        body: "Win sticker packs by predicting match outcomes — winner, exact score and first scorer.",
      },
    ],
  },
  pt: {
    skip: "Pular tour",
    back: "Voltar",
    next: "Próximo",
    finish: "Entendi",
    stepOf: (i, n) => `${i} de ${n}`,
    steps: [
      {
        target: "xp-bar",
        title: "Seu XP e seus pacotes",
        body: "Cada lição + palpite certo adiciona XP. A cada 200 XP você ganha um pacote de figurinhas.",
      },
      {
        target: "squad-pitch",
        title: "Monte seu Ultimate Team",
        body: "Toque numa vaga pra colocar um jogador da sua coleção. Figurinhas com nota mais alta aumentam o valor do time.",
      },
      {
        target: "leaderboard",
        title: "Confira seu lugar no ranking",
        body: "Veja como você está em comparação a outros jogadores — ordene por XP, valor do time ou álbum.",
      },
      {
        target: "predictions",
        title: "Bom de palpite?",
        body: "Ganhe pacotes de figurinhas prevendo resultados — vencedor, placar exato e quem abre o placar.",
      },
    ],
  },
};

// Padding around the spotlight so the highlighted element gets a
// little air. Helps the user see the full card, not just its inner
// content.
const SPOTLIGHT_PADDING = 12;

// How far the tooltip floats from the spotlight on each side.
const TOOLTIP_OFFSET = 16;

export default function DashboardTour({ enabled, onClose }) {
  const { userLanguage } = useTranslation();
  const copy = COPY[userLanguage === "pt" ? "pt" : "en"];
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const [tooltipPos, setTooltipPos] = useState(null);
  const [placement, setPlacement] = useState("below");
  const tooltipRef = useRef(null);

  const step = copy.steps[stepIndex];

  // Lock scrolling while the tour is up; restore on unmount.
  useEffect(() => {
    if (!enabled) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [enabled]);

  // Locate the current step's target element by data-tour-id, scroll
  // it into view, measure its rect, and compute where the tooltip
  // should land (below by default, above if the bottom half of the
  // viewport would clip it). Re-runs on resize so rotating a phone
  // doesn't strand the tooltip in the wrong place.
  const computePositions = useCallback(() => {
    if (!enabled || !step) return;
    const el = document.querySelector(`[data-tour-id="${step.target}"]`);
    if (!el) {
      // Target missing on this dashboard (e.g. user has no leaderboard
      // section in the future). Skip ahead silently rather than
      // blocking the tour.
      setRect(null);
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // Wait a frame for the scroll to settle, then measure.
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      setRect({
        top: r.top - SPOTLIGHT_PADDING,
        left: r.left - SPOTLIGHT_PADDING,
        width: r.width + SPOTLIGHT_PADDING * 2,
        height: r.height + SPOTLIGHT_PADDING * 2,
      });

      // Tooltip placement: prefer below; flip above if the spotlight
      // is in the bottom half. Tooltip width capped at 320px; centre
      // on the spotlight, then clamp into the viewport.
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const below = r.bottom + TOOLTIP_OFFSET + 200 < vh;
      setPlacement(below ? "below" : "above");
      const tooltipW = Math.min(320, vw - 24);
      let left = r.left + r.width / 2 - tooltipW / 2;
      left = Math.max(12, Math.min(vw - tooltipW - 12, left));
      const top = below
        ? r.bottom + SPOTLIGHT_PADDING + TOOLTIP_OFFSET
        : r.top - SPOTLIGHT_PADDING - TOOLTIP_OFFSET; // we render above
      setTooltipPos({ top, left, width: tooltipW });
    });
  }, [enabled, step]);

  useEffect(() => {
    if (!enabled) return;
    computePositions();
    const handler = () => computePositions();
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
    };
  }, [enabled, computePositions]);

  const finish = useCallback(() => {
    onClose?.();
    fetch("/api/onboarding/dashboard-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).catch((err) =>
      console.warn("[dashboard-tour] mark-complete failed:", err)
    );
  }, [onClose]);

  if (!enabled || !step) return null;

  const isLast = stepIndex === copy.steps.length - 1;

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard tour"
    >
      {/* Darkening overlay with a spotlight cut-out. We render four
          opaque rectangles around the highlighted rect rather than
          using SVG cutouts — simpler and renders identically across
          browsers. */}
      {rect ? (
        <>
          {/* Top */}
          <div
            className="absolute bg-black/70 backdrop-blur-[2px]"
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, rect.top) }}
          />
          {/* Bottom */}
          <div
            className="absolute bg-black/70 backdrop-blur-[2px]"
            style={{
              top: rect.top + rect.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Left */}
          <div
            className="absolute bg-black/70 backdrop-blur-[2px]"
            style={{
              top: rect.top,
              left: 0,
              width: Math.max(0, rect.left),
              height: rect.height,
            }}
          />
          {/* Right */}
          <div
            className="absolute bg-black/70 backdrop-blur-[2px]"
            style={{
              top: rect.top,
              left: rect.left + rect.width,
              right: 0,
              height: rect.height,
            }}
          />
          {/* Spotlight border — sits exactly on top of the cut-out
              so the highlighted element has a glowing emerald ring. */}
          <div
            className="absolute pointer-events-none rounded-2xl border-2 border-emerald-400 shadow-[0_0_28px_rgba(16,185,129,0.45)]"
            style={{
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height,
            }}
          />
        </>
      ) : (
        // Target missing — render a full overlay so the user can
        // still close the tour cleanly.
        <div className="absolute inset-0 bg-black/70 backdrop-blur-[2px]" />
      )}

      {/* Tooltip card */}
      {tooltipPos && (
        <div
          ref={tooltipRef}
          className={`absolute rounded-2xl bg-[#0f0f0f] border border-emerald-400/40 shadow-2xl p-4 ${
            placement === "above" ? "-translate-y-full" : ""
          }`}
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            width: tooltipPos.width,
          }}
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              {copy.stepOf(stepIndex + 1, copy.steps.length)}
            </p>
            <button
              type="button"
              onClick={finish}
              className="text-white/45 hover:text-white"
              aria-label={copy.skip}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <h3 className="font-bold text-white text-base leading-tight mb-1">
            {step.title}
          </h3>
          <p className="text-sm text-white/70 leading-relaxed mb-4">
            {step.body}
          </p>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold text-white/70 hover:text-white border border-white/10 hover:border-white/30 disabled:opacity-30 disabled:cursor-default transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              {copy.back}
            </button>
            <button
              type="button"
              onClick={() => {
                if (isLast) finish();
                else setStepIndex((i) => i + 1);
              }}
              className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#062013] text-xs font-bold transition-colors"
            >
              {isLast ? copy.finish : copy.next}
              {!isLast && <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

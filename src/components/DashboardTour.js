// src/components/DashboardTour.js
//
// Lightweight arrow-style guided tour for first-time dashboard
// visitors. Renders a darkening overlay with a "spotlight" cut-out
// around the current target element, plus a tooltip card.
//
// Two layout modes — chosen automatically per step:
//
//   "side"   target fits in <60% of the viewport height. The tooltip
//            is placed directly below (or above if there's no room
//            below) the spotlight. Used for compact targets like the
//            hero strip, the predictions banner, the predictions
//            stats tile.
//
//   "pinned" target is taller than ~60% of the viewport (squad pitch
//            on mobile, leaderboard). The spotlight still cuts the
//            target out of the overlay, but the tooltip is pinned to
//            the bottom of the viewport so it remains readable
//            without scrolling. The earlier implementation tried to
//            place the tooltip below such a target and it ended up
//            off-screen.
//
// Targets are looked up by `data-tour-id="<key>"` on the actual
// dashboard elements. Completion is persisted via
// /api/onboarding/dashboard-complete, which flips
// players.dashboard_tour_completed to true. Re-arm any user by
// toggling that column back to false in Supabase.

"use client";

import { useCallback, useEffect, useState } from "react";
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
        target: "predictions",
        title: "Good at predictions?",
        body: "Tap here to open the Predictions Centre — win sticker packs by calling winners, exact scores and first scorers.",
      },
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
        target: "predictions",
        title: "Bom de palpite?",
        body: "Toque aqui pra abrir a Central de Palpites — ganhe pacotes de figurinhas prevendo vencedor, placar e quem abre o placar.",
      },
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
    ],
  },
};

// Padding around the spotlight so the highlighted element gets a
// little air. Helps the user see the full card, not just its inner
// content.
const SPOTLIGHT_PADDING = 10;

// How far the tooltip floats from the spotlight in "side" mode.
const TOOLTIP_OFFSET = 14;

// If the target is taller than this fraction of the viewport, we
// switch to "pinned" layout — tooltip stuck to the bottom of the
// screen so it never goes off-screen.
const LARGE_TARGET_RATIO = 0.55;

// Tooltip width cap. Tooltip never wider than viewport - 24.
const TOOLTIP_MAX_W = 320;

export default function DashboardTour({ enabled, onClose }) {
  const { userLanguage } = useTranslation();
  const copy = COPY[userLanguage === "pt" ? "pt" : "en"];
  const [stepIndex, setStepIndex] = useState(0);
  const [layout, setLayout] = useState(null); // { mode, rect, tooltip }

  const step = copy.steps[stepIndex];
  const layoutReady = layout && layout.mode !== "missing";

  // Lock scrolling ONLY while the overlay is actually visible. If we
  // locked on `enabled` alone, the body would be stuck `overflow:
  // hidden` during the layout-compute phase (before the spotlight
  // renders) and during the brief window when a step's target is
  // missing — that was the "page gets stuck, can't scroll" report.
  // Always restore to "" on cleanup so a previous modal that left
  // an "auto" / "hidden" value on `body.style.overflow` doesn't
  // bleed into our restore.
  useEffect(() => {
    if (!enabled || !layoutReady) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [enabled, layoutReady]);

  // If a step's target doesn't exist (e.g. the predictions banner
  // isn't rendered because the user has no open matches), advance
  // automatically after a short pause. Stops the tour from getting
  // stuck on a step it can't render.
  useEffect(() => {
    if (!enabled) return;
    if (layout?.mode !== "missing") return;
    const id = setTimeout(() => {
      if (stepIndex < copy.steps.length - 1) {
        setStepIndex((i) => i + 1);
      } else {
        // finish() is defined below — inline equivalent so we don't
        // need a forward ref. Same body as finish().
        onClose?.();
        fetch("/api/onboarding/dashboard-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }).catch(() => {});
      }
    }, 1200);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, layout, stepIndex]);

  // Locate the target, scroll it into view (instant — smooth scroll
  // would still be settling by the time we measured, which was the
  // bug that made the spotlight land in the wrong spot), then
  // compute layout + tooltip position.
  const computeLayout = useCallback(() => {
    if (!enabled || !step) return;
    const el = document.querySelector(`[data-tour-id="${step.target}"]`);
    if (!el) {
      setLayout({ mode: "missing" });
      return;
    }

    // Instant scroll so the rect we read next is the rect the user
    // will actually see. Centred so the user has visual room both
    // above and below for the tooltip in "side" mode.
    el.scrollIntoView({ behavior: "auto", block: "center" });

    // Read the rect on the next paint. Layout has already been
    // applied by the time of the next frame for instant scrolls.
    requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const tooltipW = Math.min(TOOLTIP_MAX_W, vw - 24);

      const rect = {
        top: r.top - SPOTLIGHT_PADDING,
        left: r.left - SPOTLIGHT_PADDING,
        width: r.width + SPOTLIGHT_PADDING * 2,
        height: r.height + SPOTLIGHT_PADDING * 2,
      };

      // Decide mode. "Pinned" when the target is too tall to leave
      // room for a tooltip either above or below.
      const targetRatio = r.height / vh;
      const isLarge = targetRatio > LARGE_TARGET_RATIO;

      if (isLarge) {
        // Tooltip pinned to the bottom of the viewport. Always
        // readable, never clipped.
        setLayout({
          mode: "pinned",
          rect,
          tooltip: {
            left: 12,
            width: vw - 24,
            bottom: 16,
            maxWidth: tooltipW,
          },
        });
        return;
      }

      // "Side" mode — prefer below, flip above when there's no room.
      // Estimate tooltip height — we don't know the exact rendered
      // height yet but ~180px is a safe upper bound for our copy.
      const TOOLTIP_HEIGHT_GUESS = 200;
      const spaceBelow = vh - (r.bottom + SPOTLIGHT_PADDING);
      const spaceAbove = r.top - SPOTLIGHT_PADDING;
      const below = spaceBelow >= TOOLTIP_HEIGHT_GUESS || spaceBelow >= spaceAbove;

      // Centre tooltip on the spotlight, clamp into the viewport.
      let left = r.left + r.width / 2 - tooltipW / 2;
      left = Math.max(12, Math.min(vw - tooltipW - 12, left));
      const top = below
        ? r.bottom + SPOTLIGHT_PADDING + TOOLTIP_OFFSET
        : r.top - SPOTLIGHT_PADDING - TOOLTIP_OFFSET; // rendered with -translate-y-full

      setLayout({
        mode: "side",
        rect,
        tooltip: { top, left, width: tooltipW, placement: below ? "below" : "above" },
      });
    });
  }, [enabled, step]);

  useEffect(() => {
    if (!enabled) return;
    computeLayout();
    const handler = () => computeLayout();
    window.addEventListener("resize", handler);
    // No scroll listener — body is locked while the tour is up, so
    // scroll can't change. Resize covers orientation flips.
    return () => {
      window.removeEventListener("resize", handler);
    };
  }, [enabled, computeLayout]);

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
  // While the layout is still computing OR the target is missing,
  // render NOTHING. This avoids two ugly states the testers saw:
  //   1. A full blackout overlay with no spotlight (layout=null).
  //   2. A blocking overlay that traps clicks + scroll for the
  //      length of the layout compute.
  // Once layout is ready, the spotlight + tooltip appear. The
  // missing-target effect above advances or closes the tour without
  // ever showing a stuck overlay.
  if (!layoutReady) return null;

  const isLast = stepIndex === copy.steps.length - 1;
  const mode = layout.mode;
  const rect = layout.rect;

  return (
    <div
      className="fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label="Dashboard tour"
    >
      {/* Darkening overlay with a spotlight cut-out. Four opaque
          rectangles around the highlighted rect — simpler than SVG
          mask and renders identically across browsers. */}
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
        {/* Spotlight border — emerald ring on top of the cut-out. */}
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

      {/* Tooltip card */}
      {layout?.tooltip && (
        <div
          className={`absolute rounded-2xl bg-[#0f0f0f] border border-emerald-400/40 shadow-2xl p-4 ${
            mode === "side" && layout.tooltip.placement === "above"
              ? "-translate-y-full"
              : ""
          }`}
          style={
            mode === "pinned"
              ? {
                  left: layout.tooltip.left,
                  width: layout.tooltip.width,
                  bottom: layout.tooltip.bottom,
                  maxWidth: layout.tooltip.maxWidth,
                  marginLeft: "auto",
                  marginRight: "auto",
                  right: 12,
                }
              : {
                  top: layout.tooltip.top,
                  left: layout.tooltip.left,
                  width: layout.tooltip.width,
                }
          }
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

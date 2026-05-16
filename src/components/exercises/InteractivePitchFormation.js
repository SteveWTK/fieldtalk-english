// components/exercises/InteractivePitchFormation.js
"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Volume2, Trophy, Languages, CheckCircle, RotateCcw } from "lucide-react";
import { useIsWide } from "@/lib/hooks/useIsWide";

/**
 * InteractivePitchFormation — visual sibling to DragDropFormation.
 *
 * Renders the same football pitch and accepts two kinds of clickable
 * content in formation_config:
 *
 *   - position_slots[]: player positions in a formation. Click to learn.
 *   - click_areas[]:    arbitrary pitch-geography vocabulary. Click to learn.
 *
 * Behaviour per the latest design:
 *   - Marker face shows an audio icon (not the position's first letter)
 *   - On click, audio plays AND the name appears as a small badge on the
 *     pitch next to the marker (no info panel below the pitch)
 *   - A header-level Translation toggle swaps every label between
 *     English (label) and Portuguese (label_pt)
 *
 * Wide-screen layout:
 *   - On viewports ≥ 1024px wide, the pitch flips to landscape (goals on
 *     left/right) so the activity fits without scrolling. The same x/y
 *     percentages from the config are auto-rotated via transformPosition().
 *
 * Outer margin:
 *   - The green grass extends to the container edges, but the painted
 *     field lines are inset so labels like "Sideline" and "Goal Line" have
 *     room outside the playable area.
 */
export default function InteractivePitchFormation({
  step,
  lessonId,
  onComplete,
  userLanguage = "en",
}) {
  const config = step?.formation_config || {};
  const slots = config.position_slots || [];
  const areas = config.click_areas || [];
  const baseXp = step?.xp_reward || 25;
  const isPortuguese = userLanguage === "pt";
  const isHorizontal = useIsWide(1024);

  // "revision" (default) → only the most recently clicked item shows a
  // label; good for self-quizzing.
  // "presentation" → every clicked item keeps its label visible, so the
  // pitch fills up as the user works through it.
  const mode = config.mode === "presentation" ? "presentation" : "revision";

  const storageKey = `interactivePitchFormation_${lessonId || "x"}_${
    step?.id || "0"
  }`;

  const [clickedIds, setClickedIds] = useState(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return new Set(JSON.parse(raw).clickedIds || []);
    } catch {
      // ignore
    }
    return new Set();
  });
  const [activeItem, setActiveItem] = useState(null);
  const [showTranslation, setShowTranslation] = useState(isPortuguese);
  const [completed, setCompleted] = useState(false);

  const audioRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ clickedIds: Array.from(clickedIds) })
      );
    } catch {
      // ignore
    }
  }, [clickedIds, storageKey]);

  const totalItems = slots.length + areas.length;
  const isComplete = totalItems > 0 && clickedIds.size === totalItems;

  useEffect(() => {
    if (isComplete && !completed) {
      setCompleted(true);
      onCompleteRef.current?.(baseXp);
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      }
    }
  }, [isComplete, completed, baseXp, storageKey]);

  const labels = isPortuguese
    ? {
        instruction: "Toque em cada jogador ou área para aprender o vocabulário",
        progress: "explorados",
        complete: "Excelente! Você explorou tudo.",
        xpEarned: "XP ganho",
        reset: "Recomeçar",
        translate: "Tradução",
        empty: "Esta atividade ainda não tem conteúdo. Pergunte ao seu professor.",
      }
    : {
        instruction: "Tap each player or area to learn the vocabulary",
        progress: "explored",
        complete: "Excellent! You've explored everything.",
        xpEarned: "XP earned",
        reset: "Reset",
        translate: "Translation",
        empty: "This activity has no content yet. Ask your teacher.",
      };

  if (totalItems === 0) {
    return (
      <p className="text-center text-gray-600 dark:text-gray-400 py-8">
        {labels.empty}
      </p>
    );
  }

  const playAudio = async (url) => {
    if (!url || !audioRef.current) return;
    try {
      audioRef.current.src = url;
      await audioRef.current.play();
    } catch {
      // ignore — playback errors are non-fatal here
    }
  };

  const handleClick = (item, kind) => {
    setClickedIds((prev) => new Set(prev).add(item.id));
    setActiveItem({ ...item, _kind: kind });
    if (item.audio_url) playAudio(item.audio_url);
  };

  const resetAll = () => {
    setClickedIds(new Set());
    setActiveItem(null);
    setCompleted(false);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
  };

  // Rotate a vertical (x, y) percentage pair to horizontal layout when the
  // viewport is wide. CW rotation: new_left = 100 - y, new_top = x.
  const transformPosition = (pos) => {
    if (!isHorizontal) return { left: pos.x, top: pos.y };
    const xv = parseFloat(String(pos.x).replace("%", ""));
    const yv = parseFloat(String(pos.y).replace("%", ""));
    if (Number.isNaN(xv) || Number.isNaN(yv)) {
      return { left: pos.x, top: pos.y };
    }
    return { left: `${100 - yv}%`, top: `${xv}%` };
  };

  // Inline SVG pitch — field markings are inset so tags like "Sideline"
  // and "Goal Line" have room outside the playable area.
  const renderVerticalPitch = () => (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <rect x="0" y="0" width="100" height="140" fill="#15803d" />
      <rect
        x="8"
        y="8"
        width="84"
        height="124"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <line x1="8" y1="70" x2="92" y2="70" stroke="white" strokeWidth="0.4" />
      <circle
        cx="50"
        cy="70"
        r="8"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <circle cx="50" cy="70" r="0.6" fill="white" />
      <rect
        x="28"
        y="8"
        width="44"
        height="14"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <rect
        x="38"
        y="8"
        width="24"
        height="6"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <rect
        x="28"
        y="118"
        width="44"
        height="14"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <rect
        x="38"
        y="126"
        width="24"
        height="6"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
    </svg>
  );

  const renderHorizontalPitch = () => (
    <svg
      viewBox="0 0 140 100"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full pointer-events-none"
    >
      <rect x="0" y="0" width="140" height="100" fill="#15803d" />
      <rect
        x="8"
        y="8"
        width="124"
        height="84"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <line x1="70" y1="8" x2="70" y2="92" stroke="white" strokeWidth="0.4" />
      <circle
        cx="70"
        cy="50"
        r="8"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <circle cx="70" cy="50" r="0.6" fill="white" />
      <rect
        x="8"
        y="28"
        width="14"
        height="44"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <rect
        x="8"
        y="38"
        width="6"
        height="24"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <rect
        x="118"
        y="28"
        width="14"
        height="44"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <rect
        x="126"
        y="38"
        width="6"
        height="24"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
    </svg>
  );

  const labelText = (item) =>
    showTranslation && item.label_pt ? item.label_pt : item.label;

  // Render one clickable marker — used for both players and pitch areas.
  const renderMarker = (item, variant) => {
    const isClicked = clickedIds.has(item.id);
    const isActive = activeItem?.id === item.id;
    const pos = transformPosition(item);

    const buttonClasses =
      variant === "slot"
        ? `w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-md transition-all text-white ${
            isActive
              ? "ring-4 ring-emerald-300 scale-110 bg-emerald-600"
              : isClicked
                ? "bg-emerald-600 ring-2 ring-emerald-200"
                : "bg-gradient-to-br from-accent-500 to-accent-700 hover:scale-110 ring-2 ring-white/40"
          }`
        : `rounded-full flex items-center justify-center transition-all ${
            isActive
              ? "bg-yellow-300 ring-4 ring-yellow-200 w-8 h-8 sm:w-9 sm:h-9"
              : isClicked
                ? "bg-yellow-400 ring-2 ring-yellow-200 w-7 h-7 sm:w-8 sm:h-8"
                : "bg-white ring-2 ring-white/70 w-6 h-6 sm:w-7 sm:h-7 hover:scale-125"
          }`;

    return (
      <div
        key={`${variant}-${item.id}`}
        className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
        style={{ left: pos.left, top: pos.top, zIndex: isActive ? 20 : 10 }}
      >
        <button
          type="button"
          onClick={() => handleClick(item, variant)}
          className={buttonClasses}
          aria-label={item.label}
        >
          {isClicked && !isActive ? (
            <CheckCircle
              className={
                variant === "slot"
                  ? "w-5 h-5"
                  : "w-3.5 h-3.5 text-emerald-700"
              }
            />
          ) : (
            <Volume2
              className={
                variant === "slot"
                  ? "w-5 h-5 sm:w-6 sm:h-6"
                  : "w-3.5 h-3.5 text-emerald-700"
              }
            />
          )}
        </button>
        {(isActive || (mode === "presentation" && isClicked)) && (
          <span className="mt-1 px-2 py-0.5 rounded-md bg-black/75 text-white text-[11px] sm:text-xs font-semibold whitespace-nowrap shadow ipf-fade-in">
            {labelText(item)}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {step?.content || labels.instruction}
          {config.formation_name && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium text-xs">
              {config.formation_name}
            </span>
          )}
        </p>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-gray-900 dark:text-white">
            {clickedIds.size}/{totalItems} {labels.progress}
          </span>
          <button
            onClick={() => setShowTranslation((v) => !v)}
            className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label={labels.translate}
          >
            <Languages className="w-3.5 h-3.5" />
            {labels.translate}
          </button>
          {clickedIds.size > 0 && !completed && (
            <button
              onClick={resetAll}
              className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              <RotateCcw className="w-3 h-3" />
              {labels.reset}
            </button>
          )}
        </div>
      </div>

      {/* Pitch */}
      <div
        className="relative w-full mx-auto rounded-xl overflow-hidden shadow-md"
        style={{
          maxWidth: isHorizontal ? "700px" : "500px",
          aspectRatio: isHorizontal ? "7 / 5" : "5 / 7",
        }}
      >
        {config.pitch_image ? (
          <Image
            src={config.pitch_image}
            alt="Pitch"
            fill
            sizes="(max-width: 1024px) 500px, 700px"
            className="object-cover pointer-events-none"
          />
        ) : isHorizontal ? (
          renderHorizontalPitch()
        ) : (
          renderVerticalPitch()
        )}

        {slots.map((slot) => renderMarker(slot, "slot"))}
        {areas.map((area) => renderMarker(area, "area"))}
      </div>

      {/* Completion */}
      {completed && (
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl p-6 text-center">
          <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {labels.complete}
          </h3>
          <div className="inline-flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
            <CheckCircle className="w-5 h-5" />+{baseXp} {labels.xpEarned}
          </div>
        </div>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />

      <style jsx>{`
        @keyframes ipf-fade-in {
          0% {
            opacity: 0;
            transform: translateY(4px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        :global(.ipf-fade-in) {
          animation: ipf-fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

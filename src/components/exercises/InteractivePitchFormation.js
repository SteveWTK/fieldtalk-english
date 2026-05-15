// components/exercises/InteractivePitchFormation.js
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Volume2,
  Trophy,
  Languages,
  CheckCircle,
  X,
  RotateCcw,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * InteractivePitchFormation — visual sibling to DragDropFormation.
 *
 * Renders the same inline SVG football pitch and accepts two kinds of
 * clickable content in formation_config:
 *
 *   - position_slots[]: player positions in a formation. Each becomes a
 *     circular player token at x/y. Click to learn the position's
 *     vocabulary (label, description, audio).
 *
 *   - click_areas[]: arbitrary pitch-geography vocabulary (halfway line,
 *     penalty area, corner flag, etc.). Each becomes a small dot+label
 *     marker at x/y. Click to learn the location's vocabulary.
 *
 * Either or both can be present in a step. Completion fires once every
 * present item has been clicked at least once.
 *
 * Schema (all fields optional except id/x/y):
 *   {
 *     id: string,
 *     label: string,           // English
 *     label_pt: string,        // optional translation
 *     description: string,     // English explanation
 *     description_pt: string,  // optional translation
 *     audio_url: string,       // optional — plays on click
 *     x: "50%",
 *     y: "50%"
 *   }
 */
export default function InteractivePitchFormation({
  step,
  lessonId,
  onComplete,
  userLanguage = "en",
}) {
  const { t } = useTranslation();
  const config = step?.formation_config || {};
  const slots = config.position_slots || [];
  const areas = config.click_areas || [];
  const baseXp = step?.xp_reward || 25;
  const isPortuguese = userLanguage === "pt";

  // Per-lesson, per-step persistence so progress doesn't carry across
  // different pitch steps in the same lesson.
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
  const [showTranslation, setShowTranslation] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [completed, setCompleted] = useState(false);

  const audioRef = useRef(null);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Persist progress
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
      // Clear persistence on completion so a replay starts fresh
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
        instruction:
          "Toque em cada jogador ou área para aprender o vocabulário",
        progress: "explorados",
        complete: "Excelente! Você explorou tudo.",
        xpEarned: "XP ganho",
        listen: "Ouvir",
        translation: "Tradução",
        reset: "Recomeçar",
        empty:
          "Esta atividade ainda não tem conteúdo. Pergunte ao seu professor.",
      }
    : {
        instruction:
          "Tap each player or area to learn the vocabulary",
        progress: "explored",
        complete: "Excellent! You've explored everything.",
        xpEarned: "XP earned",
        listen: "Listen",
        translation: "Translation",
        reset: "Reset",
        empty:
          "This activity has no content yet. Ask your teacher.",
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
      setAudioPlaying(true);
      audioRef.current.onended = () => setAudioPlaying(false);
      audioRef.current.onerror = () => setAudioPlaying(false);
      await audioRef.current.play();
    } catch {
      setAudioPlaying(false);
    }
  };

  const handleClick = (item, kind) => {
    setClickedIds((prev) => new Set(prev).add(item.id));
    setActiveItem({ ...item, _kind: kind });
    setShowTranslation(false);
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

  // Inline SVG pitch — same vocabulary as DragDropFormation for visual
  // consistency across the three formation-aware step types.
  const renderInlinePitch = () => (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
    >
      <rect x="0" y="0" width="100" height="140" fill="#15803d" />
      <rect
        x="2"
        y="2"
        width="96"
        height="136"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <line x1="2" y1="70" x2="98" y2="70" stroke="white" strokeWidth="0.4" />
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
        x="25"
        y="2"
        width="50"
        height="14"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <rect
        x="36"
        y="2"
        width="28"
        height="6"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <rect
        x="25"
        y="124"
        width="50"
        height="14"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <rect
        x="36"
        y="132"
        width="28"
        height="6"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
    </svg>
  );

  // Renders a player token (used for position_slots)
  const renderPlayerToken = (slot) => {
    const isClicked = clickedIds.has(slot.id);
    const isActive = activeItem?.id === slot.id;
    return (
      <button
        key={`slot-${slot.id}`}
        onClick={() => handleClick(slot, "slot")}
        className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold text-white shadow-md transition-all ${
          isActive
            ? "ring-4 ring-emerald-300 scale-110"
            : isClicked
              ? "bg-emerald-600 ring-2 ring-emerald-200"
              : "bg-gradient-to-br from-accent-500 to-accent-700 hover:scale-110 ring-2 ring-white/40"
        }`}
        style={{ left: slot.x, top: slot.y }}
        aria-label={slot.label}
      >
        {isClicked ? (
          <CheckCircle className="w-5 h-5" />
        ) : (
          slot.label?.charAt(0) || "?"
        )}
      </button>
    );
  };

  // Renders a click-area marker (used for click_areas)
  const renderAreaMarker = (area) => {
    const isClicked = clickedIds.has(area.id);
    const isActive = activeItem?.id === area.id;
    return (
      <button
        key={`area-${area.id}`}
        onClick={() => handleClick(area, "area")}
        className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group ${
          isActive ? "z-10" : "z-0"
        }`}
        style={{ left: area.x, top: area.y }}
        aria-label={area.label}
      >
        <div
          className={`rounded-full transition-all flex items-center justify-center ${
            isActive
              ? "bg-yellow-300 ring-4 ring-yellow-200 w-6 h-6 sm:w-7 sm:h-7"
              : isClicked
                ? "bg-yellow-400 ring-2 ring-yellow-200 w-5 h-5 sm:w-6 sm:h-6"
                : "bg-white ring-2 ring-white/70 w-4 h-4 sm:w-5 sm:h-5 hover:scale-125"
          }`}
        >
          {isClicked && <CheckCircle className="w-3 h-3 text-emerald-700" />}
        </div>
        <span
          className={`text-[10px] sm:text-xs font-semibold px-1.5 py-0.5 rounded bg-black/60 text-white whitespace-nowrap transition-opacity ${
            isActive || isClicked
              ? "opacity-100"
              : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {area.label}
        </span>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* Instruction + progress */}
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
        style={{ maxWidth: "500px", aspectRatio: "5 / 7" }}
      >
        {config.pitch_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.pitch_image}
            alt="Pitch"
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          renderInlinePitch()
        )}

        {slots.map(renderPlayerToken)}
        {areas.map(renderAreaMarker)}
      </div>

      {/* Info panel for the active item */}
      {activeItem && (
        <div className="relative bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 animate-fade-in-up">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-bold text-lg text-gray-900 dark:text-white">
              {showTranslation && activeItem.label_pt
                ? activeItem.label_pt
                : activeItem.label}
            </h4>
            <button
              onClick={() => setActiveItem(null)}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {(activeItem.description || activeItem.description_pt) && (
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              {showTranslation && activeItem.description_pt
                ? activeItem.description_pt
                : activeItem.description}
            </p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {activeItem.audio_url && (
              <button
                onClick={() => playAudio(activeItem.audio_url)}
                disabled={audioPlaying}
                className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-full text-sm font-medium transition-colors"
              >
                <Volume2 className="w-4 h-4" />
                {labels.listen}
              </button>
            )}
            {(activeItem.label_pt || activeItem.description_pt) && (
              <button
                onClick={() => setShowTranslation((v) => !v)}
                className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <Languages className="w-4 h-4" />
                {labels.translation}
              </button>
            )}
          </div>
        </div>
      )}

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
        @keyframes fade-in-up {
          0% {
            opacity: 0;
            transform: translateY(8px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        :global(.animate-fade-in-up) {
          animation: fade-in-up 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}

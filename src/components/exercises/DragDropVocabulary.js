// components/exercises/DragDropVocabulary.js
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  CheckCircle,
  RotateCcw,
  Trophy,
  AlertCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  playSuccessSound,
  playErrorSound,
  playAudioFile,
} from "@/lib/soundEffects";
import { useSoundPreference } from "@/lib/hooks/useSoundPreference";

/**
 * DragDropVocabulary Step
 *
 * Users drag English vocabulary cards onto matching targets (images or
 * translations). One-to-one matching: each English card has exactly one
 * correct target. The mapping between english cards and their targets is
 * shuffled independently so the user has to figure out which goes where.
 *
 * vocab_config:
 *   - display_mode: 'auto' | 'image' | 'translation' (default: 'auto')
 *       auto:        show image_url if present, else translation
 *       image:       always show image (item must have image_url)
 *       translation: always show translation
 *   - items: array of:
 *       - id: string (unique)
 *       - english: string (shown on draggable card)
 *       - translation: string (shown on target if no image / mode=translation)
 *       - image_url: string (shown on target if present / mode=image)
 */
export default function DragDropVocabulary({
  step,
  onComplete,
  userLanguage = "en",
}) {
  const config = step?.vocab_config || {};
  const items = config.items || [];
  const displayMode = config.display_mode || "auto";
  const baseXp = step?.xp_reward || 30;
  const isPortuguese = userLanguage === "pt";
  const { isMuted, toggleMute } = useSoundPreference();

  const labels = isPortuguese
    ? {
        instruction: "Arraste cada palavra para sua imagem ou tradução correta",
        progress: "corretos",
        wrongPlace: "Não é a correspondência. Tente novamente.",
        complete: "Vocabulário completo!",
        reset: "Recomeçar",
        xpEarned: "XP ganho",
        empty: "Nenhuma palavra de vocabulário configurada.",
      }
    : {
        instruction:
          "Drag each word onto its correct image or translation",
        progress: "correct",
        wrongPlace: "Not the right match. Try again.",
        complete: "Vocabulary complete!",
        reset: "Reset",
        xpEarned: "XP earned",
        empty: "No vocabulary items configured.",
      };

  // Shuffle source order (the english tray) and target order independently
  const shuffledSources = useMemo(() => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const shuffledTargets = useMemo(() => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // matches: { [itemId]: true }
  const [matches, setMatches] = useState({});
  const [draggingItemId, setDraggingItemId] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [shakeItemId, setShakeItemId] = useState(null);
  const [hoveredTargetId, setHoveredTargetId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [completed, setCompleted] = useState(false);

  const targetRefsRef = useRef({});
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const matchedCount = Object.keys(matches).length;
  const totalItems = items.length;
  const isComplete = matchedCount === totalItems && totalItems > 0;

  useEffect(() => {
    if (isComplete && !completed) {
      setCompleted(true);
      onCompleteRef.current?.(baseXp);
    }
  }, [isComplete, completed, baseXp]);

  // Determine how a target should render given display_mode + item content
  const targetShowsImage = (item) => {
    if (displayMode === "image") return !!item.image_url;
    if (displayMode === "translation") return false;
    return !!item.image_url; // auto: image if available
  };

  // ---- Drag handlers ----
  const handlePointerDown = (e, itemId) => {
    if (matches[itemId]) return;
    e.preventDefault();
    setDraggingItemId(itemId);
    setDragPos({ x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    // Play the word's audio file (if any) the moment the user picks up the card
    if (!isMuted) {
      const item = items.find((it) => it.id === itemId);
      if (item?.audio_url) playAudioFile(item.audio_url);
    }
  };

  const findTargetAtPoint = (clientX, clientY) => {
    for (const item of items) {
      const el = targetRefsRef.current[item.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return item.id;
      }
    }
    return null;
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingItemId) return;
      setDragPos({ x: e.clientX, y: e.clientY });
      setHoveredTargetId(findTargetAtPoint(e.clientX, e.clientY));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draggingItemId, items]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!draggingItemId) return;
      const droppedTargetId = findTargetAtPoint(e.clientX, e.clientY);

      if (droppedTargetId && droppedTargetId === draggingItemId) {
        // Correct match
        setMatches((prev) => ({ ...prev, [draggingItemId]: true }));
        setErrorMessage(null);
        if (!isMuted) playSuccessSound();
      } else {
        // Wrong drop OR dropped outside any target
        setShakeItemId(draggingItemId);
        setErrorMessage(droppedTargetId ? labels.wrongPlace : null);
        setTimeout(() => setShakeItemId(null), 600);
        if (droppedTargetId) {
          setTimeout(() => setErrorMessage(null), 1800);
        }
        // Error sound only when they actually dropped on a wrong target —
        // skip if they just released over empty space (less punishing)
        if (!isMuted && droppedTargetId) playErrorSound();
      }

      setDraggingItemId(null);
      setHoveredTargetId(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draggingItemId, items, isMuted]
  );

  useEffect(() => {
    if (!draggingItemId) return;
    const moveHandler = (e) => handlePointerMove(e);
    const upHandler = (e) => handlePointerUp(e);
    window.addEventListener("pointermove", moveHandler);
    window.addEventListener("pointerup", upHandler);
    window.addEventListener("pointercancel", upHandler);
    return () => {
      window.removeEventListener("pointermove", moveHandler);
      window.removeEventListener("pointerup", upHandler);
      window.removeEventListener("pointercancel", upHandler);
    };
  }, [draggingItemId, handlePointerMove, handlePointerUp]);

  const resetAll = () => {
    setMatches({});
    setCompleted(false);
    setErrorMessage(null);
  };

  if (totalItems === 0) {
    return (
      <p className="text-center text-gray-600 dark:text-gray-400 py-8">
        {labels.empty}
      </p>
    );
  }

  // ---- Card renderers ----
  const renderEnglishCard = (item, opts = {}) => {
    const { isShaking = false } = opts;
    return (
      <div
        className={`select-none touch-none px-4 py-3 rounded-lg shadow-md border-2 cursor-grab active:cursor-grabbing bg-white dark:bg-gray-700 transition-colors text-center font-semibold text-gray-900 dark:text-white ${
          isShaking
            ? "animate-shake border-red-500"
            : "border-gray-300 dark:border-gray-600 hover:border-accent-500"
        }`}
        style={{ minWidth: "100px" }}
      >
        {item.english}
      </div>
    );
  };

  const renderTargetCard = (item) => {
    const isMatched = matches[item.id];
    const showImage = targetShowsImage(item);
    const isHovered = hoveredTargetId === item.id && !isMatched;

    return (
      <div
        ref={(el) => {
          targetRefsRef.current[item.id] = el;
        }}
        className={`rounded-lg shadow-md border-2 overflow-hidden bg-white dark:bg-gray-700 transition-all ${
          isMatched
            ? "border-green-500"
            : isHovered
              ? "border-accent-500 scale-105"
              : "border-gray-300 dark:border-gray-600"
        }`}
        style={{ width: "120px" }}
      >
        {isMatched && (
          <div className="bg-green-500 text-white text-xs font-bold px-2 py-1 text-center flex items-center justify-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {item.english}
          </div>
        )}
        <div className="h-20 flex items-center justify-center p-2">
          {showImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.image_url}
              alt={item.english}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          ) : (
            <span className="text-center text-sm font-medium text-gray-700 dark:text-gray-300">
              {item.translation}
            </span>
          )}
        </div>
      </div>
    );
  };

  const unmatchedSources = shuffledSources.filter((item) => !matches[item.id]);

  return (
    <div className="space-y-4">
      {/* Instruction & progress */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {step?.content || labels.instruction}
        </p>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-gray-900 dark:text-white">
            {matchedCount}/{totalItems} {labels.progress}
          </span>
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute sounds" : "Mute sounds"}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          {matchedCount > 0 && !completed && (
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

      {/* Error toast */}
      {errorMessage && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" />
          {errorMessage}
        </div>
      )}

      {/* English tray */}
      {!completed && unmatchedSources.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-3 justify-center">
            {unmatchedSources.map((item) => (
              <div
                key={item.id}
                onPointerDown={(e) => handlePointerDown(e, item.id)}
                style={{ touchAction: "none" }}
              >
                {renderEnglishCard(item, {
                  isShaking: shakeItemId === item.id,
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Targets grid */}
      <div className="grid gap-3 justify-center" style={{ gridTemplateColumns: "repeat(auto-fit, 120px)" }}>
        {shuffledTargets.map((item) => (
          <div key={item.id}>{renderTargetCard(item)}</div>
        ))}
      </div>

      {/* Floating dragging card */}
      {draggingItemId && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPos.x,
            top: dragPos.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          {renderEnglishCard(items.find((it) => it.id === draggingItemId) || {})}
        </div>
      )}

      {/* Completion */}
      {completed && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 text-center">
          <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {labels.complete}
          </h3>
          <div className="inline-flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
            <CheckCircle className="w-5 h-5" />+{baseXp} {labels.xpEarned}
          </div>
        </div>
      )}

      {/* Animations */}
      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-8px);
          }
          40%,
          80% {
            transform: translateX(8px);
          }
        }
        :global(.animate-shake) {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

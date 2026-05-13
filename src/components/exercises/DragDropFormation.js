// components/exercises/DragDropFormation.js
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  CheckCircle,
  RotateCcw,
  Trophy,
  AlertCircle,
  Volume2,
  VolumeX,
} from "lucide-react";
import { playSuccessSound, playErrorSound } from "@/lib/soundEffects";
import { useSoundPreference } from "@/lib/hooks/useSoundPreference";

/**
 * DragDropFormation Step
 *
 * Renders an empty pitch with position slots and a row of player cards.
 * User drags each card onto a slot; card.position must match slot.accepts.
 *
 * formation_config:
 *   - formation_name: string (e.g. "4-3-3")
 *   - pitch_image: string (optional URL; falls back to inline SVG pitch)
 *   - position_slots: array of:
 *       - id: string (unique slot id)
 *       - label: string
 *       - x: string (CSS percent, e.g. "50%")
 *       - y: string (CSS percent, e.g. "92%")
 *       - accepts: string[] (positions that may go in this slot)
 *   - player_cards: array of:
 *       - id: string
 *       - name: string
 *       - position: string
 *       - image_url: string (optional)
 *   - validation: 'match_position_to_slot_accepts' (default)
 */
export default function DragDropFormation({
  step,
  // lessonId,
  onComplete,
  userLanguage = "en",
}) {
  const config = step?.formation_config || {};
  const slots = config.position_slots || [];
  const cards = config.player_cards || [];
  const baseXp = step?.xp_reward || 30;
  const isPortuguese = userLanguage === "pt";
  const { isMuted, toggleMute } = useSoundPreference();

  const labels = isPortuguese
    ? {
        instruction: "Arraste cada jogador para sua posição correta",
        progress: "colocados corretamente",
        wrongPlace: "Posição incorreta — tente novamente",
        complete: "Formação completa!",
        reset: "Recomeçar",
        xpEarned: "XP ganho",
      }
    : {
        instruction: "Drag each player to their correct position",
        progress: "placed correctly",
        wrongPlace: "Wrong position — try again",
        complete: "Formation complete!",
        reset: "Reset",
        xpEarned: "XP earned",
      };

  // placements: { [cardId]: slotId }
  const [placements, setPlacements] = useState({});
  const [draggingCardId, setDraggingCardId] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [shakeCardId, setShakeCardId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [completed, setCompleted] = useState(false);

  const pitchRef = useRef(null);
  const slotRefs = useRef({});
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const placedCount = Object.keys(placements).length;
  const totalSlots = slots.length;
  const isComplete = placedCount === totalSlots && totalSlots > 0;

  // Trigger completion once all slots filled
  useEffect(() => {
    if (isComplete && !completed) {
      setCompleted(true);
      onCompleteRef.current?.(baseXp);
    }
  }, [isComplete, completed, baseXp]);

  // Cards still in the tray (not yet placed correctly)
  const trayCards = cards.filter((c) => !placements[c.id]);

  // ---- Drag handlers (Pointer events for unified touch/mouse) ----
  const handlePointerDown = (e, cardId) => {
    if (placements[cardId]) return; // already placed
    e.preventDefault();
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    setDraggingCardId(cardId);
    setDragOffset({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    });
    setDragPos({ x: e.clientX, y: e.clientY });
    // Capture pointer so we keep getting events even if leaving the element
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // setPointerCapture may not work on every device; safe to ignore
    }
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingCardId) return;
      setDragPos({ x: e.clientX, y: e.clientY });
    },
    [draggingCardId]
  );

  const findSlotAtPoint = (clientX, clientY) => {
    for (const slot of slots) {
      const el = slotRefs.current[slot.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return slot;
      }
    }
    return null;
  };

  const handlePointerUp = useCallback(
    (e) => {
      if (!draggingCardId) return;
      const card = cards.find((c) => c.id === draggingCardId);
      const targetSlot = findSlotAtPoint(e.clientX, e.clientY);

      if (targetSlot && card) {
        // Slot must not already have a different card placed in it
        const slotAlreadyFilled = Object.values(placements).includes(
          targetSlot.id
        );
        const accepts = targetSlot.accepts || [];
        const isCorrect = accepts.includes(card.position);

        if (!slotAlreadyFilled && isCorrect) {
          // Correct placement
          setPlacements((prev) => ({ ...prev, [card.id]: targetSlot.id }));
          setErrorMessage(null);
          if (!isMuted) playSuccessSound();
        } else {
          // Wrong placement — shake and return
          setShakeCardId(card.id);
          setErrorMessage(labels.wrongPlace);
          setTimeout(() => {
            setShakeCardId(null);
          }, 600);
          setTimeout(() => setErrorMessage(null), 2000);
          if (!isMuted) playErrorSound();
        }
      }

      setDraggingCardId(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draggingCardId, cards, placements, slots, isMuted]
  );

  // Attach window listeners while dragging so we still catch pointer-up if released outside
  useEffect(() => {
    if (!draggingCardId) return;
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
  }, [draggingCardId, handlePointerMove, handlePointerUp]);

  const resetAll = () => {
    setPlacements({});
    setCompleted(false);
    setErrorMessage(null);
  };

  // Find which card is in a slot
  const cardInSlot = (slotId) => {
    const cardId = Object.entries(placements).find(
      ([, sId]) => sId === slotId
    )?.[0];
    return cardId ? cards.find((c) => c.id === cardId) : null;
  };

  // Render a player card (used both in tray and inside slots)
  const renderCard = (card, opts = {}) => {
    const { isPlaced = false, isDragging = false, isShaking = false } = opts;
    return (
      <div
        className={`select-none touch-none ${
          isPlaced
            ? "w-16 h-20 sm:w-20 sm:h-24"
            : "w-20 h-24 sm:w-24 sm:h-28 cursor-grab active:cursor-grabbing"
        } ${isShaking ? "animate-shake" : ""} ${
          isDragging ? "opacity-50" : ""
        } bg-white dark:bg-gray-700 rounded-lg shadow-md border-2 ${
          isPlaced
            ? "border-green-500"
            : "border-gray-300 dark:border-gray-600 hover:border-accent-500"
        } flex flex-col items-center justify-center p-1 transition-colors`}
      >
        {card.image_url ? (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 dark:bg-gray-600 overflow-hidden mb-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.image_url}
              alt={card.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </div>
        ) : (
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-sm sm:text-base mb-1">
            {card.name?.charAt(0) || "?"}
          </div>
        )}
        <p className="text-xs sm:text-sm font-semibold text-center text-gray-900 dark:text-white leading-tight line-clamp-2">
          {card.name}
        </p>
      </div>
    );
  };

  // Inline SVG pitch fallback when no pitch_image is provided
  const renderInlinePitch = () => (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
    >
      <rect x="0" y="0" width="100" height="140" fill="#15803d" />
      {/* Outer line */}
      <rect
        x="2"
        y="2"
        width="96"
        height="136"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      {/* Halfway line */}
      <line x1="2" y1="70" x2="98" y2="70" stroke="white" strokeWidth="0.4" />
      {/* Center circle */}
      <circle
        cx="50"
        cy="70"
        r="8"
        fill="none"
        stroke="white"
        strokeWidth="0.4"
      />
      <circle cx="50" cy="70" r="0.6" fill="white" />
      {/* Top penalty area */}
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
      {/* Bottom penalty area */}
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

  return (
    <div className="space-y-4">
      {/* Instruction & progress */}
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
            {placedCount}/{totalSlots} {labels.progress}
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
          {placedCount > 0 && !completed && (
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

      {/* Pitch */}
      <div
        ref={pitchRef}
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

        {/* Position slots */}
        {slots.map((slot) => {
          const placedCard = cardInSlot(slot.id);
          return (
            <div
              key={slot.id}
              ref={(el) => (slotRefs.current[slot.id] = el)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all ${
                placedCard
                  ? ""
                  : "border-2 border-dashed border-white/70 bg-white/10 hover:bg-white/20 rounded-lg"
              }`}
              style={{
                left: slot.x,
                top: slot.y,
                width: placedCard ? "auto" : "60px",
                height: placedCard ? "auto" : "60px",
              }}
            >
              {placedCard ? (
                <div className="animate-pop-in">
                  {renderCard(placedCard, { isPlaced: true })}
                </div>
              ) : (
                <span className="text-xs font-semibold text-white text-center px-1 leading-tight pointer-events-none">
                  {slot.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Card tray */}
      {trayCards.length > 0 && !completed && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-3 justify-center">
            {trayCards.map((card) => {
              // const isDragging = draggingCardId === card.id;
              const isShaking = shakeCardId === card.id;
              return (
                <div
                  key={card.id}
                  onPointerDown={(e) => handlePointerDown(e, card.id)}
                  style={{
                    touchAction: "none",
                  }}
                >
                  {renderCard(card, { isShaking, isDragging: false })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Floating card while dragging */}
      {draggingCardId && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPos.x - dragOffset.x,
            top: dragPos.y - dragOffset.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          {renderCard(
            cards.find((c) => c.id === draggingCardId),
            {
              isDragging: false,
            }
          )}
        </div>
      )}

      {/* Completion message */}
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

      {/* Custom animations */}
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
        @keyframes pop-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          60% {
            transform: scale(1.1);
            opacity: 1;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        :global(.animate-shake) {
          animation: shake 0.5s ease-in-out;
        }
        :global(.animate-pop-in) {
          animation: pop-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}

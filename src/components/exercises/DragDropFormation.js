// components/exercises/DragDropFormation.js
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  // CheckCircle,
  RotateCcw,
  // Trophy,
  AlertCircle,
  Volume2,
  VolumeX,
  Hand,
} from "lucide-react";
import {
  playSuccessSound,
  playErrorSound,
  playCheerSound,
} from "@/lib/soundEffects";
import { useSoundPreference } from "@/lib/hooks/useSoundPreference";
import { useIsWide } from "@/lib/hooks/useIsWide";
import { useOnboardingFlag } from "@/lib/hooks/useOnboardingFlag";

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
  const isHorizontal = useIsWide(1024);

  // Rotate vertical (x, y) percentages CW for landscape layout on wide
  // screens. Mirrors InteractivePitchFormation so the three pitch step
  // types stay visually aligned.
  const transformPosition = (slot) => {
    if (!isHorizontal) return { left: slot.x, top: slot.y };
    const xv = parseFloat(String(slot.x).replace("%", ""));
    const yv = parseFloat(String(slot.y).replace("%", ""));
    if (Number.isNaN(xv) || Number.isNaN(yv)) {
      return { left: slot.x, top: slot.y };
    }
    return { left: `${100 - yv}%`, top: `${xv}%` };
  };

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

  const { seen: onboardSeen, markSeen: markOnboardSeen } =
    useOnboardingFlag("drag_drop_formation");

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

  // Empty slot rects are small (~44px); fingers often land just past the
  // edge of the visible slot. Two-stage hit test: prefer an exact rect
  // hit if there is one, otherwise pick the nearest slot whose centre is
  // within `dropTolerancePx` of the drop point. Override per step via
  // formation_config.drop_tolerance_px.
  const dropTolerancePx = Number(config.drop_tolerance_px) || 40;
  const findSlotAtPoint = (clientX, clientY) => {
    let nearestSlot = null;
    let nearestDist = dropTolerancePx;
    for (const slot of slots) {
      const el = slotRefs.current[slot.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      // Stage 1: exact-rect hit — early return so a direct hit always wins.
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return slot;
      }
      // Stage 2: distance from slot centre. Keep the closest within tolerance.
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const d = Math.hypot(clientX - cx, clientY - cy);
      if (d < nearestDist) {
        nearestDist = d;
        nearestSlot = slot;
      }
    }
    return nearestSlot;
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
          // Dismiss the onboarding demo on the first successful placement —
          // the user has clearly understood the mechanic.
          if (!onboardSeen) markOnboardSeen();
          // Final correct placement of the formation gets the brighter
          // fanfare; intermediate placements get the standard chime.
          const willBeLast = Object.keys(placements).length + 1 === totalSlots;
          if (!isMuted) {
            if (willBeLast) playCheerSound();
            else playSuccessSound();
          }
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
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-100 dark:bg-gray-600 overflow-hidden mb-1">
            <Image
              src={card.image_url}
              alt={card.name}
              fill
              sizes="48px"
              className="object-cover"
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

  // Inline SVG pitch fallback when no pitch_image is provided. Markings
  // are inset 8% so click areas (sideline, goal line) have room outside
  // the playable area.
  const renderVerticalPitch = () => (
    <svg
      viewBox="0 0 100 140"
      preserveAspectRatio="none"
      className="absolute inset-0 w-full h-full"
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
      className="absolute inset-0 w-full h-full"
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

  // Toggle the drag-demo overlay until the user has either dismissed it
  // by tap or completed their first correct drop.
  const showDragDemo = !onboardSeen && !completed && trayCards.length > 0;

  return (
    <div className="relative space-y-4">
      {/* Drag-by-example onboarding overlay. Lets clicks through to the
          rest of the UI everywhere except on the caption pill, which is
          itself the dismiss target. */}
      {showDragDemo && (
        <div
          className="absolute inset-0 z-30 pointer-events-none ddf-demo-fade"
          aria-hidden="true"
        >
          <button
            type="button"
            onClick={markOnboardSeen}
            className="pointer-events-auto absolute left-1/2 -translate-x-1/2 top-12 bg-blue-800/95 text-white text-sm sm:text-base font-semibold px-4 py-2.5 rounded-xl ring-1 ring-white/15 shadow-lg cursor-pointer onboard-hint-enter"
            aria-label={
              isPortuguese ? "Arraste para a posição" : "Drag to position"
            }
          >
            {isPortuguese ? "Arraste para a posição" : "Drag to position"}
          </button>
          <div className="ddf-hand-anim absolute left-1/2 -translate-x-1/2">
            <Hand className="w-9 h-9 text-white drop-shadow-lg rotate-[20deg]" />
          </div>
        </div>
      )}

      {/* Instruction & progress */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* <p className="text-sm text-gray-700 dark:text-gray-300">
          {step?.content || labels.instruction}
          {config.formation_name && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium text-xs">
              {config.formation_name}
            </span>
          )}
        </p> */}
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
            className="object-cover"
          />
        ) : isHorizontal ? (
          renderHorizontalPitch()
        ) : (
          renderVerticalPitch()
        )}

        {/* Position slots — empty slots are silent dashed circles (no
            labels); the player learns position names from the preceding
            InteractivePitchFormation step. */}
        {slots.map((slot) => {
          const placedCard = cardInSlot(slot.id);
          const pos = transformPosition(slot);
          return (
            <div
              key={slot.id}
              ref={(el) => (slotRefs.current[slot.id] = el)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center transition-all ${
                placedCard
                  ? ""
                  : "border-2 border-dashed border-white/70 bg-white/10 hover:bg-white/20 rounded-full"
              }`}
              style={{
                left: pos.left,
                top: pos.top,
                width: placedCard ? "auto" : "44px",
                height: placedCard ? "auto" : "44px",
              }}
            >
              {placedCard && (
                <div className="animate-pop-in">
                  {renderCard(placedCard, { isPlaced: true })}
                </div>
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
      {/* {completed && (
        <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl p-6 text-center">
          <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {labels.complete}
          </h3>
          <div className="inline-flex items-center gap-2 text-green-700 dark:text-green-400 font-semibold">
            <CheckCircle className="w-5 h-5" />+{baseXp} {labels.xpEarned}
          </div>
        </div>
      )} */}

      {/* Custom animations — one consolidated styled-jsx block (the file
          may only contain one). */}
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
        @keyframes ddf-hand-move {
          0% {
            bottom: 6%;
            opacity: 0;
          }
          12% {
            opacity: 1;
          }
          60% {
            bottom: 55%;
            opacity: 1;
          }
          78% {
            bottom: 55%;
            opacity: 0;
          }
          100% {
            bottom: 6%;
            opacity: 0;
          }
        }
        @keyframes ddf-demo-fade {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes onboard-hint-enter {
          0% {
            opacity: 0;
            transform: translateX(-50%) scale(0.94);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) scale(1);
          }
        }
        :global(.animate-shake) {
          animation: shake 0.5s ease-in-out;
        }
        :global(.animate-pop-in) {
          animation: pop-in 0.3s ease-out;
        }
        :global(.ddf-hand-anim) {
          animation: ddf-hand-move 2.6s ease-in-out infinite;
        }
        :global(.ddf-demo-fade) {
          animation: ddf-demo-fade 0.4s ease-out forwards;
        }
        :global(.onboard-hint-enter) {
          animation: onboard-hint-enter 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

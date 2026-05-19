// components/exercises/DragDropGroups.js
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { RotateCcw, AlertCircle, Volume2, VolumeX } from "lucide-react";
import {
  playSuccessSound,
  playErrorSound,
  playCheerSound,
} from "@/lib/soundEffects";
import { useSoundPreference } from "@/lib/hooks/useSoundPreference";

/**
 * DragDropGroups Step
 *
 * Drag cards from a tray into one of several containers, each holding
 * one or more slots. Two validation modes via groups_config.validation:
 *
 *   - "free" (default): any card → any container. No correctness. Used
 *     for prediction-style activities ("Predict the finish — 1st, 2nd…").
 *   - "match_group": each card has a `group` field; the placement only
 *     sticks when card.group === container.id. Otherwise the card shakes
 *     and returns to the tray. Used for grouping activities ("Which
 *     group does each team belong to?").
 *
 * groups_config schema:
 *   - validation: "free" | "match_group"
 *   - containers: array of:
 *       - id: string (unique)
 *       - label: string
 *       - slot_count: number (default 1)
 *   - cards: array of:
 *       - id: string
 *       - label: string
 *       - group: string (used in match_group mode — references a container.id)
 *       - image_url: string (optional — e.g. a country flag; renders left of
 *         the label inside the pill)
 */
export default function DragDropGroups({
  step,
  onComplete,
  userLanguage = "en",
}) {
  const config = step?.groups_config || {};
  const containers = config.containers || [];
  const cards = config.cards || [];
  const validation =
    config.validation === "match_group" ? "match_group" : "free";
  const baseXp = step?.xp_reward || 30;
  const isPortuguese = userLanguage === "pt";
  const { isMuted, toggleMute } = useSoundPreference();

  const labels = isPortuguese
    ? {
        instructionFree: "Arraste cada cartão para sua posição",
        instructionMatch: "Arraste cada cartão para o grupo correto",
        progressFree: "colocados",
        progressMatch: "colocados corretamente",
        wrongPlace: "Grupo incorreto — tente novamente",
        full: "Este grupo já está cheio",
        complete: "Concluído!",
        reset: "Recomeçar",
        empty:
          "Esta atividade ainda não tem conteúdo. Pergunte ao seu professor.",
      }
    : {
        instructionFree: "Drag each card to a position",
        instructionMatch: "Drag each card to the correct group",
        progressFree: "placed",
        progressMatch: "placed correctly",
        wrongPlace: "Wrong group — try again",
        full: "This group is full",
        complete: "Complete!",
        reset: "Reset",
        empty: "This activity has no content yet.",
      };

  // placements: { [cardId]: { containerId, slotIndex } }
  const [placements, setPlacements] = useState({});
  const [draggingCardId, setDraggingCardId] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [shakeCardId, setShakeCardId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [completed, setCompleted] = useState(false);

  const containerRefs = useRef({});
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Cards still in the tray (not placed yet)
  const trayCards = cards.filter((c) => !placements[c.id]);
  const placedCount = Object.keys(placements).length;
  const totalCards = cards.length;

  // Completion check: free → all placed; match → all placed AND all correct.
  const isComplete = (() => {
    if (totalCards === 0) return false;
    if (placedCount !== totalCards) return false;
    if (validation === "free") return true;
    return cards.every((c) => {
      const p = placements[c.id];
      return p && p.containerId === c.group;
    });
  })();

  useEffect(() => {
    if (isComplete && !completed) {
      setCompleted(true);
      if (!isMuted) playCheerSound();
      onCompleteRef.current?.(baseXp);
    }
  }, [isComplete, completed, baseXp, isMuted]);

  // Find which container the pointer is inside (if any).
  const findContainerAtPoint = (clientX, clientY) => {
    for (const container of containers) {
      const el = containerRefs.current[container.id];
      if (!el) continue;
      const rect = el.getBoundingClientRect();
      if (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      ) {
        return container;
      }
    }
    return null;
  };

  // Pick the next empty slot index in a container, or -1 if full.
  const nextEmptySlot = (containerId) => {
    const container = containers.find((c) => c.id === containerId);
    if (!container) return -1;
    const slotCount = Number(container.slot_count) || 1;
    const taken = new Set();
    Object.values(placements).forEach((p) => {
      if (p.containerId === containerId) taken.add(p.slotIndex);
    });
    for (let i = 0; i < slotCount; i++) {
      if (!taken.has(i)) return i;
    }
    return -1;
  };

  // ---- Pointer drag handlers (touch + mouse via PointerEvent) ----
  const handlePointerDown = (e, cardId) => {
    if (placements[cardId]) return;
    e.preventDefault();
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    setDraggingCardId(cardId);
    setDragOffset({
      x: e.clientX - rect.left - rect.width / 2,
      y: e.clientY - rect.top - rect.height / 2,
    });
    setDragPos({ x: e.clientX, y: e.clientY });
    try {
      target.setPointerCapture(e.pointerId);
    } catch {
      // ignore — some devices reject this; window listeners cover us
    }
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingCardId) return;
      setDragPos({ x: e.clientX, y: e.clientY });
    },
    [draggingCardId]
  );

  const handlePointerUp = useCallback(
    (e) => {
      if (!draggingCardId) return;
      const card = cards.find((c) => c.id === draggingCardId);
      const targetContainer = findContainerAtPoint(e.clientX, e.clientY);

      if (targetContainer && card) {
        const slotIndex = nextEmptySlot(targetContainer.id);
        if (slotIndex === -1) {
          // Container full
          setShakeCardId(card.id);
          setErrorMessage(labels.full);
          setTimeout(() => setShakeCardId(null), 600);
          setTimeout(() => setErrorMessage(null), 2000);
          if (!isMuted) playErrorSound();
        } else {
          const accepted =
            validation === "free" || card.group === targetContainer.id;
          if (accepted) {
            setPlacements((prev) => ({
              ...prev,
              [card.id]: {
                containerId: targetContainer.id,
                slotIndex,
              },
            }));
            setErrorMessage(null);
            if (!isMuted) playSuccessSound();
          } else {
            // Wrong group
            setShakeCardId(card.id);
            setErrorMessage(labels.wrongPlace);
            setTimeout(() => setShakeCardId(null), 600);
            setTimeout(() => setErrorMessage(null), 2000);
            if (!isMuted) playErrorSound();
          }
        }
      }

      setDraggingCardId(null);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draggingCardId, cards, placements, containers, validation, isMuted]
  );

  // Window listeners while dragging so we still catch pointer-up off-card.
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

  // Look up which card sits in a specific slot.
  const cardInSlot = (containerId, slotIndex) => {
    const cardId = Object.entries(placements).find(
      ([, p]) => p.containerId === containerId && p.slotIndex === slotIndex
    )?.[0];
    return cardId ? cards.find((c) => c.id === cardId) : null;
  };

  if (containers.length === 0 || cards.length === 0) {
    return (
      <p className="text-center text-gray-600 dark:text-gray-400 py-8">
        {labels.empty}
      </p>
    );
  }

  // Render a card pill — used both in the tray and when placed in a slot.
  // When card.image_url is set (e.g. a country flag), it sits to the left
  // of the label inside the pill.
  const renderCard = (card, opts = {}) => {
    const { isPlaced = false, isShaking = false, isDragging = false } = opts;
    return (
      <div
        className={`inline-flex items-center gap-2 select-none touch-none pl-1.5 pr-3 py-1 sm:pl-2 sm:pr-4 sm:py-1.5 rounded-full font-medium text-xs sm:text-sm shadow-sm border-2 transition-colors whitespace-nowrap ${
          isShaking ? "animate-shake" : ""
        } ${isDragging ? "opacity-50" : ""} ${
          isPlaced
            ? "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-400 text-emerald-900 dark:text-emerald-100"
            : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:border-accent-500 cursor-grab active:cursor-grabbing"
        }`}
      >
        {card.image_url && (
          <span className="relative inline-block w-7 h-5 sm:w-8 sm:h-6 rounded-sm overflow-hidden shrink-0 ring-1 ring-black/10">
            <Image
              src={card.image_url}
              alt=""
              fill
              sizes="32px"
              className="object-cover"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
          </span>
        )}
        {/* If there's an image and no label, fall back gracefully. */}
        {(card.label || !card.image_url) && (
          <span>{card.label || card.id}</span>
        )}
      </div>
    );
  };

  // Responsive grid columns based on container count.
  const containersGridCols = (() => {
    const n = containers.length;
    if (n <= 1) return "grid-cols-1";
    if (n === 2) return "grid-cols-1 sm:grid-cols-2";
    if (n === 3) return "grid-cols-1 sm:grid-cols-3";
    if (n === 4) return "grid-cols-2 sm:grid-cols-4";
    return "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  })();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {step?.content ||
            (validation === "match_group"
              ? labels.instructionMatch
              : labels.instructionFree)}
        </p>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-gray-900 dark:text-white">
            {placedCount}/{totalCards}{" "}
            {validation === "match_group"
              ? labels.progressMatch
              : labels.progressFree}
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

      {/* Containers */}
      <div className={`grid gap-3 ${containersGridCols}`}>
        {containers.map((container) => {
          const slotCount = Number(container.slot_count) || 1;
          // Single slot → vertical layout (just the placeholder). Multiple
          // slots → 2-column grid so panels don't get too tall.
          const slotsGridCols =
            slotCount <= 2 ? "grid-cols-1" : "grid-cols-2";
          return (
            <div
              key={container.id}
              ref={(el) => (containerRefs.current[container.id] = el)}
              className="bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-3 sm:p-4"
            >
              <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-2 text-center">
                {container.label || container.id}
              </h4>
              <div className={`grid gap-2 ${slotsGridCols}`}>
                {Array.from({ length: slotCount }).map((_, idx) => {
                  const placed = cardInSlot(container.id, idx);
                  return (
                    <div
                      key={idx}
                      className={`min-h-[44px] flex items-center justify-center rounded-lg ${
                        placed
                          ? ""
                          : "border-2 border-dashed border-gray-300 dark:border-gray-600 bg-white/40 dark:bg-gray-900/30"
                      }`}
                    >
                      {placed && (
                        <div className="animate-pop-in">
                          {renderCard(placed, { isPlaced: true })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tray */}
      {trayCards.length > 0 && !completed && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2 justify-center">
            {trayCards.map((card) => {
              const isShaking = shakeCardId === card.id;
              const isDragging = draggingCardId === card.id;
              return (
                <div
                  key={card.id}
                  onPointerDown={(e) => handlePointerDown(e, card.id)}
                  style={{ touchAction: "none" }}
                >
                  {renderCard(card, { isShaking, isDragging })}
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
          {renderCard(cards.find((c) => c.id === draggingCardId))}
        </div>
      )}

      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-6px);
          }
          40%,
          80% {
            transform: translateX(6px);
          }
        }
        @keyframes pop-in {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          60% {
            transform: scale(1.08);
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

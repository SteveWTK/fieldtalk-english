// components/exercises/DragDropGroups.js
"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  RotateCcw,
  AlertCircle,
  Volume2,
  VolumeX,
  CheckCircle,
  Lock,
} from "lucide-react";
import {
  playSuccessSound,
  playErrorSound,
  playCheerSound,
} from "@/lib/soundEffects";
import { useSoundPreference } from "@/lib/hooks/useSoundPreference";
import { getStepXp } from "@/lib/xp/stepTypeDefaults";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

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
  // Optional — when provided, predictions are stored under a key
  // namespaced with the lesson id so two lessons that happen to use
  // the same step.id (e.g. "predict-the-finish") don't clobber each
  // other's prediction rows.
  lessonId,
}) {
  const config = step?.groups_config || {};
  const containers = config.containers || [];
  const rawCards = config.cards || [];
  const validation =
    config.validation === "match_group" ? "match_group" : "free";
  const baseXp = getStepXp(step);
  const isPortuguese = userLanguage === "pt";
  const { isMuted, toggleMute } = useSoundPreference();
  const { user } = useAuth();

  // Stable, randomised order of cards for the tray. Fisher-Yates,
  // recomputed only when the step itself changes so the order doesn't
  // jitter on every re-render. Both match-group and free-validation
  // steps benefit — for "Which group?" it forces the user to read the
  // labels, for predictions it just feels less rote.
  const cards = useMemo(() => {
    const arr = Array.isArray(rawCards) ? [...rawCards] : [];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step?.id]);

  // Prediction key = lesson::step. Falls back to the bare step.id when
  // no lessonId is passed so existing rows / older callers keep working.
  const predictionStepKey = lessonId && step?.id ? `${lessonId}::${step.id}` : step?.id;

  // Prediction-step flag: explicit step-level toggle OR (defensive)
  // inside groups_config. When set, the user commits via a Save button
  // — completion / XP / cheer fire on save, not on placing the last card.
  const isPredictionStep =
    step?.save_as_prediction === true ||
    step?.groups_config?.save_as_prediction === true;
  const stepDeadlineIso =
    step?.prediction_deadline || step?.groups_config?.prediction_deadline || null;

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

  // Prediction-step state. `submitted` is true once the user has saved
  // their prediction (it survives reloads because we restore from DB).
  // `savedDeadlineAt` is the locked-in deadline echoed back by the API.
  // `submitting` / `saveError` / `justSaved` drive the Save button.
  const [restoring, setRestoring] = useState(isPredictionStep);
  const [submitted, setSubmitted] = useState(false);
  const [savedDeadlineAt, setSavedDeadlineAt] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [justSaved, setJustSaved] = useState(false);

  const containerRefs = useRef({});
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Cards still in the tray (not placed yet)
  const trayCards = cards.filter((c) => !placements[c.id]);
  const placedCount = Object.keys(placements).length;
  const totalCards = cards.length;

  // "All cards placed" — the visual readiness signal. Distinct from
  // "completed" (= XP awarded). For prediction steps, completion is
  // gated on the explicit Save click; for non-prediction steps it
  // fires automatically when placement is finished.
  const allPlaced = (() => {
    if (totalCards === 0) return false;
    if (placedCount !== totalCards) return false;
    if (validation === "free") return true;
    return cards.every((c) => {
      const p = placements[c.id];
      return p && p.containerId === c.group;
    });
  })();

  // Effective deadline: locked-in value from DB takes priority; fall
  // back to whatever the step JSON currently advertises (in case this
  // is a fresh first-time render before any save).
  const effectiveDeadlineMs = (() => {
    const iso = savedDeadlineAt || stepDeadlineIso;
    if (!iso) return null;
    const t = new Date(iso).getTime();
    return Number.isFinite(t) ? t : null;
  })();
  const isLocked =
    isPredictionStep &&
    effectiveDeadlineMs !== null &&
    Date.now() > effectiveDeadlineMs;

  // Restore the user's saved prediction (if any) for this step on mount.
  // Non-prediction steps skip this and render normally.
  useEffect(() => {
    if (!isPredictionStep) {
      setRestoring(false);
      return;
    }
    if (!user?.id || !predictionStepKey) {
      setRestoring(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("predictions")
          .select("data, deadline_at")
          .eq("player_id", user.id)
          .eq("step_id", predictionStepKey)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          console.warn("[predictions] restore error:", error);
          setRestoring(false);
          return;
        }
        if (data) {
          const flat = data.data?.placements || {};
          const restored = {};
          for (const [cardId, containerId] of Object.entries(flat)) {
            // 1-slot containers (Predict the finish): slotIndex is
            // always 0. Multi-slot recovery isn't required for the
            // current group_finish use case.
            restored[cardId] = { containerId, slotIndex: 0 };
          }
          setPlacements(restored);
          setSubmitted(true);
          setSavedDeadlineAt(data.deadline_at || null);
        }
      } catch (err) {
        console.warn("[predictions] restore exception:", err);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isPredictionStep, user?.id, predictionStepKey]);

  // Non-prediction steps: completion fires automatically when all
  // cards are correctly placed. (Prediction-step completion fires on
  // the explicit Save click; see handleSavePrediction below.)
  useEffect(() => {
    if (isPredictionStep) return;
    if (allPlaced && !completed) {
      setCompleted(true);
      if (!isMuted) playCheerSound();
      onCompleteRef.current?.(baseXp);
    }
  }, [allPlaced, completed, baseXp, isMuted, isPredictionStep]);

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
    // Resetting placements while editing a saved prediction lets the user
    // start over — they re-submit via the Save button to commit.
    if (!isPredictionStep) setCompleted(false);
    setErrorMessage(null);
    setSaveError(null);
    setJustSaved(false);
  };

  // Commit the prediction. Lesson-step XP + cheer fire here, not on
  // placement, so the user has room to reset and rearrange until they
  // tap Save. Allows re-save (with new placements) until the deadline.
  const handleSavePrediction = async () => {
    if (!predictionStepKey) return;
    if (isLocked) return;
    setSubmitting(true);
    setSaveError(null);
    setJustSaved(false);

    const flatPlacements = {};
    for (const [cardId, p] of Object.entries(placements)) {
      if (p?.containerId) flatPlacements[cardId] = p.containerId;
    }

    try {
      const res = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step_id: predictionStepKey,
          prediction_type: step.prediction_type || "group_finish",
          deadline_at: stepDeadlineIso, // server preserves existing if already set
          data: {
            title: step.title || "",
            placements: flatPlacements,
            cards: cards.map((c) => ({
              id: c.id,
              label: c.label,
              image_url: c.image_url || null,
            })),
            containers: containers.map((c) => ({
              id: c.id,
              label: c.label,
            })),
          },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.warn("[predictions] save failed", res.status, json);
        setSaveError(json.error || "Could not save");
        setSubmitting(false);
        return;
      }
      console.log("[predictions] saved OK");
      // Echoed deadline_at takes priority — locks the row's first-save
      // value across subsequent updates.
      if (json.deadline_at) setSavedDeadlineAt(json.deadline_at);
      const wasFirstSave = !submitted;
      setSubmitted(true);
      setJustSaved(true);
      setSubmitting(false);
      // Fire the lesson-step completion (XP + cheer) only on the first
      // successful save — re-saves don't grant the XP twice.
      if (wasFirstSave && !completed) {
        setCompleted(true);
        if (!isMuted) playCheerSound();
        onCompleteRef.current?.(baseXp);
      } else if (!isMuted) {
        // Re-save still gets a light chime for feedback.
        playSuccessSound();
      }
      // Brief "Saved ✓" indicator before reverting to the steady state.
      setTimeout(() => setJustSaved(false), 1800);
    } catch (err) {
      console.warn("[predictions] network error", err);
      setSaveError("Network error — please try again");
      setSubmitting(false);
    }
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

  // Format a deadline timestamp for the status banner. Falls back to
  // the raw ISO string if the locale formatter trips.
  const formatDeadline = (ms, ptLocale) => {
    if (!ms) return null;
    try {
      return new Date(ms).toLocaleDateString(ptLocale ? "pt-BR" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return String(new Date(ms).toISOString().slice(0, 10));
    }
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

      {/* Prediction-step status banner. Three states:
            - Locked (deadline has passed) — red lock-style notice
            - Submitted (already saved, can still edit) — green
            - Draft (no save yet)                       — quiet hint  */}
      {isPredictionStep && !restoring && (
        <div
          className={`flex items-start gap-2 px-3 py-2 rounded-lg text-sm border ${
            isLocked
              ? "bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800"
              : submitted
                ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800"
                : "bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-200 border-blue-200 dark:border-blue-800"
          }`}
        >
          {isLocked ? (
            <Lock className="w-4 h-4 mt-0.5 shrink-0" />
          ) : submitted ? (
            <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            {isLocked ? (
              <>
                <p className="font-semibold">
                  {isPortuguese
                    ? "Bloqueado — a fase de grupos começou."
                    : "Locked — group stage has started."}
                </p>
                <p className="text-xs opacity-80">
                  {isPortuguese
                    ? "Sua predição não pode mais ser editada."
                    : "Your prediction can no longer be edited."}
                </p>
              </>
            ) : submitted ? (
              <>
                <p className="font-semibold">
                  {isPortuguese
                    ? "Predição salva ✓"
                    : "Prediction saved ✓"}
                </p>
                {effectiveDeadlineMs && (
                  <p className="text-xs opacity-80">
                    {isPortuguese
                      ? `Você pode alterá-la até ${formatDeadline(
                          effectiveDeadlineMs,
                          isPortuguese
                        )}.`
                      : `You can change it until ${formatDeadline(
                          effectiveDeadlineMs,
                          isPortuguese
                        )}.`}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="font-semibold">
                  {isPortuguese
                    ? "Arraste cada equipe e toque em Salvar quando estiver pronto."
                    : "Drag each team into place, then tap Save when you're ready."}
                </p>
                {effectiveDeadlineMs && (
                  <p className="text-xs opacity-80">
                    {isPortuguese
                      ? `Prazo: ${formatDeadline(effectiveDeadlineMs, isPortuguese)}`
                      : `Deadline: ${formatDeadline(effectiveDeadlineMs, isPortuguese)}`}
                  </p>
                )}
              </>
            )}
          </div>
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

      {/* Tray — hidden when:
            - non-prediction step has been auto-completed, OR
            - prediction step is locked (deadline passed)              */}
      {trayCards.length > 0 &&
        (isPredictionStep ? !isLocked : !completed) && (
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

      {/* Save button — prediction steps only. Disabled until every card
          is placed; hides entirely once the deadline has passed. */}
      {isPredictionStep && !isLocked && (
        <div className="flex flex-col items-center gap-2">
          {saveError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4" />
              {saveError}
            </div>
          )}
          <button
            type="button"
            onClick={handleSavePrediction}
            disabled={!allPlaced || submitting}
            className={`px-6 py-2.5 rounded-full font-bold text-sm sm:text-base tracking-wide transition-all ${
              justSaved
                ? "bg-emerald-500 text-white"
                : "bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed text-[#070707]"
            }`}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                {isPortuguese ? "Salvando…" : "Saving…"}
              </span>
            ) : justSaved ? (
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                {isPortuguese ? "Salvo" : "Saved"}
              </span>
            ) : submitted ? (
              isPortuguese
                ? "Atualizar predição"
                : "Update your prediction"
            ) : isPortuguese ? (
              "Salvar predição"
            ) : (
              "Save your prediction"
            )}
          </button>
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

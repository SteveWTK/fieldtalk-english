/* eslint-disable @typescript-eslint/no-unused-vars */
// components/exercises/InteractiveGameFormation.js
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Trophy,
  Languages,
} from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import {
  playSuccessSound,
  playErrorSound,
  playCheerSound,
} from "@/lib/soundEffects";
import { useSoundPreference } from "@/lib/hooks/useSoundPreference";
import { useIsWide } from "@/lib/hooks/useIsWide";

/**
 * InteractiveGameFormation — visual sibling to DragDropFormation, but
 * a command-following game rather than placement.
 *
 * The pitch shows the 11 players of a fixed formation. A spoken/written
 * command refers to one player by slot id (e.g. "Pass to the left winger").
 * The user either CLICKS the correct slot (default, with tolerance) or
 * DRAGS the ball onto the correct slot (opt-in via interaction_mode).
 *
 * formation_config:
 *   - formation_name: string ("4-3-3")
 *   - pitch_image: optional URL
 *   - interaction_mode: "click" (default) | "drag"
 *   - click_tolerance_px: number — radius (in rendered px) around a slot
 *       centre that still counts as a hit in click mode. Default 50.
 *   - ball_start: { x: "50%", y: "85%" } — initial ball position
 *   - position_slots: array of:
 *       - id: string
 *       - label: string (e.g. "Left Winger")
 *       - label_pt: string (optional)
 *       - x: "50%"
 *       - y: "92%"
 *   - commands: array of:
 *       - id: string
 *       - text: string (English command)
 *       - translation: string (optional)
 *       - target_slot_id: string  ← references a position_slots[].id
 *       - audio_url: string (optional pre-recorded; otherwise TTS)
 *       - success_message: string (optional)
 *   - timing: optional speed-progression block
 *       - enabled: boolean — if false/missing, no per-command timer
 *       - commands_per_round: number (default 4)
 *       - initial_ms: number (default 8000) — round 1's time limit
 *       - decrement_ms: number (default 1500) — shaved off each round
 *       - min_ms: number (default 3000) — floor
 *
 * Sounds:
 *   - playSuccessSound on a normal correct
 *   - playCheerSound on the last correct of each round (or final command)
 *   - playErrorSound on wrong or timeout
 *
 * Wide-screen layout:
 *   - Viewports ≥ 1024px wide flip to landscape; slot/ball percentages
 *     are auto-rotated CW so the same JSON works in both orientations.
 */
export default function InteractiveGameFormation({
  step,
  lessonId,
  onComplete,
  userLanguage = "en",
}) {
  const { t } = useTranslation();
  const config = step?.formation_config || {};
  const slots = config.position_slots || [];
  const commands = config.commands || [];
  const interactionMode = config.interaction_mode || "click";
  const clickTolerancePx = Number(config.click_tolerance_px) || 50;
  const ballStart = config.ball_start || { x: "50%", y: "85%" };

  const baseXp = step?.xp_reward || 40;
  const isPortuguese = userLanguage === "pt";
  const { isMuted, toggleMute } = useSoundPreference();
  const isHorizontal = useIsWide(1024);

  // Speed-progression block. enabled=false (or missing) → no timer.
  const timing = config.timing || {};
  const timingEnabled = timing.enabled === true;
  const commandsPerRound = Math.max(1, Number(timing.commands_per_round) || 4);
  const initialMs = Math.max(1000, Number(timing.initial_ms) || 8000);
  const decrementMs = Math.max(0, Number(timing.decrement_ms) || 1500);
  const minMs = Math.max(1000, Number(timing.min_ms) || 3000);

  const timeLimitFor = (commandIdx) => {
    if (!timingEnabled) return null;
    const round = Math.floor(commandIdx / commandsPerRound);
    return Math.max(minMs, initialMs - round * decrementMs);
  };

  // CW rotation of (x, y) percentage pairs for landscape layout on wide
  // screens. Matches DragDropFormation + InteractivePitchFormation.
  const transformPosition = (pos) => {
    if (!isHorizontal) return { left: pos.x, top: pos.y };
    const xv = parseFloat(String(pos.x).replace("%", ""));
    const yv = parseFloat(String(pos.y).replace("%", ""));
    if (Number.isNaN(xv) || Number.isNaN(yv)) {
      return { left: pos.x, top: pos.y };
    }
    return { left: `${100 - yv}%`, top: `${xv}%` };
  };

  const storageKey = `interactiveGameFormation_${lessonId || "x"}_${
    step?.id || "0"
  }`;

  const labels = isPortuguese
    ? {
        instructionClick: "Ouça o comando e clique no jogador correto",
        instructionDrag: "Ouça o comando e arraste a bola ao jogador correto",
        play: "Ouvir comando",
        listen: "Ouvir novamente",
        translation: "Tradução",
        progress: "comandos",
        score: "Pontos",
        correct: "Excelente passe!",
        wrong: "Tente novamente — ouça com atenção",
        complete: "Jogo completo!",
        playAgain: "Jogar novamente",
        xpEarned: "XP ganho",
        loading: "Carregando...",
        empty: "Este jogo ainda não tem comandos. Pergunte ao seu professor.",
      }
    : {
        instructionClick: "Listen to the command and click the correct player",
        instructionDrag: "Listen and drag the ball to the correct player",
        play: "Listen to command",
        listen: "Listen again",
        translation: "Translation",
        progress: "commands",
        score: "Score",
        correct: "Great pass!",
        wrong: "Try again — listen carefully",
        complete: "Game complete!",
        playAgain: "Play again",
        xpEarned: "XP earned",
        loading: "Loading...",
        empty: "This game has no commands yet. Ask your teacher.",
      };

  // ---- Restored state from localStorage ----
  const initial = (() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const [currentCommand, setCurrentCommand] = useState(
    initial?.currentCommand || 0
  );
  const [score, setScore] = useState(initial?.score || 0);
  const [gameState, setGameState] = useState(initial?.gameState || "ready"); // ready | playing | completed
  const [ballPos, setBallPos] = useState(
    initial?.ballPos || { left: ballStart.x, top: ballStart.y }
  );
  const [showTranslation, setShowTranslation] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [hasPlayedCommand, setHasPlayedCommand] = useState(false);
  const [feedback, setFeedback] = useState(null); // null | "correct" | "wrong"
  const [activeSlotId, setActiveSlotId] = useState(null);

  // Drag mode state
  const [dragging, setDragging] = useState(false);
  const [dragPx, setDragPx] = useState({ x: 0, y: 0 });

  // Timing/round state
  const [roundBadge, setRoundBadge] = useState(null); // number | null
  const [timerKey, setTimerKey] = useState(0); // bump to restart the CSS bar
  const prevRoundRef = useRef(0);

  const audioRef = useRef(null);
  const pitchRef = useRef(null);
  const slotRefs = useRef({});
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const currentCmd = commands[currentCommand];
  const totalCommands = commands.length;

  // Persist progress
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (gameState === "completed") return;
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({ currentCommand, score, gameState, ballPos })
      );
    } catch {
      // ignore
    }
  }, [currentCommand, score, gameState, ballPos, storageKey]);

  // Clear on completion (after a small delay so a refresh during the
  // celebration doesn't reset prematurely).
  useEffect(() => {
    if (gameState !== "completed") return;
    const tid = setTimeout(() => {
      if (typeof window !== "undefined") {
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      }
    }, 2000);
    return () => clearTimeout(tid);
  }, [gameState, storageKey]);

  // ---- Audio ----
  const playCommand = useCallback(async () => {
    if (!currentCmd) return;
    setAudioLoading(true);
    setFeedback(null);
    try {
      const url = await generateCommandAudio(currentCmd);
      if (url && audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play();
      }
    } catch {
      // ignore — fall through to playing state
    } finally {
      setAudioLoading(false);
      setGameState("playing");
      setHasPlayedCommand(true);
    }
  }, [currentCmd]);

  // Auto-play next command after a correct answer
  useEffect(() => {
    if (gameState !== "ready") return;
    if (currentCommand === 0) return;
    if (hasPlayedCommand) return;
    const tid = setTimeout(() => {
      playCommand();
    }, 800);
    return () => clearTimeout(tid);
  }, [gameState, currentCommand, hasPlayedCommand, playCommand]);

  // ---- Hit resolution ----
  const slotRectCentre = (slotId) => {
    const el = slotRefs.current[slotId];
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  };

  const findClickedSlot = (clientX, clientY) => {
    let best = null;
    let bestDist = clickTolerancePx;
    for (const slot of slots) {
      const c = slotRectCentre(slot.id);
      if (!c) continue;
      const d = Math.hypot(clientX - c.cx, clientY - c.cy);
      if (d <= bestDist) {
        bestDist = d;
        best = slot;
      }
    }
    return best;
  };

  // Move the ball to a slot using % positions
  const moveBallToSlot = (slot) => {
    setBallPos({ left: slot.x, top: slot.y });
  };

  // Advance to next command (or complete) — used for both correct answers
  // and timeouts. `scoreDelta` is 1 for correct, 0 for timeout/wrong-then-
  // skip. Currently only the timeout path uses 0 since wrong clicks just
  // shake and let the user retry.
  const advanceCommand = (scoreDelta) => {
    setFeedback(null);
    setActiveSlotId(null);
    const nextScore = score + scoreDelta;
    if (currentCommand + 1 < totalCommands) {
      setCurrentCommand((c) => c + 1);
      setHasPlayedCommand(false);
      setGameState("ready");
    } else {
      setGameState("completed");
      const xp = Math.round((nextScore / totalCommands) * (baseXp - 10)) + 10;
      onCompleteRef.current?.(xp);
    }
  };

  const handleHit = (targetSlot) => {
    if (!currentCmd || !targetSlot) return;
    const isCorrect = targetSlot.id === currentCmd.target_slot_id;
    setActiveSlotId(targetSlot.id);

    if (isCorrect) {
      setFeedback("correct");
      setScore((s) => s + 1);
      moveBallToSlot(targetSlot);
      // Cheer at the last command of every round (rounds enabled) AND at
      // the final command of the entire exercise. Otherwise standard chime.
      const isLastOfRound =
        timingEnabled && (currentCommand + 1) % commandsPerRound === 0;
      const isLastOfGame = currentCommand + 1 === totalCommands;
      if (!isMuted) {
        if (isLastOfRound || isLastOfGame) {
          playCheerSound();
        } else {
          playSuccessSound();
        }
      }
      setTimeout(() => advanceCommand(1), 1800);
    } else {
      setFeedback("wrong");
      if (!isMuted) playErrorSound();
      setTimeout(() => {
        setFeedback(null);
        setActiveSlotId(null);
      }, 1500);
    }
  };

  // Per-command countdown — when the game enters "playing" with a finite
  // time limit, schedule a timeout that auto-advances (counting as wrong)
  // if the user hasn't clicked in time. The CSS bar reads the same value.
  const currentTimeLimit = timeLimitFor(currentCommand);
  useEffect(() => {
    if (!timingEnabled) return;
    if (gameState !== "playing") return;
    if (!currentTimeLimit) return;
    setTimerKey((k) => k + 1);
    const tid = setTimeout(() => {
      setFeedback("wrong");
      if (!isMuted) playErrorSound();
      setTimeout(() => advanceCommand(0), 1200);
    }, currentTimeLimit);
    return () => clearTimeout(tid);
    // advanceCommand intentionally omitted — capture the values at the
    // moment we enter "playing".
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState, currentCommand, currentTimeLimit, timingEnabled, isMuted]);

  // Round transition badge — fires briefly when entering a new round.
  useEffect(() => {
    if (!timingEnabled) {
      prevRoundRef.current = 0;
      return;
    }
    const round = Math.floor(currentCommand / commandsPerRound);
    if (round > prevRoundRef.current && currentCommand > 0) {
      setRoundBadge(round + 1);
      const tid = setTimeout(() => setRoundBadge(null), 1600);
      prevRoundRef.current = round;
      return () => clearTimeout(tid);
    }
    prevRoundRef.current = round;
  }, [currentCommand, timingEnabled, commandsPerRound]);

  // ---- Click mode ----
  const handlePitchClick = (e) => {
    if (gameState !== "playing") return;
    if (interactionMode === "drag") return; // drag mode handles via pointer up
    const targetSlot = findClickedSlot(e.clientX, e.clientY);
    if (targetSlot) handleHit(targetSlot);
  };

  // ---- Drag mode ----
  const handleBallPointerDown = (e) => {
    if (interactionMode !== "drag") return;
    if (gameState !== "playing") return;
    e.preventDefault();
    setDragging(true);
    setDragPx({ x: e.clientX, y: e.clientY });
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => setDragPx({ x: e.clientX, y: e.clientY });
    const onUp = (e) => {
      setDragging(false);
      const targetSlot = findClickedSlot(e.clientX, e.clientY);
      if (targetSlot) handleHit(targetSlot);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, currentCommand, gameState]);

  // ---- Reset ----
  const resetGame = () => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
    }
    setCurrentCommand(0);
    setScore(0);
    setGameState("ready");
    setBallPos({ left: ballStart.x, top: ballStart.y });
    setFeedback(null);
    setShowTranslation(false);
    setHasPlayedCommand(false);
    setActiveSlotId(null);
    setRoundBadge(null);
    prevRoundRef.current = 0;
  };

  // ---- Empty-state guard ----
  if (slots.length === 0 || commands.length === 0) {
    return (
      <p className="text-center text-gray-600 dark:text-gray-400 py-8">
        {labels.empty}
      </p>
    );
  }

  // Inline SVG pitch — inset markings so the three pitch step types share
  // visual vocabulary. See DragDropFormation + InteractivePitchFormation.
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {step?.content ||
            (interactionMode === "drag"
              ? labels.instructionDrag
              : labels.instructionClick)}
          {config.formation_name && (
            <span className="ml-2 px-2 py-0.5 rounded-full bg-accent-100 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300 font-medium text-xs">
              {config.formation_name}
            </span>
          )}
        </p>
        <div className="flex items-center gap-3 text-sm">
          <span className="font-semibold text-gray-900 dark:text-white">
            {currentCommand + (gameState === "completed" ? 0 : 1)}/
            {totalCommands} {labels.progress}
          </span>
          <span className="font-semibold text-accent-700 dark:text-accent-300">
            {labels.score}: {score}/{totalCommands}
          </span>
          <button
            onClick={toggleMute}
            aria-label={isMuted ? "Unmute" : "Mute"}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white p-1"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Command panel */}
      {gameState !== "completed" && (
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 sm:p-4">
          {gameState === "ready" ? (
            <div className="text-center">
              <button
                onClick={playCommand}
                disabled={audioLoading}
                className="inline-flex items-center gap-2 bg-accent-600 hover:bg-accent-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-full font-semibold transition-colors"
              >
                {audioLoading ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                {audioLoading ? labels.loading : labels.play}
              </button>
            </div>
          ) : (
            <div>
              <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
                &ldquo;{currentCmd?.text}&rdquo;
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  onClick={playCommand}
                  disabled={audioLoading}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  {audioLoading ? (
                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                  {labels.listen}
                </button>
                {currentCmd?.translation && (
                  <button
                    onClick={() => setShowTranslation((v) => !v)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Languages className="w-4 h-4" />
                    {labels.translation}
                  </button>
                )}
              </div>
              {showTranslation && currentCmd?.translation && (
                <p className="text-center text-accent-700 dark:text-accent-400 italic mt-2 text-sm">
                  {currentCmd.translation}
                </p>
              )}
              {/* Countdown bar — only when timing is enabled & we're in
                  the answer window for this command. */}
              {timingEnabled && currentTimeLimit && !feedback && (
                <div className="mt-3 h-1.5 rounded-full bg-emerald-200/40 dark:bg-emerald-900/40 overflow-hidden">
                  <div
                    key={timerKey}
                    className="h-full bg-emerald-500 dark:bg-emerald-400 ig-timer-bar"
                    style={{
                      animationDuration: `${currentTimeLimit}ms`,
                    }}
                  />
                </div>
              )}
              {feedback && (
                <div
                  className={`mt-3 text-center text-sm font-semibold ${
                    feedback === "correct"
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-red-700 dark:text-red-300"
                  }`}
                >
                  {feedback === "correct"
                    ? `✅ ${currentCmd?.success_message || labels.correct}`
                    : `❌ ${labels.wrong}`}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pitch */}
      <div
        ref={pitchRef}
        onClick={handlePitchClick}
        className="relative w-full mx-auto rounded-xl overflow-hidden shadow-md select-none"
        style={{
          maxWidth: isHorizontal ? "700px" : "500px",
          aspectRatio: isHorizontal ? "7 / 5" : "5 / 7",
          cursor:
            gameState === "playing" && interactionMode === "click"
              ? "crosshair"
              : "default",
        }}
      >
        {config.pitch_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={config.pitch_image}
            alt="Pitch"
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />
        ) : isHorizontal ? (
          renderHorizontalPitch()
        ) : (
          renderVerticalPitch()
        )}

        {/* Player slots — blank circles. Names from the prior pitch step. */}
        {slots.map((slot) => {
          const isTarget = activeSlotId === slot.id;
          const isCorrectTarget =
            feedback === "correct" && currentCmd?.target_slot_id === slot.id;
          const pos = transformPosition(slot);
          return (
            <div
              key={slot.id}
              ref={(el) => (slotRefs.current[slot.id] = el)}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-10 h-10 sm:w-12 sm:h-12 rounded-full shadow-md transition-all ${
                isCorrectTarget
                  ? "bg-emerald-500 ring-4 ring-emerald-200 scale-110"
                  : isTarget
                    ? "bg-red-500 ring-4 ring-red-200"
                    : "bg-gradient-to-br from-accent-500 to-accent-700 ring-2 ring-white/40"
              }`}
              style={{ left: pos.left, top: pos.top, pointerEvents: "none" }}
              aria-label={slot.label}
            />
          );
        })}

        {/* The ball */}
        {!dragging && (() => {
          const ballPosTransformed = transformPosition({
            x: ballPos.left,
            y: ballPos.top,
          });
          return (
            <button
              type="button"
              onPointerDown={handleBallPointerDown}
              disabled={gameState !== "playing" || interactionMode !== "drag"}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border-2 border-black shadow-lg transition-all duration-700 ${
                interactionMode === "drag" && gameState === "playing"
                  ? "cursor-grab active:cursor-grabbing hover:scale-110"
                  : "cursor-default"
              }`}
              style={{
                left: ballPosTransformed.left,
                top: ballPosTransformed.top,
                touchAction: "none",
                backgroundImage:
                  "radial-gradient(circle at 30% 30%, white 25%, #ddd 70%)",
              }}
              aria-label="Ball"
            />
          );
        })()}

        {/* Round transition badge — brief overlay when a faster round starts. */}
        {roundBadge && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="ig-round-badge px-4 py-2 rounded-full bg-black/75 text-white font-bold text-lg shadow-lg">
              {isPortuguese ? "Rodada" : "Round"} {roundBadge}
              <span className="ml-2 text-amber-300">⚡</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating ball while dragging */}
      {dragging && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPx.x,
            top: dragPx.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <div
            className="w-8 h-8 rounded-full border-2 border-black shadow-lg"
            style={{
              backgroundImage:
                "radial-gradient(circle at 30% 30%, white 25%, #ddd 70%)",
            }}
          />
        </div>
      )}

      {/* Completion panel */}
      {gameState === "completed" && (
        <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl p-6 text-center">
          <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {labels.complete}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 mb-3">
            {score}/{totalCommands}
          </p>
          <button
            onClick={resetGame}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            {labels.playAgain}
          </button>
        </div>
      )}

      {/* Hidden audio element */}
      <audio ref={audioRef} className="hidden" />

      <style jsx>{`
        @keyframes ig-timer-bar {
          0% {
            width: 100%;
          }
          100% {
            width: 0%;
          }
        }
        :global(.ig-timer-bar) {
          animation-name: ig-timer-bar;
          animation-timing-function: linear;
          animation-fill-mode: forwards;
        }
        @keyframes ig-round-badge {
          0% {
            opacity: 0;
            transform: scale(0.7);
          }
          15%,
          85% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.95);
          }
        }
        :global(.ig-round-badge) {
          animation: ig-round-badge 1.6s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
}

// Identical TTS strategy to InteractiveGame: try pre-recorded asset first,
// otherwise fall through to /api/tts.
async function generateCommandAudio(command) {
  if (!command) return null;

  if (command.audio_url && command.audio_url.startsWith("/audio/")) {
    try {
      const res = await fetch(command.audio_url, { method: "HEAD" });
      if (res.ok) return command.audio_url;
    } catch {
      // fall through to TTS
    }
  }

  try {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: command.text,
        englishVariant: "british",
        voiceGender: "female",
      }),
    });
    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }
  } catch {
    // ignore
  }
  return null;
}

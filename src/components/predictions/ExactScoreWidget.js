// src/components/predictions/ExactScoreWidget.js
//
// Two number-pickers (home + away). Capped at 9 each for usability;
// the API allows 0–20 in case a wild scoreline ever happens. Plus +
// minus buttons + a debounced auto-save on each change.
"use client";

import { useState, useEffect, useRef } from "react";
import { Crosshair, Plus, Minus, Check, Loader2 } from "lucide-react";
import { REWARDS } from "@/lib/predictions/rewards";

const MAX_DISPLAY_GOALS = 9;
const SAVE_DEBOUNCE_MS = 600;

export default function ExactScoreWidget({
  homeTeam,
  awayTeam,
  current, // {home: 2, away: 1} or null
  locked,
  onSubmit,
  copy,
}) {
  const [home, setHome] = useState(current?.home ?? null);
  const [away, setAway] = useState(current?.away ?? null);
  const [phase, setPhase] = useState("idle");
  const timerRef = useRef(null);

  // Keep in sync if the parent reloads with new server state.
  useEffect(() => {
    setHome(current?.home ?? null);
    setAway(current?.away ?? null);
  }, [current?.home, current?.away]);

  // Debounced auto-save on any change. The user can hammer + / -
  // and we'll fire one save once they settle.
  useEffect(() => {
    if (locked) return;
    if (home === null || away === null) return;
    if (
      home === (current?.home ?? null) &&
      away === (current?.away ?? null)
    ) {
      return;
    }
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setPhase("saving");
      const result = await onSubmit({ home, away });
      setPhase(result?.ok ? "saved" : "error");
      if (result?.ok) {
        setTimeout(() => setPhase("idle"), 1500);
      }
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // We deliberately don't depend on `current` here — it would
    // refire on a reload after the save, undoing the "saved" state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [home, away, locked]);

  const bump = (side, delta) => {
    if (locked) return;
    if (side === "home") {
      setHome((v) => {
        const next = Math.min(MAX_DISPLAY_GOALS, Math.max(0, (v ?? 0) + delta));
        return next;
      });
    } else {
      setAway((v) => {
        const next = Math.min(MAX_DISPLAY_GOALS, Math.max(0, (v ?? 0) + delta));
        return next;
      });
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Crosshair className="w-3.5 h-3.5 text-amber-300" />
            <h4 className="font-bold text-sm text-white">
              {copy.exactScoreTitle}
            </h4>
          </div>
          <p className="text-[11px] text-white/55 leading-relaxed">
            {copy.exactScoreHint}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-300/15 text-amber-200">
          +{REWARDS.exact_score.xp} XP
        </span>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <ScoreStepper
          team={homeTeam}
          value={home}
          onUp={() => bump("home", 1)}
          onDown={() => bump("home", -1)}
          disabled={locked}
        />
        <span className="text-white/40 font-black text-lg">×</span>
        <ScoreStepper
          team={awayTeam}
          value={away}
          onUp={() => bump("away", 1)}
          onDown={() => bump("away", -1)}
          disabled={locked}
        />
      </div>

      <StatusLine phase={phase} copy={copy} />
    </div>
  );
}

function ScoreStepper({ team, value, onUp, onDown, disabled }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2 flex items-center justify-between gap-1.5 min-w-0">
      <button
        type="button"
        onClick={onDown}
        disabled={disabled}
        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-40 flex items-center justify-center text-white/70 transition-colors"
        aria-label="Decrease"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <div className="flex-1 text-center min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold truncate">
          {team}
        </p>
        <p className="text-2xl font-black tabular-nums leading-none mt-0.5">
          {value === null ? "—" : value}
        </p>
      </div>
      <button
        type="button"
        onClick={onUp}
        disabled={disabled}
        className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/15 disabled:opacity-40 flex items-center justify-center text-white/70 transition-colors"
        aria-label="Increase"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function StatusLine({ phase, copy }) {
  if (phase === "idle") return null;
  return (
    <div className="mt-2 text-[11px] font-semibold flex items-center gap-1.5">
      {phase === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-white/60" />
          <span className="text-white/60">{copy.saving}</span>
        </>
      )}
      {phase === "saved" && (
        <>
          <Check className="w-3 h-3 text-emerald-300" />
          <span className="text-emerald-300">{copy.saved}</span>
        </>
      )}
      {phase === "error" && (
        <span className="text-red-300">{copy.saveError}</span>
      )}
    </div>
  );
}

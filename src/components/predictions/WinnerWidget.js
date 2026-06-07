// src/components/predictions/WinnerWidget.js
//
// Three-way home / draw / away pick. Renders three pill buttons in
// a row. Tracks "saved" state internally so the parent only needs
// to pass the current pick + an onChange callback.
"use client";

import { useState, useEffect } from "react";
import { Trophy, Check, Loader2 } from "lucide-react";
import { REWARDS } from "@/lib/predictions/rewards";

export default function WinnerWidget({
  homeTeam,
  awayTeam,
  current, // {winner: "home"|"away"|"draw"} or null
  locked,
  onSubmit,
  copy,
}) {
  const initial = current?.winner || null;
  const [pick, setPick] = useState(initial);
  const [phase, setPhase] = useState("idle"); // idle | saving | saved | error

  useEffect(() => {
    setPick(current?.winner || null);
  }, [current?.winner]);

  const handleChoose = async (next) => {
    if (locked || phase === "saving") return;
    setPick(next);
    setPhase("saving");
    const result = await onSubmit({ winner: next });
    setPhase(result?.ok ? "saved" : "error");
    if (result?.ok) {
      setTimeout(() => setPhase("idle"), 1500);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <Trophy className="w-3.5 h-3.5 text-emerald-300" />
            <h4 className="font-bold text-sm text-white">
              {copy.winnerTitle}
            </h4>
          </div>
          <p className="text-[11px] text-white/55 leading-relaxed">
            {copy.winnerHint}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200">
          +{REWARDS.winner.xp} XP
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <PickButton
          label={homeTeam}
          sub={copy.home}
          active={pick === "home"}
          disabled={locked}
          onClick={() => handleChoose("home")}
        />
        <PickButton
          label={copy.draw}
          sub=""
          active={pick === "draw"}
          disabled={locked}
          onClick={() => handleChoose("draw")}
        />
        <PickButton
          label={awayTeam}
          sub={copy.away}
          active={pick === "away"}
          disabled={locked}
          onClick={() => handleChoose("away")}
        />
      </div>

      <StatusLine phase={phase} copy={copy} />
    </div>
  );
}

function PickButton({ label, sub, active, disabled, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group rounded-lg border px-2 py-2 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? "border-emerald-400 bg-emerald-500/15 text-white"
          : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/25 hover:text-white"
      }`}
    >
      <p className="text-xs font-bold leading-tight truncate">{label}</p>
      {sub && <p className="text-[10px] text-white/40 mt-0.5">{sub}</p>}
    </button>
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

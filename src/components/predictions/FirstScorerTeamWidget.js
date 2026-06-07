// src/components/predictions/FirstScorerTeamWidget.js
//
// Three-way: home / away / none (a 0–0 draw means nobody opened
// the scoring, so we let the user predict it explicitly).
"use client";

import { useState, useEffect } from "react";
import { Flame, Check, Loader2 } from "lucide-react";
import { REWARDS } from "@/lib/predictions/rewards";

export default function FirstScorerTeamWidget({
  homeTeam,
  awayTeam,
  current, // {team: "home"|"away"|"none"} or null
  locked,
  onSubmit,
  copy,
}) {
  const [pick, setPick] = useState(current?.team || null);
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    setPick(current?.team || null);
  }, [current?.team]);

  const handleChoose = async (next) => {
    if (locked || phase === "saving") return;
    setPick(next);
    setPhase("saving");
    const result = await onSubmit({ team: next });
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
            <Flame className="w-3.5 h-3.5 text-orange-300" />
            <h4 className="font-bold text-sm text-white">
              {copy.firstScorerTitle}
            </h4>
          </div>
          <p className="text-[11px] text-white/55 leading-relaxed">
            {copy.firstScorerHint}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-orange-300/15 text-orange-200">
          +{REWARDS.first_scorer_team.xp} XP
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <PickButton
          label={homeTeam}
          active={pick === "home"}
          disabled={locked}
          onClick={() => handleChoose("home")}
        />
        <PickButton
          label={copy.none}
          active={pick === "none"}
          disabled={locked}
          onClick={() => handleChoose("none")}
          variant="neutral"
        />
        <PickButton
          label={awayTeam}
          active={pick === "away"}
          disabled={locked}
          onClick={() => handleChoose("away")}
        />
      </div>

      <StatusLine phase={phase} copy={copy} />
    </div>
  );
}

function PickButton({ label, active, disabled, onClick, variant }) {
  const activeClass =
    variant === "neutral"
      ? "border-white/40 bg-white/10 text-white"
      : "border-orange-400 bg-orange-500/15 text-white";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-2 py-2 text-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        active
          ? activeClass
          : "border-white/10 bg-white/[0.02] text-white/70 hover:border-white/25 hover:text-white"
      }`}
    >
      <p className="text-xs font-bold leading-tight truncate">{label}</p>
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

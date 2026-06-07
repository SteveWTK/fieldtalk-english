/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/predictions/MatchCard.js
//
// One row in the Predictions Centre list. Header shows the two
// teams + kickoff time + stage badge. Body is one of two shapes:
//
//   - Upcoming match → three prediction widgets (winner, exact
//                       score, first-scorer) stacked vertically.
//                       Widgets self-disable once kickoff has passed.
//   - Resolved match → final score + per-pick correct/wrong + XP.
//
// Submits to /api/match-predictions/submit per widget. On success
// the parent's onSaved() callback refreshes the list so the
// next render reflects what the server actually stored (handles
// the rare conflict case cleanly).
"use client";

import { useMemo, useState } from "react";
import { Clock, Check, X, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import Image from "next/image";
import WinnerWidget from "./WinnerWidget";
import ExactScoreWidget from "./ExactScoreWidget";
import FirstScorerTeamWidget from "./FirstScorerTeamWidget";

const STAGE_LABEL_EN = {
  group_a: "Group A",
  group_b: "Group B",
  group_c: "Group C",
  group_d: "Group D",
  group_e: "Group E",
  group_f: "Group F",
  group_g: "Group G",
  group_h: "Group H",
  group_i: "Group I",
  group_j: "Group J",
  group_k: "Group K",
  group_l: "Group L",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-finals",
  sf: "Semi-finals",
  third: "Third-place play-off",
  final: "Final",
};

const STAGE_LABEL_PT = {
  group_a: "Grupo A",
  group_b: "Grupo B",
  group_c: "Grupo C",
  group_d: "Grupo D",
  group_e: "Grupo E",
  group_f: "Grupo F",
  group_g: "Grupo G",
  group_h: "Grupo H",
  group_i: "Grupo I",
  group_j: "Grupo J",
  group_k: "Grupo K",
  group_l: "Grupo L",
  r32: "Trigésimas",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semis",
  third: "Disputa do 3º lugar",
  final: "Final",
};

function stageLabel(stage, lang) {
  const map = lang === "pt" ? STAGE_LABEL_PT : STAGE_LABEL_EN;
  return map[stage] || stage;
}

function formatKickoff(iso, lang) {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-GB", {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function flagSrc(code) {
  if (!code) return null;
  // Match the convention already used elsewhere for flag PNGs.
  return `https://flagcdn.com/w80/${code.toLowerCase()}.png`;
}

export default function MatchCard({ match, copy, lang, mode, onSaved }) {
  const {
    id: matchId,
    home_team: homeTeam,
    away_team: awayTeam,
    home_team_code: homeCode,
    away_team_code: awayCode,
    kickoff_at: kickoffAt,
    stage,
    venue,
    predictions,
    status,
    home_score: homeScore,
    away_score: awayScore,
    first_scorer_team: firstScorerTeam,
  } = match;

  const now = Date.now();
  const kickoffMs = kickoffAt ? new Date(kickoffAt).getTime() : 0;
  const isLocked = mode === "resolved" || (kickoffMs > 0 && now >= kickoffMs);
  const isResolved = mode === "resolved";

  // Collapse upcoming cards by default if all three picks are made,
  // so the user can scan their submitted predictions at a glance.
  const allPicked =
    predictions?.winner &&
    predictions?.exact_score &&
    predictions?.first_scorer_team;
  const [expanded, setExpanded] = useState(!allPicked || mode === "resolved");

  const submitPick = async (predictionType, data) => {
    try {
      const res = await fetch("/api/match-predictions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, predictionType, data }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { ok: false, error: json?.error || "Save failed" };
      }
      onSaved?.();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || "Network error" };
    }
  };

  const totalXp = useMemo(() => {
    if (!isResolved || !predictions) return 0;
    return ["winner", "exact_score", "first_scorer_team"]
      .map((k) => predictions[k]?.xp_awarded || 0)
      .reduce((a, b) => a + b, 0);
  }, [predictions, isResolved]);

  return (
    <article className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
      {/* ── Header strip ── */}
      <header className="px-4 sm:px-5 py-3 border-b border-white/10 bg-white/[0.02]">
        <div className="flex items-center justify-between gap-3 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-200/80">
            {stageLabel(stage, lang)}
          </span>
          <KickoffBadge
            kickoffMs={kickoffMs}
            now={now}
            isResolved={isResolved}
            copy={copy}
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <TeamSide name={homeTeam} code={homeCode} align="left" />
          {isResolved ? (
            <div className="flex items-center gap-2 text-2xl sm:text-3xl font-black tabular-nums">
              <span>{homeScore ?? "—"}</span>
              <span className="text-white/30 text-lg">×</span>
              <span>{awayScore ?? "—"}</span>
            </div>
          ) : (
            <span className="text-white/30 text-sm font-black tracking-wider">
              vs
            </span>
          )}
          <TeamSide name={awayTeam} code={awayCode} align="right" />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-white/45 mt-2">
          <Clock className="w-3 h-3" />
          <span>{formatKickoff(kickoffAt, lang)}</span>
          {venue && (
            <>
              <span className="text-white/20 px-1">·</span>
              <MapPin className="w-3 h-3" />
              <span className="truncate">{venue}</span>
            </>
          )}
        </div>
      </header>

      {/* ── Body ── */}
      {isResolved ? (
        <ResolvedBody
          predictions={predictions}
          totalXp={totalXp}
          firstScorerTeam={firstScorerTeam}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          copy={copy}
        />
      ) : (
        <UpcomingBody
          expanded={expanded}
          setExpanded={setExpanded}
          allPicked={allPicked}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          predictions={predictions}
          isLocked={isLocked}
          submitPick={submitPick}
          copy={copy}
        />
      )}
    </article>
  );
}

function KickoffBadge({ kickoffMs, now, isResolved, copy }) {
  if (isResolved) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-white/65">
        {copy.badges.finished}
      </span>
    );
  }
  if (kickoffMs <= 0) return null;
  const mins = Math.round((kickoffMs - now) / 60000);
  if (mins <= 0) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-500/15 text-red-200">
        {copy.badges.locked}
      </span>
    );
  }
  if (mins <= 120) {
    return (
      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-300/15 text-amber-200">
        {copy.badges.kickoffSoon}
      </span>
    );
  }
  return null;
}

function TeamSide({ name, code, align }) {
  const src = flagSrc(code);
  return (
    <div
      className={`flex items-center gap-2 min-w-0 ${
        align === "right" ? "flex-row-reverse text-right" : ""
      }`}
    >
      {src ? (
        <Image
          src={src}
          alt={name}
          width={28}
          height={20}
          className="rounded-sm shadow"
          unoptimized
        />
      ) : (
        <div className="w-7 h-5 rounded-sm bg-white/10" />
      )}
      <p className="font-bold text-sm sm:text-base text-white truncate">
        {name}
      </p>
    </div>
  );
}

function UpcomingBody({
  expanded,
  setExpanded,
  allPicked,
  homeTeam,
  awayTeam,
  predictions,
  isLocked,
  submitPick,
  copy,
}) {
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="w-full px-4 sm:px-5 py-3 flex items-center justify-between text-xs text-white/65 hover:text-white/90 hover:bg-white/[0.03] transition-colors"
      >
        <span className="font-semibold">
          {allPicked ? "All picks made" : "Tap to predict"}
        </span>
        <ChevronDown className="w-4 h-4" />
      </button>
    );
  }

  return (
    <div className="p-4 sm:p-5 space-y-3">
      <WinnerWidget
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        current={predictions?.winner?.prediction_data}
        locked={isLocked}
        onSubmit={(data) => submitPick("winner", data)}
        copy={copy.widgets}
      />
      <ExactScoreWidget
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        current={predictions?.exact_score?.prediction_data}
        locked={isLocked}
        onSubmit={(data) => submitPick("exact_score", data)}
        copy={copy.widgets}
      />
      <FirstScorerTeamWidget
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        current={predictions?.first_scorer_team?.prediction_data}
        locked={isLocked}
        onSubmit={(data) => submitPick("first_scorer_team", data)}
        copy={copy.widgets}
      />

      {isLocked && (
        <p className="text-[11px] text-white/50 text-center pt-1">
          {copy.widgets.lockedNote}
        </p>
      )}

      {allPicked && (
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="w-full flex items-center justify-center gap-1.5 text-[11px] text-white/45 hover:text-white/75 pt-1"
        >
          <ChevronUp className="w-3 h-3" />
          Collapse
        </button>
      )}
    </div>
  );
}

function ResolvedBody({
  predictions,
  totalXp,
  firstScorerTeam,
  homeTeam,
  awayTeam,
  copy,
}) {
  const rows = [
    {
      type: "winner",
      label: copy.widgets.winnerTitle,
      pick: predictions?.winner,
      describe: (p) => {
        const w = p?.prediction_data?.winner;
        if (w === "home") return homeTeam;
        if (w === "away") return awayTeam;
        if (w === "draw") return copy.widgets.draw;
        return "—";
      },
    },
    {
      type: "exact_score",
      label: copy.widgets.exactScoreTitle,
      pick: predictions?.exact_score,
      describe: (p) => {
        const h = p?.prediction_data?.home;
        const a = p?.prediction_data?.away;
        if (h === undefined || a === undefined) return "—";
        return `${h}–${a}`;
      },
    },
    {
      type: "first_scorer_team",
      label: copy.widgets.firstScorerTitle,
      pick: predictions?.first_scorer_team,
      describe: (p) => {
        const t = p?.prediction_data?.team;
        if (t === "home") return homeTeam;
        if (t === "away") return awayTeam;
        if (t === "none") return copy.widgets.none;
        return "—";
      },
    },
  ];

  return (
    <div className="p-4 sm:p-5 space-y-2">
      {rows.map((r) => (
        <ResolvedRow
          key={r.type}
          label={r.label}
          picked={r.pick ? r.describe(r.pick) : null}
          correct={r.pick?.correct}
          xp={r.pick?.xp_awarded}
          copy={copy}
        />
      ))}
      <div className="flex items-center justify-between pt-2 mt-1 border-t border-white/10">
        <span className="text-xs font-semibold text-white/55">
          {copy.results.totalEarned}
        </span>
        <span className="text-base font-black text-emerald-300 tabular-nums">
          +{totalXp} XP
        </span>
      </div>
    </div>
  );
}

function ResolvedRow({ label, picked, correct, xp, copy }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        {correct === true ? (
          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3" />
          </span>
        ) : correct === false ? (
          <span className="w-5 h-5 rounded-full bg-white/5 text-white/40 flex items-center justify-center shrink-0">
            <X className="w-3 h-3" />
          </span>
        ) : (
          <span className="w-5 h-5 rounded-full bg-white/5 text-white/40 flex items-center justify-center shrink-0">
            —
          </span>
        )}
        <div className="min-w-0">
          <p className="font-semibold text-white truncate">{label}</p>
          <p className="text-[11px] text-white/50 truncate">
            {picked
              ? `${copy.results.youPicked}: ${picked}`
              : copy.results.pending}
          </p>
        </div>
      </div>
      <span
        className={`text-xs font-bold tabular-nums shrink-0 ${
          xp > 0 ? "text-emerald-300" : "text-white/30"
        }`}
      >
        {xp > 0 ? `+${xp}` : "—"}
      </span>
    </div>
  );
}

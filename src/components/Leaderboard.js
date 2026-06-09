// src/components/Leaderboard.js
//
// Top-N leaderboard tile, used on the Ultimate Team dashboard.
//
// Two filter axes:
//   1. Sort mode (squad value | XP | album %)
//   2. Cohort (Global | My school) — appears only for users whose
//      players.partner_referrer is set, so a Cultura Teresina or
//      Fortaleza student can switch to a school-local ranking for
//      classroom competitions.
//
// Each row shows the primary metric prominently plus one secondary
// number for context. If the user isn't in the visible top slice, an
// extra "you" row appears at the bottom showing their rank.
"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Crown, Users2, Globe2 } from "lucide-react";
import { BRANCHES } from "@/lib/branches";
import { useTranslation } from "@/hooks/useTranslation";

export default function Leaderboard({ defaultSort = "squad_value" }) {
  const { userLanguage } = useTranslation();
  const [sort, setSort] = useState(defaultSort);
  // "all" → global; "mine" → caller's partner_referrer (resolved
  // server-side from cookies). The component fetches once on mount
  // with "all" to learn whether the caller has a partner_referrer
  // (callerBranch in the response); only then does the school
  // toggle appear.
  const [cohort, setCohort] = useState("all");
  const [entries, setEntries] = useState([]);
  const [you, setYou] = useState(null);
  const [callerBranch, setCallerBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          sort,
          limit: "10",
          branch: cohort,
        });
        const res = await fetch(`/api/leaderboard?${params.toString()}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Could not load leaderboard");
          setEntries([]);
          setYou(null);
        } else {
          setEntries(json.entries || []);
          setYou(json.you || null);
          setCallerBranch(json.callerBranch || null);
        }
      } catch {
        if (!cancelled) {
          setError("Network error");
          setEntries([]);
          setYou(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sort, cohort]);

  // Look up the partner's friendly display name. Falls back to the
  // generic "My school" label if the slug isn't registered in
  // BRANCHES (so a brand-new partner we haven't added a logo for
  // yet still gets a working toggle).
  const schoolName =
    callerBranch && BRANCHES[callerBranch]?.alt
      ? BRANCHES[callerBranch].alt
      : userLanguage === "pt"
        ? "Minha escola"
        : "My school";

  const globalLabel = userLanguage === "pt" ? "Geral" : "Global";
  const emptyLabel =
    userLanguage === "pt"
      ? "Ninguém no ranking ainda — seja o primeiro!"
      : "No players ranked yet — be the first!";
  const emptySchoolLabel =
    userLanguage === "pt"
      ? "Ninguém da sua escola no ranking ainda — seja o primeiro!"
      : "No one from your school ranked yet — be the first!";

  return (
    <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white/60 text-xs tracking-wider uppercase">
          <Trophy className="w-3.5 h-3.5" />
          Leaderboard
        </div>
        {/* Sort-mode toggle — three states. */}
        <div className="flex rounded-full bg-white/5 p-0.5 text-[10px] sm:text-xs">
          <button
            type="button"
            onClick={() => setSort("squad_value")}
            className={`px-2 py-1 rounded-full font-semibold transition-colors ${
              sort === "squad_value"
                ? "bg-emerald-500 text-[#070707]"
                : "text-white/60 hover:text-white"
            }`}
          >
            Squad
          </button>
          <button
            type="button"
            onClick={() => setSort("xp")}
            className={`px-2 py-1 rounded-full font-semibold transition-colors ${
              sort === "xp"
                ? "bg-emerald-500 text-[#070707]"
                : "text-white/60 hover:text-white"
            }`}
          >
            XP
          </button>
          <button
            type="button"
            onClick={() => setSort("album")}
            className={`px-2 py-1 rounded-full font-semibold transition-colors ${
              sort === "album"
                ? "bg-emerald-500 text-[#070707]"
                : "text-white/60 hover:text-white"
            }`}
          >
            Album
          </button>
        </div>
      </div>

      {/* Cohort toggle — only renders when the caller has a
          partner_referrer. Renders inline (separate row) so on
          mobile it doesn't fight with the sort pills for space. */}
      {callerBranch && (
        <div className="flex items-center justify-end mb-3">
          <div className="flex rounded-full bg-white/5 p-0.5 text-[10px] sm:text-xs">
            <button
              type="button"
              onClick={() => setCohort("all")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-colors ${
                cohort === "all"
                  ? "bg-emerald-500 text-[#070707]"
                  : "text-white/60 hover:text-white"
              }`}
            >
              <Globe2 className="w-3 h-3" />
              {globalLabel}
            </button>
            <button
              type="button"
              onClick={() => setCohort("mine")}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-colors ${
                cohort === "mine"
                  ? "bg-emerald-500 text-[#070707]"
                  : "text-white/60 hover:text-white"
              }`}
              title={schoolName}
            >
              <Users2 className="w-3 h-3" />
              {/* On narrow screens the full Cultura name overflows
                  — truncate without losing the prefix. */}
              <span className="truncate max-w-[140px]">{schoolName}</span>
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-6 flex justify-center">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-xs text-red-300">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-white/50 text-center py-3">
          {cohort === "mine" ? emptySchoolLabel : emptyLabel}
        </p>
      ) : (
        <>
          <ol className="space-y-1">
            {entries.map((e) => (
              <LeaderboardRow
                key={`${e.rank}-${e.name}`}
                entry={e}
                primary={sort}
              />
            ))}
          </ol>
          {you && (
            <>
              <div className="my-2 border-t border-white/10" />
              <LeaderboardRow entry={you} primary={sort} />
            </>
          )}
        </>
      )}
    </section>
  );
}

function LeaderboardRow({ entry, primary }) {
  const {
    rank,
    name,
    totalXp,
    squadValue,
    albumOwned = 0,
    albumTotal = 0,
    albumPct = 0,
    isYou,
  } = entry;
  // Primary = the big number on the right (the metric we're sorting on).
  // Secondary = a quieter context line below it. For album we surface
  // the "X / Y" raw count so the user can see absolute progress too.
  let primaryValue;
  let secondaryLabel;
  if (primary === "squad_value") {
    primaryValue = `${squadValue}`;
    secondaryLabel = `${totalXp.toLocaleString()} XP`;
  } else if (primary === "album") {
    primaryValue = `${albumPct}%`;
    secondaryLabel = `${albumOwned}/${albumTotal} collected`;
  } else {
    primaryValue = totalXp.toLocaleString();
    secondaryLabel = `Squad ${squadValue}`;
  }

  return (
    <li
      className={`flex items-center gap-2 sm:gap-3 px-2 py-1.5 rounded-lg text-sm ${
        isYou ? "bg-emerald-500/15 ring-1 ring-emerald-400/40" : ""
      }`}
    >
      {/* Rank — gold crown for #1, otherwise the number */}
      <div className="w-6 shrink-0 text-center">
        {rank === 1 ? (
          <Crown className="w-4 h-4 text-amber-300 inline-block" />
        ) : (
          <span className="text-xs font-bold text-white/50">{rank}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`truncate ${
            isYou ? "font-bold text-emerald-100" : "text-white/85"
          }`}
        >
          {name}
          {isYou && (
            <span className="ml-1 text-[10px] text-emerald-300 font-semibold">
              (you)
            </span>
          )}
        </p>
      </div>
      <div className="text-right shrink-0">
        <div className="text-sm font-bold text-white">{primaryValue}</div>
        <div className="text-[10px] text-white/40 -mt-0.5">
          {secondaryLabel}
        </div>
      </div>
    </li>
  );
}

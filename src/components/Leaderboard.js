// src/components/Leaderboard.js
//
// Top-N leaderboard tile, used on the Ultimate Team dashboard.
// Three ranking modes via a small toggle:
//   - "squad"  → by squad value (sum of placed sticker ratings)
//   - "xp"     → by total XP accumulated
//   - "album"  → by % of the active sticker roster collected
//
// Each row shows the primary metric prominently plus one secondary
// number for context. If the user isn't in the visible top slice, an
// extra "you" row appears at the bottom showing their rank.
"use client";

import React, { useEffect, useState } from "react";
import { Trophy, Crown } from "lucide-react";

export default function Leaderboard({ defaultSort = "squad_value" }) {
  const [sort, setSort] = useState(defaultSort);
  const [entries, setEntries] = useState([]);
  const [you, setYou] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/leaderboard?sort=${encodeURIComponent(sort)}&limit=10`
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Could not load leaderboard");
          setEntries([]);
          setYou(null);
        } else {
          setEntries(json.entries || []);
          setYou(json.you || null);
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
  }, [sort]);

  return (
    <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-white/60 text-xs tracking-wider uppercase">
          <Trophy className="w-3.5 h-3.5" />
          Leaderboard
        </div>
        {/* Tiny mode toggle — square pill with three states. */}
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

      {loading ? (
        <div className="py-6 flex justify-center">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : error ? (
        <p className="text-xs text-red-300">{error}</p>
      ) : entries.length === 0 ? (
        <p className="text-xs text-white/50 text-center py-3">
          No players ranked yet — be the first!
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
        isYou
          ? "bg-emerald-500/15 ring-1 ring-emerald-400/40"
          : ""
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

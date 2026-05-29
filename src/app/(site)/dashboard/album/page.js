// src/app/(site)/dashboard/album/page.js
//
// Sticker album — Panini-binder style. Every active sticker in the
// system appears here; the ones the user owns render in full colour
// with a duplicate quantity badge, the rest are dimmed. Grouped by
// country, sorted by rating within each group.
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ArrowRightLeft, Sparkles, Loader2 } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  useFullStickerRoster,
  usePlayerCollection,
  useLatestPackStickerIds,
} from "@/lib/hooks/useStickerData";
import StickerCard from "@/components/stickers/StickerCard";

// Must stay in sync with XP_PER_RATING on the server route — the
// number rendered on each trade button reads from this map.
const TRADE_IN_XP_BY_RATING = { 1: 5, 2: 10, 3: 20, 4: 40, 5: 80 };

function AlbumContent() {
  const { user } = useAuth();
  const { stickers, loading: rosterLoading } = useFullStickerRoster();
  const { collection, loading: collectionLoading, refresh: refreshCollection } =
    usePlayerCollection(user?.id);
  const [pendingId, setPendingId] = useState(null);
  const [tradingId, setTradingId] = useState(null);
  const [sessionXp, setSessionXp] = useState(0);
  const [errorMsg, setErrorMsg] = useState(null);
  // Stickers in the user's most recent pack opening — rendered with a
  // green NEW ribbon in the album until they open another pack.
  const { stickerIds: latestPackIds } = useLatestPackStickerIds(user?.id);
  const latestPackSet = useMemo(
    () => new Set(latestPackIds || []),
    [latestPackIds]
  );

  // sticker_id → { quantity } for fast lookup in the grid
  const ownedById = useMemo(() => {
    const m = new Map();
    for (const row of collection) {
      if (row.sticker?.id) m.set(row.sticker.id, row.quantity || 1);
    }
    return m;
  }, [collection]);

  // Group full roster by country to render a binder section per nation.
  const grouped = useMemo(() => {
    const map = new Map();
    for (const s of stickers) {
      if (!map.has(s.country)) map.set(s.country, []);
      map.get(s.country).push(s);
    }
    return [...map.entries()].map(([country, items]) => ({ country, items }));
  }, [stickers]);

  const ownedCount = ownedById.size;
  const totalCount = stickers.length;
  const pct = totalCount > 0 ? Math.round((ownedCount / totalCount) * 100) : 0;

  // Two-click trade-in: first click on a sticker arms the confirm
  // button; a second click within ~3s commits. Anything else cancels.
  // Keeps the action deliberate without forcing a modal for every
  // single dupe.
  const armConfirm = (stickerId) => {
    setErrorMsg(null);
    setPendingId(stickerId);
    setTimeout(() => {
      setPendingId((curr) => (curr === stickerId ? null : curr));
    }, 3000);
  };

  const handleTradeIn = async (sticker) => {
    if (!sticker?.id) return;
    setTradingId(sticker.id);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/stickers/trade-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sticker_id: sticker.id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMsg(json.error || "Could not trade in sticker");
        return;
      }
      setSessionXp((x) => x + (json.xpAwarded || 0));
      refreshCollection();
    } catch {
      setErrorMsg("Network error — please try again");
    } finally {
      setTradingId(null);
      setPendingId(null);
    }
  };

  if (rosterLoading || collectionLoading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            Dashboard
          </Link>
        </header>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Sticker Album
        </h1>

        {/* Album-completion progress card — matches the leaderboard's
            "album" sort so the % the user sees here is the same one
            they see ranked publicly. Milestone ticks give the bar
            shape and turn the next round number into a clear target.
            Hidden entirely when the roster is empty (totalCount = 0)
            so a brand-new edition doesn't show a 0% goal post. */}
        {totalCount > 0 && (
          <AlbumProgress
            ownedCount={ownedCount}
            totalCount={totalCount}
            pct={pct}
          />
        )}

        {/* Trade-in helper strip — only renders once the user has earned
            anything in this session, plus a persistent hint about how
            it works. */}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-white/70">
            <ArrowRightLeft className="w-4 h-4 text-emerald-300" />
            <span>
              Got duplicates? Tap{" "}
              <span className="font-semibold text-emerald-300">+XP</span> on any
              card you own twice or more to trade one in.
            </span>
          </div>
          {sessionXp > 0 && (
            <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-200 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />+{sessionXp} XP this session
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs sm:text-sm px-3 py-2">
            {errorMsg}
          </div>
        )}

        {/* Country sections */}
        {grouped.length === 0 ? (
          <p className="text-white/50">No stickers in the roster yet.</p>
        ) : (
          grouped.map(({ country, items }) => {
            const ownedHere = items.filter((s) => ownedById.has(s.id)).length;
            return (
              <section
                key={country}
                className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 sm:p-5"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-base sm:text-lg">{country}</h2>
                  <span className="text-xs text-white/50 font-semibold">
                    {ownedHere}/{items.length}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {items.map((sticker) => {
                    const qty = ownedById.get(sticker.id) || 0;
                    const isFromLatestPack = latestPackSet.has(sticker.id);
                    const canTrade = qty > 1;
                    const xpForThis =
                      TRADE_IN_XP_BY_RATING[sticker.rating] || 0;
                    const isPending = pendingId === sticker.id;
                    const isTrading = tradingId === sticker.id;
                    return (
                      <div key={sticker.id} className="relative flex flex-col items-center">
                        <StickerCard
                          sticker={sticker}
                          owned={qty > 0}
                          quantity={qty}
                          size="sm"
                        />
                        {isFromLatestPack && qty > 0 && (
                          // Top-right matches the Pack Opened modal so
                          // the badge feels consistent across surfaces,
                          // and avoids covering the position badge in
                          // the card's top-left corner.
                          <span className="absolute -top-1 right-0 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow ring-2 ring-[#070707] tracking-wide">
                            NEW
                          </span>
                        )}
                        {canTrade && (
                          <button
                            type="button"
                            onClick={() =>
                              isPending
                                ? handleTradeIn(sticker)
                                : armConfirm(sticker.id)
                            }
                            disabled={isTrading}
                            className={`mt-1 w-full px-1.5 py-1 rounded-md text-[10px] font-bold leading-tight tracking-wide transition-colors border ${
                              isPending
                                ? "bg-emerald-500 hover:bg-emerald-400 text-[#062013] border-emerald-300 animate-pulse"
                                : "bg-emerald-500/10 hover:bg-emerald-500/25 text-emerald-200 border-emerald-500/40"
                            } disabled:opacity-60 disabled:cursor-wait`}
                            title={
                              isPending
                                ? "Tap to confirm — earns XP, loses one duplicate"
                                : `Trade one duplicate for +${xpForThis} XP`
                            }
                          >
                            {isTrading ? (
                              <span className="inline-flex items-center justify-center gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                              </span>
                            ) : isPending ? (
                              `Confirm +${xpForThis} XP`
                            ) : (
                              `+${xpForThis} XP`
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </main>
    </div>
  );
}

/**
 * Prominent progress card at the top of the album.
 *
 *   - Big % on the right, "X / Y stickers collected" on the left.
 *   - Gradient bar with milestone ticks at 25 / 50 / 75 / 100.
 *   - A short hint below: either "N more to hit M%" (motivation
 *     towards the next milestone) or a finish-line message when the
 *     album is complete.
 */
function AlbumProgress({ ownedCount, totalCount, pct }) {
  const milestones = [25, 50, 75, 100];
  const nextMilestone = milestones.find((m) => pct < m) || 100;
  const targetCount = Math.ceil((nextMilestone / 100) * totalCount);
  const remainingToMilestone = Math.max(0, targetCount - ownedCount);
  const isComplete = pct >= 100;

  return (
    <section className="rounded-2xl bg-gradient-to-br from-emerald-500/10 via-white/5 to-white/0 border border-emerald-400/20 backdrop-blur-sm p-4 sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-emerald-200/80 font-semibold">
            Album progress
          </p>
          <p className="text-sm sm:text-base text-white/80 mt-0.5">
            <span className="font-bold text-white">{ownedCount}</span>
            <span className="text-white/40"> / {totalCount}</span> stickers
            collected
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl sm:text-4xl font-black leading-none text-white">
            {pct}
            <span className="text-base font-bold text-white/50">%</span>
          </div>
        </div>
      </div>

      {/* Bar + milestone ticks. Ticks live INSIDE the track so they
          visually overlay regardless of % — the filled portion picks
          them up in white-on-white, the unfilled portion shows them
          dimmed. */}
      <div className="relative mt-3 h-2.5 rounded-full bg-white/10 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-200 transition-[width] duration-700 ease-out"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
        {milestones.slice(0, -1).map((m) => (
          <span
            key={m}
            aria-hidden
            className="absolute top-0 bottom-0 w-px bg-white/40 mix-blend-overlay"
            style={{ left: `${m}%` }}
          />
        ))}
      </div>

      {/* Milestone label row — kept subtle so the bar reads first. */}
      <div className="mt-1.5 flex justify-between text-[10px] text-white/40 font-semibold tabular-nums">
        <span>0%</span>
        <span className={pct >= 25 ? "text-emerald-300" : ""}>25%</span>
        <span className={pct >= 50 ? "text-emerald-300" : ""}>50%</span>
        <span className={pct >= 75 ? "text-emerald-300" : ""}>75%</span>
        <span className={pct >= 100 ? "text-emerald-300" : ""}>100%</span>
      </div>

      {/* Motivation line — concrete next-step prompt. */}
      <p className="mt-3 text-xs sm:text-sm text-white/70">
        {isComplete ? (
          <span className="text-emerald-300 font-bold">
            🏆 Album complete — every active sticker collected!
          </span>
        ) : remainingToMilestone === 0 ? (
          <>
            <span className="font-bold text-white">{nextMilestone}%</span> in
            reach — open another pack to push past it.
          </>
        ) : (
          <>
            <span className="font-bold text-white">{remainingToMilestone}</span>{" "}
            more sticker{remainingToMilestone === 1 ? "" : "s"} to hit{" "}
            <span className="font-bold text-emerald-300">{nextMilestone}%</span>
            .
          </>
        )}
      </p>
    </section>
  );
}

export default function AlbumPage() {
  return (
    <ProtectedRoute>
      <AlbumContent />
    </ProtectedRoute>
  );
}

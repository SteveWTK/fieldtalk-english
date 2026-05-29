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
          <div className="text-sm text-white/60">
            <span className="font-bold text-white">{ownedCount}</span> /{" "}
            {totalCount} collected{" "}
            <span className="text-white/40">({pct}%)</span>
          </div>
        </header>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Sticker Album
        </h1>

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
                          <span className="absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-[9px] font-bold text-white shadow ring-2 ring-[#070707] tracking-wide">
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

export default function AlbumPage() {
  return (
    <ProtectedRoute>
      <AlbumContent />
    </ProtectedRoute>
  );
}

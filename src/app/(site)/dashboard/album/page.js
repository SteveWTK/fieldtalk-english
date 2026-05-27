// src/app/(site)/dashboard/album/page.js
//
// Sticker album — Panini-binder style. Every active sticker in the
// system appears here; the ones the user owns render in full colour
// with a duplicate quantity badge, the rest are dimmed. Grouped by
// country, sorted by rating within each group.
"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  useFullStickerRoster,
  usePlayerCollection,
  useLatestPackStickerIds,
} from "@/lib/hooks/useStickerData";
import StickerCard from "@/components/stickers/StickerCard";

function AlbumContent() {
  const { user } = useAuth();
  const { stickers, loading: rosterLoading } = useFullStickerRoster();
  const { collection, loading: collectionLoading } = usePlayerCollection(
    user?.id
  );
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
                    return (
                      <div key={sticker.id} className="relative">
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

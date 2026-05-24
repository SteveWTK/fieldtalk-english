// src/app/(site)/dashboard/squad/page.js
//
// Squad builder. Three sections:
//   1. Header (back link + Squad Value tile)
//   2. Pitch with 11 slots — tap an empty slot to place the selected
//      sticker, tap a filled slot to remove it.
//   3. Collection tray — tap a sticker to select. Stickers already in
//      the squad are dimmed and not selectable; you'd remove from the
//      pitch first to re-place elsewhere.
//
// Tap-to-place (not drag) keeps the UI simple, works the same on touch
// and pointer devices, and avoids the slot-rect maths a full
// drag-and-drop would need. Drag-and-drop can come later if testers ask.
"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, AlertCircle, Trophy, X } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerCollection } from "@/lib/hooks/useStickerData";
import { usePlayerSquad } from "@/lib/hooks/usePlayerSquad";
import { getFormation, isPositionCompatible } from "@/lib/squads/squadConfig";
import StickerCard from "@/components/stickers/StickerCard";

function SquadBuilderContent() {
  const { user } = useAuth();
  const { collection, loading: collectionLoading } = usePlayerCollection(
    user?.id
  );
  const {
    positions,
    stickersById,
    formation,
    squadValue,
    loading: squadLoading,
    save,
    cacheSticker,
  } = usePlayerSquad(user?.id);

  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [shakeSlotId, setShakeSlotId] = useState(null);

  const formationConfig = getFormation(formation);

  // Set of sticker ids currently placed somewhere on the pitch — these
  // are dimmed in the tray and not selectable.
  const placedIds = useMemo(
    () => new Set(Object.values(positions).filter(Boolean)),
    [positions]
  );

  // Lookup table for the tray: each unique sticker the user owns, with
  // quantity. (Duplicates collapse to one tray entry — quantity is just
  // a future "tradable" hint; each instance can only be placed once.)
  const trayItems = useMemo(() => {
    return (collection || []).map((row) => ({
      sticker: row.sticker,
      quantity: row.quantity || 1,
    }));
  }, [collection]);

  const selectedSticker = useMemo(() => {
    if (!selectedStickerId) return null;
    const row = trayItems.find((r) => r.sticker?.id === selectedStickerId);
    return row?.sticker || null;
  }, [selectedStickerId, trayItems]);

  const flashError = (msg, slotId) => {
    setErrorMessage(msg);
    if (slotId) setShakeSlotId(slotId);
    setTimeout(() => setErrorMessage(null), 2200);
    setTimeout(() => setShakeSlotId(null), 600);
  };

  // ── Slot click ──
  const handleSlotClick = async (slot) => {
    const occupantId = positions[slot.id];

    // Empty slot + we have a selection → place if compatible.
    if (!occupantId && selectedSticker) {
      if (!isPositionCompatible(selectedSticker, slot)) {
        flashError(
          `${selectedSticker.position} can't play in the ${slot.label} slot`,
          slot.id
        );
        return;
      }
      cacheSticker(selectedSticker);
      const next = { ...positions, [slot.id]: selectedSticker.id };
      const ok = await save(next);
      if (ok) setSelectedStickerId(null);
      return;
    }

    // Empty slot + no selection → nothing.
    if (!occupantId) return;

    // Filled slot:
    //  - if we have a selection and it's compatible → swap (occupant
    //    goes back to tray, selection takes the slot).
    //  - otherwise → just remove the occupant.
    if (
      selectedSticker &&
      isPositionCompatible(selectedSticker, slot) &&
      selectedSticker.id !== occupantId
    ) {
      cacheSticker(selectedSticker);
      const next = { ...positions, [slot.id]: selectedSticker.id };
      const ok = await save(next);
      if (ok) setSelectedStickerId(null);
    } else {
      const next = { ...positions };
      delete next[slot.id];
      await save(next);
    }
  };

  // ── Tray sticker click ──
  const handleTrayClick = (sticker) => {
    if (!sticker) return;
    if (placedIds.has(sticker.id)) return; // already in squad
    if (selectedStickerId === sticker.id) {
      setSelectedStickerId(null);
      return;
    }
    setSelectedStickerId(sticker.id);
  };

  if (collectionLoading || squadLoading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const slots = formationConfig.slots;
  const squadMax = slots.length * 5;
  const placedCount = Object.values(positions).filter(Boolean).length;

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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
              <Trophy className="w-3.5 h-3.5 text-amber-300" />
              <span className="text-xs text-white/60 tracking-wide uppercase">
                Squad
              </span>
              <span className="font-bold">
                {squadValue}
                <span className="text-white/40">/{squadMax}</span>
              </span>
            </div>
          </div>
        </header>

        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
          Your Squad
        </h1>

        {/* Error toast */}
        {errorMessage && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm">
            <AlertCircle className="w-4 h-4" />
            {errorMessage}
          </div>
        )}

        {/* Pitch */}
        <SquadPitch
          slots={slots}
          positions={positions}
          stickersById={stickersById}
          selectedSticker={selectedSticker}
          onSlotClick={handleSlotClick}
          shakeSlotId={shakeSlotId}
        />

        {/* Selection banner */}
        {selectedSticker && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 text-sm">
            <span>
              <span className="font-semibold">{selectedSticker.name}</span>{" "}
              selected — tap a compatible position
            </span>
            <button
              type="button"
              onClick={() => setSelectedStickerId(null)}
              className="p-1 rounded hover:bg-white/10"
              aria-label="Clear selection"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tray */}
        <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base sm:text-lg">Your Collection</h2>
            <span className="text-xs text-white/50 font-semibold">
              {placedCount}/{slots.length} placed
            </span>
          </div>
          {trayItems.length === 0 ? (
            <p className="text-sm text-white/50">
              You haven&apos;t opened any packs yet — head back to the
              dashboard and open one to start your squad.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {trayItems.map(({ sticker, quantity }) => {
                if (!sticker) return null;
                const isPlaced = placedIds.has(sticker.id);
                const isSelected = selectedStickerId === sticker.id;
                return (
                  <button
                    type="button"
                    key={sticker.id}
                    onClick={() => handleTrayClick(sticker)}
                    disabled={isPlaced}
                    className={`relative rounded-xl transition-transform ${
                      isPlaced
                        ? "cursor-not-allowed"
                        : "hover:scale-[1.04] active:scale-[0.98]"
                    } ${
                      isSelected
                        ? "ring-4 ring-emerald-400 ring-offset-2 ring-offset-[#070707]"
                        : ""
                    }`}
                  >
                    <StickerCard
                      sticker={sticker}
                      owned={!isPlaced}
                      quantity={quantity}
                      size="sm"
                    />
                    {isPlaced && (
                      <span className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/40">
                        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/90 text-[10px] font-bold text-white">
                          IN SQUAD
                        </span>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

/**
 * Landscape pitch with the formation slots. Each slot:
 *  - empty       → dashed circle, position label, ringed in emerald if
 *                  the currently-selected sticker would fit here
 *  - filled      → mini StickerCard, tappable to remove
 *  - "shake"     → momentarily shakes when an invalid placement is tried
 */
function SquadPitch({
  slots,
  positions,
  stickersById,
  selectedSticker,
  onSlotClick,
  shakeSlotId,
}) {
  // CW rotation: same convention used by DragDropFormation in landscape.
  const rotate = (s) => {
    const xv = parseFloat(s.x);
    const yv = parseFloat(s.y);
    return { left: `${100 - yv}%`, top: `${xv}%` };
  };

  return (
    <div
      className="relative w-full mx-auto rounded-2xl overflow-hidden shadow-md border border-white/10"
      style={{ aspectRatio: "7 / 5", maxWidth: "880px" }}
    >
      <svg
        viewBox="0 0 140 100"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full pointer-events-none"
      >
        <rect x="0" y="0" width="140" height="100" fill="#0f3a23" />
        <rect
          x="8"
          y="8"
          width="124"
          height="84"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="0.4"
        />
        <line
          x1="70"
          y1="8"
          x2="70"
          y2="92"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="0.4"
        />
        <circle
          cx="70"
          cy="50"
          r="8"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="0.4"
        />
        <circle cx="70" cy="50" r="0.6" fill="rgba(255,255,255,0.7)" />
        <rect
          x="8"
          y="28"
          width="14"
          height="44"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="0.4"
        />
        <rect
          x="118"
          y="28"
          width="14"
          height="44"
          fill="none"
          stroke="rgba(255,255,255,0.55)"
          strokeWidth="0.4"
        />
      </svg>

      {slots.map((slot) => {
        const pos = rotate(slot);
        const occupantId = positions[slot.id];
        const occupant = occupantId ? stickersById[occupantId] : null;
        const fitsSelection =
          !!selectedSticker &&
          (slot.accepts || []).includes(selectedSticker.position) &&
          !occupant;
        const isShaking = shakeSlotId === slot.id;

        return (
          <button
            key={slot.id}
            type="button"
            onClick={() => onSlotClick(slot)}
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all rounded-xl ${
              isShaking ? "sq-shake" : ""
            }`}
            style={{ left: pos.left, top: pos.top }}
            aria-label={slot.label}
          >
            {occupant ? (
              <div
                className={`relative ${
                  fitsSelection ? "ring-2 ring-emerald-300 rounded-xl" : ""
                }`}
              >
                <StickerCard sticker={occupant} size="sm" owned />
              </div>
            ) : (
              <div
                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full border-2 border-dashed flex items-center justify-center text-xs sm:text-sm font-bold transition-colors ${
                  fitsSelection
                    ? "border-emerald-300 bg-emerald-500/20 text-emerald-100"
                    : "border-white/45 bg-white/5 text-white/55"
                }`}
              >
                {slot.label}
              </div>
            )}
          </button>
        );
      })}

      <style jsx>{`
        @keyframes sq-shake {
          0%, 100% { transform: translate(-50%, -50%) translateX(0); }
          20%, 60% { transform: translate(-50%, -50%) translateX(-6px); }
          40%, 80% { transform: translate(-50%, -50%) translateX(6px); }
        }
        :global(.sq-shake) {
          animation: sq-shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

export default function SquadPage() {
  return (
    <ProtectedRoute>
      <SquadBuilderContent />
    </ProtectedRoute>
  );
}

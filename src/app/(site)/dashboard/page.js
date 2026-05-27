// src/app/(site)/dashboard/page.js
//
// Phase 2 dashboard skeleton. Dark theme matching the WC2026 landing.
// Five tiles:
//   - Hero strip:    avatar + name + level badge + XP progress bar
//   - Squad pitch:   landscape SVG with empty player slots (placeholder)
//   - Squad Value:   sum-of-ratings tile (0/55 until Phase 4 wires it)
//   - Pack vault:    floor(total_xp / pack_xp_cost) — Phase 3 will subtract
//                    pack_openings and add the "open one" flow
//   - Predictions:   pending/resolved counts (empty until Phase 5)
//
// The hooks already in place wire everything to live data where it
// exists; placeholders are explicit so it's obvious what's coming next.
"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useIsWide } from "@/lib/hooks/useIsWide";
import ProfileEditModal from "@/components/ProfileEditModal";
import { Pencil } from "lucide-react";
import Link from "next/link";
import {
  Trophy,
  Package,
  ChevronRight,
  ChevronLeft,
  Crosshair,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerDashboard } from "@/lib/hooks/usePlayerData";
import { useAppSettings } from "@/lib/hooks/useAppSettings";
import {
  usePackInventory,
  usePlayerCollection,
} from "@/lib/hooks/useStickerData";
import { usePlayerSquad } from "@/lib/hooks/usePlayerSquad";
import { usePlayerPredictions } from "@/lib/hooks/usePlayerPredictions";
import { getFormation } from "@/lib/squads/squadConfig";
import PackOpeningModal from "@/components/stickers/PackOpeningModal";
import Leaderboard from "@/components/Leaderboard";
import StickerCard from "@/components/stickers/StickerCard";

function DashboardContent() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { profile, progress, loading } = usePlayerDashboard(user?.id);
  const { settings } = useAppSettings();

  const totalXp = progress?.total_xp || 0;
  const packXpCost = settings?.pack_xp_cost || 200;
  const {
    packsAvailable,
    xpToNextPack,
    refresh: refreshPacks,
  } = usePackInventory(user?.id, packXpCost, totalXp);
  // Hero progress bar = how far through the current pack threshold.
  // (Levels removed — pack progress is now the primary "you're making
  // progress" signal alongside total XP and squad value.)
  const heroPackProgressPct = Math.round(
    ((totalXp % packXpCost) / packXpCost) * 100
  );
  const { collection, refresh: refreshCollection } = usePlayerCollection(
    user?.id
  );
  const {
    positions: squadPositions,
    stickersById: squadStickersById,
    squadValue,
  } = usePlayerSquad(user?.id);
  const { counts: predictionCounts } = usePlayerPredictions(user?.id);
  const squadMax = 55;
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  // Local overrides for name + avatar so the hero updates immediately
  // after the modal saves, without waiting for a full profile refetch.
  const [profileOverride, setProfileOverride] = useState({
    full_name: null,
    avatar_url: null,
  });

  const handlePackModalClose = ({ refetch } = {}) => {
    setPackModalOpen(false);
    if (refetch) {
      // After a successful open, refetch the counts so the dashboard
      // numbers (and the album when the user navigates there) reflect
      // the new state immediately.
      refreshPacks();
      refreshCollection();
    }
  };

  // Profile override (set when the edit modal saves) wins over the
  // freshly-loaded profile so the UI updates instantly without a
  // refetch. Falls through to user_metadata then the email prefix.
  const fullName =
    (profileOverride.full_name ?? profile?.full_name) ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Player";
  const avatarUrl =
    profileOverride.avatar_url ?? profile?.avatar_url ?? "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070707] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden">
      {/* Ambient glows — same vocabulary as the WC landing */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.18), rgba(16,185,129,0) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-25%] right-[-15%] w-[55vw] h-[55vw] rounded-full blur-3xl opacity-50"
          style={{
            background:
              "radial-gradient(circle at center, rgba(234,179,8,0.10), rgba(234,179,8,0) 70%)",
          }}
        />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        {/* Top-of-page nav row — Back to lessons link sits to the left
            so users can hop back into the lesson flow easily. */}
        <div className="flex items-center justify-between">
          <Link
            href="/lesson"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to lessons
          </Link>
        </div>

        {/* ── Hero strip ─────────────────────────────────────────────── */}
        <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5 sm:p-6">
          <div className="flex items-center gap-4">
            {/* Avatar — image if set, otherwise initials on a gradient. */}
            <button
              type="button"
              onClick={() => setProfileModalOpen(true)}
              aria-label="Edit profile"
              className="group relative w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden shrink-0 ring-2 ring-white/15 hover:ring-emerald-400 transition-shadow"
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={fullName}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-blue-700 text-white font-bold text-lg sm:text-xl">
                  {initials || "?"}
                </span>
              )}
              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Pencil className="w-4 h-4" />
              </span>
            </button>
            {/* Name + cumulative XP + progress towards next pack */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(true)}
                    className="text-left hover:text-white/90 min-w-0"
                    aria-label={t("edit_profile", "Edit profile")}
                  >
                    <h1 className="text-lg sm:text-xl font-bold truncate">
                      {fullName}
                    </h1>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/10 hover:bg-emerald-500/20 border border-white/15 hover:border-emerald-400/60 text-white/80 hover:text-emerald-200 text-[11px] font-semibold tracking-wide transition-colors whitespace-nowrap shrink-0"
                  >
                    <Pencil className="w-3 h-3" />
                    {t("edit_profile", "Edit profile")}
                  </button>
                </div>
                <span className="text-xs text-white/60">
                  <span className="font-bold text-white">
                    {totalXp.toLocaleString()}
                  </span>{" "}
                  XP
                </span>
              </div>
              <div className="mt-3">
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-300 transition-[width] duration-500"
                    style={{ width: `${heroPackProgressPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-white/60 mt-1.5">
                  <span>
                    {packsAvailable > 0
                      ? `🎉 ${packsAvailable} pack${packsAvailable === 1 ? "" : "s"} ready`
                      : `${xpToNextPack} XP to your next pack`}
                  </span>
                  <span className="text-white/40">
                    Squad value {squadValue}/{squadMax}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Main grid: squad pitch + side tiles ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Squad pitch — takes 2 columns on lg */}
          <section className="lg:col-span-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-base sm:text-lg">Your Squad</h2>
              <Link
                href="/dashboard/squad"
                className="text-xs sm:text-sm text-emerald-300 hover:text-emerald-200 flex items-center gap-0.5 font-semibold"
              >
                Edit squad <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <DashboardPitch
              positions={squadPositions}
              stickersById={squadStickersById}
            />
            <p className="text-center text-xs text-white/50 mt-3">
              Open packs to collect stickers, then build your XI here
            </p>
          </section>

          {/* Side tiles */}
          <div className="space-y-6">
            {/* Squad Value */}
            <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5">
              <div className="flex items-center gap-2 text-white/60 text-xs tracking-wider uppercase mb-2">
                <Trophy className="w-3.5 h-3.5" />
                Squad Value
              </div>
              <div className="text-3xl sm:text-4xl font-black">
                {squadValue}
                <span className="text-base font-medium text-white/40">
                  {" "}/ {squadMax}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
                <div
                  className="h-full bg-emerald-400 transition-[width] duration-500"
                  style={{ width: `${(squadValue / squadMax) * 100}%` }}
                />
              </div>
            </section>

            {/* Pack vault */}
            <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5">
              <div className="flex items-center justify-between text-white/60 text-xs tracking-wider uppercase mb-2">
                <div className="flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" />
                  Pack Vault
                </div>
                <Link
                  href="/dashboard/album"
                  className="text-emerald-300 hover:text-emerald-200 normal-case tracking-normal flex items-center gap-0.5"
                >
                  Album <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {packsAvailable > 0 ? (
                <>
                  <div className="text-3xl sm:text-4xl font-black">
                    {packsAvailable}
                    <span className="text-base font-medium text-white/40">
                      {" "}ready
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPackModalOpen(true)}
                    className="mt-3 w-full px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-[#070707] text-sm font-bold tracking-wide transition-colors"
                  >
                    Open a pack
                  </button>
                </>
              ) : (
                <>
                  <div className="text-3xl sm:text-4xl font-black text-white/30">
                    0
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    Earn{" "}
                    <span className="text-white/80 font-semibold">
                      {xpToNextPack || packXpCost} more XP
                    </span>{" "}
                    to unlock your{" "}
                    {totalXp >= packXpCost ? "next" : "first"} pack
                  </p>
                </>
              )}
              {collection.length > 0 && (
                <p className="mt-3 text-xs text-white/50">
                  <span className="text-white/80 font-semibold">
                    {collection.length}
                  </span>{" "}
                  unique sticker{collection.length === 1 ? "" : "s"} collected
                </p>
              )}
            </section>

            {/* Predictions */}
            <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5">
              <div className="flex items-center justify-between text-white/60 text-xs tracking-wider uppercase mb-2">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5" />
                  Predictions
                </div>
                {predictionCounts.total > 0 && (
                  <Link
                    href="/dashboard/predictions"
                    className="text-emerald-300 hover:text-emerald-200 normal-case tracking-normal flex items-center gap-0.5"
                  >
                    View <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {predictionCounts.total > 0 ? (
                <>
                  <div className="text-3xl sm:text-4xl font-black">
                    {predictionCounts.pending}
                    <span className="text-base font-medium text-white/40">
                      {" "}pending
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-white/50">
                    <span>
                      <span className="text-white/80 font-semibold">
                        {predictionCounts.resolved}
                      </span>{" "}
                      resolved
                    </span>
                    {predictionCounts.totalBonusXp > 0 && (
                      <span>
                        <span className="text-emerald-300 font-semibold">
                          +{predictionCounts.totalBonusXp} XP
                        </span>{" "}
                        bonus
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="text-3xl sm:text-4xl font-black text-white/30">
                    0
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    Your predictions will appear here once they&apos;re saved
                    from lessons
                  </p>
                </>
              )}
            </section>

            {/* Leaderboard — top 10 ranked by Squad value or XP. */}
            <Leaderboard defaultSort="squad_value" />
          </div>
        </div>
      </main>

      {/* Pack-opening modal — mounted once at root so the reveal cards
          don't get clipped by parent transforms / overflows. */}
      <PackOpeningModal
        open={packModalOpen}
        onClose={handlePackModalClose}
      />

      {/* Profile editor — display name + flag avatar picker. Updates
          locally via profileOverride so the hero strip refreshes
          immediately on save. */}
      <ProfileEditModal
        open={profileModalOpen}
        initialName={fullName}
        initialAvatarUrl={avatarUrl}
        onClose={() => setProfileModalOpen(false)}
        onSaved={(next) =>
          setProfileOverride({
            full_name: next.full_name ?? "",
            avatar_url: next.avatar_url ?? "",
          })
        }
      />
    </div>
  );
}

/**
 * Read-only pitch for the dashboard. Slots come from the shared
 * squadConfig so the layout always matches /dashboard/squad. Layout
 * flips to landscape on viewports ≥ 1024px; portrait on smaller screens
 * so 11 cards remain legible without horizontal cramping.
 *
 * Tapping a placed card brings it to the front (z-30 + slight scale)
 * so users can inspect a specific player on a crowded pitch. Tap again
 * or tap elsewhere to defocus.
 */
function DashboardPitch({ positions = {}, stickersById = {} }) {
  const formationConfig = getFormation("4-3-3");
  const isHorizontal = useIsWide(1024);
  const [focusedSlotId, setFocusedSlotId] = useState(null);

  // CW rotation for landscape; identity for portrait.
  const transform = (s) => {
    if (!isHorizontal) return { left: s.x, top: s.y };
    const xv = parseFloat(s.x);
    const yv = parseFloat(s.y);
    return { left: `${100 - yv}%`, top: `${xv}%` };
  };

  return (
    <div
      className="relative w-full mx-auto rounded-xl overflow-hidden shadow-md"
      style={{
        aspectRatio: isHorizontal ? "7 / 5" : "5 / 7",
        maxWidth: isHorizontal ? "100%" : "360px",
      }}
      onClick={() => setFocusedSlotId(null)}
    >
      {isHorizontal ? (
        <svg
          viewBox="0 0 140 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <rect x="0" y="0" width="140" height="100" fill="#0f3a23" />
          <rect x="8" y="8" width="124" height="84" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
          <line x1="70" y1="8" x2="70" y2="92" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
          <circle cx="70" cy="50" r="8" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
          <circle cx="70" cy="50" r="0.6" fill="rgba(255,255,255,0.7)" />
          <rect x="8" y="28" width="14" height="44" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
          <rect x="118" y="28" width="14" height="44" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 100 140"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <rect x="0" y="0" width="100" height="140" fill="#0f3a23" />
          <rect x="8" y="8" width="84" height="124" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
          <line x1="8" y1="70" x2="92" y2="70" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
          <circle cx="50" cy="70" r="8" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
          <circle cx="50" cy="70" r="0.6" fill="rgba(255,255,255,0.7)" />
          <rect x="28" y="8" width="44" height="14" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
          <rect x="28" y="118" width="44" height="14" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.4" />
        </svg>
      )}

      {formationConfig.slots.map((slot) => {
        const pos = transform(slot);
        const occupantId = positions[slot.id];
        const occupant = occupantId ? stickersById[occupantId] : null;
        const isFocused = focusedSlotId === slot.id;
        return (
          <div
            key={slot.id}
            // Focus swaps the card from "xs" to "md" so the full name,
            // shirt number, position and rating render crisply — instead
            // of CSS-scaling an xs card and pixelating its text.
            className={`absolute -translate-x-1/2 -translate-y-1/2 transition-[z-index] ${
              isFocused ? "z-30 drop-shadow-2xl" : "z-10"
            }`}
            style={{ left: pos.left, top: pos.top }}
            onClick={(e) => {
              if (!occupant) return;
              e.stopPropagation();
              setFocusedSlotId((prev) => (prev === slot.id ? null : slot.id));
            }}
          >
            {occupant ? (
              <div className="cursor-pointer">
                <StickerCard
                  sticker={occupant}
                  owned
                  size={isFocused ? "md" : "xs"}
                />
              </div>
            ) : (
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 border-dashed border-white/40 bg-white/5 flex items-center justify-center text-[9px] sm:text-[10px] font-semibold text-white/40">
                {slot.label}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}

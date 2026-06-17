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

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useIsWide } from "@/lib/hooks/useIsWide";
import ProfileEditModal from "@/components/ProfileEditModal";
import { Pencil, BookOpen, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Trophy,
  Package,
  ChevronRight,
  ChevronLeft,
  Crosshair,
  Gamepad2,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { listResumes } from "@/lib/lessons/resume";
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
import NotificationsOptIn from "@/components/notifications/NotificationsOptIn";
import PredictionsCentreBanner from "@/components/predictions/PredictionsCentreBanner";
import NewContentBanner from "@/components/NewContentBanner";
import DashboardTour from "@/components/DashboardTour";
import PartnerLogo from "@/components/branding/PartnerLogo";

function DashboardContent() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, progress, loading, refetchProgress } = usePlayerDashboard(
    user?.id
  );
  const { settings } = useAppSettings();
  // Pending lesson resume — populated from localStorage. When set we
  // surface a "Resume your lesson" CTA at the top of the dashboard
  // AND (when the pack modal closes) a follow-up button inside it,
  // so a user who came here via the mid-lesson "Open" banner has
  // multiple obvious paths back to where they were.
  const [pendingResume, setPendingResume] = useState(null);

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
      // After a successful open, refetch everything that could have
      // shifted: pack count, collection, AND total XP. The XP refetch
      // matters because the user may have arrived on the dashboard
      // before markLessonComplete's bump propagated, or via a
      // mid-lesson partial commit that just landed — either way we
      // want the hero's "X XP to next pack" to reflect reality.
      refreshPacks();
      refreshCollection();
      refetchProgress?.();
    }
  };

  // Read any resumable lesson once the user is known. Re-runs after a
  // pack modal close so when the user finishes opening their reveal
  // the "Resume your lesson" banner reflects the (possibly cleared)
  // state without needing a hard refresh.
  useEffect(() => {
    if (!user?.id) {
      setPendingResume(null);
      return;
    }
    const list = listResumes(user.id);
    setPendingResume(list[0] || null);
  }, [user, packModalOpen]);

  // Auto-open the pack modal when the lesson page sends us here via
  // ?openPack=1. We strip the param afterwards so a refresh doesn't
  // re-trigger the open.
  useEffect(() => {
    if (!searchParams) return;
    if (searchParams.get("openPack") !== "1") return;
    setPackModalOpen(true);
    router.replace("/dashboard");
  }, [searchParams, router]);

  const resumeHref = pendingResume ? `/lesson/${pendingResume.lessonId}` : null;

  // Profile override (set when the edit modal saves) wins over the
  // freshly-loaded profile so the UI updates instantly without a
  // refetch. Falls through to user_metadata then the email prefix.
  const fullName =
    (profileOverride.full_name ?? profile?.full_name) ||
    user?.user_metadata?.full_name ||
    user?.email?.split("@")[0] ||
    "Player";
  const avatarUrl = profileOverride.avatar_url ?? profile?.avatar_url ?? "";
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

  // First-visit dashboard tour. Mounts when:
  //   - data has loaded
  //   - the user is a WC2026 player (other editions opt-in later)
  //   - players.dashboard_tour_completed is not yet true
  //   - no other modal is open on the dashboard (pack vault, profile
  //     editor) — we don't want spotlights overlapping a modal
  //   - the welcome flow wasn't just completed (localStorage flag set
  //     by the lesson page when the user opens their starter pack;
  //     prevents the tour from firing in the immediate post-pack
  //     navigation window when testers occasionally land here for a
  //     moment before /lesson finishes settling)
  // Persisted via /api/onboarding/dashboard-complete; admins can
  // re-arm any user by setting the column back to false.
  const [showDashboardTour, setShowDashboardTour] = useState(false);
  useEffect(() => {
    if (loading || !profile) return;
    if (profile.edition !== "wc2026") return;
    if (profile.dashboard_tour_completed === true) return;
    if (packModalOpen || profileModalOpen) return;
    // Belt-and-braces local marker. DashboardTour.finish() writes
    // this on completion. Reading it here means an earlier API
    // failure that left players.dashboard_tour_completed at false
    // can't re-fire the tour on this device — the local signal
    // wins. (Was the root cause of "the tour starts every time he
    // opens a sticker pack" report.)
    try {
      if (localStorage.getItem("ft.dashboard.tour_completed") === "1") {
        return;
      }
    } catch {
      /* localStorage unavailable — proceed */
    }
    // Welcome-flow deferral. 60-second window: enough to skip the
    // immediate post-pack navigation, short enough that the typical
    // "open pack → do lesson 1 → tap dashboard" path (~1–2 min on
    // an engaged user) lands on the dashboard with the tour ready.
    try {
      const completedAt = Number(
        localStorage.getItem("ft.welcome.completed_at") || 0
      );
      if (completedAt && Date.now() - completedAt < 60 * 1000) {
        return;
      }
    } catch {
      // localStorage unavailable (private mode) — proceed.
    }
    // Defer one tick so the dashboard markup has mounted and our
    // data-tour-id targets are present in the DOM.
    const id = setTimeout(() => setShowDashboardTour(true), 800);
    return () => clearTimeout(id);
  }, [loading, profile, packModalOpen, profileModalOpen]);

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
        {/* Top-of-page nav row — Back to lessons link sits to the
            left so users can hop back into the lesson flow easily.
            The optional partner logo sits to the right; for users
            attributed to a branch with placements.dashboard = true
            it renders, otherwise it's null. */}
        <div className="flex items-center justify-between">
          <Link
            href="/lesson"
            className="inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            {t("back_to_lessons", "Back to lessons")}
          </Link>
          <div className="flex items-center gap-3">
            {/* Game Centre link gated to admins until the section is
                polished and ready for users. Flip the condition to
                always-on once we're happy with it. */}
            {profile?.user_type === "platform_admin" && (
              <Link
                href="/games"
                className="inline-flex items-center gap-1.5 text-sm text-white/70 hover:text-white"
              >
                <Gamepad2 className="w-4 h-4" />
                {t("game_centre_link", "Game Centre")}
              </Link>
            )}
            <PartnerLogo placement="dashboard" profile={profile} size="sm" />
          </div>
        </div>

        {/* Resume-lesson banner — appears whenever the user has an
            in-flight lesson saved (typically because they opened a
            mid-lesson sticker pack). Gives them a one-tap path back
            to the exact step they were on, instead of having to find
            the lesson again from the lesson list. */}
        {pendingResume && resumeHref && (
          <Link
            href={resumeHref}
            className="group flex items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-transparent border border-emerald-400/40 hover:border-emerald-300 px-4 sm:px-5 py-3 sm:py-3.5 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-9 h-9 rounded-full bg-emerald-500/25 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-emerald-200" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-emerald-200/80 font-semibold">
                  {t("resume_eyebrow", "Pick up where you left off")}
                </p>
                <p className="text-sm sm:text-base font-bold text-white truncate">
                  {pendingResume.lessonTitle
                    ? `${t("resume_named_prefix", "Resume — ")}${pendingResume.lessonTitle}`
                    : t("resume_generic", "Resume your lesson")}
                </p>
              </div>
            </div>
            <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-500 group-hover:bg-emerald-400 text-[#062013] text-xs sm:text-sm font-bold tracking-wide">
              {t("resume_cta", "Resume")}
              <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        )}

        {/* "New content available" — lights up when the open-lesson
            count grows past what this user has seen. Self-dismisses
            on tap-through to /lesson. Renders null when there's no
            new content. */}
        <NewContentBanner />

        {/* Open matches nudge — renders null if the user has no
            actionable predictions, so it only shows up when there's
            something to do. */}
        <PredictionsCentreBanner />

        {/* Push notification opt-in. Renders itself null if the
            browser doesn't support push, the user already opted in,
            or they dismissed it within the last 7 days. */}
        <NotificationsOptIn />

        {/* ── Hero strip ─────────────────────────────────────────────── */}
        <section
          data-tour-id="xp-bar"
          className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5 sm:p-6"
        >
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
                  // Avatars are flag PNGs or already-sized uploads — no
                  // benefit from Vercel's optimizer, and skipping it
                  // keeps every new sticker / lesson image from
                  // pushing us past the quota.
                  unoptimized
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
                      ? packsAvailable === 1
                        ? t("pack_ready_singular", "🎉 1 pack ready")
                        : t(
                            "packs_ready_plural",
                            "🎉 {count} packs ready"
                          ).replace("{count}", packsAvailable)
                      : t(
                          "xp_to_next_pack",
                          "{xp} XP to your next pack"
                        ).replace("{xp}", xpToNextPack)}
                  </span>
                  <span className="text-white/40">
                    {t("squad_value_short", "Squad value {value}/{max}")
                      .replace("{value}", squadValue)
                      .replace("{max}", squadMax)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Main grid: squad pitch + side tiles ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Squad pitch — takes 2 columns on lg */}
          <section
            data-tour-id="squad-pitch"
            className="lg:col-span-2 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5 sm:p-6"
          >
            <div className="flex items-center justify-between mb-4">
              {/* "Ultimate Team" is the same in both languages by design
                  — it's the product name for the squad surface. The
                  Edit link DOES localise: "Edit team" / "Monte seu
                  time". */}
              <h2 className="font-semibold text-base sm:text-lg">
                Ultimate Team
              </h2>
              <Link
                href="/dashboard/squad"
                className="text-xs sm:text-sm text-emerald-300 hover:text-emerald-200 flex items-center gap-0.5 font-semibold"
              >
                {t("edit_team_link", "Edit team")}{" "}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <DashboardPitch
              positions={squadPositions}
              stickersById={squadStickersById}
            />
            <p className="text-center text-xs text-white/50 mt-3">
              {t(
                "build_xi_hint",
                "Open packs to collect stickers, then build your XI here"
              )}
            </p>
          </section>

          {/* Side tiles */}
          <div className="space-y-6">
            {/* Squad Value */}
            <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5">
              <div className="flex items-center gap-2 text-white/60 text-xs tracking-wider uppercase mb-2">
                <Trophy className="w-3.5 h-3.5" />
                {t("squad_value_label", "Squad Value")}
              </div>
              <div className="text-3xl sm:text-4xl font-black">
                {squadValue}
                <span className="text-base font-medium text-white/40">
                  {" "}
                  / {squadMax}
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
                  {t("pack_vault_label", "Pack Vault")}
                </div>
                <Link
                  href="/dashboard/album"
                  className="text-emerald-300 hover:text-emerald-200 normal-case tracking-normal flex items-center gap-0.5"
                >
                  {t("album_link", "Album")} <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              {packsAvailable > 0 ? (
                <>
                  <div className="text-3xl sm:text-4xl font-black">
                    {packsAvailable}
                  </div>
                  <button
                    type="button"
                    onClick={() => setPackModalOpen(true)}
                    className="mt-3 w-full px-3 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-[#070707] text-sm font-bold tracking-wide transition-colors"
                  >
                    {t("open_a_pack", "Open a pack")}
                  </button>
                </>
              ) : (
                <>
                  <div className="text-3xl sm:text-4xl font-black text-white/30">
                    0
                  </div>
                  <p className="text-xs text-white/50 mt-2">
                    {(totalXp >= packXpCost
                      ? t(
                          "earn_more_xp_next",
                          "Earn {xp} more XP to unlock your next pack"
                        )
                      : t(
                          "earn_more_xp_first",
                          "Earn {xp} more XP to unlock your first pack"
                        )
                    ).replace("{xp}", xpToNextPack || packXpCost)}
                  </p>
                </>
              )}
              {collection.length > 0 && (
                <p className="mt-3 text-xs text-white/50">
                  {collection.length === 1
                    ? t(
                        "unique_sticker_collected_singular",
                        "1 unique sticker collected"
                      )
                    : t(
                        "unique_stickers_collected_plural",
                        "{count} unique stickers collected"
                      ).replace("{count}", collection.length)}
                </p>
              )}
            </section>

            {/* Predictions stats */}
            <section className="rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm p-5">
              <div className="flex items-center justify-between text-white/60 text-xs tracking-wider uppercase mb-2">
                <div className="flex items-center gap-2">
                  <Crosshair className="w-3.5 h-3.5" />
                  {t("predictions_label", "Predictions")}
                </div>
                {predictionCounts.total > 0 && (
                  <Link
                    href="/dashboard/predictions"
                    className="text-emerald-300 hover:text-emerald-200 normal-case tracking-normal flex items-center gap-0.5"
                  >
                    {t("view_link", "View")} <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
              {predictionCounts.total > 0 ? (
                <>
                  <div className="text-3xl sm:text-4xl font-black">
                    {predictionCounts.pending}
                    <span className="text-base font-medium text-white/40">
                      {" "}
                      {t("pending_label", "pending")}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-white/50">
                    <span>
                      <span className="text-white/80 font-semibold">
                        {predictionCounts.resolved}
                      </span>{" "}
                      {t("resolved_label", "resolved")}
                    </span>
                    {predictionCounts.totalBonusXp > 0 && (
                      <span>
                        <span className="text-emerald-300 font-semibold">
                          +{predictionCounts.totalBonusXp} XP
                        </span>{" "}
                        {t("bonus_label", "bonus")}
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
                    {t(
                      "predictions_empty_hint",
                      "Your predictions will appear here once they're saved from lessons"
                    )}
                  </p>
                </>
              )}

              {/* Hat-trick badge — surfaces whenever the user has at
                  least one all-3-correct match. Sits at the bottom of
                  the predictions tile so it builds on the existing
                  predictions storyline (resolved + bonus + hat-tricks). */}
              {(progress?.hat_trick_count || 0) > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2">
                  <span className="text-xl">🎩</span>
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wider text-amber-200/80 font-bold">
                      {progress.hat_trick_count === 1
                        ? t("hat_trick_singular", "Hat-trick")
                        : t("hat_tricks_plural", "Hat-tricks")}
                    </p>
                    <p className="text-sm font-bold text-amber-100">
                      {progress.hat_trick_count}
                      <span className="text-xs font-normal text-white/50 ml-1.5">
                        {t(
                          "hat_trick_hint",
                          "all 3 picks correct on one match"
                        )}
                      </span>
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Leaderboard — top 10 ranked by Squad value or XP. */}
            <div data-tour-id="leaderboard">
              <Leaderboard defaultSort="squad_value" />
            </div>
          </div>
        </div>
      </main>

      {/* Dashboard onboarding tour — arrow-style spotlight + tooltip
          pointing at each section. Only renders for WC2026 players
          who haven't completed it yet. We also pause it when any
          other modal opens (pack vault, profile editor) — both
          modals are full-screen on mobile, so a spotlight underneath
          them would be wasted; the tour resumes once they close. */}
      <DashboardTour
        enabled={showDashboardTour && !packModalOpen && !profileModalOpen}
        onClose={() => setShowDashboardTour(false)}
      />

      {/* Pack-opening modal — mounted once at root so the reveal cards
          don't get clipped by parent transforms / overflows. */}
      <PackOpeningModal
        open={packModalOpen}
        onClose={handlePackModalClose}
        resumeAction={
          pendingResume && resumeHref
            ? {
                href: resumeHref,
                label: pendingResume.lessonTitle
                  ? `Resume — ${pendingResume.lessonTitle}`
                  : "Resume lesson",
              }
            : null
        }
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
    // Outer container is NOT overflow-hidden — that's what lets a
    // focused (md-sized) card spill past the pitch boundary near a
    // corner slot instead of getting clipped. The pitch SVG art is
    // clipped by an inner rounded layer; the slot layer sits above
    // it with overflow:visible.
    <div
      className="relative w-full mx-auto"
      style={{
        aspectRatio: isHorizontal ? "7 / 5" : "5 / 7",
        maxWidth: isHorizontal ? "100%" : "360px",
      }}
      onClick={() => setFocusedSlotId(null)}
    >
      <div className="absolute inset-0 rounded-xl overflow-hidden shadow-md">
        {isHorizontal ? (
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
        ) : (
          <svg
            viewBox="0 0 100 140"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <rect x="0" y="0" width="100" height="140" fill="#0f3a23" />
            <rect
              x="8"
              y="8"
              width="84"
              height="124"
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="0.4"
            />
            <line
              x1="8"
              y1="70"
              x2="92"
              y2="70"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="0.4"
            />
            <circle
              cx="50"
              cy="70"
              r="8"
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="0.4"
            />
            <circle cx="50" cy="70" r="0.6" fill="rgba(255,255,255,0.7)" />
            <rect
              x="28"
              y="8"
              width="44"
              height="14"
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="0.4"
            />
            <rect
              x="28"
              y="118"
              width="44"
              height="14"
              fill="none"
              stroke="rgba(255,255,255,0.55)"
              strokeWidth="0.4"
            />
          </svg>
        )}
      </div>

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

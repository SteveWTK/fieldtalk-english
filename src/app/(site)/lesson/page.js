/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/(site)/lesson/page.js
//
// The Training Ground — player-facing home for lesson progression.
//
// Layout (revamped 2026-09-15):
//   Header       — Eyebrow + welcome
//   Vitals strip — 4-up StatTile row (Level / XP / Lessons / Streak)
//   Continue     — hero card pointing at the player's next lesson,
//                  with an overall-progress MetricBar
//   End-of-unit  — celebratory CTA after finishing a Unit's last lesson
//   Pillar chips — horizontal Chip row, one per Unit + progress %
//   Lesson grid  — 2-col responsive grid of lesson cards for the
//                  selected Unit; the 7th "Mental Training" slot
//                  renders below.
//
// The previous accordion+row layout was a single narrow column that
// under-used the surface a training ground deserves. The chip picker
// keeps "one unit visible at a time" (the affordance the accordion
// gave) while letting the lessons render as a proper card grid — the
// visual language the rest of the app now uses.
//
// All business logic (onboarding, first-lesson prompt, end-of-unit
// hop, paywall gating, all-open-lessons-done modal, deep-link
// completion handling) is preserved verbatim; only the JSX
// structure + subcomponents changed.
"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Target,
  Globe,
  Calendar,
  Star,
  ChevronRight,
  Play,
  Lock,
  CheckCircle,
  Medal,
  TrendingUp,
  BookOpen,
  MessageSquare,
  Mic,
  Construction,
  Trophy,
  ArrowRight,
  Sparkles,
  Flame,
  Zap,
} from "lucide-react";
import XPGainAnimation from "@/components/XPGainAnimation";
import { usePlayerDashboard } from "@/lib/hooks/usePlayerData";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTranslation } from "@/hooks/useTranslation";
import FirstLessonPrompt from "@/components/FirstLessonPrompt";
import PaywallCard from "@/components/PaywallCard";
import { usePlayerAccess } from "@/lib/access/usePlayerAccess";
import WelcomeOnboarding from "@/components/WelcomeOnboarding";
import ProPathOnboarding from "@/components/onboarding/propath/ProPathOnboarding";
import PackOpeningModal from "@/components/stickers/PackOpeningModal";
import NewContentBanner from "@/components/NewContentBanner";
import PillarMentalSlot from "@/components/mental/PillarMentalSlot";
import LevelBanner from "@/components/lesson/LevelBanner";

// DS primitives — the same set that lives in the coach + mental
// dashboards, so this page speaks the same visual language.
import Eyebrow from "@/components/ui/eyebrow";
import Panel from "@/components/ui/panel";
import Button from "@/components/ui/button";
import Chip from "@/components/ui/chip";
import StatTile from "@/components/ui/stat-tile";
import MetricBar from "@/components/ui/metric-bar";

function PlayerLessonsMenu() {
  const [selectedPillar, setSelectedPillar] = useState("survival");
  const [showXPGain, setShowXPGain] = useState(false);
  const [showConstructionModal, setShowConstructionModal] = useState(false);
  // Auto-pop "great work — new content soon" modal when the user
  // has completed every currently-open lesson (all lessons whose
  // under_construction = false). Gated per (user, open-lesson-count)
  // via localStorage so it shows once when they reach the wall, then
  // again next time we release more content and they catch up. See
  // the useEffect below for trigger logic.
  const [showAllOpenLessonsDoneModal, setShowAllOpenLessonsDoneModal] =
    useState(false);
  // Smooth-scroll the newly-selected Unit's lesson grid into view
  // after a chip click. block: "nearest" avoids jolting when the
  // grid is already visible.
  useEffect(() => {
    if (!selectedPillar) return;
    if (typeof document === "undefined") return;
    const el = document.querySelector(`[data-pillar-name="${selectedPillar}"]`);
    if (!el) return;
    // Defer one frame so the grid has mounted before we scroll.
    const id = window.setTimeout(() => {
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 60);
    return () => window.clearTimeout(id);
  }, [selectedPillar]);
  // "Start here" prompt — visible on first visit only (no completions yet
  // AND localStorage hasn't recorded a dismissal). Decided in useEffect
  // below once data has loaded.
  const [showStartPrompt, setShowStartPrompt] = useState(false);
  // After the user finishes a lesson and is bounced back here with
  // `?completed=<lessonId>`, this holds the id of the lesson card we want
  // to highlight (typically the next one). Cleared on subsequent visits.
  const [highlightLessonId, setHighlightLessonId] = useState(null);

  // End-of-unit jump target — set when the just-completed lesson was the
  // last in its unit AND there's a next unit. Drives the "Continue to
  // [Next Unit] →" hero CTA, which links directly to step 1 of that
  // next unit's first lesson (one click, no card-hunting).
  const [endOfUnitJump, setEndOfUnitJump] = useState(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const completedParam = searchParams.get("completed");
  // Tracks which completedParam value we've already auto-applied for, so
  // re-renders of this page (e.g. the parent's pillars reference changing)
  // can't snap the user back to the auto-selected pillar after they've
  // clicked a different pillar card themselves.
  const appliedCompletedRef = useRef(null);

  const { user } = useAuth();
  // All visible strings now come from the locale files via t().
  const { t, userLanguage } = useTranslation(user);

  // Use the actual logged-in user's ID
  const userId = user?.id;

  const {
    profile,
    progress,
    pillars,
    lessons,
    completions,
    achievements,
    levels,
    levelCompletions,
    loading,
    refetchProgress,
  } = usePlayerDashboard(userId);

  // Per-edition access status. Drives:
  //   - the inline paywall banner at the top of the list
  //   - the "edition_paywall" lesson card state (locked + nudges to
  //     /pricing instead of letting the user open the lesson)
  // Platform admins get hasAccess: true from the API regardless, so
  // QA isn't blocked.
  const access = usePlayerAccess(profile?.edition);

  // First-visit onboarding — one flag drives both flows, but the
  // actual overlay chosen depends on the caller's edition:
  //   - wc2026         → <WelcomeOnboarding /> (packs + squad story)
  //   - propath_26_27  → <ProPathOnboarding /> (position + goal + ready)
  // Both write to the same players.onboarding_completed column when
  // dismissed, so the "did they finish setup?" gate stays in one
  // place regardless of edition.
  const [showWelcome, setShowWelcome] = useState(false);
  const [showProPathOnboarding, setShowProPathOnboarding] = useState(false);
  // When the user taps "Open my first pack" on the final onboarding
  // slide, this flips to true and PackOpeningModal mounts. The modal
  // calls /api/packs/open, awards the welcome pack contents, then
  // returns to /lesson where the FirstLessonPrompt highlights Unit 1
  // Lesson 1.
  const [showStarterPack, setShowStarterPack] = useState(false);

  // Session-local "we've already shown onboarding this load" flag.
  // The /api/onboarding/complete write inside WelcomeOnboarding is
  // fire-and-forget, so a refetchProgress() triggered by the pack
  // modal close can race ahead of the DB commit and momentarily
  // return profile.onboarding_completed = false, which would re-show
  // the modal. This local guard prevents that flicker.
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  useEffect(() => {
    if (loading || !user?.id || !profile) return;
    if (profile.onboarding_completed === true) return;
    if (onboardingDismissed) return;
    // Route to the right onboarding by edition. Legacy "players"
    // rows fall through to the WC flow — they were the pre-launch
    // seed cohort and shouldn't hit any onboarding at this point.
    if (profile.edition === "propath_26_27") {
      setShowProPathOnboarding(true);
    } else if (profile.edition === "wc2026") {
      setShowWelcome(true);
    }
  }, [loading, user, profile, onboardingDismissed]);

  const handleProPathOnboardingClose = () => {
    setShowProPathOnboarding(false);
    setOnboardingDismissed(true);
    refetchProgress?.();
  };

  const handleWelcomeClose = (nextAction) => {
    setShowWelcome(false);
    setOnboardingDismissed(true);
    try {
      localStorage.setItem("ft.welcome.completed_at", String(Date.now()));
    } catch {
      // private mode — non-fatal, tour just fires immediately
    }
    if (nextAction === "open_pack") {
      setShowStarterPack(true);
    }
  };

  const handleStarterPackClose = () => {
    setShowStarterPack(false);
    refetchProgress?.();
  };
  const previewLessonSet = useMemo(
    () => new Set(access.previewLessonIds || []),
    [access.previewLessonIds],
  );
  const showInlinePaywall = !!user && !access.loading && !access.hasAccess;

  // Show the "Start here" prompt only when:
  //   - data has loaded
  //   - the user is signed in
  //   - they have no completed lessons yet
  useEffect(() => {
    if (loading || !user) return;
    setShowStartPrompt((completions?.length || 0) === 0);
  }, [loading, user, completions]);

  // "All open lessons completed" detection. Triggers a one-time
  // congratulatory modal the first time the user catches up to the
  // construction wall.
  useEffect(() => {
    if (loading || !user?.id) return;
    if (!Array.isArray(lessons) || lessons.length === 0) return;
    const openLessons = lessons.filter((l) => !l.under_construction);
    if (openLessons.length === 0) return;
    const completedIds = new Set(
      (completions || []).map((c) => c.lesson_id).filter(Boolean),
    );
    const allOpenDone = openLessons.every((l) => completedIds.has(l.id));
    if (!allOpenDone) return;
    const storageKey = `ft.allOpenLessonsDone.${user.id}.${openLessons.length}`;
    try {
      if (window.localStorage.getItem(storageKey) === "1") return;
    } catch {
      /* private mode — show once per session */
    }
    setShowAllOpenLessonsDoneModal(true);
  }, [loading, user, lessons, completions]);

  const dismissAllOpenLessonsDoneModal = () => {
    setShowAllOpenLessonsDoneModal(false);
    if (!user?.id || !Array.isArray(lessons)) return;
    const openCount = lessons.filter((l) => !l.under_construction).length;
    try {
      window.localStorage.setItem(
        `ft.allOpenLessonsDone.${user.id}.${openCount}`,
        "1",
      );
    } catch {
      /* private mode — non-fatal */
    }
  };

  // When we land here from a finished lesson with `?completed=<id>`,
  // figure out which pillar to show and which lesson card to highlight:
  //   - Same pillar if there's a next lesson after the completed one.
  //   - Otherwise the next pillar (by sort_order), with its first lesson.
  useEffect(() => {
    if (loading || !user) return;
    if (!completedParam) return;
    if (!pillars || pillars.length === 0) return;
    if (appliedCompletedRef.current === completedParam) return;

    const sourcePillar = pillars.find((p) =>
      (p.lessons || []).some((l) => l.id === completedParam),
    );
    if (!sourcePillar) return;

    const lessonsSorted = [...(sourcePillar.lessons || [])].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
    );
    const idx = lessonsSorted.findIndex((l) => l.id === completedParam);
    const nextInPillar = idx >= 0 ? lessonsSorted[idx + 1] : null;

    if (nextInPillar) {
      setSelectedPillar(sourcePillar.name);
      setHighlightLessonId(nextInPillar.id);
      setEndOfUnitJump(null);
    } else {
      const pillarsSorted = [...pillars].sort(
        (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
      );
      const pIdx = pillarsSorted.findIndex((p) => p.name === sourcePillar.name);
      const nextPillar = pIdx >= 0 ? pillarsSorted[pIdx + 1] : null;

      if (nextPillar) {
        const firstNextLesson = [...(nextPillar.lessons || [])].sort(
          (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
        )[0];
        setSelectedPillar(nextPillar.name);
        setHighlightLessonId(firstNextLesson?.id || null);
        if (firstNextLesson) {
          setEndOfUnitJump({
            unitName: nextPillar.display_name || nextPillar.name,
            unitPillarName: nextPillar.name,
            lessonId: firstNextLesson.id,
            lessonTitle: firstNextLesson.title || null,
          });
        } else {
          setEndOfUnitJump(null);
        }
      } else {
        setSelectedPillar(sourcePillar.name);
        setHighlightLessonId(null);
        setEndOfUnitJump(null);
      }
    }

    appliedCompletedRef.current = completedParam;
    router.replace("/lesson", { scroll: false });
  }, [loading, user, completedParam, pillars, router]);

  // Auto-select the current unit when the user lands on /lesson.
  //
  // Runs when `pillars` or `levels` first hydrate and:
  //   1. The URL didn't carry a `?completed=` deep-link (that effect
  //      wins — it already set the right pillar).
  //   2. The current `selectedPillar` isn't inside the player's
  //      current Level (e.g. stale "survival" default sitting in
  //      state when the player is actually working in Level 3).
  // When both hold, we pick the first non-100% pillar in the current
  // Level, falling back to the first pillar of that Level.
  useEffect(() => {
    if (loading) return;
    if (completedParam) return;                // completedParam effect owns selection
    if (!pillars || pillars.length === 0) return;
    if (!levels || levels.length === 0) return;

    const activeLvls = levels.filter((l) => l.is_active !== false);
    // Find the Level currently in progress.
    const inProgress = (() => {
      for (const lvl of activeLvls) {
        const lvlPillars = pillars
          .filter((p) => (p.level_id ?? activeLvls[0]?.id) === lvl.id)
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        if (lvlPillars.length === 0) continue;
        const allComplete = lvlPillars.every((p) => (p.progress || 0) >= 100);
        if (!allComplete) return { lvl, pillars: lvlPillars };
      }
      return null;
    })();
    if (!inProgress) return;

    const inLevelNames = new Set(inProgress.pillars.map((p) => p.name));
    if (inLevelNames.has(selectedPillar)) return; // player already viewing this level

    const nextPillar =
      inProgress.pillars.find((p) => (p.progress || 0) < 100) ||
      inProgress.pillars[0];
    if (nextPillar) setSelectedPillar(nextPillar.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, pillars, levels, completedParam]);

  // Loading state — dark skeleton that matches the final layout so
  // the paint-in feels intentional instead of a flash.
  if (loading) {
    return (
      <div className="min-h-screen bg-primary-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-64 bg-primary-800 rounded" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-primary-panel border border-primary-700 h-24 rounded-card"
                />
              ))}
            </div>
            <div className="bg-primary-panel border border-primary-700 h-40 rounded-card" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="bg-primary-panel border border-primary-700 h-40 rounded-card"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-primary-900 text-primary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h2 className="text-2xl font-display font-bold mb-4">
              Please sign in to view your Lesson Menu
            </h2>
          </div>
        </div>
      </div>
    );
  }

  // Check if user is a guest (guest emails end with @fieldtalk.guest)
  const isGuest =
    user.email?.endsWith("@fieldtalk.guest") || user.user_metadata?.is_guest;

  // Use real data or fallback to sensible defaults
  const playerData = {
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      (isGuest ? null : user.email?.split("@")[0]) ||
      "Player",
    position: profile?.position || user.user_metadata?.position || "Player",
    club: profile?.club?.name || "Global Player",
    current_level: progress?.current_level || 1,
    total_xp: progress?.total_xp || 0,
    completedLessons: completions?.length || 0,
    current_streak: progress?.current_streak || 0,
    joinDate: progress?.created_at || new Date().toISOString(),
  };

  const currentPillar =
    pillars.find((p) => p.name === selectedPillar) || pillars[0];
  const currentLessons = currentPillar?.lessons || [];

  // Platform admins get to preview under-construction lessons so we can
  // QA new content (e.g. Lesson 2) before it goes live to the cohort.
  const isPlatformAdmin = profile?.user_type === "platform_admin";

  // Improved lesson status calculation
  const getLessonStatus = (lesson) => {
    // Check if lesson is under construction — platform admins bypass this.
    if (lesson.under_construction && !isPlatformAdmin) return "construction";

    // Check if this lesson is completed
    const isCompleted = completions?.some((c) => c.lesson_id === lesson.id);
    if (isCompleted) return "completed";

    // Get all lessons in this pillar, sorted by sort_order
    const pillarLessons = currentLessons
      .filter((l) => l.pillar_id === lesson.pillar_id)
      .sort((a, b) => a.sort_order - b.sort_order);

    const lessonIndex = pillarLessons.findIndex((l) => l.id === lesson.id);

    const isPreview = previewLessonSet.has(lesson.id);
    if (!access.loading && !access.hasAccess && !isPreview) {
      return "edition_paywall";
    }

    if (lessonIndex === 0) {
      return "current";
    }

    const previousLessons = pillarLessons.slice(0, lessonIndex);
    const allPreviousCompleted = previousLessons.every((prevLesson) =>
      completions?.some((c) => c.lesson_id === prevLesson.id),
    );

    if (allPreviousCompleted) {
      return "current";
    }

    return "locked";
  };

  const getIconComponent = (iconName) => {
    const icons = {
      Globe,
      Target,
      MessageSquare,
      Star,
      Calendar,
      Medal,
    };
    return icons[iconName] || Star;
  };

  // Overall edition progress — a single 0-100 number for the
  // MetricBar in the Continue hero. Counts open lessons (excludes
  // under_construction) as the denominator so the bar doesn't stall
  // at 90% when the last two lessons are hidden behind construction.
  const openLessons = Array.isArray(lessons)
    ? lessons.filter((l) => !l.under_construction)
    : [];
  const completedIds = new Set(
    (completions || []).map((c) => c.lesson_id).filter(Boolean),
  );
  const overallProgressPct =
    openLessons.length > 0
      ? Math.round(
          (openLessons.filter((l) => completedIds.has(l.id)).length /
            openLessons.length) *
            100,
        )
      : 0;

  // "Continue where you left off" target — the first available
  // (non-locked, non-completed, non-construction) lesson in the
  // current pillar. Walks pillars in sort order so first-visit users
  // land on Unit 1 Lesson 1. Skips if a paywall applies (the hero
  // then shows the paywall CTA instead).
  const nextLesson = (() => {
    const pillarsSorted = [...pillars].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
    );
    for (const p of pillarsSorted) {
      const ls = [...(p.lessons || [])].sort(
        (a, b) => (a.sort_order || 0) - (b.sort_order || 0),
      );
      for (const l of ls) {
        if (l.under_construction && !isPlatformAdmin) continue;
        if (completedIds.has(l.id)) continue;
        // Same paywall check as getLessonStatus.
        const isPreview = previewLessonSet.has(l.id);
        if (!access.loading && !access.hasAccess && !isPreview) continue;
        return { lesson: l, pillar: p };
      }
    }
    return null;
  })();

  // ── Levels layer ────────────────────────────────────────────
  // The top-level content organisation: each Level contains N Units
  // (pillars). Fetched from the DB so display names + colours stay
  // editable. Sequential progression (v1) — the player's "current"
  // level is the first sort-ordered level with any incomplete pillar.
  const activeLevels = (levels || []).filter((l) => l.is_active !== false);

  // Group pillars by level_id. NULL-level pillars fall back under
  // the first active level so nothing is orphaned during migration.
  const pillarsByLevelId = new Map();
  for (const p of pillars) {
    const key = p.level_id ?? (activeLevels[0]?.id ?? null);
    if (key == null) continue;
    if (!pillarsByLevelId.has(key)) pillarsByLevelId.set(key, []);
    pillarsByLevelId.get(key).push(p);
  }
  for (const arr of pillarsByLevelId.values()) {
    arr.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  // Certificate lookup by level_id — used by the LevelBanner marker.
  const certificateByLevelId = new Map(
    (levelCompletions || []).map((c) => [c.level_id, c]),
  );

  // Current level = first (by sort_order) level whose pillars aren't
  // all at 100%. Falls back to the last level if the player has
  // finished everything. `null` while data is still loading.
  const currentLevel = (() => {
    for (const lvl of activeLevels) {
      const lvlPillars = pillarsByLevelId.get(lvl.id) || [];
      if (lvlPillars.length === 0) continue;
      const allComplete = lvlPillars.every((p) => (p.progress || 0) >= 100);
      if (!allComplete) return lvl;
    }
    return activeLevels[activeLevels.length - 1] || null;
  })();

  const currentLevelIndex = currentLevel
    ? activeLevels.findIndex((l) => l.id === currentLevel.id) + 1
    : null;
  const currentLevelPillars = currentLevel
    ? pillarsByLevelId.get(currentLevel.id) || []
    : [];
  const currentLevelUnitsComplete = currentLevelPillars.filter(
    (p) => (p.progress || 0) >= 100,
  ).length;
  const currentLevelEarnedCert = currentLevel
    ? certificateByLevelId.get(currentLevel.id) || null
    : null;

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* First-visit onboarding overlays — WC or Pro Path variant
            picks itself by profile.edition. */}
        {showWelcome && (
          <WelcomeOnboarding userId={user?.id} onClose={handleWelcomeClose} />
        )}
        {showProPathOnboarding && (
          <ProPathOnboarding
            userName={
              profile?.full_name ||
              user?.user_metadata?.full_name ||
              user?.email?.split("@")[0] ||
              ""
            }
            onDismiss={handleProPathOnboardingClose}
          />
        )}
        {showStarterPack && (
          <PackOpeningModal
            open={showStarterPack}
            onClose={handleStarterPackClose}
          />
        )}

        {/* "New content available" — banner surfaces before scrolling
            so returning users spot new units. Self-renders null when
            already acknowledged. */}
        <div className="mb-6">
          <NewContentBanner />
        </div>

        {/* Header — welcome + eyebrow. Speaks the same visual
            language as the coach dashboard and mental hub. */}
        {/* <header className="mb-6">
          <Eyebrow className="mb-1">Global Player · Training Ground</Eyebrow>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-primary-50">
            {isGuest
              ? "Welcome to Global Player"
              : `Welcome back, ${playerData.name.split(" ")[0]}`}
          </h1>
          <p className="text-sm text-primary-400 mt-2 max-w-2xl leading-relaxed">
            {profile?.edition === "propath_26_27"
              ? "Every lesson gets you closer to trial-ready English."
              : "Pick up where you left off — your next lesson is one tap away."}
          </p>
        </header> */}

        {/* Vitals strip — 4-up KPI row. Total XP carries tone="accent"
            as the composite hero metric (per DS "one accented tile
            per row" rule). */}
        {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <StatTile
            label={<StatIcon Icon={Trophy}>Level</StatIcon>}
            value={playerData.current_level}
          />
          <StatTile
            label={<StatIcon Icon={Zap}>Total XP</StatIcon>}
            value={formatNumber(playerData.total_xp)}
            tone="accent"
          />
          <StatTile
            label={<StatIcon Icon={BookOpen}>Lessons</StatIcon>}
            value={playerData.completedLessons}
            caption={
              openLessons.length > 0
                ? `of ${openLessons.length} open`
                : undefined
            }
          />
          <StatTile
            label={<StatIcon Icon={Flame}>Streak</StatIcon>}
            value={playerData.current_streak}
            caption={playerData.current_streak > 0 ? "day streak" : "no streak yet"}
          />
        </div> */}

        {/* Continue where you left off — hero card. Commented out
            per the 2026-09 design decision to keep personalised
            "continue" affordances on /dashboard only; on /lesson
            the highlighted current Unit + Next lesson card carry
            that job instead. Kept in the file (not deleted) so the
            block can be restored quickly if user testing pushes back.
        {nextLesson && (
          <Panel
            eyebrow="Continue where you left off"
            title={nextLesson.lesson.title}
            className="mb-4"
            headerAction={
              <Button
                as="a"
                href={`/lesson/${nextLesson.lesson.id}`}
                variant="primary"
                size="md"
                Icon={Play}
              >
                {userLanguage === "pt" ? "Continuar" : "Continue"}
              </Button>
            }
          >
            <p className="text-sm text-primary-400 leading-relaxed">
              {nextLesson.pillar.display_name || nextLesson.pillar.name}
              {nextLesson.lesson.description_pt && userLanguage === "pt"
                ? ` · ${nextLesson.lesson.description_pt}`
                : nextLesson.lesson.description && userLanguage !== "pt"
                  ? ` · ${nextLesson.lesson.description}`
                  : ""}
            </p>
            <div className="mt-2">
              <MetricBar
                label={
                  userLanguage === "pt"
                    ? "Progresso na edição"
                    : "Edition progress"
                }
                value={overallProgressPct}
                signal="accent"
              />
            </div>
          </Panel>
        )}
        */}

        {/* End-of-unit CTA — sits ABOVE the pillar chips so it's the
            first thing a user sees after finishing a Unit's last
            lesson. Rebuilt on DS tokens; keeps the pulse/wiggle
            animations declared at the bottom of this component. */}
        {endOfUnitJump && (
          <div className="mb-4 rounded-card bg-accent-400/10 border border-accent-400/40 px-4 sm:px-6 py-4 sm:py-5">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-11 h-11 rounded-full bg-accent-400/20 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-accent-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-label text-accent-300 font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    {userLanguage === "pt"
                      ? "Unidade concluída!"
                      : "Unit complete!"}
                  </p>
                  <p className="text-sm sm:text-base font-bold text-primary-50">
                    {userLanguage === "pt"
                      ? `Toque em ${endOfUnitJump.unitName} para começar a próxima unidade`
                      : `Tap ${endOfUnitJump.unitName} to start the next unit`}
                  </p>
                </div>
              </div>
              <ArrowRight
                className="w-5 h-5 text-accent-400 shrink-0 onb-arrow-nudge"
                aria-hidden
              />
            </div>
          </div>
        )}

        {/* ─── LEVELS LAYER ──────────────────────────────────────
            Row 1: Level banner — only the player's current Level
                    (viewport-width, vertically slim, signal-tinted).
            Row 2: 4-Unit card grid — the pillars assigned to this
                    Level. 4 columns on wide screens, 2 columns on
                    narrow. Current Unit carries the lime border. */}
        {currentLevel && (
          <div className="mb-4">
            <LevelBanner
              level={currentLevel}
              unitsComplete={currentLevelUnitsComplete}
              unitsTotal={currentLevelPillars.length}
              earnedCertificate={currentLevelEarnedCert}
              levelIndex={currentLevelIndex}
              totalLevels={activeLevels.length}
              lang={userLanguage === "pt" ? "pt" : "en"}
            />
          </div>
        )}

        {currentLevelPillars.length > 0 && (
          <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {currentLevelPillars.map((pillar) => {
              const isActive = selectedPillar === pillar.name;
              const isNextUp =
                endOfUnitJump?.unitPillarName === pillar.name && !isActive;
              const isComplete = (pillar.progress || 0) >= 100;
              const Icon = getIconComponent(pillar.icon);
              return (
                <UnitCard
                  key={pillar.name}
                  pillar={pillar}
                  Icon={Icon}
                  isActive={isActive}
                  isComplete={isComplete}
                  isNextUp={isNextUp}
                  onSelect={() => setSelectedPillar(pillar.name)}
                  lang={userLanguage === "pt" ? "pt" : "en"}
                />
              );
            })}
          </div>
        )}

        {/* Selected Unit — its lesson grid. Uses Panel for the whole
            block so the pillar header + grid + mental slot read as
            one unit of content. */}
        {currentPillar && (
          <section
            data-pillar-name={currentPillar.name}
            data-pillars-container
            className="mb-8"
          >
            <Panel
              eyebrow={currentPillar.image_url ? undefined : undefined}
              title={currentPillar.display_name || currentPillar.name}
              meta={
                userLanguage === "pt"
                  ? `${currentPillar.progress || 0}% concluído`
                  : `${currentPillar.progress || 0}% complete`
              }
            >
              {currentPillar.description_pt && userLanguage === "pt" && (
                <p className="text-sm text-primary-300 leading-relaxed">
                  {currentPillar.description_pt}
                </p>
              )}
              {currentPillar.description && userLanguage !== "pt" && (
                <p className="text-sm text-primary-300 leading-relaxed">
                  {currentPillar.description}
                </p>
              )}

              {/* "Start here" prompt — only shows on the first pillar's
                  first lesson (component gates itself on shouldShow +
                  its own localStorage flag). */}
              <FirstLessonPrompt
                shouldShow={showStartPrompt}
                onDismiss={() => setShowStartPrompt(false)}
              />

              {currentLessons.length === 0 ? (
                <div className="rounded-card border border-primary-700 bg-primary-900 p-6 text-center">
                  <p className="text-sm text-primary-400">
                    No lessons available for this unit yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[...currentLessons]
                    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
                    .map((lesson, lessonIndex) => {
                      const status = getLessonStatus(lesson);
                      const highlight =
                        (showStartPrompt && lessonIndex === 0) ||
                        (highlightLessonId && lesson.id === highlightLessonId);
                      return (
                        <LessonCard
                          key={lesson.id}
                          lesson={lesson}
                          status={status}
                          highlight={highlight}
                          userLanguage={userLanguage}
                          onConstruction={() => setShowConstructionModal(true)}
                          profile={profile}
                          t={t}
                        />
                      );
                    })}
                </div>
              )}

              {/* The Mental Training "7th slot" — self-hides when
                  no activity is assigned to this unit. Renders full-
                  width below the grid so it's the natural finish for
                  each unit's practice set. */}
              <PillarMentalSlot unitId={currentPillar.id} />
            </Panel>
          </section>
        )}

        {/* XP Gain Animation */}
        <XPGainAnimation
          xp={50}
          show={showXPGain}
          onComplete={() => setShowXPGain(false)}
        />

        {/* Under Construction Modal — rebuilt on DS tokens. */}
        {showConstructionModal && (
          <div className="fixed inset-0 bg-primary-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-primary-panel border border-primary-700 rounded-panel p-6 max-w-md w-full">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-signal-performance/15 border border-signal-performance/30 flex items-center justify-center">
                  <Construction className="w-8 h-8 text-signal-performance" />
                </div>
              </div>
              <h3 className="text-xl font-display font-bold text-primary-50 text-center mb-3">
                {t("lesson_under_construction")}
              </h3>
              <p className="text-sm text-primary-300 text-center mb-6 leading-relaxed">
                {t("lesson_under_construction_msg")}
              </p>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setShowConstructionModal(false)}
                className="w-full"
              >
                {t("ok")}
              </Button>
            </div>
          </div>
        )}

        {/* "All open lessons completed" — fires once per (user, open-
            lesson-count) when the user catches up to the construction
            wall. Rebuilt on DS tokens. */}
        {showAllOpenLessonsDoneModal && (
          <div className="fixed inset-0 bg-primary-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-primary-panel border border-accent-400/30 rounded-panel p-6 sm:p-7 max-w-md w-full">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-accent-400/15 border border-accent-400/30 flex items-center justify-center">
                  <Trophy className="w-8 h-8 text-accent-400" />
                </div>
              </div>
              <h3 className="text-xl font-display font-black text-primary-50 text-center mb-3">
                {t("all_open_lessons_done_title")}
              </h3>
              <p className="text-sm text-primary-300 text-center leading-relaxed mb-5">
                {t("all_open_lessons_done_body_1")}
              </p>
              {(() => {
                const showGameCentreCard =
                  profile?.user_type === "platform_admin";
                return (
                  <>
                    <div
                      className={`rounded-card bg-accent-400/10 border border-accent-400/30 p-4 ${
                        showGameCentreCard ? "mb-3" : "mb-6"
                      }`}
                    >
                      <p className="text-sm font-bold text-accent-300 mb-1">
                        {t("all_open_lessons_done_body_2_heading")}
                      </p>
                      <p className="text-sm text-primary-300 leading-relaxed">
                        {t("all_open_lessons_done_body_2")}
                      </p>
                    </div>
                    {showGameCentreCard && (
                      <div className="rounded-card bg-signal-performance/10 border border-signal-performance/30 p-4 mb-6">
                        <p className="text-sm font-bold text-signal-performance mb-1">
                          {t("all_open_lessons_done_game_centre_heading")}
                        </p>
                        <p className="text-sm text-primary-300 leading-relaxed mb-3">
                          {t("all_open_lessons_done_game_centre")}
                        </p>
                        <Link
                          href="/games"
                          onClick={dismissAllOpenLessonsDoneModal}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-signal-performance text-primary-900 hover:brightness-110 transition-all"
                        >
                          {t("all_open_lessons_done_game_centre_cta")}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    )}
                  </>
                );
              })()}
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={dismissAllOpenLessonsDoneModal}
                className="w-full"
              >
                {t("all_open_lessons_done_cta")}
              </Button>
            </div>
          </div>
        )}
      </main>

      {/* Single styled-jsx block — Next.js only permits one <style jsx>
          tree per component render. Keyframes drive the "next-attention"
          wiggle on the next-up pillar chip and the "fl-first-lesson-pulse"
          on the first available lesson card. */}
      <style jsx global>{`
        @keyframes fl-first-lesson-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(163, 230, 53, 0.45);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(163, 230, 53, 0);
          }
        }
        .fl-first-lesson-pulse {
          animation: fl-first-lesson-pulse 2s ease-out infinite;
        }
        @keyframes onb-arrow-nudge {
          0%,
          100% {
            transform: translateX(0);
          }
          50% {
            transform: translateX(6px);
          }
        }
        .onb-arrow-nudge {
          animation: onb-arrow-nudge 1.4s ease-in-out infinite;
        }
        @keyframes next-attention {
          0%,
          18%,
          30%,
          100% {
            transform: translateX(0) rotate(0);
          }
          20% {
            transform: translateX(-2px) rotate(-0.4deg);
          }
          22% {
            transform: translateX(2px) rotate(0.4deg);
          }
          24% {
            transform: translateX(-2px) rotate(-0.4deg);
          }
          26% {
            transform: translateX(2px) rotate(0.4deg);
          }
        }
        .next-attention {
          animation: next-attention 3.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

/* ─── LessonCard ──────────────────────────────────────────────── */

/* ─── UnitCard ────────────────────────────────────────────────
   A rectangular Unit tile — small cover image, name, progress, and
   a lime border when active. Used inside the 4-Unit grid on the
   current Level's row. Three visual states:
     active     — accent-400 border (this is the Unit the player is
                  currently viewing the lessons for)
     complete   — subtle accent-400 ring + CheckCircle top-right
     idle       — neutral slate ring, unit not yet selected

   Independent of LessonCard because Units are top-level containers
   with different information density — cover image bleeds to the
   edge, progress bar sits at the bottom, name is the hero. */
function UnitCard({
  pillar,
  Icon,
  isActive,
  isComplete,
  isNextUp,
  onSelect,
  lang,
}) {
  const name = pillar.display_name || pillar.name;
  const pct = pillar.progress || 0;
  return (
    <button
      type="button"
      onClick={onSelect}
      data-pillar-name={pillar.name}
      className={[
        "group relative overflow-hidden rounded-card border-2 text-left transition-all",
        // Fill stays the panel neutral so the border does the
        // heavy lifting for state.
        "bg-primary-panel",
        // State ring — active > complete > idle. Active wins so a
        // completed Unit the player re-visits still shows the
        // "you're viewing this" signal.
        isActive
          ? "border-accent-400"
          : isComplete
            ? "border-accent-400/40 hover:border-accent-400/60"
            : "border-primary-700 hover:border-primary-500",
        // A gentle horizontal wiggle for the next-up unit — matches
        // the same animation used on the end-of-unit CTA arrow.
        isNextUp ? "next-attention" : "",
      ].join(" ")}
    >
      {/* Cover image band — bleeds to the top edge. Falls back to a
          slate placeholder with just the Unit icon when no image is
          set, so the card silhouette stays consistent across Units. */}
      <div className="relative h-20 sm:h-24 bg-primary-800 overflow-hidden">
        {pillar.image_url ? (
          <>
            <Image
              src={pillar.image_url}
              alt=""
              fill
              sizes="(max-width: 1024px) 50vw, 25vw"
              className="object-cover"
              onError={(e) => {
                e.target.style.display = "none";
              }}
            />
            {/* Bottom fade so the title area below reads even over
                bright/high-contrast cover images. */}
            <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-primary-panel to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {Icon && (
              <Icon
                className="w-7 h-7 text-primary-500"
                strokeWidth={1.5}
              />
            )}
          </div>
        )}
        {/* Complete indicator — sits over the image top-right. */}
        {isComplete && (
          <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-accent-400 text-primary-900 inline-flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5" strokeWidth={2.5} />
          </span>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-display font-bold text-primary-50 text-sm leading-tight line-clamp-2">
          {name}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1 rounded-full bg-primary-800 overflow-hidden">
            <div
              className={`h-full transition-all ${isComplete ? "bg-accent-400" : "bg-primary-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] tabular-nums font-semibold text-primary-400">
            {pct}%
          </span>
        </div>
        {lang === "pt" && isActive && (
          <p className="mt-1.5 text-[10px] uppercase tracking-label text-accent-400 font-semibold">
            Selecionada
          </p>
        )}
        {lang !== "pt" && isActive && (
          <p className="mt-1.5 text-[10px] uppercase tracking-label text-accent-400 font-semibold">
            Selected
          </p>
        )}
      </div>
    </button>
  );
}

// Grid-friendly lesson card. Renders one of five visual states
// driven by `status`:
//   completed         — muted with a check tick, still clickable
//   current           — accent-400 border + Play cta (the "next up")
//   locked            — dimmed, not clickable
//   construction      — dashed border-signal-performance, opens modal
//   edition_paywall   — nudges to /pricing with a Sparkles chip
function LessonCard({
  lesson,
  status,
  highlight,
  userLanguage,
  onConstruction,
  profile,
  t,
}) {
  const isClickable =
    status !== "locked" &&
    status !== "construction" &&
    status !== "edition_paywall";

  const statusStyle =
    {
      completed:
        "border-primary-700 bg-primary-panel hover:border-accent-400/40",
      current: "border-accent-400/50 bg-primary-panel hover:border-accent-400",
      locked: "border-primary-700 bg-primary-panel/50 opacity-60",
      construction:
        "border-signal-performance/40 border-dashed bg-primary-panel",
      edition_paywall:
        "border-signal-performance/40 border-dashed bg-primary-panel",
    }[status] || "border-primary-700 bg-primary-panel";

  const inner = (
    <>
      {lesson.image_url && (
        <div className="relative -mx-4 -mt-4 mb-3 h-28 sm:h-32 overflow-hidden rounded-t-card bg-primary-800">
          <Image
            src={lesson.image_url}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          {/* Bottom gradient wash so the title chip legibility stays
              solid over bright cover images. */}
          <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-primary-panel to-transparent" />
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="font-display font-semibold text-primary-50 text-sm leading-tight">
          {lesson.title}
        </h4>
        <StatusPill status={status} />
      </div>

      {(lesson.description_pt || lesson.description) && (
        <p className="text-xs text-primary-400 leading-relaxed line-clamp-2 mb-2">
          {userLanguage === "pt"
            ? lesson.description_pt || lesson.description
            : lesson.description || lesson.description_pt}
        </p>
      )}

      <div className="flex items-center flex-wrap gap-1.5 mt-auto pt-1">
        {lesson.level_name && (
          <Chip size="sm" signal={levelSignal(lesson.level_name)}>
            {lesson.level_name}
          </Chip>
        )}
        <span className="text-[11px] text-primary-400 tabular-nums">
          {lesson.xp_reward || 0} XP
        </span>
        {lesson.estimated_duration && (
          <span className="text-[11px] text-primary-500 tabular-nums">
            · {lesson.estimated_duration} min
          </span>
        )}
      </div>

      {status === "locked" && (
        <p className="text-[11px] text-primary-500 mt-2">
          {t("complete_prev_to_unlock")}
        </p>
      )}
      {status === "construction" && (
        <p className="text-[11px] text-signal-performance mt-2">
          {t("lesson_under_construction")}
        </p>
      )}
      {status === "edition_paywall" && (
        <div className="mt-3">
          <Link
            href={`/pricing?edition=${encodeURIComponent(profile?.edition || "wc2026")}`}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-signal-performance/15 hover:bg-signal-performance/25 border border-signal-performance/40 hover:border-signal-performance/70 text-signal-performance text-[10px] font-bold uppercase tracking-label transition-colors"
            aria-label="Get the full edition to unlock"
          >
            <Sparkles className="w-3 h-3" />
            {userLanguage === "pt" ? "Edição completa" : "Full edition"}
          </Link>
        </div>
      )}
    </>
  );

  const baseClass = `flex flex-col h-full p-4 rounded-card border transition-all ${statusStyle} ${
    highlight ? "fl-first-lesson-pulse" : ""
  }`;

  if (isClickable) {
    return (
      <Link
        href={`/lesson/${lesson.id}`}
        className={`${baseClass} hover:brightness-105`}
      >
        {inner}
      </Link>
    );
  }
  if (status === "construction") {
    return (
      <button
        type="button"
        onClick={onConstruction}
        className={`${baseClass} text-left`}
      >
        {inner}
      </button>
    );
  }
  return <div className={baseClass}>{inner}</div>;
}

function StatusPill({ status }) {
  const meta = {
    completed: {
      Icon: CheckCircle,
      className: "bg-accent-400/15 text-accent-400 border-accent-400/30",
      label: "Done",
    },
    current: {
      Icon: Play,
      className: "bg-accent-400 text-primary-900 border-transparent",
      label: "Next",
    },
    locked: {
      Icon: Lock,
      className: "bg-primary-800 text-primary-500 border-primary-700",
      label: "Locked",
    },
    construction: {
      Icon: Construction,
      className:
        "bg-signal-performance/10 text-signal-performance border-signal-performance/30",
      label: "Soon",
    },
    edition_paywall: {
      Icon: Sparkles,
      className:
        "bg-signal-performance/10 text-signal-performance border-signal-performance/30",
      label: "Full",
    },
  }[status] || {
    Icon: Play,
    className: "bg-primary-800 text-primary-300 border-primary-700",
    label: "",
  };
  const { Icon, className, label } = meta;
  return (
    <span
      className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-label ${className}`}
    >
      <Icon className="w-3 h-3" />
      {label && <span>{label}</span>}
    </span>
  );
}

// Map lesson.level_name → DS signal for the level Chip. "Survival"
// is entry-level (sky), "Precision" is mid (violet), "Fluency" is
// advanced (orange). Falls back to no-signal (default slate).
function levelSignal(name) {
  if (!name) return undefined;
  const n = name.toLowerCase();
  if (n.includes("survival")) return "english";
  if (n.includes("precision")) return "mental";
  if (n.includes("fluency")) return "performance";
  return undefined;
}

function StatIcon({ Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" />
      <span>{children}</span>
    </span>
  );
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US");
  return String(n);
}

export default function PlayerDashboard() {
  return (
    <ProtectedRoute>
      {/* useSearchParams (used inside PlayerLessonsMenu for ?completed=…)
          needs a Suspense boundary for Next.js static rendering. */}
      <Suspense fallback={null}>
        <PlayerLessonsMenu />
      </Suspense>
    </ProtectedRoute>
  );
}

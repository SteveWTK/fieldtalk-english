/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/(site)/lesson/page.js
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
} from "lucide-react";
import AnimatedProgressBar from "@/components/AnimatedProgressBar";
// import AnimatedCounter from "@/components/AnimatedCounter";
import XPGainAnimation from "@/components/XPGainAnimation";
// import MatchCountdown from "@/components/MatchCountdown";
import { usePlayerDashboard } from "@/lib/hooks/usePlayerData";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTranslation } from "@/hooks/useTranslation";
import FirstLessonPrompt from "@/components/FirstLessonPrompt";
import PaywallCard from "@/components/PaywallCard";
import { usePlayerAccess } from "@/lib/access/usePlayerAccess";
import WelcomeOnboarding from "@/components/WelcomeOnboarding";
import PackOpeningModal from "@/components/stickers/PackOpeningModal";

function PlayerLessonsMenu() {
  const [selectedPillar, setSelectedPillar] = useState("survival");
  const [showXPGain, setShowXPGain] = useState(false);
  const [showConstructionModal, setShowConstructionModal] = useState(false);
  // Smooth-scroll the newly-expanded Unit card into view when the
  // user picks a different Unit. block: "nearest" means we only
  // scroll if the card isn't already on screen — avoids jolting the
  // page when the user expands a Unit that's already visible.
  useEffect(() => {
    if (!selectedPillar) return;
    if (typeof document === "undefined") return;
    const el = document.querySelector(`[data-pillar-name="${selectedPillar}"]`);
    if (!el) return;
    // Defer one frame so the expanded content has mounted; otherwise
    // we'd scroll to the card's pre-expansion height and stop short.
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

  // First-visit WC2026 welcome flow. Only mounts when:
  //   - data has loaded
  //   - user is signed in to a wc2026 player row
  //   - players.onboarding_completed is not yet true
  // Dismissing the modal POSTs /api/onboarding/complete which flips
  // the flag. Admins can re-arm any user by setting the column back
  // to false in the Supabase table editor.
  const [showWelcome, setShowWelcome] = useState(false);
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
    if (profile.edition !== "wc2026") return;
    if (profile.onboarding_completed === true) return;
    if (onboardingDismissed) return;
    setShowWelcome(true);
  }, [loading, user, profile, onboardingDismissed]);

  const handleWelcomeClose = (nextAction) => {
    setShowWelcome(false);
    setOnboardingDismissed(true);
    // Marker the dashboard tour reads to defer itself for the few
    // minutes immediately after the welcome flow ends. Set on every
    // close (open_pack OR skip) so users who skip without opening
    // the pack aren't ambushed by the dashboard tour either.
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
    // Refresh dashboard data so the pack vault count + collection
    // reflect what was just opened. We're already on /lesson, so the
    // FirstLessonPrompt naturally surfaces Unit 1 Lesson 1.
    refetchProgress?.();
  };
  const previewLessonSet = useMemo(
    () => new Set(access.previewLessonIds || []),
    [access.previewLessonIds]
  );
  const showInlinePaywall = !!user && !access.loading && !access.hasAccess;

  // Show the "Start here" prompt only when:
  //   - data has loaded
  //   - the user is signed in
  //   - they have no completed lessons yet
  // The component itself also respects a localStorage dismissal flag, so
  // setting this to true won't force the prompt to re-appear after it was
  // already dismissed in a prior session.
  useEffect(() => {
    if (loading || !user) return;
    setShowStartPrompt((completions?.length || 0) === 0);
  }, [loading, user, completions]);

  // When we land here from a finished lesson with `?completed=<id>`,
  // figure out which pillar to show and which lesson card to highlight:
  //   - Same pillar if there's a next lesson after the completed one.
  //   - Otherwise the next pillar (by sort_order), with its first lesson.
  useEffect(() => {
    if (loading || !user) return;
    if (!completedParam) return;
    if (!pillars || pillars.length === 0) return;
    // Only auto-apply once per unique completedParam value. Without this
    // guard, a parent-render-induced new `pillars` reference would re-fire
    // the effect and snap the user back to the auto-selected pillar even
    // after they've clicked a different pillar card.
    if (appliedCompletedRef.current === completedParam) return;

    // Find the pillar that contains the just-completed lesson.
    const sourcePillar = pillars.find((p) =>
      (p.lessons || []).some((l) => l.id === completedParam)
    );
    if (!sourcePillar) return;

    // Sort lessons within the pillar to know the "next" one.
    const lessonsSorted = [...(sourcePillar.lessons || [])].sort(
      (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
    );
    const idx = lessonsSorted.findIndex((l) => l.id === completedParam);
    const nextInPillar = idx >= 0 ? lessonsSorted[idx + 1] : null;

    if (nextInPillar) {
      // Stay on this pillar; highlight the next lesson. (The lesson
      // page now skips this case in the streamlined flow — it routes
      // straight to the next lesson — but we keep it for direct URL
      // navigation and admin debug.)
      setSelectedPillar(sourcePillar.name);
      setHighlightLessonId(nextInPillar.id);
      setEndOfUnitJump(null);
    } else {
      // Last lesson of the pillar — find the next pillar by sort_order.
      const pillarsSorted = [...pillars].sort(
        (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
      );
      const pIdx = pillarsSorted.findIndex((p) => p.name === sourcePillar.name);
      const nextPillar = pIdx >= 0 ? pillarsSorted[pIdx + 1] : null;

      if (nextPillar) {
        const firstNextLesson = [...(nextPillar.lessons || [])].sort(
          (a, b) => (a.sort_order || 0) - (b.sort_order || 0)
        )[0];
        setSelectedPillar(nextPillar.name);
        setHighlightLessonId(firstNextLesson?.id || null);
        // Stash the next-unit info for the hero CTA + card highlight.
        // unitPillarName is the lookup key for highlighting the matching
        // unit card; unitName is the human-facing display string.
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
        // No further pillars — they've finished everything.
        setSelectedPillar(sourcePillar.name);
        setHighlightLessonId(null);
        setEndOfUnitJump(null);
      }
    }

    // Mark this completedParam as applied so we don't re-run for it…
    appliedCompletedRef.current = completedParam;
    // …and strip it from the URL so a refresh doesn't restart the effect
    // and the user's current selection persists naturally.
    router.replace("/lesson", { scroll: false });
  }, [loading, user, completedParam, pillars, router]);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
            ))}
          </div>
          <div className="bg-gray-200 h-64 rounded-xl mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-gray-200 h-96 rounded-xl"></div>
            <div className="bg-gray-200 h-96 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // If no user, show error
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary-900 dark:text-white mb-4">
            Please sign in to view your Lesson Menu
          </h2>
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
    club: profile?.club?.name || "FieldTalk English",
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

    // Edition paywall — applies AFTER the preview lesson. The first
    // lesson per pillar is in previewLessonSet, so it never reaches
    // here. Unlocking a paid edition flips access.hasAccess to true
    // and this branch never trips.
    const isPreview = previewLessonSet.has(lesson.id);
    if (!access.loading && !access.hasAccess && !isPreview) {
      return "edition_paywall";
    }

    // First lesson is always available
    if (lessonIndex === 0) {
      return "current";
    }

    // Check if all previous lessons in this pillar are completed
    const previousLessons = pillarLessons.slice(0, lessonIndex);
    const allPreviousCompleted = previousLessons.every((prevLesson) =>
      completions?.some((c) => c.lesson_id === prevLesson.id)
    );

    if (allPreviousCompleted) {
      return "current";
    }

    return "locked";
  };

  const recentAchievements = achievements?.slice(0, 3) || [
    {
      achievement: {
        name: "Welcome to FieldTalk",
        description: "Started your English learning journey",
        icon: "Star",
      },
      earned_at: "Today",
    },
  ];

  // const upcomingMatches = [
  //   { opponent: "Brighton", date: "Dec 28", type: "Premier League" },
  //   { opponent: "Arsenal", date: "Jan 2", type: "Premier League" },
  //   { opponent: "Man City", date: "Jan 15", type: "FA Cup" },
  // ];

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "current":
        return <Play className="w-5 h-5 text-blue-500" />;
      case "locked":
        return <Lock className="w-5 h-5 text-gray-400" />;
      case "edition_paywall":
        // Sparkles in gold/amber distinguishes "Full edition content"
        // from sequence-locked content (grey Lock). Two different
        // shapes (sparkles vs lock) read at a glance — users can tell
        // "I need to unlock this with progress" from "I need to
        // purchase the edition" without looking twice.
        return <Sparkles className="w-5 h-5 text-amber-300" />;
      case "construction":
        return <Construction className="w-5 h-5 text-white" />;
      default:
        return null;
    }
  };

  const getDifficultyColor = (level_name) => {
    switch (level_name) {
      case "Survival":
        return "bg-attention-100 text-attention-800";
      case "Survival Absolute":
        return "bg-accent-100 text-accent-800";
      case "Precision":
        return "bg-attention-100 text-attention-800";
      case "Fluency":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-primary-100 text-primary-800";
    }
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

  // Render the lesson list for a given pillar. Pulled out into a
  // helper so the accordion above can call it per-pillar without
  // duplicating ~120 lines of JSX. Reads the same component-scope
  // refs (status helpers, showStartPrompt, profile, etc.) as the
  // old inline block did.
  const renderPillarLessons = (pillar) => {
    const lessons = pillar?.lessons || [];
    return (
      <>
        {/* Inline paywall — sits above the cards when the user is
            signed in but hasn't unlocked the edition. */}
        {/* {showInlinePaywall && (
          <PaywallCard
            edition={profile?.edition || "wc2026"}
            variant="inline"
          />
        )} */}

        {/* "Start here" prompt — only shows on the first pillar's
            first lesson, by virtue of FirstLessonPrompt's own
            shouldShow gate + showStartPrompt being computed against
            the overall completions count, not per-pillar. */}
        {selectedPillar === pillar.name && (
          <FirstLessonPrompt
            shouldShow={showStartPrompt}
            onDismiss={() => setShowStartPrompt(false)}
          />
        )}

        {lessons.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No lessons available for this pillar yet.
            </p>
          </div>
        ) : (
          lessons.map((lesson, lessonIndex) => {
            const status = getLessonStatus(lesson);
            const isClickable =
              status !== "locked" &&
              status !== "construction" &&
              status !== "edition_paywall";
            const highlight =
              (showStartPrompt &&
                lessonIndex === 0 &&
                selectedPillar === pillar.name) ||
              (highlightLessonId && lesson.id === highlightLessonId);

            return (
              <div
                key={lesson.id}
                className={`p-4 rounded-lg border hover:scale-[1.01] transition-all duration-200 ${
                  status === "current"
                    ? "border-growth-500 bg-growth-50 dark:bg-growth-900/20"
                    : status === "completed"
                      ? "border-accent-200 bg-accent-50/50 dark:bg-accent-900/20"
                      : status === "construction"
                        ? "border-primary-200 bg-primary-50/50 dark:bg-primary-900/20 opacity-75"
                        : "border-primary-200 dark:border-primary-700"
                } ${highlight ? "fl-first-lesson-pulse next-attention" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-grow">
                    {getStatusIcon(status)}
                    <div className="flex-grow">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {lesson.title}
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        {lesson.description_pt}
                      </p>
                      <div className="flex items-center space-x-2 mt-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(lesson.difficulty)}`}
                        >
                          {lesson.level_name}
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {lesson.xp_reward} XP
                        </span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          {lesson.estimated_duration} min
                        </span>
                      </div>
                    </div>
                  </div>
                  {lesson.image_url && (
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 ml-3 shrink-0">
                      <Image
                        src={lesson.image_url}
                        alt=""
                        fill
                        sizes="(max-width: 640px) 64px, 80px"
                        className="object-cover"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    </div>
                  )}
                  {isClickable ? (
                    <Link
                      href={`/lesson/${lesson.id}`}
                      className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors ml-4"
                    >
                      {status === "completed" ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <ChevronRight className="w-5 h-5" />
                      )}
                    </Link>
                  ) : status === "construction" ? (
                    <button
                      onClick={() => setShowConstructionModal(true)}
                      className="p-2 text-white hover:bg-accent-100 dark:hover:bg-accent-900/20 rounded-lg transition-colors ml-4"
                    >
                      <Construction className="w-5 h-5" />
                    </button>
                  ) : status === "edition_paywall" ? (
                    <Link
                      href={`/pricing?edition=${encodeURIComponent(profile?.edition || "wc2026")}`}
                      className="ml-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-300/15 hover:bg-amber-300/25 border border-amber-300/40 hover:border-amber-300/70 text-amber-200 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap"
                      aria-label="Get the full edition to unlock"
                    >
                      <Sparkles className="w-3 h-3" />
                      {userLanguage === "pt"
                        ? "Edição completa"
                        : "Full edition"}
                    </Link>
                  ) : (
                    <div className="p-2 text-gray-400 ml-4">
                      <Lock className="w-5 h-5" />
                    </div>
                  )}
                </div>
                {status === "locked" && (
                  <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                    {t("complete_prev_to_unlock")}
                  </div>
                )}
                {status === "construction" && (
                  <div className="mt-3 text-xs text-white dark:text-white">
                    {t("lesson_under_construction")}
                  </div>
                )}
              </div>
            );
          })
        )}
      </>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* First-visit WC2026 welcome — fullscreen overlay, mounts
          before any other content so the user lands directly in the
          intro flow. When the user finishes the flow, they can
          either "Open my first pack" (→ PackOpeningModal below) or
          dismiss; either way the modal closes and the lesson list
          becomes visible. */}
      {showWelcome && (
        <WelcomeOnboarding userId={user?.id} onClose={handleWelcomeClose} />
      )}

      {/* Starter sticker pack — opens the moment the WelcomeOnboarding
          completes with the "open_pack" action. On close, the user
          stays on /lesson where Unit 1 Lesson 1 is already highlighted
          by FirstLessonPrompt. */}
      {showStarterPack && (
        <PackOpeningModal
          open={showStarterPack}
          onClose={handleStarterPackClose}
        />
      )}
      {/* <h1 className="text-2xl font-bold text-primary-900 dark:text-white">
        World Cup 2026 Edition
      </h1> */}
      {/* Welcome Message */}
      {/* <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-900 dark:text-white">
          {isGuest
            ? t("welcome_to_fieldtalk")
            : `${t("welcome_back")} ${playerData.name}!`}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Continue your English learning journey
        </p>
      </div> */}

      {/* End-of-unit hero CTA — sits ABOVE the unit cards so it's
          the first thing a user sees after completing the final
          lesson of a unit. Points them at the highlighted next-unit
          card (which carries an emerald glow). Clicking that card
          uses the existing #lessons anchor jump, so the page
          smoothly scrolls down to reveal the next unit's lesson
          list with its first lesson already highlighted. */}
      {endOfUnitJump && (
        <div className="mb-6 sm:mb-8 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/10 to-amber-300/10 border border-emerald-400/50 px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-11 h-11 rounded-full bg-emerald-500/30 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-200" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wider text-emerald-200 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  {userLanguage === "pt"
                    ? "Unidade concluída!"
                    : "Unit complete!"}
                </p>
                <p className="text-sm sm:text-base font-bold text-white">
                  {userLanguage === "pt"
                    ? `Toque em ${endOfUnitJump.unitName} para começar a próxima unidade`
                    : `Tap ${endOfUnitJump.unitName} to start the next unit`}
                </p>
              </div>
            </div>
            <ArrowRight
              className="w-5 h-5 text-emerald-300 shrink-0 onb-arrow-nudge"
              aria-hidden
            />
          </div>
          {/* Animations declared in the single styled-jsx block at
              the bottom of this component — Next.js only allows one
              <style jsx> tree per render. */}
        </div>
      )}

      {/* Units — accordion layout. Each Unit is a full-width card
          that expands inline to reveal its lessons when tapped. This
          replaces the previous "grid of unit cards above + lesson
          list below" layout, which scaled poorly past ~6 units (user
          had to scroll up-down-up to compare units and find lessons).
          Single-expanded with collapse: clicking a different unit
          collapses the previous and expands the new one. Clicking
          the currently-expanded unit collapses it — matches the
          chevron-rotates-down affordance that everyone tries
          instinctively. Smooth-scrolls the newly-expanded card into view.
          Width capped at max-w-3xl (768px) and centred: on mobile
          the cards fill the screen (correct); on tablet they hit
          the natural iPad-portrait width; on laptop/desktop they
          stay at the comfortable reading column with whitespace on
          either side. Same pattern Duolingo / Brilliant / Khan
          Academy use — prevents the unnatural card-stretching that
          a 1280px-wide accordion would produce on a 27" monitor. */}
      <div className="space-y-4 mb-8 max-w-2xl mx-auto" data-pillars-container>
        {pillars.map((pillar, index) => {
          const IconComponent = getIconComponent(pillar.icon);
          const isExpanded = selectedPillar === pillar.name;
          const isStartNextUnit = endOfUnitJump?.unitPillarName === pillar.name;
          return (
            <div
              key={pillar.name}
              data-pillar-name={pillar.name}
              className={`rounded-xl border-2 transition-all duration-200 overflow-hidden bg-white dark:bg-primary-800 ${
                isStartNextUnit
                  ? "border-emerald-400 shadow-[0_0_24px_rgba(16,185,129,0.25)] start-next-unit-pulse next-attention"
                  : isExpanded
                    ? "border-accent-500"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              {/* Header — banner image + title + progress. The whole
                  area is clickable. Clicking the open unit collapses
                  it (selectedPillar → null); clicking a closed unit
                  expands it and collapses any other open one. The
                  rest of the app handles a null selectedPillar
                  cleanly: the completion-jump effect always sets a
                  named pillar, and the currentPillar fallback uses
                  pillars[0] for any non-render consumers. */}
              <button
                type="button"
                onClick={() =>
                  setSelectedPillar(isExpanded ? null : pillar.name)
                }
                className="block w-full text-left p-6"
              >
                {pillar.image_url ? (
                  <div className="relative -mx-6 -mt-6 mb-4 h-32 overflow-hidden rounded-t-xl bg-gray-100 dark:bg-gray-800">
                    <Image
                      src={pillar.image_url}
                      alt={pillar.display_name || ""}
                      fill
                      sizes="(max-width: 640px) 100vw, 100vw"
                      className="object-cover"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-gradient-to-r from-accent-600 to-accent-400 rounded-lg flex items-center justify-center mb-4">
                    <IconComponent className="w-6 h-6 text-white" />
                  </div>
                )}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                      {pillar.display_name}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      {pillar.description_pt}
                    </p>
                  </div>
                  {/* Chevron indicator — rotates to point down when
                      the card is expanded. Visual cue that the card
                      can open. */}
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 shrink-0 mt-1 transition-transform duration-200 ${
                      isExpanded ? "rotate-90" : ""
                    }`}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {pillar.progress}%
                  </span>
                </div>
                <div className="mt-2">
                  <AnimatedProgressBar
                    value={pillar.progress}
                    maxValue={100}
                    color="bg-gradient-to-r from-accent-600 to-accent-400"
                    showPercentage={false}
                    animationDelay={index * 200 + 500}
                  />
                </div>
              </button>

              {/* Expanded lessons — only mounted for the open Unit so
                  closed Units stay light in the DOM. */}
              {isExpanded && (
                <div className="px-4 sm:px-6 pb-6 border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                  {renderPillarLessons(pillar)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* The lessons grid that used to sit below the Units (with an
          empty sidebar column) is gone — lessons now render inline
          inside each expanded Unit card above. The empty sidebar
          slot (commented-out "Recent Achievements" / "Quick
          Practice") was removed entirely; if either gets reinstated
          later it can live in its own section. */}

      {/* XP Gain Animation */}
      <XPGainAnimation
        xp={50}
        show={showXPGain}
        onComplete={() => setShowXPGain(false)}
      />

      {/* Under Construction Modal */}
      {showConstructionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 dark:bg-attention-900/20 rounded-full flex items-center justify-center">
                <Construction className="w-8 h-8 text-primary-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-3">
              {t("lesson_under_construction")}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              {t("lesson_under_construction_msg")}
            </p>
            <button
              onClick={() => setShowConstructionModal(false)}
              className="w-full bg-accent-500 hover:bg-accent-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {t("ok")}
            </button>
          </div>
        </div>
      )}

      {/* Single styled-jsx block for the whole page — Next.js only
          permits one <style jsx> tree per component render, so the
          end-of-unit CTA's keyframes live here alongside the
          Start-here pulse rather than inline. */}
      <style jsx global>{`
        @keyframes fl-first-lesson-pulse {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
          }
        }
        .fl-first-lesson-pulse {
          animation: fl-first-lesson-pulse 2s ease-out infinite;
          border-color: rgb(16 185 129) !important;
        }

        /* End-of-unit CTA: nudging arrow + pulsing glow on the
           highlighted next-unit card. */
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
        @keyframes start-next-unit-pulse {
          0%,
          100% {
            box-shadow: 0 0 24px rgba(16, 185, 129, 0.25);
          }
          50% {
            box-shadow: 0 0 36px rgba(16, 185, 129, 0.45);
          }
        }
        .start-next-unit-pulse {
          animation: start-next-unit-pulse 2.2s ease-in-out infinite;
        }

        /* Gentle attention wiggle — same vocabulary as the vocab
           cards (translate ±2px + rotate ±0.4deg) but on a slightly
           longer cycle so the highlighted next-unit and next-lesson
           cards read as "ready when you are" rather than "alert". */
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
        /* When a card carries both the pulse + the wiggle, compose
           the animations so neither cancels the other. */
        .start-next-unit-pulse.next-attention {
          animation:
            start-next-unit-pulse 2.2s ease-in-out infinite,
            next-attention 3.6s ease-in-out infinite;
        }
        .fl-first-lesson-pulse.next-attention {
          animation:
            fl-first-lesson-pulse 2s ease-out infinite,
            next-attention 3.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
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

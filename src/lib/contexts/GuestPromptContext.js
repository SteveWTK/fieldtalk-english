"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";

const GuestPromptContext = createContext(null);

// Session storage keys for tracking dismissed prompts
const STORAGE_KEYS = {
  floatingButtonDismissed: "guest_floating_dismissed",
  coachTipShown: "guest_coach_tip_shown",
  hatTrickShown: "guest_hattrick_shown",
  exitIntentShown: "guest_exit_shown",
  timeWarning30Dismissed: "guest_time_30_dismissed",
  timeWarning10Dismissed: "guest_time_10_dismissed",
};

export function GuestPromptProvider({ children }) {
  const { user } = useAuth();

  // Guest status - check if email ends with @fieldtalk.guest or user_metadata.is_guest
  const isGuest = user?.email?.endsWith("@fieldtalk.guest") || user?.user_metadata?.is_guest || false;

  // Stats from API
  const [stats, setStats] = useState({
    lessons: 0,
    xp: 0,
    level: 1,
  });
  // Setter is intentionally unused since we stopped calling the
  // legacy /status endpoint (which was the only source of expiry
  // data). TimeWarningBanner stays wired through the context so a
  // future "guests with expiry" flow can set this again without
  // touching the context shape.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [guestExpiresAt, setGuestExpiresAt] = useState(null);
  const [loading, setLoading] = useState(true);

  // Prompt visibility state (persisted in sessionStorage)
  const [promptState, setPromptState] = useState({
    floatingButtonDismissed: false,
    coachTipShown: false,
    hatTrickShown: false,
    exitIntentShown: false,
    timeWarning30Dismissed: false,
    timeWarning10Dismissed: false,
  });

  // Load persisted state from sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadedState = {};
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      loadedState[key] = sessionStorage.getItem(storageKey) === "true";
    });
    setPromptState(loadedState);
  }, []);

  // Fetch guest stats from the Supabase-SSR-based /stats endpoint —
  // works for both /o-campo try-flow guests and QR-flow guests.
  //
  // The legacy /status endpoint (used only for expiry banners) is
  // deliberately NOT called here anymore — it 401's for every
  // Supabase-authed guest since it uses NextAuth, which spammed the
  // console. QR-flow guests lose the time-warning banner for now;
  // low-priority since we rarely create expiring guests.
  const fetchGuestData = useCallback(async () => {
    if (!isGuest || !user) {
      setLoading(false);
      return;
    }

    try {
      const statsRes = await fetch("/api/guest-access/stats", {
        credentials: "include",
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.stats) {
          setStats({
            lessons: statsData.stats.lessons || 0,
            xp: statsData.stats.xp || 0,
            level: statsData.stats.level || 1,
          });
        }
      }
    } catch (err) {
      console.error("Error fetching guest data:", err);
    } finally {
      setLoading(false);
    }
  }, [isGuest, user]);

  // Initial fetch + fast polling for guests. A short 5s interval
  // keeps the floating "Garanta seu XP" button appearing within a
  // few seconds of Lesson 1 completion, instead of up to 30s later
  // (by which time the auto-advance has already dropped them into
  // Lesson 2 and the CTA moment is gone).
  //
  // Also listens for a 'guest-lesson-completed' window event — the
  // lesson player can fire this right after a successful completion
  // to pull a fresh stats read without waiting for the next poll
  // tick. Non-breaking: if the lesson player doesn't dispatch it,
  // polling still catches the state within 5s.
  useEffect(() => {
    fetchGuestData();

    if (!isGuest) return;

    const pollInterval = setInterval(() => {
      fetchGuestData();
    }, 5000);

    function handleCompleted() {
      fetchGuestData();
    }
    if (typeof window !== "undefined") {
      window.addEventListener("guest-lesson-completed", handleCompleted);
    }

    return () => {
      clearInterval(pollInterval);
      if (typeof window !== "undefined") {
        window.removeEventListener("guest-lesson-completed", handleCompleted);
      }
    };
  }, [fetchGuestData, isGuest]);

  // Update a prompt state and persist to sessionStorage
  const updatePromptState = useCallback((key, value) => {
    setPromptState(prev => ({ ...prev, [key]: value }));
    if (typeof window !== "undefined" && STORAGE_KEYS[key]) {
      sessionStorage.setItem(STORAGE_KEYS[key], String(value));
    }
  }, []);

  // Calculate time remaining until guest session expires
  const getTimeRemaining = useCallback(() => {
    if (!guestExpiresAt) return null;
    const expiresAtMs = new Date(guestExpiresAt).getTime();
    const remaining = expiresAtMs - Date.now();
    return remaining > 0 ? remaining : 0;
  }, [guestExpiresAt]);

  // Check if enough lessons completed for each CTA
  const shouldShowFloatingButton = isGuest && stats.lessons >= 1 && !promptState.floatingButtonDismissed;
  const shouldShowCoachTip = isGuest && stats.lessons >= 2 && !promptState.coachTipShown;
  const shouldShowHatTrick = isGuest && stats.lessons >= 3 && !promptState.hatTrickShown;

  // Time-based warnings (30 min = 1800000ms, 10 min = 600000ms)
  const timeRemaining = getTimeRemaining();
  const shouldShowTimeWarning30 = isGuest && timeRemaining !== null && timeRemaining <= 1800000 && timeRemaining > 600000 && !promptState.timeWarning30Dismissed;
  const shouldShowTimeWarning10 = isGuest && timeRemaining !== null && timeRemaining <= 600000 && timeRemaining > 0 && !promptState.timeWarning10Dismissed;

  const value = {
    // State
    isGuest,
    guestExpiresAt,
    stats,
    loading,
    promptState,

    // Visibility checks
    shouldShowFloatingButton,
    shouldShowCoachTip,
    shouldShowHatTrick,
    shouldShowTimeWarning30,
    shouldShowTimeWarning10,

    // Actions
    updatePromptState,
    refreshStats: fetchGuestData,
    getTimeRemaining,
  };

  return (
    <GuestPromptContext.Provider value={value}>
      {children}
    </GuestPromptContext.Provider>
  );
}

export function useGuestPrompts() {
  const context = useContext(GuestPromptContext);
  if (!context) {
    throw new Error("useGuestPrompts must be used within a GuestPromptProvider");
  }
  return context;
}

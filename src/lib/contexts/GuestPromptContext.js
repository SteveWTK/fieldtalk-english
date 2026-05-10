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

  // Fetch guest stats
  const fetchGuestData = useCallback(async () => {
    if (!isGuest || !user) {
      setLoading(false);
      return;
    }

    try {
      // Fetch stats from guest-access status API
      const statusRes = await fetch("/api/guest-access/status", {
        credentials: "include",
      });
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        if (statusData.stats) {
          setStats({
            lessons: statusData.stats.lessons || 0,
            xp: statusData.stats.xp || 0,
            level: statusData.stats.level || 1,
          });
        }
        if (statusData.expires_at) {
          setGuestExpiresAt(statusData.expires_at);
        }
      }
    } catch (err) {
      console.error("Error fetching guest data:", err);
    } finally {
      setLoading(false);
    }
  }, [isGuest, user]);

  // Initial fetch and periodic polling for guests
  // Poll every 30 seconds to catch lesson completions and update CTAs
  useEffect(() => {
    fetchGuestData();

    if (!isGuest) return;

    const pollInterval = setInterval(() => {
      fetchGuestData();
    }, 30000); // 30 seconds

    return () => clearInterval(pollInterval);
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

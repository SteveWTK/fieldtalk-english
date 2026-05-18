// src/components/ReplayOnboardingButton.js
// Small floating admin tool: wipes the localStorage flags written by
// useOnboardingFlag so the in-step onboarding hints (InteractivePitchFormation,
// DragDropFormation, InteractiveGameFormation) all replay on next load.
//
// Visible only when the signed-in player has user_type === "platform_admin".
// Lives at fixed bottom-right so it doesn't compete with lesson UI.
"use client";

import { useState } from "react";
import { RefreshCcw, Check } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";

const ONBOARDING_PREFIX = "fieldtalk_onboarded_";

export default function ReplayOnboardingButton() {
  const { user } = useAuth();
  const { profile } = usePlayerProfile(user?.id);
  const [justCleared, setJustCleared] = useState(false);

  // Only show this for platform admins. We read from the players table via
  // usePlayerProfile (authoritative source for user_type). While the profile
  // is loading we render nothing.
  if (!user || profile?.user_type !== "platform_admin") return null;

  const handleReplay = () => {
    if (typeof window === "undefined") return;
    try {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(ONBOARDING_PREFIX)) keysToRemove.push(key);
      }
      keysToRemove.forEach((k) => localStorage.removeItem(k));
    } catch {
      // ignore — non-fatal
    }
    setJustCleared(true);
    // Reload after a beat so the user sees the "Cleared" confirmation flash.
    setTimeout(() => window.location.reload(), 350);
  };

  return (
    <button
      type="button"
      onClick={handleReplay}
      aria-label="Replay onboarding hints (admin)"
      title="Replay onboarding hints (admin)"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-blue-800/90 hover:bg-blue-800 text-white text-xs sm:text-sm font-semibold shadow-lg ring-1 ring-white/15 transition-colors"
    >
      {justCleared ? (
        <>
          <Check className="w-4 h-4" />
          Cleared
        </>
      ) : (
        <>
          <RefreshCcw className="w-4 h-4" />
          <span className="hidden sm:inline">Replay onboarding</span>
        </>
      )}
    </button>
  );
}

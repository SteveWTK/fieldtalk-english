// src/lib/hooks/useOnboardingFlag.js
// Tiny SSR-safe localStorage flag for "user has seen this onboarding".
// Returns { seen, markSeen, reset } so each step type can show its hint
// exactly once across sessions.
"use client";

import { useCallback, useState } from "react";

const PREFIX = "fieldtalk_onboarded_";

export function useOnboardingFlag(key) {
  const fullKey = PREFIX + key;

  const [seen, setSeen] = useState(() => {
    if (typeof window === "undefined") return true; // suppress during SSR
    try {
      return localStorage.getItem(fullKey) === "true";
    } catch {
      return false;
    }
  });

  const markSeen = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(fullKey, "true");
      } catch {
        // ignore — non-fatal
      }
    }
    setSeen(true);
  }, [fullKey]);

  // Optional escape hatch — handy in dev or if you want a "show me again"
  // affordance later.
  const reset = useCallback(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(fullKey);
      } catch {
        // ignore
      }
    }
    setSeen(false);
  }, [fullKey]);

  return { seen, markSeen, reset };
}

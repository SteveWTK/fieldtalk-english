// src/lib/hooks/useOnboardingFlag.js
// Tiny SSR-safe localStorage flag for "user has seen this onboarding".
// Returns { seen, markSeen, reset } so each step type can show its hint
// exactly once across sessions.
//
// Options:
//   force — when true, the hook ignores any persisted "seen" flag AND
//           never writes one. markSeen() flips local state only, so the
//           hint dismisses for the current session but reappears on next
//           mount. Used for steps with replay_onboarding: true (e.g. when
//           the same step type appears twice in one lesson and we want
//           the user to be reminded both times).
"use client";

import { useCallback, useState } from "react";

const PREFIX = "fieldtalk_onboarded_";

export function useOnboardingFlag(key, options = {}) {
  const { force = false } = options;
  const fullKey = PREFIX + key;

  const [seen, setSeen] = useState(() => {
    if (force) return false;
    if (typeof window === "undefined") return true; // suppress during SSR
    try {
      return localStorage.getItem(fullKey) === "true";
    } catch {
      return false;
    }
  });

  const markSeen = useCallback(() => {
    if (!force && typeof window !== "undefined") {
      try {
        localStorage.setItem(fullKey, "true");
      } catch {
        // ignore — non-fatal
      }
    }
    setSeen(true);
  }, [fullKey, force]);

  // Optional escape hatch — handy in dev or for the platform-admin
  // "Replay onboarding" button.
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

// src/lib/hooks/useSoundPreference.js
// Tiny hook for a persisted mute preference. Reads from localStorage on mount
// so the user's choice survives page reloads and applies across all components
// that opt into it.
"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "fieldtalk_sound_muted";

export function useSoundPreference() {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "true") setIsMuted(true);
    } catch {
      // ignore — localStorage may be unavailable in some contexts
    }
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      try {
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, String(next));
        }
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return { isMuted, toggleMute };
}

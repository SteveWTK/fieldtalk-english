// src/lib/hooks/useIsWide.js
// Tiny SSR-safe media-query hook. Returns true when the viewport is at least
// `breakpointPx` wide. Used by pitch-based exercise components to switch from
// portrait pitch (mobile) to landscape pitch (laptop/desktop).
"use client";

import { useEffect, useState } from "react";

export function useIsWide(breakpointPx = 1024) {
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia(`(min-width: ${breakpointPx}px)`);
    const update = () => setIsWide(mql.matches);
    update();
    // Modern browsers
    if (mql.addEventListener) {
      mql.addEventListener("change", update);
      return () => mql.removeEventListener("change", update);
    }
    // Safari < 14 fallback
    mql.addListener(update);
    return () => mql.removeListener(update);
  }, [breakpointPx]);

  return isWide;
}

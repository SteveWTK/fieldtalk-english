// src/lib/branches/useCurrentBranchSlug.js
//
// Resolves the current user's partner branch slug from the two
// sources we keep in sync:
//
//   1. `players.partner_referrer` — written at signup, lives in the
//      DB. Source of truth for returning users (different device /
//      cleared cache / etc.).
//   2. `localStorage` (ft.partner_referrer key) — written at the
//      /wc2026 landing page before signup. Source of truth for the
//      pre-profile-loaded window (e.g. the /auth/callback loading
//      splash, which runs before the player row has been fetched).
//
// Returns null if neither source has a slug. Components that render
// partner branding should treat null as "don't render anything".
"use client";

import { useEffect, useState } from "react";
import { readPartnerReferrer } from "@/lib/partners/referrer";

export function useCurrentBranchSlug(profile) {
  // Prefer the DB value when we have it (most authoritative).
  const profileSlug = profile?.partner_referrer || null;

  // Hydrate localStorage on mount so SSR doesn't flash a different
  // value than the client first paints with. Tracked in state so
  // changes (e.g. another tab updates the slug) propagate.
  const [storageSlug, setStorageSlug] = useState(null);
  useEffect(() => {
    setStorageSlug(readPartnerReferrer());
  }, []);

  return profileSlug || storageSlug || null;
}

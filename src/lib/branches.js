// src/lib/branches.js
// Lightweight branch-branding registry. Marketing links carry a ?branch=<key>
// query param so individual Cultura branches (and future partners) can be
// shown their own logo on the WC2026 landing page and /join signup screen.
//
// To add a new branch:
//   1. Drop the logo at public/logos/<filename>.png
//   2. Add an entry below keyed by a short URL-friendly slug
//   3. Share the campaign link as /wc2026?branch=<slug>
//
// Unknown or absent ?branch= falls back to "default" (the traditional lion
// logo). No DB or admin UI needed at this stage.

export const DEFAULT_BRANCH_KEY = "default";

export const BRANCHES = {
  default: {
    logoSrc: "/logos/cultura-inglesa-logo-lion.png",
    alt: "Cultura Inglesa",
  },
  fortaleza: {
    logoSrc: "/logos/cultura-inglesa-logo-arrows.png",
    alt: "Cultura Inglesa Fortaleza",
  },
};

export function getBranch(branchKey) {
  if (!branchKey) return BRANCHES[DEFAULT_BRANCH_KEY];
  const normalized = String(branchKey).toLowerCase().trim();
  return BRANCHES[normalized] || BRANCHES[DEFAULT_BRANCH_KEY];
}

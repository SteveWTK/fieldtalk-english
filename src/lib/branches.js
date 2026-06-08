// src/lib/branches.js
//
// Partner-branch registry. Marketing links carry a ?branch=<slug>
// param so individual Cultura branches (and future partners) can
// be shown their own logo across the app.
//
// Two responsibilities here:
//
//   1. Logo + alt text per branch, used by /wc2026 and /join
//      (driven by the URL param at landing time).
//   2. Per-branch `placements` config — which surfaces SHOW the
//      partner logo for users attributed to that branch. The
//      <PartnerLogo placement="..." /> component reads this map
//      and renders or returns null accordingly.
//
// To add a new branch:
//   1. Drop the logo at public/logos/<filename>.png
//   2. Add an entry below keyed by a short URL-friendly slug
//   3. Share the campaign link as /wc2026?branch=<slug>
//   4. Decide which placements they want the logo on:
//        loading    — splash shown immediately after sign-in
//        dashboard  — alongside the hero strip on /dashboard
//        siteHeader — top header across the (site) layout
//        footer     — site footer next to the copyright
//      Default for new partners: { loading: true } only — turn the
//      others on when the partner explicitly asks.
//
// Unknown / absent ?branch= falls back to "default" (the traditional
// Cultura lion logo). The default branch never shows the partner
// logo on dashboard/header/footer — those surfaces stay clean for
// non-attributed users.

export const DEFAULT_BRANCH_KEY = "default";

const DEFAULT_PLACEMENTS = {
  loading: false,
  dashboard: false,
  siteHeader: false,
  footer: false,
};

export const BRANCHES = {
  default: {
    logoSrc: "/logos/cultura-inglesa-logo-lion.png",
    alt: "Cultura Inglesa",
    // Default branch — non-attributed organic traffic. We DON'T
    // imply a Cultura partnership on these users' surfaces, so the
    // logo only appears on the /wc2026 landing (where it's driven
    // directly by the page, not by placements config).
    placements: { ...DEFAULT_PLACEMENTS },
  },
  fortaleza: {
    logoSrc: "/logos/cultura-inglesa-arrows.png",
    alt: "Cultura Inglesa Fortaleza",
    slug: "fortaleza",
    // First partner — branded loading splash on every sign-in.
    // Flip dashboard / siteHeader / footer to true when Fortaleza
    // (or any branch you copy this from) explicitly asks.
    placements: {
      ...DEFAULT_PLACEMENTS,
      loading: true,
    },
  },
};

export function getBranch(branchKey) {
  if (!branchKey) return BRANCHES[DEFAULT_BRANCH_KEY];
  const normalized = String(branchKey).toLowerCase().trim();
  return BRANCHES[normalized] || BRANCHES[DEFAULT_BRANCH_KEY];
}

/**
 * Returns true when the partner logo for the given branch slug
 * should appear at the given placement. Used by <PartnerLogo /> to
 * decide whether to render anything. Safe for unknown slugs
 * (returns false).
 */
export function isPlacementEnabled(branchKey, placement) {
  if (!branchKey || !placement) return false;
  const normalized = String(branchKey).toLowerCase().trim();
  const branch = BRANCHES[normalized];
  if (!branch || !branch.placements) return false;
  return branch.placements[placement] === true;
}

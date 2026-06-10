// src/lib/branches.js
//
// Partner-branch registry. Marketing links carry a ?branch=<slug>
// param so individual Cultura branches (and future partners) can be
// shown their own logo on the WC2026 landing page, /join signup
// screen, and (optionally) on other surfaces across the app.
//
// To add a new branch:
//   1. Drop the logo at public/logos/<filename>.png
//   2. Add an entry below keyed by a short URL-friendly slug
//   3. Share the campaign link as /wc2026?branch=<slug>
//   4. Decide which placements they want the logo on (see below)
//
// Unknown / absent ?branch= falls back to "default" (the traditional
// Cultura lion logo) — only used on the /wc2026 landing.
//
// ⚠ IMPORTANT — DO NOT REMOVE THESE EXPORTS:
//   - `placements` on each branch (controls where the logo renders)
//   - `isPlacementEnabled` (called by <PartnerLogo />)
//   - `DEFAULT_PLACEMENTS` (the off-by-default baseline)
// The PartnerLogo component is mounted in Footer + HeaderBase + the
// dashboard + the auth callback splash. Removing either export
// crashes every signed-in page with "isPlacementEnabled is not a
// function". If a partner doesn't need any logo placements outside
// the landing, set { ...DEFAULT_PLACEMENTS } — that's safe.

export const DEFAULT_BRANCH_KEY = "default";

// Off-by-default baseline. Spread this into a partner's placements
// to opt in to specific surfaces one at a time.
const DEFAULT_PLACEMENTS = {
  loading: false,    // post-login splash (auth callback)
  dashboard: false,  // top-right of the dashboard nav row
  siteHeader: false, // beside the FieldTalk wordmark
  footer: false,     // next to the copyright
};

export const BRANCHES = {
  default: {
    logoSrc: "/logos/cultura-inglesa-logo-lion.png",
    alt: "Cultura Inglesa",
    placements: { ...DEFAULT_PLACEMENTS },
  },
  fortaleza: {
    logoSrc: "/logos/cultura-inglesa-arrows.png",
    alt: "Cultura Inglesa Fortaleza",
    slug: "fortaleza",
    // Alternative names this partner has been entered under in
    // seat_licenses.partner_name or partner_promo_prefixes.partner_name.
    // The canonical name is `alt`; canonicalPartnerName() below maps
    // any of these (case-insensitive, trimmed) onto it. Cultura
    // Inglesa hold rights for the whole state of Ceará but operate
    // out of Fortaleza, so the two names get used interchangeably —
    // we want them to roll up as one partner everywhere.
    aliases: ["Cultura Inglesa Ceará", "Cultura Inglesa Ceara"],
    placements: { ...DEFAULT_PLACEMENTS, loading: true },
  },
  teresina: {
    logoSrc: "/logos/cultura-inglesa-logo-lion.png",
    alt: "Cultura Inglesa Teresina",
    slug: "teresina",
    placements: { ...DEFAULT_PLACEMENTS, loading: true },
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
 * decide whether to render anything. Safe for unknown slugs +
 * unknown placements (returns false).
 */
export function isPlacementEnabled(branchKey, placement) {
  if (!branchKey || !placement) return false;
  const normalized = String(branchKey).toLowerCase().trim();
  const branch = BRANCHES[normalized];
  if (!branch || !branch.placements) return false;
  return branch.placements[placement] === true;
}

// ── Partner-name normalisation ───────────────────────────────────
// Different rows of seat_licenses + partner_promo_prefixes carry
// different variants of the same partner's name (e.g. "Cultura
// Inglesa Fortaleza" vs "Cultura Inglesa Ceará"). Without
// normalisation, the admin partner-tracking page renders them as
// separate partners — which breaks per-partner reporting and the
// local-leaderboard pitch.
//
// The map is built once at module load from each branch's `alt`
// (canonical) + `aliases` array. Lookup is case-insensitive and
// whitespace-trimmed. Unknown names pass through unchanged.

const PARTNER_NAME_CANONICAL = (() => {
  const map = new Map();
  for (const [slug, branch] of Object.entries(BRANCHES)) {
    if (slug === DEFAULT_BRANCH_KEY) continue;
    const canonical = branch.alt;
    if (!canonical) continue;
    map.set(canonical.toLowerCase().trim(), canonical);
    for (const a of branch.aliases || []) {
      if (typeof a !== "string") continue;
      map.set(a.toLowerCase().trim(), canonical);
    }
  }
  return map;
})();

/**
 * Returns the canonical display name for a partner. Pass any of:
 *   - the canonical name itself ("Cultura Inglesa Fortaleza")
 *   - an alias ("Cultura Inglesa Ceará", "Cultura Inglesa Ceara")
 *   - an unknown string — passes through verbatim
 * Use anywhere an admin page groups or displays a partner_name.
 */
export function canonicalPartnerName(rawName) {
  if (!rawName || typeof rawName !== "string") return rawName;
  return PARTNER_NAME_CANONICAL.get(rawName.toLowerCase().trim()) || rawName;
}

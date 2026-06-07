// src/lib/partners/referrer.js
//
// Tiny client-side helpers for capturing + persisting the
// ?branch=<slug> URL parameter so it survives the signup funnel.
//
// Storage: localStorage (works across page reloads within the same
// browser session, doesn't expire on its own). We don't use cookies
// because:
//   - The branch slug isn't sensitive
//   - We don't need it on every server request
//   - Server-side capture happens once at signup, never after
//
// The signup APIs read it from the client-supplied body (the client
// pulls it from localStorage), so even if the user opens the signup
// page in a fresh tab, the slug travels with them as long as
// it's in the same browser profile.

const STORAGE_KEY = "ft.partner_referrer";
// Sanity cap: slugs are URL fragments, no need to be longer than this.
// Stops a malicious / accidental query string from filling storage.
const MAX_SLUG_LENGTH = 64;

// Sanitise: lowercase, trim, keep only url-safe chars (letters,
// digits, dashes, underscores). Anything else (spaces, punctuation,
// path separators) gets dropped. Defensive against typos like
// ?branch=Fortaleza! and against any attempt at injection.
function cleanSlug(raw) {
  if (typeof raw !== "string") return null;
  const lower = raw.toLowerCase().trim();
  const safe = lower.replace(/[^a-z0-9\-_]/g, "");
  if (!safe || safe.length > MAX_SLUG_LENGTH) return null;
  return safe;
}

/**
 * Save a branch slug to localStorage. Call from any page that
 * receives ?branch= in the URL (currently /wc2026 and /join).
 * Idempotent — re-saving the same slug is a no-op; overwriting
 * with a different slug captures the most-recent attribution
 * (matches industry norm where the last touch wins).
 */
export function rememberPartnerReferrer(rawSlug) {
  if (typeof window === "undefined") return null;
  const slug = cleanSlug(rawSlug);
  if (!slug) return null;
  try {
    localStorage.setItem(STORAGE_KEY, slug);
  } catch {
    // Private mode / disabled storage — silently ignore. Worst case
    // is we lose the attribution for this user; the funnel still works.
  }
  return slug;
}

/**
 * Read the stored slug. Returns null in SSR, in private mode, or
 * when no slug was ever set. The signup pages pass this to the
 * /api/auth/* routes which write it to the players row.
 */
export function readPartnerReferrer() {
  if (typeof window === "undefined") return null;
  try {
    return cleanSlug(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

/**
 * Clear after successful attribution has been written server-side.
 * Optional — we leave it in storage by default in case the user
 * signs up on a different account from the same device and wants
 * the same attribution applied. Call manually from anywhere you
 * want to reset.
 */
export function clearPartnerReferrer() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

// src/lib/whatsapp/quiz-grading.js
//
// Shared button-quiz grading primitives. Used by:
//   - lead-funnel-router.js (pre-signup Q1/Q2 funnel)
//   - review-quiz-router.js (post-lesson T+24h review)
//
// The review-quiz router still ships with inline copies of these
// helpers (untouched — that flow is in production). Both flows use the
// same button-quiz shape:
//   {
//     buttons: [{ id, label: {pt, en?} | string, correct: boolean }, ...],
//     explanation: {pt, en?} | string,
//   }
// so the pick-resolution + language rendering here is safe to share.

// Free-text fallback maps: numeric prefix → button INDEX, letter prefix
// → button id (case-insensitive). Matches what the review-quiz router
// has done since Phase 7 so the two flows behave identically to users.
const NUMERIC_MAP = { 1: 0, 2: 1, 3: 2 };
const LETTER_MAP = { a: "a", b: "b", c: "c" };

/**
 * Sanity-check a snapshot. Returns a normalized copy or null when it's
 * unusable (no buttons, wrong shape).
 */
export function normalizeSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return null;
  const buttons = Array.isArray(snapshot.buttons) ? snapshot.buttons : null;
  if (!buttons || buttons.length === 0) return null;
  return {
    id: typeof snapshot.id === "string" ? snapshot.id : null,
    prompt: snapshot.prompt ?? null,
    buttons,
    explanation: snapshot.explanation ?? null,
  };
}

/**
 * Given the parsed inbound + snapshot buttons, decide which button
 * (if any) the user picked. Returns `{ index, buttonId }` or null.
 *
 * Priority:
 *   1. Real button-tap payload → exact match by id.
 *   2. Free-text: single token 1/2/3 → index map.
 *   3. Free-text: single token a/b/c (case-insensitive) → id map.
 *   4. Otherwise → null (caller decides: defer, escalate, etc.).
 */
export function resolvePick({ parsed, buttons }) {
  if (parsed?.button?.id) {
    const idx = buttons.findIndex(
      (b) => String(b.id).toLowerCase() === parsed.button.id.toLowerCase(),
    );
    if (idx >= 0) return { index: idx, buttonId: buttons[idx].id };
  }

  const trimmed = (parsed?.text || "").trim().toLowerCase();
  if (!trimmed) return null;
  // Single token only — "1 boa!" or "a sim" are ambiguous, so we
  // treat them as unrelated. Users can still answer with just "1".
  if (/\s/.test(trimmed)) return null;

  if (Object.prototype.hasOwnProperty.call(NUMERIC_MAP, trimmed)) {
    const idx = NUMERIC_MAP[trimmed];
    if (idx < buttons.length) {
      return { index: idx, buttonId: buttons[idx].id };
    }
  }

  if (Object.prototype.hasOwnProperty.call(LETTER_MAP, trimmed)) {
    const wantedId = LETTER_MAP[trimmed];
    const idx = buttons.findIndex(
      (b) => String(b.id).toLowerCase() === wantedId,
    );
    if (idx >= 0) return { index: idx, buttonId: buttons[idx].id };
  }

  return null;
}

export function normalizeLang(lang) {
  return lang === "en" || lang === "pt" ? lang : "pt";
}

/**
 * Given a { pt, en } bundle (or a plain string), return the string
 * for the requested language. Falls back to pt, then en, then empty.
 */
export function pickLangString(bundle, lang) {
  if (typeof bundle === "string") return bundle;
  if (!bundle || typeof bundle !== "object") return "";
  return bundle[lang] || bundle.pt || bundle.en || "";
}

// src/lib/brand/name.js
//
// Single source of truth for the product name and its approved
// bilingual descriptors + slogans. Import from here rather than
// hard-coding the name — one file to update if it ever changes
// again, and any missed reference during the rename becomes
// immediately visible.
//
// Rules from the Global Player brand system:
//   - The product name "Global Player" NEVER translates. Same
//     spelling in every locale.
//   - Only descriptors and slogans localise. The pairs below are
//     the approved ones (source: docs/brand/handoff/HANDOFF.md §4).
//   - Never use first-person voice ("we", "our"). Never use
//     exclamation marks except inside quoted touchline speech.
//
// The former names FieldTalk and Pro Path are retired — do not
// re-introduce them anywhere. Rebrand context is in MIGRATION.md.

export const PRODUCT_NAME = "Global Player";

// Short form for constrained surfaces (favicons, avatar fallbacks,
// social handles). Not for prose — write out the full name.
export const PRODUCT_NAME_SHORT = "GP";

// Approved bilingual descriptors. Each is a self-contained phrase
// that can serve as a subtitle under the wordmark or a tagline.
// Keys are stable — new pairs get added, existing ones don't get
// re-worded without a brand review.
export const DESCRIPTORS = {
  mental_and_english: {
    pt: "Blindagem mental. Inglês de campo.",
    en: "Mental armour. Field English.",
  },
  base_to_world: {
    pt: "Da base ao palco global.",
    en: "From the academy to the world stage.",
  },
  ready_for_the_world: {
    pt: "Preparado para o mundo.",
    en: "Ready for the world.",
  },
};

// Convenience — the default descriptor pair used under the wordmark
// on marketing surfaces. Marketing may override per-page; product
// chrome uses this one.
export const DEFAULT_DESCRIPTOR = DESCRIPTORS.mental_and_english;

/**
 * Pick a descriptor's localised string. Falls back to PT (the
 * primary locale) if the requested language isn't authored.
 *
 * @param {keyof typeof DESCRIPTORS} key
 * @param {'pt' | 'en'} lang
 */
export function descriptor(key, lang = "pt") {
  const pair = DESCRIPTORS[key];
  if (!pair) return "";
  return pair[lang] || pair.pt;
}

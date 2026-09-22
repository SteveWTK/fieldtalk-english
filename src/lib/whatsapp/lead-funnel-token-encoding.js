// src/lib/whatsapp/lead-funnel-token-encoding.js
//
// Encode + decode the 8-char outreach token as zero-width Unicode
// characters, so the "Oi <token>" wa.me pre-fill renders as just "Oi"
// in both the lead's chat and the business number's chat.
//
// Mechanism:
//   Token alphabet is 32 chars (see TOKEN_ALPHABET in lead-funnel-
//   outreach.js). Each token char is 5 bits. We encode the whole 40-bit
//   token as 20 zero-width characters (2 bits per char, base-4).
//
//   Zero-width chars used, all rendered as invisible across modern
//   WhatsApp clients (mobile / web / desktop):
//     U+200B  ZERO WIDTH SPACE          → 00
//     U+200C  ZERO WIDTH NON-JOINER     → 01
//     U+200D  ZERO WIDTH JOINER         → 10
//     U+2060  WORD JOINER               → 11
//
// The router calls decodeZeroWidthToken on every inbound. If the
// message contains a valid 20-char zero-width sequence, we decode it
// back to the base-32 token. Falls back to null when the message has
// no zero-width chars — the visible-format legacy parser
// (parseTokenFromInbound) is still available for messages sent before
// this change.

// Keep in sync with TOKEN_ALPHABET in lead-funnel-outreach.js. Small
// duplicate on purpose: this module is import-safe from the router
// hot path without pulling in generation logic.
const TOKEN_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const TOKEN_LENGTH = 8;

const ZW_CHARS = ["​", "‌", "‍", "⁠"];
const ZW_TO_VAL = {
  "​": 0,
  "‌": 1,
  "‍": 2,
  "⁠": 3,
};

/**
 * Encode a token like "kg7m3xph" as 20 zero-width characters.
 * Returns "" if the token is invalid — caller should handle by
 * falling back to the visible-token format.
 */
export function encodeTokenAsZeroWidth(token) {
  if (typeof token !== "string" || token.length !== TOKEN_LENGTH) return "";

  // token → 40 bits (5 bits per char, MSB first)
  const bits = [];
  for (const ch of token) {
    const idx = TOKEN_ALPHABET.indexOf(ch);
    if (idx < 0) return "";
    for (let b = 4; b >= 0; b--) {
      bits.push((idx >> b) & 1);
    }
  }

  // bits → 20 zero-width chars (2 bits per char)
  let out = "";
  for (let i = 0; i < bits.length; i += 2) {
    const hi = bits[i];
    const lo = bits[i + 1] || 0;
    out += ZW_CHARS[(hi << 1) | lo];
  }
  return out;
}

/**
 * Extract a zero-width-encoded token from an inbound message body.
 * Returns lowercase token string or null.
 *
 * Tolerant: the message text can contain any visible characters
 * around the zero-width sequence ("Oi", "Hello", newlines, etc.).
 * We collect just the zero-width chars and decode.
 */
export function decodeZeroWidthToken(text) {
  if (typeof text !== "string") return null;

  const vals = [];
  for (const ch of text) {
    if (Object.prototype.hasOwnProperty.call(ZW_TO_VAL, ch)) {
      vals.push(ZW_TO_VAL[ch]);
    }
  }
  if (vals.length !== TOKEN_LENGTH * 2.5) return null;

  // vals → 40 bits
  const bits = [];
  for (const v of vals) {
    bits.push((v >> 1) & 1);
    bits.push(v & 1);
  }

  // bits → 8 base-32 chars (5 bits per, MSB first)
  const chars = [];
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    let idx = 0;
    for (let b = 0; b < 5; b++) {
      idx = (idx << 1) | bits[i * 5 + b];
    }
    if (idx >= TOKEN_ALPHABET.length) return null;
    chars.push(TOKEN_ALPHABET[idx]);
  }
  return chars.join("");
}

/**
 * Strip zero-width chars from a string. Handy for logging the
 * "visible" part of a lead's message without the invisible payload
 * cluttering debug traces or CRM timelines.
 */
export function stripZeroWidth(text) {
  if (typeof text !== "string") return text;
  return text.replace(/[​‌‍⁠]/g, "");
}

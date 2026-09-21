// src/lib/whatsapp/lead-funnel-outreach.js
//
// Pure helpers for the WhatsApp lead-funnel outreach: token generation
// + wa.me link building. No I/O — safe to unit-test.
//
// The token is what ties the wa.me link (that the salesperson pastes
// into their personal WA DM) back to the lead row when the lead
// actually messages the business number. Lead types "Oi <token>" as
// their first message; the lead-funnel router (built in PR #2) matches
// on this token to pull up the lead record before any Q1 send.

// Token alphabet: lowercase letters + digits, minus visually ambiguous
// characters (0/o, 1/l/i). Length 8 gives 32^8 ≈ 10^12 space — safely
// unique for any realistic outreach volume without being unwieldy on
// screen or in a WhatsApp bubble.
const TOKEN_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const TOKEN_LENGTH = 8;

export function generateOutreachToken() {
  // Uses global crypto — Node 20+ ships it globally, matching the
  // Vercel runtime. Falls back to Math.random when crypto is absent
  // (only local dev with old Node), still safe for uniqueness at our
  // scale.
  const bytes = new Uint8Array(TOKEN_LENGTH);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < TOKEN_LENGTH; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_ALPHABET[bytes[i] % TOKEN_ALPHABET.length];
  }
  return token;
}

/**
 * Build the wa.me link the salesperson pastes into their outreach
 * message. `businessNumberE164` should include the leading '+', which
 * wa.me strips. The message body is Portuguese by default because BR
 * is the primary market; callers can override for other locales.
 *
 *   buildOutreachLink({
 *     businessNumberE164: "+551132300933",
 *     token: "kg7m3xph",
 *   })
 *   // → "https://wa.me/551132300933?text=Oi%20kg7m3xph"
 */
export function buildOutreachLink({ businessNumberE164, token, greeting }) {
  if (!businessNumberE164) {
    throw new Error("buildOutreachLink: businessNumberE164 required");
  }
  if (!token) {
    throw new Error("buildOutreachLink: token required");
  }
  const digits = String(businessNumberE164).replace(/[^\d]/g, "");
  const messageBody = `${greeting || "Oi"} ${token}`;
  const encoded = encodeURIComponent(messageBody);
  return `https://wa.me/${digits}?text=${encoded}`;
}

/**
 * Extract the token from an inbound message body. Matches "Oi <token>",
 * case-insensitive, tolerant of leading/trailing whitespace and stray
 * punctuation. Returns lowercase token or null.
 *
 * Used by the lead-funnel router (PR #2) — kept here so the token
 * format is defined in ONE place.
 */
export function parseTokenFromInbound(body) {
  if (typeof body !== "string") return null;
  const match = body.trim().match(/^oi[\s.,!:-]+([a-z0-9]{4,32})\b/i);
  if (!match) return null;
  return match[1].toLowerCase();
}

// src/lib/whatsapp/lead-funnel-outreach.js
//
// Pure helpers for the WhatsApp lead-funnel outreach: token generation
// + wa.me link building. No I/O — safe to unit-test.
//
// The token is what ties the wa.me link (that the salesperson pastes
// into their personal WA DM) back to the lead row when the lead
// actually messages the business number.
//
// Encoding: the token is pre-filled into the wa.me link as a sequence
// of zero-width Unicode characters appended after "Oi", so both the
// lead's and the business account's chat bubble display just "Oi".
// The router decodes the invisible bytes on receipt. Legacy visible-
// format tokens (used during PR #2 testing) still parse for backward
// compatibility — see parseTokenFromInbound.

import {
  encodeTokenAsZeroWidth,
  decodeZeroWidthToken,
} from "@/lib/whatsapp/lead-funnel-token-encoding";

// Token alphabet: lowercase letters + digits, minus visually ambiguous
// characters (0/o, 1/l/i). Length 8 gives 32^8 ≈ 10^12 space — safely
// unique for any realistic outreach volume.
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
 * Build the public-facing outreach link the salesperson pastes into
 * their DM. Short, brand-domained, e.g.
 *
 *   https://www.globalplayerpro.com/o/kg7m3xph
 *
 * The lead clicks it and the /o/[token] route 302-redirects to the
 * wa.me deeplink (built by `buildWhatsappDeeplink`). This keeps the
 * shared URL clean and trust-worthy — no long %-encoded strings in
 * the DM, and the domain reassures the recipient about who they're
 * talking to.
 */
export function buildOutreachLink({ token }) {
  if (!token) throw new Error("buildOutreachLink: token required");
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.globalplayerpro.com";
  const cleanOrigin = origin.replace(/\/$/, "");
  return `${cleanOrigin}/o/${encodeURIComponent(token)}`;
}

/**
 * Build the underlying wa.me deeplink the /o/[token] redirect route
 * (and only that route) uses to hand off to WhatsApp. Message body is
 * `<greeting><zero-width token>` so the lead sees just "Oi" in their
 * chat while the router still receives the invisible token bytes.
 */
export function buildWhatsappDeeplink({
  businessNumberE164,
  token,
  greeting,
}) {
  if (!businessNumberE164) {
    throw new Error("buildWhatsappDeeplink: businessNumberE164 required");
  }
  if (!token) {
    throw new Error("buildWhatsappDeeplink: token required");
  }
  const digits = String(businessNumberE164).replace(/[^\d]/g, "");
  const zwToken = encodeTokenAsZeroWidth(token);
  // Safety net: if the encoding failed (shouldn't happen for our own
  // generated tokens), fall back to the legacy visible format so the
  // outreach still works.
  const suffix = zwToken || ` ${token}`;
  const messageBody = `${greeting || "Oi"}${suffix}`;
  const encoded = encodeURIComponent(messageBody);
  return `https://wa.me/${digits}?text=${encoded}`;
}

/**
 * Extract the token from an inbound message body. Tries the zero-width
 * decoder first (current format); falls back to visible "Oi <token>"
 * parsing for legacy links sent during PR #2 testing. Returns lowercase
 * token or null.
 */
export function parseTokenFromInbound(body) {
  if (typeof body !== "string") return null;

  // Preferred path: zero-width encoded token.
  const zwDecoded = decodeZeroWidthToken(body);
  if (zwDecoded) return zwDecoded.toLowerCase();

  // Legacy visible format — kept so tokens minted before the encoding
  // change still work.
  const match = body.trim().match(/^oi[\s.,!:-]+([a-z0-9]{4,32})\b/i);
  if (!match) return null;
  return match[1].toLowerCase();
}

/**
 * Build the /demo/<token> URL the lead lands on when tapping the
 * WhatsApp CTA. Reads NEXT_PUBLIC_SITE_URL for the origin (falls
 * back to globalplayerpro.com so the router can't fail closed if
 * the env var is missing).
 */
export function buildCtaLink(token) {
  if (!token) throw new Error("buildCtaLink: token required");
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.globalplayerpro.com";
  const cleanOrigin = origin.replace(/\/$/, "");
  return `${cleanOrigin}/demo/${encodeURIComponent(token)}`;
}

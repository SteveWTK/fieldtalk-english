// src/lib/sales/contact.js
//
// Single source of truth for "who does the lead land on WhatsApp with
// when they want to buy". Paul leads sales; David sends outreach but
// hands off to Paul for close.
//
// Overridable via env vars so we don't need a code deploy to swap
// contact (e.g. Paul on holiday, David covering) — but sensible
// hardcoded fallbacks so the demo + pricing page never point at a
// dead number when the envs are missing.
//
//   NEXT_PUBLIC_SALES_WHATSAPP_PHONE   E.164, e.g. "+554298473334"
//   NEXT_PUBLIC_SALES_WHATSAPP_NAME    First name for copy, e.g. "Paul"
//
// Both must be NEXT_PUBLIC_* since we build wa.me links client-side
// on public pages (pricing) and inside client components (DemoCta).

const FALLBACK_PHONE = "+554298473334";
const FALLBACK_NAME = "Paul";

export function getSalesContact() {
  return {
    phoneE164:
      (process.env.NEXT_PUBLIC_SALES_WHATSAPP_PHONE || FALLBACK_PHONE).trim(),
    name: (process.env.NEXT_PUBLIC_SALES_WHATSAPP_NAME || FALLBACK_NAME).trim(),
  };
}

/**
 * Build a wa.me link to the sales contact, optionally pre-filling the
 * first message. Keeps every "Talk to us" button in the funnel pointed
 * at the same phone with a warm opener.
 *
 *   buildSalesWhatsappLink({ prefilledMessage: "Oi Paul! Vi a demo…" })
 *   // → "https://wa.me/554298473334?text=Oi%20Paul!%20Vi%20a%20demo…"
 */
export function buildSalesWhatsappLink({ prefilledMessage } = {}) {
  const { phoneE164 } = getSalesContact();
  const digits = String(phoneE164).replace(/[^\d]/g, "");
  if (!prefilledMessage) return `https://wa.me/${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(prefilledMessage)}`;
}

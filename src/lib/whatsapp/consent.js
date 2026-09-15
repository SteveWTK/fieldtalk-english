// src/lib/whatsapp/consent.js
//
// Canonical LGPD-style consent copy for WhatsApp opt-in. Kept in one
// place so all three surfaces (Pro Path onboarding, WC onboarding,
// standalone PhoneCollectionModal for existing users) show the EXACT
// same wording — and so the audit-trail snapshot we store in
// players.whatsapp_consent_text is the same string the user actually
// saw. Changing wording? Version it: add v2 alongside, migrate callers,
// leave v1 stored on existing rows as their historical record.
//
// The 2026-09-12 rebrand updated the product name from "FieldTalk" to
// "Global Player". Existing users' snapshots in
// players.whatsapp_consent_text keep the old wording verbatim — that's
// the whole point of snapshotting — so no historical row is rewritten.
// New opt-ins after this date agree to the Global Player wording.

const CONSENT_TEXT_EN =
  "I agree to receive WhatsApp messages from Global Player with practice reminders, encouragement, tips, and updates. I can opt out at any time by replying STOP.";

const CONSENT_TEXT_PT =
  "Concordo em receber mensagens do Global Player no WhatsApp com lembretes de prática, incentivos, dicas e novidades. Posso cancelar a qualquer momento respondendo PARAR.";

/** @param {'en' | 'pt'} lang */
export function getConsentText(lang) {
  return lang === "pt" ? CONSENT_TEXT_PT : CONSENT_TEXT_EN;
}

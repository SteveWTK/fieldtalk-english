// src/lib/broadcasts/config.js
//
// Compile-time config for the broadcasts system. Two things live here:
//
//   1. TEST_RECIPIENTS — the fixed set of numbers the compose UI's
//      "Send test" button can send to. Kept in code (not DB) because
//      it's the core team's own numbers, changes rarely, and doesn't
//      benefit from live editability.
//
//   2. DISPATCHER_TICK_LIMIT — how many pending recipients the cron
//      drains per minute. 8s per send × 7 sends ≈ 56s within the
//      1-minute cron tick — matches the LGP "safe for warm accounts"
//      guidance while staying inside Vercel's serverless timeout.
//      Bump upward once the FieldTalk number has been warm for a
//      few weeks; drop if we see WhatsApp rate-limit errors.
//
// Phone numbers stored as raw user-facing strings; the normalizer in
// src/lib/utils/phone.js canonicalises them to Z-API format (13-digit
// BR mobiles get the mandatory leading 9 auto-prepended). Numbers
// verified against the phone.js normalizer on 2026-08-23.

/**
 * @typedef {{ id: string, name: string, phoneRaw: string }} TestRecipient
 */

/** @type {TestRecipient[]} */
export const TEST_RECIPIENTS = [
  {
    id: "steve",
    name: "Steve (UK)",
    phoneRaw: "+44 7404 700273",
  },
  {
    id: "david",
    name: "David",
    // Displayed on WhatsApp as +55 86 9925-9773 (10-digit subscriber
    // format). Normalizer auto-prepends the mandatory 9 → 5586999259773.
    phoneRaw: "+55 86 9925-9773",
  },
  {
    id: "paul",
    name: "Paul",
    // Same 10→11 digit auto-fix path as David.
    phoneRaw: "+55 42 9847-3334",
  },
];

/**
 * Look up a test recipient by id. Returns undefined if not found.
 * @param {string} id
 */
export function getTestRecipient(id) {
  return TEST_RECIPIENTS.find((r) => r.id === id);
}

// Dispatcher tick ceiling — see file header.
//
// Since Phase 6, per-broadcast throttle is enforced via scheduled_slot
// spacing at fan-out time (not via a fixed per-tick cap). The dispatcher
// just processes any pending rows whose slot has arrived, up to this
// ceiling. Higher = catches up faster after outages; lower = safer for
// Vercel serverless timeouts.
//
// At ~500ms per WhatsApp send, 50 recipients = ~25s of cron work — well
// within Vercel's 60s serverless timeout, comfortably below Z-API's
// rate-limit ceilings for warm accounts.
export const DISPATCHER_TICK_LIMIT = 50;

// Supported broadcast body languages. Order matters — compose UI tabs
// render in this order, and the "primary" language (index 0) is the
// default active tab. Extend by adding a new entry + running any
// migration to accept the new code in target_filter validation.
export const BROADCAST_LANGUAGES = [
  { code: "pt", label: "Português" },
  { code: "en", label: "English" },
  // { code: "es", label: "Español" },   // uncomment when going live in ES
];

/** All valid language codes as a Set for validation. */
export const VALID_BROADCAST_LANGUAGES = new Set(
  BROADCAST_LANGUAGES.map((l) => l.code),
);

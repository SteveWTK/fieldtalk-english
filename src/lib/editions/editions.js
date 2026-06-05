// src/lib/editions/editions.js
//
// Two related concepts live in this file:
//
//   1. Editions — content sets a player has paid access to. Identified
//      by a slug (e.g. "wc2026") that matches players.edition and
//      player_edition_access.edition.
//
//   2. Offerings — the products we sell in Stripe. Each offering has a
//      mode (one_time / subscription), an interval (for subscriptions),
//      a currency, and the list of editions it unlocks. Multiple
//      offerings can grant access to the same edition (e.g. WC2026 is
//      available as both a one-off purchase AND as part of an
//      all-editions subscription).
//
// Adding a new offering:
//   1. Create the Stripe Product + Price in the dashboard.
//   2. Add the env var to .env.local with the price ID.
//   3. Append an entry to OFFERINGS below.
//
// Adding a new edition:
//   1. Add the slug to EDITIONS.
//   2. Either add new offerings for it, OR add the slug to existing
//      subscription offerings' `editionsGranted` to bundle it in.

// ─── Editions ──────────────────────────────────────────────────────

const EDITIONS = {
  wc2026: {
    id: "wc2026",
    name: "World Cup 2026 Edition",
    tagline: "Match-day English, gamified for the 2026 World Cup.",
    // One-off purchases of this edition unlock access until this
    // ISO timestamp. Stripe sees the same payment regardless — the
    // cutoff is enforced by our webhook writing this into the
    // access row's current_period_end, and hasEditionAccess()
    // filtering rows whose current_period_end is in the past.
    //
    // Set null for editions with permanent one-off access (e.g.
    // "Premier League 26/27" if we ever sell it as a forever buy).
    oneTimeAccessEnd: "2026-08-31T23:59:59-03:00",
  },
  // Future editions: championsleague26, premierleague26, …
};

export function getEdition(id) {
  if (!id) return null;
  return EDITIONS[id] || null;
}

export function listEditions() {
  return Object.values(EDITIONS);
}

// ─── Offerings (Stripe products we sell) ───────────────────────────

// `displayPrice` and `displayInterval` are user-facing strings the
// pricing page reads to render the cards. They live here (rather than
// being fetched from Stripe at request time) so the pricing page
// doesn't need a server round-trip to render — keep them in sync
// with the actual Stripe prices yourself.
//
// `priceId` is the Stripe Price ID, looked up from .env.local. On the
// client this comes back as null because non-NEXT_PUBLIC vars aren't
// exposed to the browser — that's fine; only the server-side
// /api/checkout route reads priceId, never the client.

const OFFERINGS = [
  {
    id: "wc2026_one_time_brl",
    label: "World Cup 2026 — full edition",
    description: "One-time purchase.",
    mode: "one_time",
    interval: null,
    currency: "BRL",
    // EDIT THESE to match the live Stripe price (R$ amount).
    displayPrice: "R$ 57",
    displayInterval: "one-time",
    editionsGranted: ["wc2026"],
    priceId: process.env.STRIPE_WC2026_BRL_PRICE_ID || null,
  },
  {
    id: "editions_monthly_brl",
    label: "FieldTalk Monthly",
    description:
      "Recurring access to every FieldTalk edition while subscribed.",
    mode: "subscription",
    interval: "monthly",
    currency: "BRL",
    displayPrice: "R$ 19",
    displayInterval: "/month",
    // Subscription tiers grant access to the full library. As new
    // editions launch, append their slug here so existing subscribers
    // automatically unlock the new content.
    editionsGranted: ["wc2026"],
    priceId: process.env.STRIPE_EDITIONS_MONTHLY_BRL_PRICE_ID || null,
  },
  {
    id: "editions_yearly_brl",
    label: "FieldTalk Yearly",
    description:
      "Recurring access to every FieldTalk edition while subscribed. Best value.",
    mode: "subscription",
    interval: "yearly",
    currency: "BRL",
    displayPrice: "R$ 149",
    displayInterval: "/year",
    editionsGranted: ["wc2026"],
    priceId: process.env.STRIPE_EDITIONS_YEARLY_BRL_PRICE_ID || null,
  },
];

export function getOffering(id) {
  if (!id) return null;
  return OFFERINGS.find((o) => o.id === id) || null;
}

export function listOfferings() {
  return OFFERINGS.slice();
}

/**
 * Every offering that unlocks the given edition. Used by the pricing
 * page to render the right cards per edition (e.g. wc2026 shows the
 * one-off + both subscription cards).
 */
export function listOfferingsForEdition(editionId) {
  return OFFERINGS.filter((o) => o.editionsGranted.includes(editionId));
}

/**
 * Reverse lookup from a Stripe price id back to the offering. Used by
 * the webhook so a portal-managed price swap (or a payment-mode
 * session whose metadata is missing) can still resolve which
 * editions to grant.
 */
export function getOfferingByPriceId(priceId) {
  if (!priceId) return null;
  return OFFERINGS.find((o) => o.priceId === priceId) || null;
}

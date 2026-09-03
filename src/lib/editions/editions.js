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
  propath_26_27: {
    id: "propath_26_27",
    name: "FieldTalk Pro Path",
    tagline:
      "The English you'll actually use - dressing room, coach, agent, media.",
    // Season pass runs Aug 2026 → Aug 2027 to match the football
    // calendar. Adjust here if the launch date slips; the webhook
    // reads this at purchase time.
    oneTimeAccessEnd: "2027-08-31T23:59:59-03:00",
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

/**
 * Set of every valid edition id, plus the legacy "players" slug that
 * pre-launched player accounts were tagged with (kept here so
 * SUPPORTED_EDITIONS checks in signup routes still let those users
 * back in). Any new edition added to EDITIONS above is automatically
 * accepted by the auth flow — no need to remember to update a
 * second allow-list.
 */
export function getSupportedEditionIds() {
  return new Set([...Object.keys(EDITIONS), "players"]);
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
    // Once Pro Path Stripe products exist, add "propath_26_27" here
    // so existing subscribers get automatic access. Kept WC-only for
    // now until Pro Path is publicly launched — otherwise WC
    // subscribers would see a Pro Path edition they didn't sign up
    // for on their dashboard.
    editionsGranted: ["wc2026"],
    priceId: process.env.STRIPE_EDITIONS_YEARLY_BRL_PRICE_ID || null,
  },

  // ─── Pro Path 26/27 offerings ─────────────────────────────────
  //
  // Three tiers matching the individual-sales business model:
  //   - season_pass  : one-time R$ 149 for 12-month access
  //   - monthly      : R$ 29/mo subscription (aimed at trialists
  //                    skilling up ahead of a specific trial)
  //   - yearly       : R$ 179/year subscription, better value than
  //                    monthly, auto-renews across seasons
  //
  // TO ACTIVATE:
  //   1. In Stripe dashboard, create 3 products under "Pro Path 26/27":
  //        - "Pro Path 26/27 — Season Pass" (one-time, R$ 149)
  //        - "Pro Path — Monthly"           (recurring monthly, R$ 29)
  //        - "Pro Path — Yearly"            (recurring yearly, R$ 179)
  //   2. Copy each Price ID into .env.local + Vercel env:
  //        STRIPE_PROPATH_SEASON_BRL_PRICE_ID=price_...
  //        STRIPE_PROPATH_MONTHLY_BRL_PRICE_ID=price_...
  //        STRIPE_PROPATH_YEARLY_BRL_PRICE_ID=price_...
  //   3. Deploy — the pricing page will auto-render these cards once
  //      the env vars land (they show as "coming soon" without a
  //      priceId, since the checkout can't create a session).
  //
  // Bulk-seat (Tier 2) doesn't need an offering — the existing
  // seat-licences admin flow generates codes that grant this same
  // edition via the redemption path.
  {
    id: "propath_season_brl",
    label: "Pro Path — Season Pass",
    description:
      "One-time purchase, full access through the current season (Aug 26 → Aug 27).",
    mode: "one_time",
    interval: null,
    currency: "BRL",
    displayPrice: "R$ 149",
    displayInterval: "one-time",
    editionsGranted: ["propath_26_27"],
    priceId: process.env.STRIPE_PROPATH_SEASON_BRL_PRICE_ID || null,
  },
  {
    id: "propath_monthly_brl",
    label: "Pro Path — Monthly",
    description: "Skill up ahead of a specific trial. Cancel anytime.",
    mode: "subscription",
    interval: "monthly",
    currency: "BRL",
    displayPrice: "R$ 29",
    displayInterval: "/month",
    editionsGranted: ["propath_26_27"],
    priceId: process.env.STRIPE_PROPATH_MONTHLY_BRL_PRICE_ID || null,
  },
  {
    id: "propath_yearly_brl",
    label: "Pro Path — Yearly",
    description:
      "Twelve months of access, auto-renews across seasons. Best value for career-long use.",
    mode: "subscription",
    interval: "yearly",
    currency: "BRL",
    displayPrice: "R$ 179",
    displayInterval: "/year",
    editionsGranted: ["propath_26_27"],
    priceId: process.env.STRIPE_PROPATH_YEARLY_BRL_PRICE_ID || null,
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

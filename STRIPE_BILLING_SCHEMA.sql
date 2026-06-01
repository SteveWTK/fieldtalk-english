-- FieldTalk — Stripe billing + edition access schema
-- ----------------------------------------------------
-- Run once in the Supabase SQL editor. Idempotent (IF NOT EXISTS
-- everywhere) so re-running is safe.
--
-- Adds three things:
--   1. players.stripe_customer_id — one Stripe customer per user,
--      reused across editions. Set on first Checkout session creation.
--   2. player_edition_access — the source of truth for "who can access
--      what edition right now". One row per (player, edition) pair.
--      Driven by Stripe webhooks for subscriptions, or by seat-license
--      redemptions, or by admin grants.
--   3. seat_licenses + seat_redemptions — bulk school packs. A partner
--      (e.g. Cultura Inglesa) gets a code; students apply it and an
--      access row is provisioned without going through Stripe Checkout.
--
-- All three new tables stay locked down via RLS: nothing readable or
-- writable by the anon/auth role. Every interaction goes through a
-- server-side API route using the service-role admin client, so we
-- can't accidentally leak codes or grant access from the browser.

-- =====================================================
-- PART 1: Stripe customer reference on players
-- =====================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Customer ID lookups happen on every webhook event; this is the
-- equivalent of the Stripe → player join key, so it's worth indexing.
CREATE INDEX IF NOT EXISTS idx_players_stripe_customer_id
  ON players(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;


-- =====================================================
-- PART 2: player_edition_access — entitlement source of truth
-- =====================================================
-- Why a separate table instead of a column on players: a single user
-- can eventually hold access to multiple editions at once (e.g. an
-- early adopter who paid for WC2026 and later for the Champions
-- League edition). Storing entitlements per-row keeps that clean.
--
-- status semantics — mirrors Stripe's subscription.status vocabulary
-- plus a few extras:
--   'active'        — fully paid up, full access
--   'trialing'      — inside a trial window, full access
--   'past_due'      — payment failed but Stripe is retrying. The
--                     access check treats this as no-access by default
--                     so we don't keep serving content while dunning;
--                     flip the policy in editionAccess.js if you want
--                     a grace period.
--   'canceled'      — explicitly canceled (or trial ended without
--                     conversion). No access.
--   'incomplete'    — subscription created but first payment not yet
--                     confirmed (e.g. SCA pending). No access yet.
--
-- source — how access was granted, so admins can audit:
--   'subscription'   — paid via Stripe Checkout
--   'seat_redemption'— redeemed a partner school code
--   'admin_grant'    — comp / staff / influencer, set manually

CREATE TABLE IF NOT EXISTS player_edition_access (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id             UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  edition               TEXT NOT NULL,
  status                TEXT NOT NULL CHECK (status IN (
                          'active', 'trialing', 'past_due',
                          'canceled', 'incomplete'
                        )),
  source                TEXT NOT NULL CHECK (source IN (
                          'subscription', 'seat_redemption', 'admin_grant'
                        )),
  stripe_subscription_id TEXT,
  stripe_price_id       TEXT,
  -- For subscriptions: Stripe's current_period_end. For seat redemptions:
  -- the license's valid_until (may be null = no expiry). For admin
  -- grants: null = perpetual, otherwise the chosen end date.
  current_period_end    TIMESTAMPTZ,
  granted_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, edition)
);

CREATE INDEX IF NOT EXISTS idx_player_edition_access_player_id
  ON player_edition_access(player_id);
CREATE INDEX IF NOT EXISTS idx_player_edition_access_edition_status
  ON player_edition_access(edition, status);
-- Fast lookup from a Stripe webhook payload — webhook gives us the
-- subscription id, we need to find the matching access row.
CREATE INDEX IF NOT EXISTS idx_player_edition_access_subscription
  ON player_edition_access(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- Keep updated_at fresh automatically.
CREATE OR REPLACE FUNCTION public.touch_player_edition_access()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_touch_player_edition_access ON player_edition_access;
CREATE TRIGGER trg_touch_player_edition_access
  BEFORE UPDATE ON player_edition_access
  FOR EACH ROW EXECUTE FUNCTION public.touch_player_edition_access();


-- =====================================================
-- PART 3: seat_licenses + seat_redemptions — bulk school packs
-- =====================================================
-- A partner (Cultura Inglesa branch, club, NGO) buys N seats for an
-- edition. We create a license row with a redeem code and hand it
-- to them. Each of their students enters the code on signup; that
-- inserts a redemption row, ticks seats_used up, and provisions a
-- 'seat_redemption' access row for them.

CREATE TABLE IF NOT EXISTS seat_licenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_name    TEXT NOT NULL,
  contact_email   TEXT,
  edition         TEXT NOT NULL,
  seats_total     INT NOT NULL CHECK (seats_total > 0),
  -- Denormalised counter — kept in sync by the redeem_seat_license()
  -- function below so the partner-facing dashboard can show
  -- "12/30 seats used" without a count() across redemptions.
  seats_used      INT NOT NULL DEFAULT 0 CHECK (seats_used >= 0),
  code            TEXT NOT NULL UNIQUE,
  -- Optional expiry. Null = no expiry. Once past, redemptions are
  -- rejected by redeem_seat_license() but already-redeemed users
  -- keep their access until their access row says otherwise.
  valid_until     TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seat_licenses_edition
  ON seat_licenses(edition);
-- Codes are looked up case-insensitively at redeem time. We store
-- them as uppercase by convention and the redeem function upper()s
-- the input.
CREATE UNIQUE INDEX IF NOT EXISTS idx_seat_licenses_code_upper
  ON seat_licenses(upper(code));


CREATE TABLE IF NOT EXISTS seat_redemptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id   UUID NOT NULL REFERENCES seat_licenses(id) ON DELETE RESTRICT,
  player_id    UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  redeemed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One redemption per (license, player). Prevents a student from
  -- "burning" multiple seats off the same partner code.
  UNIQUE (license_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_seat_redemptions_license_id
  ON seat_redemptions(license_id);
CREATE INDEX IF NOT EXISTS idx_seat_redemptions_player_id
  ON seat_redemptions(player_id);


-- =====================================================
-- PART 4: redeem_seat_license() — atomic redeem function
-- =====================================================
-- Wrapping the redeem flow in a Postgres function lets us hold a row
-- lock on the license while we check capacity + insert the redemption
-- + upsert the access row, so two students racing for the last seat
-- can't both succeed. SECURITY DEFINER so the service-role client can
-- call it without granting table-level write privileges to anon.
--
-- Returns:
--   ok          BOOLEAN — true on success, false on every failure
--   reason      TEXT    — null on success; otherwise a short code:
--                         'unknown_code' | 'expired' | 'no_seats'
--                         | 'already_redeemed'
--   license_id  UUID    — set when ok = true
--   edition     TEXT    — set when ok = true

CREATE OR REPLACE FUNCTION public.redeem_seat_license(
  p_player_id UUID,
  p_code      TEXT
)
RETURNS TABLE (
  ok         BOOLEAN,
  reason     TEXT,
  license_id UUID,
  edition    TEXT
) AS $$
-- The OUT columns `edition` and `license_id` collide with column
-- names used in the INSERT / ON CONFLICT clauses below. This
-- directive tells PL/pgSQL to resolve any ambiguous identifier to
-- the table column rather than the OUT variable, which is what we
-- want everywhere in this function — we only assemble OUT values
-- via explicit RETURN QUERY SELECT statements.
#variable_conflict use_column
DECLARE
  v_license RECORD;
  v_existing RECORD;
BEGIN
  -- Locate + lock the license row so concurrent redeems serialize.
  SELECT *
    INTO v_license
    FROM seat_licenses
   WHERE upper(seat_licenses.code) = upper(p_code)
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'unknown_code'::TEXT, NULL::UUID, NULL::TEXT;
    RETURN;
  END IF;

  IF v_license.valid_until IS NOT NULL AND v_license.valid_until < now() THEN
    RETURN QUERY SELECT false, 'expired'::TEXT, v_license.id, v_license.edition;
    RETURN;
  END IF;

  IF v_license.seats_used >= v_license.seats_total THEN
    RETURN QUERY SELECT false, 'no_seats'::TEXT, v_license.id, v_license.edition;
    RETURN;
  END IF;

  -- Already redeemed by this player? Treat as a no-op success so the
  -- UI can show "you're already in" without flapping the counters.
  SELECT *
    INTO v_existing
    FROM seat_redemptions
   WHERE seat_redemptions.license_id = v_license.id
     AND seat_redemptions.player_id  = p_player_id;

  IF FOUND THEN
    RETURN QUERY SELECT false, 'already_redeemed'::TEXT, v_license.id, v_license.edition;
    RETURN;
  END IF;

  -- Reserve the seat
  INSERT INTO seat_redemptions (license_id, player_id)
  VALUES (v_license.id, p_player_id);

  UPDATE seat_licenses
     SET seats_used = seats_used + 1
   WHERE id = v_license.id;

  -- Grant access. If the player already has an access row for this
  -- edition (e.g. previously had a subscription that canceled), we
  -- upgrade it back to active with the seat-redemption source.
  INSERT INTO player_edition_access (
    player_id, edition, status, source, current_period_end
  )
  VALUES (
    p_player_id,
    v_license.edition,
    'active',
    'seat_redemption',
    v_license.valid_until
  )
  ON CONFLICT (player_id, edition)
  DO UPDATE SET
    status              = 'active',
    source              = 'seat_redemption',
    stripe_subscription_id = NULL,
    stripe_price_id     = NULL,
    current_period_end  = v_license.valid_until,
    updated_at          = now();

  RETURN QUERY SELECT true, NULL::TEXT, v_license.id, v_license.edition;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- PART 5: Row-level security
-- =====================================================
-- All three new tables are server-write-only. No browser code touches
-- them directly — every read or write goes through an API route that
-- uses getSupabaseAdmin() (service-role key), which bypasses RLS.
--
-- We still enable RLS with zero policies so that, in the unlikely
-- event someone tries to query these tables with the anon key, they
-- get an empty result instead of leaking license codes or access
-- entitlements for other players.

ALTER TABLE player_edition_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_licenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE seat_redemptions     ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- PART 6: Sanity smoke test
-- =====================================================
-- Uncomment to verify everything's wired correctly. Cleans up after
-- itself. Run it once after applying the migration.

-- DO $$
-- DECLARE
--   v_player_id UUID;
--   v_license_id UUID;
--   v_redeem RECORD;
-- BEGIN
--   -- Grab any existing player to test against; bail if none exist.
--   SELECT id INTO v_player_id FROM players LIMIT 1;
--   IF v_player_id IS NULL THEN
--     RAISE NOTICE 'No players to test against — skipping smoke test.';
--     RETURN;
--   END IF;
--
--   INSERT INTO seat_licenses (partner_name, edition, seats_total, code)
--   VALUES ('Smoke Test Partner', 'wc2026', 2, 'SMOKE-TEST-001')
--   RETURNING id INTO v_license_id;
--
--   SELECT * INTO v_redeem FROM redeem_seat_license(v_player_id, 'smoke-test-001');
--   RAISE NOTICE 'First redeem: ok=% reason=%', v_redeem.ok, v_redeem.reason;
--
--   SELECT * INTO v_redeem FROM redeem_seat_license(v_player_id, 'SMOKE-TEST-001');
--   RAISE NOTICE 'Second redeem (same player): ok=% reason=%', v_redeem.ok, v_redeem.reason;
--
--   DELETE FROM seat_redemptions WHERE license_id = v_license_id;
--   DELETE FROM player_edition_access WHERE player_id = v_player_id AND edition = 'wc2026'
--     AND source = 'seat_redemption';
--   DELETE FROM seat_licenses WHERE id = v_license_id;
-- END $$;

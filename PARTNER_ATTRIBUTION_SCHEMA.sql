-- FieldTalk — Partner attribution schema
-- ---------------------------------------
-- Run once in the Supabase SQL editor. Idempotent.
--
-- Captures the three paths by which a paying user can be tied back
-- to a partner branch (Cultura Fortaleza, Cultura Recife, etc.):
--
--   1. Seat-license redemption — existing. The `seat_licenses` row's
--      `partner_name` already captures this; nothing to add.
--
--   2. Promo-code purchase via Stripe — adds:
--        - player_edition_access.promotion_code         (user-facing code text)
--        - player_edition_access.promo_code_prefix      (derived; partner lookup key)
--        - partner_promo_prefixes (PREFIX → partner_name) lookup table
--      The webhook captures the code at checkout.session.completed
--      time and stores both. The admin attribution page joins on
--      promo_code_prefix to attribute revenue.
--
--   3. Direct branch-link signup — adds:
--        - players.partner_referrer    (slug from ?branch=<slug>)
--      Captured client-side from the URL → localStorage → signup body,
--      then written to the players row at first signup. Never
--      overwritten on subsequent logins so the original attribution
--      sticks.
--
-- All three columns are TEXT (no FK to a partners table) — partner
-- identifiers come from human input (admin sets seat_licenses.partner_name,
-- typed promo_code prefixes, hand-picked branch slugs). Refactor to a
-- proper partners table when we onboard partner #5 or so; for now the
-- text approach matches everything else in the schema.


-- =====================================================
-- PART 1: players.partner_referrer
-- =====================================================
-- Set once at first signup from the URL ?branch=<slug>. The
-- ensure-player + signup-instant API routes read it from the
-- signup body and write here. We do NOT overwrite on later sign-ins
-- (same pattern as user_type / edition) — original attribution wins.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS partner_referrer TEXT;

-- Speeds up the admin attribution page's per-partner aggregation.
CREATE INDEX IF NOT EXISTS idx_players_partner_referrer
  ON players(partner_referrer)
  WHERE partner_referrer IS NOT NULL;


-- =====================================================
-- PART 2: player_edition_access.promotion_code (+ derived prefix)
-- =====================================================
-- Captured by the Stripe webhook on checkout.session.completed when
-- the session has at least one discount. The webhook retrieves the
-- promotion code object from Stripe to get the user-facing `code`
-- string (e.g. "CC-CEARA-2026A-X9K3F2") and the derived prefix
-- (everything before the last hyphen — "CC-CEARA-2026A").

ALTER TABLE player_edition_access
  ADD COLUMN IF NOT EXISTS promotion_code TEXT;

ALTER TABLE player_edition_access
  ADD COLUMN IF NOT EXISTS promo_code_prefix TEXT;

-- Cheap aggregation index for the admin attribution page.
CREATE INDEX IF NOT EXISTS idx_player_edition_access_promo_prefix
  ON player_edition_access(promo_code_prefix)
  WHERE promo_code_prefix IS NOT NULL;


-- =====================================================
-- PART 3: partner_promo_prefixes — prefix → partner lookup
-- =====================================================
-- Tiny table. One row per bulk-generated promo-code batch with the
-- partner attribution baked in at generation time. The bulk-generate
-- admin route writes here automatically when called with a
-- partnerName param; admins can also INSERT rows manually for
-- legacy one-off codes set up in the Stripe dashboard.

CREATE TABLE IF NOT EXISTS partner_promo_prefixes (
  prefix          TEXT PRIMARY KEY,
  partner_name    TEXT NOT NULL,
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Server-only — RLS enabled with zero policies. Reads + writes go
-- through admin API routes using the service-role client.
ALTER TABLE partner_promo_prefixes ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- PART 4: Verification (uncomment to sanity-check)
-- =====================================================
-- -- 1. Columns + indexes present
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='players' AND column_name='partner_referrer';
-- SELECT column_name, data_type FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='player_edition_access'
--     AND column_name IN ('promotion_code','promo_code_prefix');
-- SELECT * FROM partner_promo_prefixes LIMIT 5;
--
-- -- 2. Quick aggregation smoke test (will be empty initially)
-- SELECT partner_referrer, COUNT(*) AS signups
--   FROM players WHERE partner_referrer IS NOT NULL
--   GROUP BY partner_referrer;

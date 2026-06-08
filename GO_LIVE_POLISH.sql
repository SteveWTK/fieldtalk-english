-- FieldTalk — go-live polish migrations
-- ---------------------------------------
-- Two narrow additions to run before the Cultura Fortaleza launch:
--
--   1. players.dashboard_tour_completed  (boolean, default false)
--      Drives the new arrow-style dashboard onboarding tour that
--      mounts on /dashboard for WC2026 players who haven't yet
--      seen it. Re-arm any user by flipping the column back to
--      false in the Supabase table editor.
--
--   2. v_players_full_access view
--      A SQL view that derives "has the user got Full Access right
--      now?" from player_edition_access (the source of truth) rather
--      than denormalising onto a column on `players`. Three reasons:
--        a. Access expires (one-time purchases past their
--           current_period_end, canceled subscriptions, seat
--           licences with a valid_until that has passed).
--        b. Multiple paths grant access (subscription, one-time
--           purchase, seat redemption, admin grant). Tracking a
--           boolean would mean keeping it in sync via triggers on
--           every webhook + redeem function — fragile.
--        c. Access is per-edition (a single player can in theory
--           hold access to multiple editions). A view computes
--           the answer cheaply at read time without flattening.
--
-- Both migrations are idempotent — re-running is safe.


-- =====================================================
-- PART 1: dashboard_tour_completed column
-- =====================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS dashboard_tour_completed BOOLEAN NOT NULL DEFAULT false;

-- The dashboard reads profile.dashboard_tour_completed on every
-- visit; existing players default to `false`, so they all see the
-- tour once after this column is added. If you'd rather skip the
-- tour for the existing tester cohort (so it only shows for brand-
-- new partner signups), uncomment the line below before running:
--
--   UPDATE players SET dashboard_tour_completed = true;


-- =====================================================
-- PART 2: v_players_full_access view
-- =====================================================
-- Single-source-of-truth derived view. Joins player rows against
-- their (most-recent, still-valid) access row and surfaces:
--   has_full_access  BOOLEAN  — true if any non-expired, active
--                                / trialing access row exists.
--   access_source    TEXT     — which path granted it (helps the
--                                admin team answer "did they pay
--                                or did they redeem a code?").
--   access_until     TIMESTAMPTZ — when access ends (NULL = no
--                                expiry, e.g. permanent admin
--                                grant or a one-off purchase
--                                whose oneTimeAccessEnd was null).
--
-- Use it from the admin user-tracking pages and the partner
-- attribution page:
--
--   SELECT p.full_name, p.email, v.has_full_access, v.access_source
--     FROM players p
--     JOIN v_players_full_access v ON v.player_id = p.id;

CREATE OR REPLACE VIEW v_players_full_access AS
SELECT
  p.id AS player_id,
  p.full_name,
  p.email,
  p.edition,
  COALESCE(latest.has_active, false) AS has_full_access,
  latest.source       AS access_source,
  latest.current_period_end AS access_until
FROM players p
LEFT JOIN LATERAL (
  SELECT
    true AS has_active,
    pea.source,
    pea.current_period_end
  FROM player_edition_access pea
  WHERE pea.player_id = p.id
    AND pea.status IN ('active', 'trialing')
    AND (
      pea.current_period_end IS NULL
      OR pea.current_period_end > now()
    )
  ORDER BY pea.granted_at DESC
  LIMIT 1
) latest ON true;

-- The view inherits the underlying tables' RLS — anon/auth see
-- nothing because players + player_edition_access both deny
-- non-owner reads. The admin client (service role) bypasses RLS
-- and sees everything, which is what the admin pages need.


-- =====================================================
-- PART 3: Helper function (optional — handy for ad-hoc SQL)
-- =====================================================
-- Wraps the same logic into a single-argument boolean for quick
-- one-off checks ("does this player have Full Access?"):
--
--   SELECT has_full_access('<player-uuid>');

CREATE OR REPLACE FUNCTION public.has_full_access(p_player_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  v_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM player_edition_access pea
    WHERE pea.player_id = p_player_id
      AND pea.status IN ('active', 'trialing')
      AND (pea.current_period_end IS NULL OR pea.current_period_end > now())
  ) INTO v_exists;
  RETURN v_exists;
END;
$$;


-- =====================================================
-- Verification (uncomment to sanity-check after running)
-- =====================================================
-- -- 1. Column added
-- SELECT column_name, data_type, column_default FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='players'
--     AND column_name='dashboard_tour_completed';
--
-- -- 2. View resolves cleanly + spot-check rows
-- SELECT player_id, full_name, edition, has_full_access, access_source, access_until
--   FROM v_players_full_access
--  ORDER BY has_full_access DESC, full_name
--  LIMIT 20;
--
-- -- 3. Function works
-- SELECT has_full_access((SELECT id FROM players LIMIT 1));

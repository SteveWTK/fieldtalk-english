-- DYNAMIC_STICKER_RATINGS.sql
--
-- Phase 1 schema for dynamic sticker ratings driven by API-Football.
-- Adds fields to sticker_players + a history audit table.
--
-- New columns on sticker_players:
--
--   api_football_player_id  INTEGER NULL
--     Maps a sticker to the player's API-Football player_id. NULL
--     means "not mapped yet" — the daily cron SKIPS those rows and
--     leaves their rating untouched. Once mapped, the cron starts
--     updating that sticker's rating each morning.
--
--   previous_rating  INTEGER NULL
--     The rating this sticker had BEFORE the most recent recompute.
--     Powers the ★↑ / ★↓ animation + tooltip in the UI ("Mbappé
--     dropped from 5★ to 4★ overnight"). NULL until first recompute.
--
--   rating_updated_at  TIMESTAMPTZ NULL
--     When the cron last touched this sticker. Lets the UI fade the
--     animation after 24h and surface "stale" ratings in admin.
--
--   rating_change_reason  TEXT NULL
--     Short human-readable explanation for the tooltip:
--       "Played 4 min vs Argentina, rated 5.8"
--       "2 goals + 1 assist across 2 games, avg 7.4"
--     The cron writes this when it adjusts a rating. NULL = no recent
--     change to explain.
--
-- New table sticker_rating_history:
--
--   One row per (sticker, recompute run). Lets us a) explain to a
--   user "your squad value dropped because Mbappé went 5★→4★ on
--   2026-06-18", b) sanity-check the algorithm by rolling back a
--   bad run, and c) chart rating trajectory per sticker.

ALTER TABLE sticker_players
  ADD COLUMN IF NOT EXISTS api_football_player_id INTEGER,
  ADD COLUMN IF NOT EXISTS previous_rating INTEGER,
  ADD COLUMN IF NOT EXISTS rating_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rating_change_reason TEXT;

-- Partial index so the recompute query "all stickers with a mapping"
-- is index-only. Skips the 1000+ unmapped rows during early rollout.
CREATE INDEX IF NOT EXISTS idx_sticker_players_api_football
  ON sticker_players (api_football_player_id)
  WHERE api_football_player_id IS NOT NULL;

-- Audit log of every rating change. sticker_id is UUID to match
-- sticker_players.id (we use the supabase default UUID PK there,
-- not a BIGSERIAL).
CREATE TABLE IF NOT EXISTS sticker_rating_history (
  id              BIGSERIAL PRIMARY KEY,
  sticker_id      UUID NOT NULL REFERENCES sticker_players(id) ON DELETE CASCADE,
  recomputed_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  previous_rating INTEGER,
  new_rating      INTEGER,
  reason          TEXT,
  -- Raw payload from API-Football that drove the decision. Stored
  -- as JSONB so we can re-derive the rating later with a different
  -- algorithm without re-paying the API call.
  source          JSONB
);

CREATE INDEX IF NOT EXISTS idx_sticker_rating_history_sticker_time
  ON sticker_rating_history (sticker_id, recomputed_at DESC);

-- ──────────────────────────────────────────────────────────────────
-- RLS — history table is read-only for everyone except the service
-- role (cron writes it, admin pages read it via the admin client).
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE sticker_rating_history ENABLE ROW LEVEL SECURITY;

-- No public policies. Service role bypasses RLS, so the cron + admin
-- pages can still read/write. End users never query this directly —
-- the previous_rating + reason columns on sticker_players carry
-- everything the client UI needs.

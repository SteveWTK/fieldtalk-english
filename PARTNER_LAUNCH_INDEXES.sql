-- FieldTalk — partner-launch readiness indexes
-- ---------------------------------------------
-- Run once in Supabase SQL editor. Idempotent (IF NOT EXISTS).
--
-- Five small indexes covering the heavy-read patterns the app
-- exercises on every dashboard / lesson-list / leaderboard render.
-- Each one is a few KB at current scale (tables have tens of rows)
-- and stays cheap to maintain as Cultura traffic grows; running
-- them now means there's nothing to scramble for at 500+ users.
--
-- Why these specifically:
--
--   1. lesson_completions(player_id)
--      Hit on every /lesson page load to mark which lessons the user
--      has finished. Without this, the dashboard's
--      usePlayerDashboard hook does a sequential scan on every
--      mount.
--
--   2. player_xp_events(player_id, earned_at DESC)
--      Hit by the admin user-tracking page, the partner-tracking
--      events endpoint, and the cron jobs that determine
--      most-recent-active timestamps. The two-column ordering means
--      the planner can answer "give me this player's most recent N
--      events" without sorting.
--
--   3. pack_openings(player_id)
--      Hit on every dashboard render to compute packs-available
--      from total_xp minus opened-pack count. Also by the daily
--      pack-reminders cron.
--
--   4. player_stickers(player_id)
--      Hit by the album page, the dashboard pack vault tile, the
--      leaderboard's album-percentage sort, and the squad editor.
--
--   5. players(partner_referrer) — partial, non-null only.
--      Hit by the new leaderboard branch filter (next step in this
--      change), partner attribution queries, and the admin
--      partner-tracking pages. Partial-index keyword means only
--      players who came via a branch link are stored — tiny.

CREATE INDEX IF NOT EXISTS idx_lesson_completions_player
  ON lesson_completions(player_id);

CREATE INDEX IF NOT EXISTS idx_player_xp_events_player_earned
  ON player_xp_events(player_id, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_pack_openings_player
  ON pack_openings(player_id);

CREATE INDEX IF NOT EXISTS idx_player_stickers_player
  ON player_stickers(player_id);

-- Partial index — only stores rows where partner_referrer is set.
-- (PARTNER_ATTRIBUTION_SCHEMA.sql earlier creates one with the same
-- definition; CREATE INDEX IF NOT EXISTS makes re-running safe.)
CREATE INDEX IF NOT EXISTS idx_players_partner_referrer
  ON players(partner_referrer)
  WHERE partner_referrer IS NOT NULL;


-- =====================================================
-- Verification (uncomment after running)
-- =====================================================
-- -- Confirm all five made it onto their tables
-- SELECT tablename, indexname
--   FROM pg_indexes
--  WHERE schemaname = 'public'
--    AND indexname IN (
--      'idx_lesson_completions_player',
--      'idx_player_xp_events_player_earned',
--      'idx_pack_openings_player',
--      'idx_player_stickers_player',
--      'idx_players_partner_referrer'
--    )
--  ORDER BY tablename, indexname;
--
-- -- See how cheap they are in size
-- SELECT
--   schemaname || '.' || relname AS table,
--   indexrelname AS index,
--   pg_size_pretty(pg_relation_size(indexrelid)) AS size
--   FROM pg_stat_user_indexes
--  WHERE schemaname='public'
--    AND indexrelname LIKE 'idx_%'
--  ORDER BY pg_relation_size(indexrelid) DESC;

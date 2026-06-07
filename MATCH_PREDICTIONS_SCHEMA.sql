-- FieldTalk — Match Predictions Centre schema
-- --------------------------------------------
-- Run once in the Supabase SQL editor. Idempotent (IF NOT EXISTS,
-- OR REPLACE, DROP POLICY IF EXISTS) so re-running is safe.
--
-- Adds:
--   1. matches            — tournament schedule + final result
--   2. match_predictions  — user picks per (player, match, type)
--   3. RLS policies       — public read on matches, owner-only on picks
--   4. resolve_match()    — atomic function that grades every pick
--                            for a match in one transaction, awards XP
--                            via the standard player_xp_events trail.
--   5. Sample seed        — six placeholder Group-A matches so you can
--                            test the Centre end-to-end. Replace with
--                            the real WC2026 schedule.
--
-- Important: this lives ALONGSIDE the existing `predictions` table
-- (which holds lesson-embedded group-finish picks). Different data
-- model, different lifecycle, different surface — they coexist.


-- =====================================================
-- PART 1: matches — the tournament schedule
-- =====================================================
-- Edition-scoped so future tournaments (EURO 2028, CL 26/27) reuse
-- the same code. Plain-text team names for WC2026; refactor to a
-- teams table when the second edition lands.

CREATE TABLE IF NOT EXISTS matches (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  edition               TEXT NOT NULL DEFAULT 'wc2026',
  -- 'group_a' … 'group_l' for WC2026's twelve groups; 'r32', 'r16',
  -- 'qf', 'sf', 'third', 'final' for the knockout rounds.
  stage                 TEXT NOT NULL,
  home_team             TEXT NOT NULL,
  away_team             TEXT NOT NULL,
  -- ISO 3166-1 alpha-2 (lowercase) — used by the UI to look up
  -- flag images / emojis. Nullable so an interim TBD knockout-round
  -- entry ("Group A winner vs Group B runner-up") can be stored
  -- before teams are known.
  home_team_code        TEXT,
  away_team_code        TEXT,
  kickoff_at            TIMESTAMPTZ NOT NULL,
  -- When users can first see + start submitting picks. Default is
  -- kickoff - 7 days; admins can shift per match if needed.
  predictions_open_at   TIMESTAMPTZ NOT NULL DEFAULT (now() - INTERVAL '1 second'),
  status                TEXT NOT NULL DEFAULT 'scheduled'
                          CHECK (status IN ('scheduled', 'live', 'finished')),
  -- Result fields — null until admin enters them.
  home_score            INT,
  away_score            INT,
  -- 'home' | 'away' | 'none' (0–0 draw). Used by the
  -- first_scorer_team prediction resolver.
  first_scorer_team     TEXT CHECK (first_scorer_team IN ('home', 'away', 'none')),
  venue                 TEXT,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_kickoff      ON matches(kickoff_at);
CREATE INDEX IF NOT EXISTS idx_matches_edition_kickoff
  ON matches(edition, kickoff_at);
CREATE INDEX IF NOT EXISTS idx_matches_status       ON matches(status);
-- The Centre lists upcoming + unresolved; this partial index makes
-- that query cheap as the season fills up with resolved matches.
CREATE INDEX IF NOT EXISTS idx_matches_unresolved
  ON matches(kickoff_at)
  WHERE resolved_at IS NULL;


-- =====================================================
-- PART 2: match_predictions — the user picks
-- =====================================================
-- One row per (player, match, prediction_type). Three types in
-- MVP — 'winner', 'exact_score', 'first_scorer_team'. Add more by
-- appending to the CHECK and writing a new branch in resolve_match.

CREATE TABLE IF NOT EXISTS match_predictions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id             UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  match_id              UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  prediction_type       TEXT NOT NULL
                          CHECK (prediction_type IN (
                            'winner',
                            'exact_score',
                            'first_scorer_team'
                          )),
  -- Shape per type:
  --   winner             { "winner": "home" | "away" | "draw" }
  --   exact_score        { "home": 2, "away": 1 }
  --   first_scorer_team  { "team":   "home" | "away" | "none" }
  prediction_data       JSONB NOT NULL,
  -- Resolution fields, null until resolve_match() runs.
  correct               BOOLEAN,
  xp_awarded            INT,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (player_id, match_id, prediction_type)
);

CREATE INDEX IF NOT EXISTS idx_match_predictions_player
  ON match_predictions(player_id);
CREATE INDEX IF NOT EXISTS idx_match_predictions_match
  ON match_predictions(match_id);
-- Used by the Centre's per-player list to find unresolved picks.
CREATE INDEX IF NOT EXISTS idx_match_predictions_player_unresolved
  ON match_predictions(player_id)
  WHERE resolved_at IS NULL;


-- =====================================================
-- PART 3: Row-level security
-- =====================================================
-- matches is public-read (anyone can see the schedule, including
-- signed-out visitors browsing a future "share your bracket" link).
-- Writes go through service-role (admin scheduling + result entry),
-- so no insert/update policies for anon/auth — RLS blocks by default.

ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "matches_public_read" ON matches;
CREATE POLICY "matches_public_read"
  ON matches FOR SELECT
  TO anon, authenticated
  USING (true);


-- match_predictions is owner-only on every operation.
ALTER TABLE match_predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "match_predictions_select_own" ON match_predictions;
DROP POLICY IF EXISTS "match_predictions_insert_own" ON match_predictions;
DROP POLICY IF EXISTS "match_predictions_update_own" ON match_predictions;
DROP POLICY IF EXISTS "match_predictions_delete_own" ON match_predictions;
CREATE POLICY "match_predictions_select_own"
  ON match_predictions FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());
CREATE POLICY "match_predictions_insert_own"
  ON match_predictions FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());
CREATE POLICY "match_predictions_update_own"
  ON match_predictions FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());
CREATE POLICY "match_predictions_delete_own"
  ON match_predictions FOR DELETE
  TO authenticated
  USING (player_id = auth.uid());


-- =====================================================
-- PART 4: resolve_match() — atomic per-match grader
-- =====================================================
-- Wrapping the resolution in a single Postgres function gives us:
--   - Idempotency (re-running for an already-resolved match is a
--     no-op that returns the original counts).
--   - Atomicity (every pick + XP event + player_progress bump
--     either all commit or all roll back).
--   - Single source of truth for XP per type — tweak here, every
--     trigger picks it up.
--
-- XP table (kept in sync with src/lib/predictions/rewards.js). The
-- amounts are calibrated to pack_xp_cost = 200 so a correct pick
-- directly translates to N unopened packs:
--   winner             200 XP  (= 1 pack)
--   exact_score        600 XP  (= 3 packs)
--   first_scorer_team  200 XP  (= 1 pack)
--
-- Call from the admin resolve route AFTER setting home_score,
-- away_score and first_scorer_team on the match row.

CREATE OR REPLACE FUNCTION public.resolve_match(p_match_id UUID)
RETURNS TABLE (
  predictions_resolved INT,
  total_xp_awarded     INT
) AS $$
DECLARE
  v_match RECORD;
  v_count INT := 0;
  v_total_xp INT := 0;
BEGIN
  -- Lock the match row so concurrent resolves serialise.
  SELECT * INTO v_match
    FROM matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match % not found', p_match_id;
  END IF;

  IF v_match.home_score IS NULL OR v_match.away_score IS NULL THEN
    RAISE EXCEPTION 'Match % has no score yet — set home_score and away_score first', p_match_id;
  END IF;

  -- Idempotent: if already resolved, return the current totals as
  -- a no-op so callers can retry safely.
  IF v_match.resolved_at IS NOT NULL THEN
    SELECT COUNT(*)::INT, COALESCE(SUM(xp_awarded), 0)::INT
      INTO v_count, v_total_xp
      FROM match_predictions
     WHERE match_id = p_match_id;
    RETURN QUERY SELECT v_count, v_total_xp;
    RETURN;
  END IF;

  -- ── Grade winner picks ──
  UPDATE match_predictions mp
     SET correct = CASE
           WHEN mp.prediction_data->>'winner' = 'home' AND v_match.home_score > v_match.away_score THEN TRUE
           WHEN mp.prediction_data->>'winner' = 'away' AND v_match.away_score > v_match.home_score THEN TRUE
           WHEN mp.prediction_data->>'winner' = 'draw' AND v_match.home_score = v_match.away_score THEN TRUE
           ELSE FALSE
         END,
         xp_awarded = CASE
           WHEN mp.prediction_data->>'winner' = 'home' AND v_match.home_score > v_match.away_score THEN 200
           WHEN mp.prediction_data->>'winner' = 'away' AND v_match.away_score > v_match.home_score THEN 200
           WHEN mp.prediction_data->>'winner' = 'draw' AND v_match.home_score = v_match.away_score THEN 200
           ELSE 0
         END,
         resolved_at = now(),
         updated_at = now()
   WHERE mp.match_id = p_match_id
     AND mp.prediction_type = 'winner';

  -- ── Grade exact_score picks ──
  UPDATE match_predictions mp
     SET correct = (
           COALESCE((mp.prediction_data->>'home')::INT, -1) = v_match.home_score
           AND COALESCE((mp.prediction_data->>'away')::INT, -1) = v_match.away_score
         ),
         xp_awarded = CASE
           WHEN COALESCE((mp.prediction_data->>'home')::INT, -1) = v_match.home_score
            AND COALESCE((mp.prediction_data->>'away')::INT, -1) = v_match.away_score THEN 600
           ELSE 0
         END,
         resolved_at = now(),
         updated_at = now()
   WHERE mp.match_id = p_match_id
     AND mp.prediction_type = 'exact_score';

  -- ── Grade first_scorer_team picks ──
  -- Only graded if the admin set first_scorer_team on the match; if
  -- the field is null we leave these as unresolved (so they can be
  -- backfilled later without re-grading the winner / exact-score).
  IF v_match.first_scorer_team IS NOT NULL THEN
    UPDATE match_predictions mp
       SET correct = (mp.prediction_data->>'team' = v_match.first_scorer_team),
           xp_awarded = CASE
             WHEN mp.prediction_data->>'team' = v_match.first_scorer_team THEN 200
             ELSE 0
           END,
           resolved_at = now(),
           updated_at = now()
     WHERE mp.match_id = p_match_id
       AND mp.prediction_type = 'first_scorer_team';
  END IF;

  -- ── Per-player XP event (one row per player aggregating the
  --     three picks on this match) ──
  INSERT INTO player_xp_events (player_id, source, source_id, amount, metadata)
  SELECT
    mp.player_id,
    'match_prediction',
    p_match_id::TEXT,
    SUM(mp.xp_awarded)::INT,
    jsonb_build_object(
      'match_id',  p_match_id,
      'home_team', v_match.home_team,
      'away_team', v_match.away_team,
      'home_score', v_match.home_score,
      'away_score', v_match.away_score
    )
    FROM match_predictions mp
   WHERE mp.match_id = p_match_id
     AND COALESCE(mp.xp_awarded, 0) > 0
   GROUP BY mp.player_id;

  -- ── Bump player_progress.total_xp for existing rows ──
  UPDATE player_progress pp
     SET total_xp = COALESCE(pp.total_xp, 0) + sub.total,
         updated_at = now()
    FROM (
      SELECT player_id, SUM(xp_awarded)::INT AS total
        FROM match_predictions
       WHERE match_id = p_match_id
         AND COALESCE(xp_awarded, 0) > 0
       GROUP BY player_id
    ) sub
   WHERE pp.player_id = sub.player_id;

  -- ── Create player_progress rows for any earners without one ──
  -- Belt-and-braces: every active player should have a progress row
  -- already, but if signup race-conditions ever left someone
  -- without one we don't want to silently swallow their XP.
  INSERT INTO player_progress (player_id, total_xp)
  SELECT mp.player_id, SUM(mp.xp_awarded)::INT
    FROM match_predictions mp
    LEFT JOIN player_progress pp ON pp.player_id = mp.player_id
   WHERE mp.match_id = p_match_id
     AND COALESCE(mp.xp_awarded, 0) > 0
     AND pp.player_id IS NULL
   GROUP BY mp.player_id;

  -- ── Mark match resolved ──
  UPDATE matches
     SET resolved_at = now(),
         status = 'finished',
         updated_at = now()
   WHERE id = p_match_id;

  -- ── Return counts ──
  SELECT COUNT(*)::INT, COALESCE(SUM(xp_awarded), 0)::INT
    INTO v_count, v_total_xp
    FROM match_predictions
   WHERE match_id = p_match_id;

  RETURN QUERY SELECT v_count, v_total_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- PART 5: Sample seed — replace with the real WC2026 schedule
-- =====================================================
-- Six Group-A matchday-1 fixtures so the Centre has something to
-- render the moment you deploy. Times are placeholder; edit + add
-- the rest of the 104-match schedule when ready.
--
-- Once you've inserted the full schedule, drop this block (or just
-- skip it on re-runs — the IF NOT EXISTS guard at the top is on
-- the table, not on the rows).
--
-- Idempotent: every INSERT uses ON CONFLICT DO NOTHING keyed on
-- (edition, stage, home_team, away_team, kickoff_at), so re-running
-- this file won't duplicate the seed.

CREATE UNIQUE INDEX IF NOT EXISTS uniq_matches_fixture
  ON matches(edition, stage, home_team, away_team, kickoff_at);

INSERT INTO matches (
  edition, stage,
  home_team, home_team_code,
  away_team, away_team_code,
  kickoff_at, venue
) VALUES
  ('wc2026', 'group_a',  'Mexico',   'mx', 'New Zealand', 'nz',
   '2026-06-11 20:00:00-03',         'Estadio Azteca, Mexico City'),
  ('wc2026', 'group_b',  'Canada',   'ca', 'Tunisia',     'tn',
   '2026-06-12 16:00:00-03',         'BMO Field, Toronto'),
  ('wc2026', 'group_d',  'USA',      'us', 'Saudi Arabia','sa',
   '2026-06-12 19:00:00-03',         'SoFi Stadium, Los Angeles'),
  ('wc2026', 'group_e',  'Brasil',   'br', 'Argentina',   'ar',
   '2026-06-13 17:00:00-03',         'MetLife Stadium, New Jersey'),
  ('wc2026', 'group_f',  'France',   'fr', 'Senegal',     'sn',
   '2026-06-13 20:00:00-03',         'AT&T Stadium, Dallas'),
  ('wc2026', 'group_g',  'England',  'gb', 'Croatia',     'hr',
   '2026-06-14 16:00:00-03',         'Mercedes-Benz Stadium, Atlanta')
ON CONFLICT (edition, stage, home_team, away_team, kickoff_at) DO NOTHING;


-- =====================================================
-- PART 6: Verification queries
-- =====================================================
-- Uncomment to verify the migration. They don't change anything.
--
--   -- 1. Tables + policies present
--   SELECT tablename, rowsecurity FROM pg_tables
--    WHERE schemaname='public' AND tablename IN ('matches','match_predictions');
--   SELECT tablename, policyname, cmd FROM pg_policies
--    WHERE schemaname='public' AND tablename IN ('matches','match_predictions')
--    ORDER BY tablename, policyname;
--
--   -- 2. Sample matches loaded
--   SELECT stage, home_team, away_team, kickoff_at, status
--     FROM matches WHERE edition='wc2026' ORDER BY kickoff_at;
--
--   -- 3. End-to-end smoke test of resolve_match (uncomment + adjust):
--   --   UPDATE matches SET home_score=2, away_score=1, first_scorer_team='home'
--   --    WHERE home_team='Brasil' AND away_team='Argentina';
--   --   SELECT * FROM resolve_match(
--   --     (SELECT id FROM matches WHERE home_team='Brasil' AND away_team='Argentina')
--   --   );

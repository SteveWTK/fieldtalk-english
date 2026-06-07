-- FieldTalk — go-live fixes (2026-06-07)
-- ---------------------------------------
-- Two narrow migrations to run BEFORE deploying the new code:
--
--   1. Bumped prediction XP rewards (winner/exact_score/first_scorer
--      now award 200/600/200 XP, matching 1/3/1 sticker pack drops
--      at pack_xp_cost = 200). Replaces only the resolve_match()
--      function — no table changes, no data migration.
--
--   2. Backfill the welcome sticker pack for testers who signed up
--      before the starter-bonus code shipped. Inserts a
--      'welcome_bonus' XP event for any player without one and
--      bumps their player_progress total by 200 XP. Idempotent on
--      re-run.
--
-- Both halves are independent — run them separately if you want to
-- audit between steps.

-- =====================================================
-- PART 1: Updated resolve_match() with new XP values
-- =====================================================
-- CREATE OR REPLACE swaps the function in place. Any in-flight
-- transactions complete on the old version; new calls hit the new
-- one. No outage, no data churn.

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
  SELECT * INTO v_match
    FROM matches
   WHERE id = p_match_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match % not found', p_match_id;
  END IF;
  IF v_match.home_score IS NULL OR v_match.away_score IS NULL THEN
    RAISE EXCEPTION 'Match % has no score yet', p_match_id;
  END IF;

  IF v_match.resolved_at IS NOT NULL THEN
    SELECT COUNT(*)::INT, COALESCE(SUM(xp_awarded), 0)::INT
      INTO v_count, v_total_xp
      FROM match_predictions
     WHERE match_id = p_match_id;
    RETURN QUERY SELECT v_count, v_total_xp;
    RETURN;
  END IF;

  -- winner → 200 XP (= 1 pack)
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

  -- exact_score → 600 XP (= 3 packs)
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

  -- first_scorer_team → 200 XP (= 1 pack)
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

  -- Per-player XP event (one row aggregating the three picks).
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

  -- Bump player_progress.total_xp for existing rows.
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

  -- Belt-and-braces row creation for players without progress yet.
  INSERT INTO player_progress (player_id, total_xp)
  SELECT mp.player_id, SUM(mp.xp_awarded)::INT
    FROM match_predictions mp
    LEFT JOIN player_progress pp ON pp.player_id = mp.player_id
   WHERE mp.match_id = p_match_id
     AND COALESCE(mp.xp_awarded, 0) > 0
     AND pp.player_id IS NULL
   GROUP BY mp.player_id;

  -- Mark match resolved.
  UPDATE matches
     SET resolved_at = now(),
         status = 'finished',
         updated_at = now()
   WHERE id = p_match_id;

  SELECT COUNT(*)::INT, COALESCE(SUM(xp_awarded), 0)::INT
    INTO v_count, v_total_xp
    FROM match_predictions
   WHERE match_id = p_match_id;

  RETURN QUERY SELECT v_count, v_total_xp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =====================================================
-- PART 2: Welcome-bonus backfill for existing testers
-- =====================================================
-- Two-step CTE: insert XP events for anyone missing one, then
-- aggregate just-inserted amounts into player_progress. Tagged
-- with metadata.backfill = true so it's distinguishable from
-- new signup grants in the audit log.

WITH new_events AS (
  INSERT INTO player_xp_events (player_id, source, amount, metadata)
  SELECT
    p.id,
    'welcome_bonus',
    200,
    jsonb_build_object('note', 'Welcome sticker pack backfill', 'backfill', true)
  FROM players p
  WHERE NOT EXISTS (
    SELECT 1 FROM player_xp_events e
    WHERE e.player_id = p.id AND e.source = 'welcome_bonus'
  )
  RETURNING player_id, amount
)
INSERT INTO player_progress (player_id, total_xp)
SELECT player_id, amount FROM new_events
ON CONFLICT (player_id) DO UPDATE
SET total_xp = COALESCE(player_progress.total_xp, 0) + EXCLUDED.total_xp,
    updated_at = now();


-- =====================================================
-- Verification (uncomment to sanity-check)
-- =====================================================
-- -- How many testers got the backfill?
-- SELECT COUNT(*) AS testers_with_starter
--   FROM player_xp_events
--  WHERE source = 'welcome_bonus';
--
-- -- Spot-check a player's pack math:
-- --   packs_earned = floor(total_xp / pack_xp_cost)
-- --   packs_available = packs_earned - count(pack_openings)
-- SELECT
--   pp.player_id,
--   pp.total_xp,
--   floor(pp.total_xp / 200)::INT AS packs_earned,
--   (SELECT COUNT(*) FROM pack_openings WHERE player_id = pp.player_id) AS packs_opened
-- FROM player_progress pp
-- ORDER BY pp.updated_at DESC
-- LIMIT 10;

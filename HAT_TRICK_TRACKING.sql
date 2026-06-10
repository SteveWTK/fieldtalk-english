-- FieldTalk — hat-trick tracking
-- -------------------------------
-- Run once in the Supabase SQL editor. Idempotent.
--
-- Adds the "hat-trick" achievement: a user predicts all THREE
-- prediction types (winner, exact score, first scorer) for a
-- single match and gets all three correct. Each hat-trick is
-- worth 1000 XP — the existing per-pick XP rewards already cover
-- this, so we don't grant additional XP here. The badge is the
-- additional reward + bragging right + retention hook.
--
-- Why "hat-trick" (vs the user's suggested "Clean Sweep"):
--   - It's the universal football term for 3-in-1 (3 goals in
--     one match by one player). Reads naturally in both EN and PT
--     audiences — Brazilian football commentary uses "hat-trick"
--     untranslated.
--   - Maps cleanly to the mechanic: 3 correct predictions in 1 match.
--   - Easy to plurise ("3 hat-tricks") without sounding clunky.
--
-- Implementation:
--   1. Column on player_progress to hold the running count.
--   2. resolve_match() bumps it for any player who got all 3
--      of their 3-out-of-3 predictions correct on that match.
--   3. Backfill from existing resolved matches so the count is
--      correct from day one (relevant if you've already resolved
--      test matches).

-- =====================================================
-- PART 1: hat_trick_count column on player_progress
-- =====================================================
ALTER TABLE player_progress
  ADD COLUMN IF NOT EXISTS hat_trick_count INT NOT NULL DEFAULT 0;


-- =====================================================
-- PART 2: Updated resolve_match() with hat-trick bump
-- =====================================================
-- Wholesale replacement of the function. CREATE OR REPLACE swaps
-- in place; no in-flight transactions are interrupted.
--
-- Behaviour:
--   - Grades all three prediction types per match (winner, exact
--     score, first_scorer_team) — same as before.
--   - Awards XP into player_xp_events + bumps player_progress.total_xp
--     — same as before.
--   - NEW: for each player who submitted all three prediction
--     types AND got all three correct on this match, increments
--     player_progress.hat_trick_count by 1.
--   - Idempotent re-runs: if resolved_at is already set, returns
--     the current totals without bumping anything.

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

  -- winner → 200 XP
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

  -- exact_score → 600 XP
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

  -- first_scorer_team → 200 XP
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

  -- Per-player XP event
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

  -- Bump player_progress.total_xp for existing rows
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

  -- Belt-and-braces row creation for players without progress yet
  INSERT INTO player_progress (player_id, total_xp)
  SELECT mp.player_id, SUM(mp.xp_awarded)::INT
    FROM match_predictions mp
    LEFT JOIN player_progress pp ON pp.player_id = mp.player_id
   WHERE mp.match_id = p_match_id
     AND COALESCE(mp.xp_awarded, 0) > 0
     AND pp.player_id IS NULL
   GROUP BY mp.player_id;

  -- ── NEW: hat-trick bump ──
  -- A "hat-trick" = the player submitted all three prediction types
  -- for this match AND every single one of those was graded
  -- correct. We compute per-player counts INSIDE the match scope
  -- and bump player_progress.hat_trick_count by 1 for each
  -- qualifying player. resolve_match is idempotent at the match
  -- level (early-return when resolved_at is set), so each match
  -- contributes at most one hat-trick per player even if the
  -- function is somehow invoked twice.
  UPDATE player_progress pp
     SET hat_trick_count = COALESCE(pp.hat_trick_count, 0) + 1,
         updated_at = now()
    FROM (
      SELECT
        player_id,
        COUNT(*) FILTER (WHERE correct = true) AS correct_count,
        COUNT(*) AS submitted_count
      FROM match_predictions
      WHERE match_id = p_match_id
      GROUP BY player_id
    ) sub
   WHERE pp.player_id = sub.player_id
     AND sub.correct_count = 3
     AND sub.submitted_count = 3;

  -- Mark match resolved
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
-- PART 3: Backfill from already-resolved matches
-- =====================================================
-- One-off: counts how many resolved matches each player has
-- already hat-tricked on and seeds hat_trick_count accordingly.
-- Safe to re-run — it RESETS the count from the source of truth
-- (match_predictions), so it can't double-count.

UPDATE player_progress pp
   SET hat_trick_count = COALESCE(sub.cnt, 0),
       updated_at = now()
  FROM (
    SELECT
      mp.player_id,
      COUNT(*) AS cnt
    FROM (
      SELECT
        player_id,
        match_id,
        COUNT(*) FILTER (WHERE correct = true) AS correct_count,
        COUNT(*) AS submitted_count
      FROM match_predictions
      WHERE resolved_at IS NOT NULL
      GROUP BY player_id, match_id
    ) per_match
    JOIN match_predictions mp
      ON mp.player_id = per_match.player_id
     AND mp.match_id  = per_match.match_id
    WHERE per_match.correct_count = 3
      AND per_match.submitted_count = 3
    GROUP BY mp.player_id
  ) sub
 WHERE pp.player_id = sub.player_id;


-- =====================================================
-- Verification (uncomment after running)
-- =====================================================
-- SELECT player_id, total_xp, hat_trick_count
--   FROM player_progress
--  WHERE hat_trick_count > 0
--  ORDER BY hat_trick_count DESC, total_xp DESC
--  LIMIT 20;

-- PROPATH_LESSON_MAX_XP_V2.sql
--
-- Replaces the naive JSONB-scan max_xp trigger from V1 with a
-- stepTypeDefaults-driven computation. Rationale:
--
--   V1 walked $.**.xp_reward through the content JSONB — but the
--   real "step's XP" resolution is per-type (via src/lib/xp/
--   stepTypeDefaults.js), with the JSON's xp_reward acting only as
--   an optional per-step override. V1 also overcounted for reasons
--   related to how $.** descends nested structures (real cases
--   showed max_xp values ~2× the actual sum). V2 fixes both by:
--
--     1. Introducing a step_type_xp_defaults DB table mirroring the
--        JS file's constants. This becomes the DB-side source of
--        truth for "how much is a step of type X worth by default?"
--     2. Rewriting the trigger to iterate content->'steps' (not
--        recursive) and sum: step.xp_reward IF explicitly set,
--        otherwise the default for the step's type, otherwise 20.
--
-- Keeps the JS getStepXp() resolution order intact — same rules,
-- same numbers, single source of truth (the JS file authors adjust
-- values there; this table is re-synced on schema deploys).
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ── Defaults table ────────────────────────────────────────────────
-- Column names + values kept in sync with STEP_XP_DEFAULTS in
-- src/lib/xp/stepTypeDefaults.js. When you edit the JS file, edit
-- this INSERT too (or re-run this migration).
CREATE TABLE IF NOT EXISTS step_type_xp_defaults (
  step_type  TEXT PRIMARY KEY,
  xp         INTEGER NOT NULL DEFAULT 20,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO step_type_xp_defaults (step_type, xp) VALUES
  -- Pitch + drag-drop family
  ('interactive_pitch_formation', 25),
  ('interactive_game_formation', 40),
  ('drag_drop_formation', 30),
  ('drag_drop_groups', 30),
  ('drag_drop_vocab', 30),
  -- Listening / comprehension
  ('audio_comprehension', 20),
  ('ai_listening_challenge', 30),
  -- Memory / matching
  ('memory_match', 40),
  -- AI-assisted
  ('ai_speech_practice', 30),
  ('ai_gap_fill', 30),
  ('ai_writing', 35),
  ('ai_conversation', 35),
  ('ai_multiple_choice_gap_fill', 30),
  -- Reading / instructional
  ('scenario', 0),
  ('vocabulary', 0),
  ('pronunciation_drill', 20),
  ('timeline_drag', 30),
  ('conversation_vote', 20),
  -- Legacy / generic types the CMS may emit
  ('gap_fill', 30),
  ('multiple_choice', 20),
  -- Sentinels — completion is the wrapper screen and shouldn't grant
  -- XP on its own; per-step totals are accumulated by the lesson page.
  ('completion', 0)
ON CONFLICT (step_type) DO UPDATE SET
  xp = EXCLUDED.xp,
  updated_at = now();

-- ── Trigger rewrite ───────────────────────────────────────────────
-- Iterates NEW.content->'steps' (assumes the standard multi_step
-- wrapper). For each step:
--   - If the JSON has a valid integer step.xp_reward → use it
--     (per-step override, matches getStepXp()'s resolution).
--   - Else look up STEP_XP_DEFAULTS[step.type] in the table above.
--   - Else fall back to 20 (matches the JS getStepXp() fallback).
-- Lessons whose content lacks a `steps` array end up with max_xp = 0
-- — safe because the hook's segmentForLesson() handles maxXp = 0
-- explicitly (see comment there).
CREATE OR REPLACE FUNCTION set_lesson_max_xp()
RETURNS TRIGGER AS $$
DECLARE
  computed INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(
    CASE
      WHEN (step->>'xp_reward') IS NOT NULL
        AND (step->>'xp_reward') ~ '^-?\d+$'
        THEN (step->>'xp_reward')::int
      ELSE COALESCE(
        (SELECT xp FROM step_type_xp_defaults
          WHERE step_type = step->>'type'),
        20
      )
    END
  ), 0)
  INTO computed
  FROM jsonb_array_elements(
    COALESCE(NEW.content->'steps', '[]'::jsonb)
  ) AS step;
  NEW.max_xp := computed;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger definition unchanged from V1 — recreate defensively so
-- V1-only environments pick up the new function.
DROP TRIGGER IF EXISTS trg_lesson_max_xp ON lessons;
CREATE TRIGGER trg_lesson_max_xp
  BEFORE INSERT OR UPDATE OF content ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_lesson_max_xp();

-- ── Recompute existing rows ───────────────────────────────────────
-- Fires the trigger (via SET content = content) so the current 12
-- Pro Path lessons + any WC lessons get the correct max_xp values.
UPDATE lessons SET content = content;

COMMIT;

-- After running: verify with
--
--   SELECT title, max_xp FROM lessons
--    WHERE edition = 'propath_26_27'
--    ORDER BY pillar_id, sort_order;
--
-- Expected shape (per-lesson totals around 130-170 XP based on the
-- current Pro Path step mixes — NOT the inflated 500-880 the V1
-- trigger produced).

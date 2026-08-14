-- PROPATH_LESSON_MAX_XP.sql
--
-- Adds lessons.max_xp — the sum of every xp_reward embedded anywhere
-- in the lesson's content JSONB. Powers the Skill Radar's segment-
-- fill formula (fill = min(earned / (max_xp * threshold), 1.0)).
--
-- Two pieces:
--   1. Column + backfill for existing rows.
--   2. Trigger so new / updated content auto-recomputes max_xp,
--      keeping the column and the JSONB single-source-of-truth in
--      sync without app-side coordination.
--
-- Design choice — one column vs runtime sum:
--   Runtime sum of JSONB is fine for a single lesson render, but the
--   Skill Radar aggregates across the whole edition's lesson set
--   every dashboard load. Precomputing avoids parsing 30+ JSONB
--   trees per user visit. Cheap disk, expensive parse.
--
-- Idempotent. Trigger uses BEFORE INSERT OR UPDATE so re-runs and
-- CMS saves both hit the recomputation path.

BEGIN;

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS max_xp INTEGER;

-- Trigger function: recompute max_xp from content on every write.
-- Walks the JSONB tree with $.**.xp_reward — matches xp_reward at
-- any depth (root, steps[], nested step configs, etc.). Sums text-
-- casts to ints; coalesces NULL to 0 so a content-less lesson doesn't
-- explode.
CREATE OR REPLACE FUNCTION set_lesson_max_xp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.max_xp := COALESCE((
    SELECT SUM(v::int)
    FROM jsonb_array_elements_text(
      jsonb_path_query_array(NEW.content, '$.**.xp_reward')
    ) AS v
  ), 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_lesson_max_xp ON lessons;
CREATE TRIGGER trg_lesson_max_xp
  BEFORE INSERT OR UPDATE OF content ON lessons
  FOR EACH ROW EXECUTE FUNCTION set_lesson_max_xp();

-- Backfill existing rows. The trigger doesn't fire on ALTER TABLE,
-- so this UPDATE (which will fire the trigger via SET content =
-- content) is how we populate max_xp for the lessons already in the
-- table.
UPDATE lessons SET content = content;

-- Index — the Skill Radar filters by (edition, skill_axes) and then
-- needs max_xp for each row. max_xp is already selected in the base
-- query; no separate index needed. Included here so a future
-- "hardest lessons in edition X" query would be fast without extra
-- work: enable if you add such a query.
-- CREATE INDEX IF NOT EXISTS idx_lessons_edition_max_xp
--   ON lessons (edition, max_xp DESC)
--   WHERE is_active = TRUE;

COMMIT;

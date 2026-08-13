-- PROPATH_SKILL_AXES_RENAME.sql
--
-- Renames the Pro Path skill-axis slugs stored in lessons.skill_axes[]
-- to match the new registry in src/lib/lessons/skillAxes.js.
--
-- Changes:
--   'communication' → 'pitch_talk'
--   'media'         → 'media_trials'   (media + trials merged)
--   'trials'        → 'media_trials'   (media + trials merged)
--
-- Also seeds no new tags — the new 'daily_life' axis has no rows to
-- migrate; lessons are tagged as authors write them.
--
-- Safe to run multiple times: array_replace on a value already renamed
-- is a no-op. Rows with no skill_axes value (NULL / empty) skip
-- naturally because array_replace on NULL returns NULL.
--
-- Run this AFTER updating skillAxes.js in the app; before the app
-- deploy is also fine — the app treats unknown axis ids defensively
-- (getSkillAxis returns null and the radar simply ignores them).

BEGIN;

-- 1. communication → pitch_talk
UPDATE lessons
   SET skill_axes = array_replace(skill_axes, 'communication', 'pitch_talk')
 WHERE skill_axes @> ARRAY['communication']::TEXT[];

-- 2. media → media_trials
UPDATE lessons
   SET skill_axes = array_replace(skill_axes, 'media', 'media_trials')
 WHERE skill_axes @> ARRAY['media']::TEXT[];

-- 3. trials → media_trials
--    A row that had BOTH old tags (unlikely, but possible) will end
--    up with 'media_trials' listed twice after these two UPDATEs.
--    The follow-up dedupe below folds duplicates so the radar
--    doesn't count that lesson twice against the same axis.
UPDATE lessons
   SET skill_axes = array_replace(skill_axes, 'trials', 'media_trials')
 WHERE skill_axes @> ARRAY['trials']::TEXT[];

-- 4. Dedupe skill_axes arrays that may now contain 'media_trials'
--    twice (only fires on the rare rows that had both 'media' AND
--    'trials' before). ARRAY(SELECT DISTINCT unnest(...)) is the
--    idiomatic Postgres pattern.
UPDATE lessons
   SET skill_axes = ARRAY(SELECT DISTINCT unnest(skill_axes))
 WHERE skill_axes @> ARRAY['media_trials']::TEXT[]
   AND array_length(skill_axes, 1) IS NOT NULL
   AND array_length(skill_axes, 1) > 1;

COMMIT;

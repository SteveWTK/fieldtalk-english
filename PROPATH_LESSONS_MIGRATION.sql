-- PROPATH_LESSONS_MIGRATION.sql
--
-- Prepares the `lessons` table to serve two editions in parallel
-- (WC2026 + Pro Path 26/27) and, downstream, to power the Skill
-- Radar on the Pro Path dashboard.
--
-- Two additions, both non-breaking:
--
--   1. lessons.edition TEXT DEFAULT 'wc2026'
--      Scopes each lesson to an edition. Backfilled to 'wc2026' on
--      existing rows so nothing changes for WC users. Pro Path
--      lessons will be created with edition = 'propath_26_27'.
--      The dashboard's lesson-list query filters by the caller's
--      players.edition, so users only see their own edition's
--      content.
--
--   2. lessons.skill_axes TEXT[]
--      Zero-or-more skill axes a Pro Path lesson contributes to.
--      Powers the Skill Radar's per-axis completion %.
--      Canonical axes (kept in sync with src/lib/lessons/skillAxes.js):
--        communication  — Communication on the pitch
--        tactics        — Tactical talk
--        media          — Media & interviews
--        fitness        — Injuries & fitness
--        trials         — Trials & agency
--        coach          — Coach-to-player
--      A lesson can carry multiple (e.g. a media-training lesson
--      that also builds general communication vocab could be
--      {media, communication}). Null / empty array = lesson doesn't
--      map to any radar axis (safe default for WC lessons).

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS edition    TEXT NOT NULL DEFAULT 'wc2026',
  ADD COLUMN IF NOT EXISTS skill_axes TEXT[];

-- Backfill: any existing row without an edition tag becomes wc2026.
-- The DEFAULT on the ADD COLUMN handles new inserts; this UPDATE is
-- belt-and-braces for rows created before the migration ran (e.g. on
-- a partial re-run).
UPDATE lessons
   SET edition = 'wc2026'
 WHERE edition IS NULL;

-- Partial index on edition so the dashboard's per-edition lesson
-- list is index-backed. The WHERE clause keeps the index small
-- (active lessons only) — inactive lessons don't render for users
-- anyway.
CREATE INDEX IF NOT EXISTS idx_lessons_edition_active
  ON lessons (edition, sort_order)
  WHERE is_active = TRUE;

-- GIN index on skill_axes so the Skill Radar's "lessons that touch
-- axis X" lookup is fast even as the catalogue grows. Tiny cost
-- today (few lessons); pays off once Pro Path content lands in
-- volume.
CREATE INDEX IF NOT EXISTS idx_lessons_skill_axes
  ON lessons USING GIN (skill_axes)
  WHERE is_active = TRUE;

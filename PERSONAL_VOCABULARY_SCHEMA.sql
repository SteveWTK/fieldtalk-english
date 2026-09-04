-- PERSONAL_VOCABULARY_SCHEMA.sql
--
-- User-saved vocabulary. Populated when a user bookmarks a word from
-- either a vocabulary lesson step or a memory-match pair. Consumed by:
--
--   1. The /vocabulary page — search / sort / filter their saved words.
--   2. (future) The Game Centre — Vocabulary Speed Match will draw
--      from this pool to personalise practice.
--
-- Design notes:
--   - Adapted from Habitat's `personal_vocabulary` pattern, changed to
--     player_id (not user_id) and enriched with FieldTalk-specific
--     fields (tip, cultural_note, skill_axis) that VocabularyItem
--     already carries.
--   - UNIQUE (player_id, LOWER(english)) prevents accidental duplicates
--     when a user encounters the same word across multiple lessons.
--     Case-insensitive: "Goal" and "goal" collapse to one row.
--   - times_practiced + last_practiced_at drive the "needs practice"
--     filter and future spaced-repetition sorting for Game Centre games.
--
-- Idempotent. Safe to re-run.

BEGIN;

CREATE TABLE IF NOT EXISTS personal_vocabulary (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id           UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- The word itself + its translation. Both required. Translation is
  -- currently PT-only because that's the Brazilian-market launch
  -- default; other markets can extend this into a JSONB per-language
  -- field when needed.
  english             TEXT NOT NULL,
  translation         TEXT NOT NULL,

  -- Optional visual context — carried through from the source
  -- vocabulary item if it had an image. Rarely populated for now but
  -- useful for future flashcard-style games.
  english_image       TEXT,
  translation_image   TEXT,

  -- Rich context fields FieldTalk vocab items carry — surfaced on
  -- the /vocabulary page so users still see the tip / note they
  -- originally learned the word with.
  tip                 TEXT,
  cultural_note       TEXT,

  -- Provenance — where they saved it from. Useful for "show me
  -- everything from the Media & Contracts axis" or "words I saved
  -- from Unit 2".
  source_lesson_id    UUID REFERENCES lessons(id) ON DELETE SET NULL,
  source_step_type    TEXT,           -- 'vocabulary' | 'memory_match' | future kinds
  skill_axis          TEXT,           -- carried from lesson.skill_axes[0]

  -- Practice tracking — future Game Centre games call the practice
  -- endpoint on each round to bump these. Enables sorting by
  -- "most struggled" / "recently practiced" / "never practiced".
  times_practiced     INTEGER NOT NULL DEFAULT 0,
  last_practiced_at   TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent the same user saving the same word twice. Case-insensitive
  -- via lower() so "Coach" and "coach" collapse to one row.
  CONSTRAINT personal_vocabulary_player_english_unique
    UNIQUE (player_id, english)
);

-- Case-insensitive unique index on english — the CONSTRAINT above is
-- case-sensitive; this index makes duplicate detection case-insensitive
-- so the API's LOWER() check has a real index to lean on.
CREATE UNIQUE INDEX IF NOT EXISTS idx_personal_vocabulary_player_english_lower
  ON personal_vocabulary (player_id, LOWER(english));

CREATE INDEX IF NOT EXISTS idx_personal_vocabulary_player_created
  ON personal_vocabulary (player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_personal_vocabulary_player_practice
  ON personal_vocabulary (player_id, times_practiced, last_practiced_at);

ALTER TABLE personal_vocabulary ENABLE ROW LEVEL SECURITY;
-- Deny-by-default; only the service-role client (via the API routes)
-- touches this table. API routes gate on the Supabase session cookie
-- so a user can only ever affect their own rows.

COMMIT;

-- Verify:
--   SELECT count(*) FROM personal_vocabulary;   -- expect 0

-- VOCABULARY_TABLE.sql
--
-- Multi-lingual vocabulary catalogue that powers the Game Centre
-- Memory Match (and later, the auto-generated Quiz). Designed to
-- outlive WC2026 — future editions (EPL, NWSL, …) can plug their
-- own categories in by setting `edition`.
--
-- Schema decisions (locked in with the user):
--   - Per-language columns (en_term, pt_term, …) instead of JSONB.
--     Trades flexibility for simpler ad-hoc SQL + CSV export. Adding
--     a new language later = one ALTER TABLE.
--   - One table for everything. `category` + `subcategory` + `edition`
--     are filters; the partial index keeps queries fast.
--   - `image_url` is optional. The Memory Match shows IMAGE paired
--     with EN term when present, otherwise EN paired with PT.
--   - `is_active` lets us hide rows without deleting (e.g. retiring
--     a stale country if the WC bracket changes).
--   - `sort_order` is advisory; v1 of the game shuffles all matching
--     rows, but the column gives admins control for non-shuffled
--     surfaces later (drag-drop activities, "guided" mode, etc.).

CREATE TABLE IF NOT EXISTS vocabulary (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Translations. en + pt mandatory; add es/th when those editions
  -- need them.
  en_term      TEXT NOT NULL,
  pt_term      TEXT NOT NULL,
  es_term      TEXT,
  th_term      TEXT,

  -- Categorisation. The Game Centre hub picks games by category;
  -- subcategory is optional and lets a single category split into
  -- meaningful subsets ("positions / attacking", "positions / defensive").
  category     TEXT NOT NULL,
  subcategory  TEXT,

  -- 'wc2026' | future editions | NULL = universal (shown for every
  -- edition). The Game Centre filters by the user's current edition
  -- + universal entries.
  edition      TEXT,

  -- Optional media
  image_url    TEXT,
  en_audio_url TEXT,
  pt_audio_url TEXT,

  -- Meta
  difficulty   SMALLINT DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  is_active    BOOLEAN  DEFAULT TRUE,
  sort_order   INTEGER,

  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- Partial indexes so the Game Centre's "give me N rows where
-- category=X" is index-only and skips inactive rows entirely.
CREATE INDEX IF NOT EXISTS idx_vocabulary_cat_active
  ON vocabulary (category, subcategory)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_vocabulary_edition_active
  ON vocabulary (edition)
  WHERE is_active = TRUE;

-- Prevent duplicate rows for the SAME term within the same
-- (category, edition). Allows the SAME term to exist in multiple
-- categories ("Goal" — both action and stadium-element vocab).
CREATE UNIQUE INDEX IF NOT EXISTS idx_vocabulary_unique_term_per_cat
  ON vocabulary (lower(en_term), category, coalesce(edition, ''));

-- updated_at maintenance — keeps the column honest for change
-- tracking without forcing every UPDATE statement to set it manually.
CREATE OR REPLACE FUNCTION set_vocabulary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vocabulary_updated_at ON vocabulary;
CREATE TRIGGER trg_vocabulary_updated_at
  BEFORE UPDATE ON vocabulary
  FOR EACH ROW EXECUTE FUNCTION set_vocabulary_updated_at();

-- ── RLS ───────────────────────────────────────────────────────────
-- Vocabulary is public-read (any authenticated user can fetch for
-- their games), admin-write. Pattern mirrors lessons/sticker_players.
ALTER TABLE vocabulary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Vocabulary readable by everyone" ON vocabulary;
CREATE POLICY "Vocabulary readable by everyone"
  ON vocabulary FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Vocabulary writeable by admins" ON vocabulary;
CREATE POLICY "Vocabulary writeable by admins"
  ON vocabulary FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
        AND players.user_type = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
        AND players.user_type = 'platform_admin'
    )
  );

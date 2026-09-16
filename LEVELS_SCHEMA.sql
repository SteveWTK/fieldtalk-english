-- LEVELS_SCHEMA.sql
--
-- Introduces the Levels layer — the top-level content organisation
-- above Units (which the code still calls `pillars`). Each Level
-- contains N Units (4 in v1, enforced only in UI); completing all
-- Units in a Level awards a Certificate.
--
-- Levels are dynamically fetched from the DB so display names,
-- descriptions, signal tones, and icons stay editable without a
-- redeploy. 8 placeholder levels are seeded here covering A1 → B2
-- CEFR progression; content team should rename + tweak these once
-- Level 1's content is finalised.
--
-- Progression is sequential in v1 (see /api/levels — computed
-- client-side and API-side). Schema stays flexible: no NOT NULL /
-- CHECK constraints enforcing sequentiality, so future parallel
-- pathways (e.g. specialised post-retirement or location-specific
-- levels) can be gated differently. `is_specialised` reserves the
-- future path.
--
-- Certificates are minimum-viable: a `player_level_completions` row
-- per (player, level) that hits 100%. PDF generation is deferred —
-- the row is the earned-at record that a later PDF pipeline reads.
--
-- Safe to re-run — every ALTER + CREATE is IF NOT EXISTS.

-- ─────────────────────────────────────────────────────────────────
-- 1. Levels table
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS levels (
  id             SERIAL PRIMARY KEY,
  sort_order     INT NOT NULL,
  -- Stable slug — used in URLs / internal refs. Lowercase snake_case.
  name           TEXT NOT NULL UNIQUE,
  -- Bilingual display fields — editable via admin.
  display_name_pt TEXT NOT NULL,
  display_name_en TEXT NOT NULL,
  description_pt  TEXT,
  description_en  TEXT,
  -- Target CEFR band for the level (A1 / A2 / B1 / B2 etc.). UI-only.
  cefr_target    TEXT,
  -- Banner visual tone — one of `english` | `mental` | `performance`
  -- | `alert` | `accent`. Drives the subtle gradient wash + icon
  -- colour on the Level banner. Editable per-level; palette can be
  -- extended by adding more accepted values without a schema change.
  signal_tone    TEXT NOT NULL DEFAULT 'accent',
  -- Lucide icon name (e.g. 'Sprout', 'Trophy'). Editable per-level.
  icon_name      TEXT NOT NULL DEFAULT 'Trophy',
  -- Toggle to hide levels from the player-facing surface without
  -- deleting them — useful while a level's content is being drafted.
  is_active      BOOLEAN NOT NULL DEFAULT true,
  -- Reserved for future pathway support. When true, the level sits
  -- OUTSIDE the sequential main progression (e.g. optional
  -- specialised post-retirement pathway a B2 player picks up
  -- alongside the standard track).
  is_specialised BOOLEAN NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS levels_sort_order_idx ON levels(sort_order);
CREATE INDEX IF NOT EXISTS levels_is_active_idx ON levels(is_active);

-- ─────────────────────────────────────────────────────────────────
-- 2. Pillars → Levels FK
-- ─────────────────────────────────────────────────────────────────
-- Existing pillars stay working with level_id = NULL; the app treats
-- NULL-level pillars as "unassigned" and surfaces them under Level 1
-- as a fallback. Assign existing pillars via UPDATE below (or via
-- the admin UI at /admin/levels once running).
ALTER TABLE pillars
  ADD COLUMN IF NOT EXISTS level_id INT REFERENCES levels(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS pillars_level_id_idx ON pillars(level_id);

-- ─────────────────────────────────────────────────────────────────
-- 3. Player level completions (Certificates MVP — data flag only,
--    PDF pipeline deferred)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_level_completions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id  UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  level_id   INT NOT NULL REFERENCES levels(id) ON DELETE CASCADE,
  earned_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Snapshot fields — kept even if the level is later renamed, so
  -- earned certificates don't retroactively change identity.
  level_name_snapshot        TEXT,
  level_display_name_snapshot TEXT,
  UNIQUE (player_id, level_id)
);

CREATE INDEX IF NOT EXISTS player_level_completions_player_id_idx
  ON player_level_completions(player_id);

-- ─────────────────────────────────────────────────────────────────
-- 4. RLS — same "player reads own rows" pattern the rest of the
--     player_* tables use. Service role bypass keeps admin routes
--     working via the getSupabaseAdmin client.
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_level_completions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS levels_read_all ON levels;
CREATE POLICY levels_read_all ON levels
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS plc_read_own ON player_level_completions;
CREATE POLICY plc_read_own ON player_level_completions
  FOR SELECT
  USING (auth.uid() = player_id);

-- ─────────────────────────────────────────────────────────────────
-- 5. Seed 8 placeholder levels — content team should rename + tweak
--    display names, descriptions, and CEFR targets before shipping
--    Level 2+ content. Signal tones + icons chosen to feel
--    progression-shaped: sky (early) → violet (mid) → orange
--    (advanced) → accent lime (elite). Repeat per pair.
-- ─────────────────────────────────────────────────────────────────
INSERT INTO levels (sort_order, name, display_name_pt, display_name_en,
                    description_pt, description_en, cefr_target,
                    signal_tone, icon_name)
VALUES
  (1, 'foundations',       'Fundamentos',           'Foundations',
      'Primeiros passos no inglês de campo.',
      'Your first steps in football English.',
      'A1', 'english', 'Sprout'),
  (2, 'building_blocks',   'Blocos de construção',  'Building blocks',
      'Base sólida para conversação no vestiário.',
      'Solid ground for locker-room conversation.',
      'A1+', 'english', 'Milestone'),
  (3, 'everyday_football', 'Futebol do dia a dia',  'Everyday football',
      'Comunicação diária no clube.',
      'Daily communication around the club.',
      'A2', 'mental', 'MapPin'),
  (4, 'squad_life',        'Vida de equipe',        'Squad life',
      'Trabalho em equipe e ligações táticas.',
      'Team bonds and tactical exchanges.',
      'A2+', 'mental', 'Users'),
  (5, 'match_situations',  'Situações de jogo',     'Match situations',
      'Da preparação ao pós-jogo.',
      'Warm-up to full-time.',
      'B1', 'performance', 'Zap'),
  (6, 'media_and_press',   'Mídia e imprensa',      'Media and press',
      'Entrevistas, coletivas e redes sociais.',
      'Interviews, press conferences, socials.',
      'B1+', 'performance', 'Radio'),
  (7, 'advanced_fluency',  'Fluência avançada',     'Advanced fluency',
      'Debater, negociar, liderar.',
      'Debate, negotiate, lead.',
      'B2', 'accent', 'Flame'),
  (8, 'mastery_paths',     'Caminhos especializados','Mastery paths',
      'Trilhas para carreira pós-jogador ou destino específico.',
      'Post-playing career or location-specific tracks.',
      'B2+', 'accent', 'Trophy')
ON CONFLICT (name) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 6. Placeholder assignment for existing pillars
--    ────────────────────────────────────────
--    The 4 existing Pro Path pillars all go to Level 1 (foundations)
--    per the plan. Uncomment + adjust below if the pillar names in
--    your DB differ; the assignment can also be done from the admin
--    UI at /admin/levels once this migration is applied.
-- ─────────────────────────────────────────────────────────────────
--   UPDATE pillars
--     SET level_id = (SELECT id FROM levels WHERE name = 'foundations')
--     WHERE name IN ('survival', 'precision', 'fluency', 'match_prep');

-- Sanity check — pillar → level assignments after the run.
--   SELECT p.name AS pillar, l.name AS level FROM pillars p
--     LEFT JOIN levels l ON l.id = p.level_id
--     ORDER BY l.sort_order NULLS LAST, p.sort_order;

-- MENTAL_TRAINING_SCHEMA.sql
--
-- Adds the "Mental Training" pillar to FieldTalk:
--
--   1. mental_activities   — one row per authorable activity. Handles
--                            all 4 planned types (meditation / champion
--                            scenario / match prep / voice of champion)
--                            plus 'silent_timer' for the "bring your own
--                            practice" player. Type-specific content
--                            lives in a JSONB column so authoring is
--                            open-ended per type.
--
--   2. unit_mental_slot    — which activity fills the "7th slot" of
--                            each unit (pillar). Nullable join — a
--                            unit without a row here just doesn't
--                            surface a mental card yet.
--
--   3. mental_progress     — one completion row per (player, activity,
--                            calendar_day). Powers streaks + minutes-
--                            meditated stats without preventing a
--                            player from re-doing the same meditation
--                            on different days.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ─── mental_activities ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mental_activities (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The five (and growing) content types. 'silent_timer' is the
  -- "bring your own practice" player — no audio content, just a
  -- configurable timer + bells + the orb animation.
  activity_type         TEXT NOT NULL
                        CHECK (activity_type IN (
                          'meditation',
                          'champion_scenario',
                          'match_prep',
                          'voice_of_champion',
                          'silent_timer'
                        )),

  -- Bilingual card copy.
  title                 JSONB NOT NULL,             -- { pt, en }
  subtitle              JSONB,                       -- { pt, en } one-line teaser

  -- Nominal duration in seconds — the meditation length, or the
  -- estimated read/answer time for scenarios / voices. NULL for
  -- silent_timer (player picks at launch).
  duration_seconds      INTEGER,

  -- Type-specific content — shape documented in
  -- src/lib/mental/constants.js. Kept as JSONB so each type can
  -- evolve independently without a schema migration per iteration.
  content               JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Mood tags — array of mood keys the activity is suited for. Free
  -- text so we can extend the mood catalog in code without a schema
  -- change; the mood picker filters against MOOD_KEYS in constants.js.
  moods                 TEXT[] NOT NULL DEFAULT '{}',

  -- Audio (guided meditation + match prep pre-talk + voice of champion).
  -- Stored per language so a player's language pick just swaps the
  -- src attribute at runtime. Silent_timer stores no audio here;
  -- its bell audio lives in content JSONB so it's admin-swappable.
  audio_url_pt          TEXT,
  audio_url_en          TEXT,

  -- Optional hero visual for the hub card.
  cover_image_url       TEXT,

  -- Merchandising flags.
  featured              BOOLEAN NOT NULL DEFAULT false,
  active                BOOLEAN NOT NULL DEFAULT true,
  sort_order            INTEGER NOT NULL DEFAULT 0,

  created_by            UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mental_activities_type
  ON mental_activities (activity_type)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_mental_activities_moods_gin
  ON mental_activities USING GIN (moods);

DROP TRIGGER IF EXISTS trg_mental_activities_updated_at
  ON mental_activities;
CREATE OR REPLACE FUNCTION set_mental_activities_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_mental_activities_updated_at
  BEFORE UPDATE ON mental_activities
  FOR EACH ROW EXECUTE FUNCTION set_mental_activities_updated_at();

ALTER TABLE mental_activities ENABLE ROW LEVEL SECURITY;

-- Read-only policy for authenticated users on ACTIVE activities so
-- the client can render the hub + unit slot without going through the
-- API. Admin writes still go through the service-role via /admin
-- routes.
DROP POLICY IF EXISTS "mental_activities_select_active"
  ON mental_activities;
CREATE POLICY "mental_activities_select_active"
  ON mental_activities FOR SELECT
  USING (active = true);

-- ─── unit_mental_slot ──────────────────────────────────────────
--
-- Assigns which mental activity appears as the "7th slot" of each
-- unit (pillar). One row per unit maximum — swap by UPDATE rather
-- than DELETE+INSERT so the UUID stays stable for anything referring
-- to it. Optional — a unit without a row just won't render the
-- mental card.

-- pillars.id is INTEGER (legacy schema), NOT uuid — so unit_id
-- matches that type. All the mental_* IDs stay UUID for consistency
-- with the rest of the newer tables.
CREATE TABLE IF NOT EXISTS unit_mental_slot (
  unit_id               INTEGER PRIMARY KEY REFERENCES pillars(id) ON DELETE CASCADE,
  mental_activity_id    UUID NOT NULL REFERENCES mental_activities(id) ON DELETE CASCADE,
  assigned_by           UUID REFERENCES players(id) ON DELETE SET NULL,
  assigned_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_unit_mental_slot_activity
  ON unit_mental_slot (mental_activity_id);

ALTER TABLE unit_mental_slot ENABLE ROW LEVEL SECURITY;

-- Any signed-in user can read the slot mapping (used by the unit
-- page to render the 7th card). Writes go through the service-role
-- admin route.
DROP POLICY IF EXISTS "unit_mental_slot_select_all" ON unit_mental_slot;
CREATE POLICY "unit_mental_slot_select_all"
  ON unit_mental_slot FOR SELECT
  USING (true);

-- ─── mental_progress ───────────────────────────────────────────
--
-- One row per (player, activity, calendar_day). The day granularity
-- unlocks two things:
--   (a) daily streak calculation — count of distinct calendar days
--       with at least one row
--   (b) letting a player re-do the same meditation on subsequent
--       days without collision
-- but prevents the same activity being logged multiple times in a
-- single day (double-tap protection).
--
-- duration_seconds is what the player actually spent — for silent
-- meditations this is their chosen length; for guided it's rounded
-- to the audio length; for scenarios/voices it may be null.

CREATE TABLE IF NOT EXISTS mental_progress (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id             UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  activity_id           UUID REFERENCES mental_activities(id) ON DELETE SET NULL,

  -- Snapshot of the activity_type at completion — survives an admin
  -- deleting the activity row. Also lets us compute type-breakdown
  -- stats without a join.
  activity_type         TEXT NOT NULL,

  completed_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- day_key stores YYYY-MM-DD in the player's timezone context. Kept
  -- as a plain DATE so date-range filters + streak calculations are
  -- native SQL, not JS-side derivations.
  day_key               DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,

  duration_seconds      INTEGER,
  metadata              JSONB,         -- chosen answer, quiz correctness, mood at start, etc.

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (player_id, activity_id, day_key)
);

CREATE INDEX IF NOT EXISTS idx_mental_progress_player_day
  ON mental_progress (player_id, day_key DESC);

CREATE INDEX IF NOT EXISTS idx_mental_progress_player_type
  ON mental_progress (player_id, activity_type);

ALTER TABLE mental_progress ENABLE ROW LEVEL SECURITY;

-- A player can read + insert their own progress. Deleting stays
-- admin-only (via service-role) — we don't want a client bug to
-- accidentally wipe a streak.
DROP POLICY IF EXISTS "mental_progress_select_own" ON mental_progress;
CREATE POLICY "mental_progress_select_own"
  ON mental_progress FOR SELECT
  USING (player_id = auth.uid());

DROP POLICY IF EXISTS "mental_progress_insert_own" ON mental_progress;
CREATE POLICY "mental_progress_insert_own"
  ON mental_progress FOR INSERT
  WITH CHECK (player_id = auth.uid());

COMMIT;

-- Verify:
--   SELECT count(*) FROM mental_activities;   -- 0
--   SELECT count(*) FROM unit_mental_slot;    -- 0
--   SELECT count(*) FROM mental_progress;     -- 0

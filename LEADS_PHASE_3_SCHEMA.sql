-- LEADS_PHASE_3_SCHEMA.sql
--
-- Phase 3 additions to the leads CRM:
--
--   1. lead_sequences               — reusable drip campaigns.
--   2. lead_sequence_steps          — ordered steps per sequence with
--                                     relative-time scheduling
--                                     (day_offset + time_of_day_brt).
--   3. lead_sequence_enrollments    — one row per (sequence, lead)
--                                     tracking progress + stop reason.
--   4. metrics_targets              — team + per-owner goals for the
--                                     dashboard.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ─── lead_sequences ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_sequences (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                   TEXT NOT NULL,
  description            TEXT,

  -- v1 supports manual enrollment only. Auto-triggers will add
  -- values like 'lead_type_created' or 'tag_added' later; keeping
  -- the column here so v2 is data-migration only.
  trigger_type           TEXT NOT NULL DEFAULT 'manual'
                         CHECK (trigger_type IN ('manual')),

  -- Stop conditions — default-on to prevent runaway sends.
  stop_on_reply          BOOLEAN NOT NULL DEFAULT true,
  stop_on_stage_change   BOOLEAN NOT NULL DEFAULT true,
  stop_on_dnc            BOOLEAN NOT NULL DEFAULT true,

  active                 BOOLEAN NOT NULL DEFAULT true,

  created_by             UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_sequences_active
  ON lead_sequences (active);

DROP TRIGGER IF EXISTS trg_lead_sequences_updated_at ON lead_sequences;
CREATE OR REPLACE FUNCTION set_lead_sequences_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_lead_sequences_updated_at
  BEFORE UPDATE ON lead_sequences
  FOR EACH ROW EXECUTE FUNCTION set_lead_sequences_updated_at();

ALTER TABLE lead_sequences ENABLE ROW LEVEL SECURITY;

-- ─── lead_sequence_steps ────────────────────────────────────────
--
-- One row per step. Relative timing:
--   day_offset      — days AFTER enrollment (step 1 offset=0 means
--                     "send now-ish"; step 2 offset=3 means "3 days
--                     after enrollment", not "3 days after step 1")
--   time_of_day_brt — 0-23 hour in BRT
--
-- template_id + body work together: template_id references an
-- opener from lead_message_templates; if body is non-null, it
-- overrides the template's body for this specific step. At least
-- ONE must be set (enforced by CHECK).

CREATE TABLE IF NOT EXISTS lead_sequence_steps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id       UUID NOT NULL REFERENCES lead_sequences(id) ON DELETE CASCADE,
  position          INTEGER NOT NULL CHECK (position >= 1),

  -- Timing — measured from enrolled_at, not from previous step.
  -- Simpler mental model + easier to compute "next_step_due_at".
  day_offset        INTEGER NOT NULL DEFAULT 0
                    CHECK (day_offset >= 0 AND day_offset <= 365),
  time_of_day_brt   INTEGER NOT NULL DEFAULT 10
                    CHECK (time_of_day_brt >= 0 AND time_of_day_brt <= 23),

  -- Content — one or both must be set.
  template_id       UUID REFERENCES lead_message_templates(id) ON DELETE SET NULL,
  body              JSONB,  -- optional inline override {pt, en}
  notes             TEXT,   -- internal-only notes for the author

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (sequence_id, position)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'lead_sequence_steps_content_present_check'
  ) THEN
    ALTER TABLE lead_sequence_steps
      ADD CONSTRAINT lead_sequence_steps_content_present_check
      CHECK (template_id IS NOT NULL OR body IS NOT NULL);
  END IF;
END$$;

CREATE INDEX IF NOT EXISTS idx_lead_sequence_steps_sequence
  ON lead_sequence_steps (sequence_id, position);

ALTER TABLE lead_sequence_steps ENABLE ROW LEVEL SECURITY;

-- ─── lead_sequence_enrollments ──────────────────────────────────
--
-- One row per (sequence, lead) enrollment. current_step is the
-- LAST step successfully sent (0 = not started; N = full sequence
-- completed). next_step_due_at is when the next step should fire —
-- the cron reads this column exclusively for scheduling.

CREATE TABLE IF NOT EXISTS lead_sequence_enrollments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_id         UUID NOT NULL REFERENCES lead_sequences(id) ON DELETE CASCADE,
  lead_id             UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  enrolled_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_step        INTEGER NOT NULL DEFAULT 0,
  next_step_due_at    TIMESTAMPTZ,

  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active', 'completed', 'stopped')),
  stop_reason         TEXT,

  enrolled_by         UUID REFERENCES players(id) ON DELETE SET NULL,
  metadata            JSONB,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (sequence_id, lead_id)
);

DROP TRIGGER IF EXISTS trg_lead_sequence_enrollments_updated_at
  ON lead_sequence_enrollments;
CREATE OR REPLACE FUNCTION set_lead_sequence_enrollments_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_lead_sequence_enrollments_updated_at
  BEFORE UPDATE ON lead_sequence_enrollments
  FOR EACH ROW EXECUTE FUNCTION set_lead_sequence_enrollments_updated_at();

CREATE INDEX IF NOT EXISTS idx_lead_sequence_enrollments_due
  ON lead_sequence_enrollments (next_step_due_at)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_lead_sequence_enrollments_lead
  ON lead_sequence_enrollments (lead_id);

ALTER TABLE lead_sequence_enrollments ENABLE ROW LEVEL SECURITY;

-- ─── metrics_targets ────────────────────────────────────────────
--
-- Goals for the sales team. owner_id NULL = team-wide target; set
-- to a player id for per-owner accountability. target_value stored
-- as NUMERIC so it can express counts (5 wins) or ratios (0.15 =
-- 15% conversion) or currency-in-cents.

CREATE TABLE IF NOT EXISTS metrics_targets (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  kind            TEXT NOT NULL
                  CHECK (kind IN (
                    'wins_in_range',
                    'leads_created_in_range',
                    'conversion_rate_at',
                    'pipeline_value_at'
                  )),

  title           TEXT NOT NULL,
  description     TEXT,

  -- Numeric so we can store: an int count (5 wins), a ratio
  -- (0.15 = 15% conversion), OR cents (1500000 = R$15k).
  target_value    NUMERIC NOT NULL,
  target_date     DATE NOT NULL,

  -- Range start for _in_range kinds. NULL means "since target
  -- creation" (created_at is used at progress time).
  range_start     DATE,

  owner_id        UUID REFERENCES players(id) ON DELETE SET NULL,

  active          BOOLEAN NOT NULL DEFAULT true,
  achieved_at     TIMESTAMPTZ,

  created_by      UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_metrics_targets_active
  ON metrics_targets (active, target_date);

DROP TRIGGER IF EXISTS trg_metrics_targets_updated_at ON metrics_targets;
CREATE OR REPLACE FUNCTION set_metrics_targets_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_metrics_targets_updated_at
  BEFORE UPDATE ON metrics_targets
  FOR EACH ROW EXECUTE FUNCTION set_metrics_targets_updated_at();

ALTER TABLE metrics_targets ENABLE ROW LEVEL SECURITY;

COMMIT;

-- Verify:
--   SELECT count(*) FROM lead_sequences;               -- 0
--   SELECT count(*) FROM lead_sequence_steps;          -- 0
--   SELECT count(*) FROM lead_sequence_enrollments;    -- 0
--   SELECT count(*) FROM metrics_targets;              -- 0

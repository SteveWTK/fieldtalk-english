-- WHATSAPP_PHASE_6_SCHEMA.sql
--
-- Phase 6 — scheduled + recurring broadcasts.
--
--   1. Extends whatsapp_broadcasts with scheduling knobs:
--        scheduled_for, interval_seconds, window_start_hour_brt,
--        window_end_hour_brt, send_on_days, generated_from_template_id
--
--   2. Adds scheduled_slot to whatsapp_broadcast_recipients — the
--      exact moment the dispatcher should attempt each recipient.
--      Computed at fan-out time (see src/lib/broadcasts/slots.js)
--      so the dispatcher stays dumb: "process pending rows whose
--      slot <= now, respecting broadcast interval implicitly via
--      the pre-computed spacing".
--
--   3. New table whatsapp_broadcast_templates — recurring "5 tips
--      every Friday" style schedules. Hourly cron scans + generates
--      a fresh broadcast when a template's cadence hits.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ─── whatsapp_broadcasts extensions ─────────────────────────────

ALTER TABLE whatsapp_broadcasts
  -- When to START fan-out. NULL = send immediately when admin clicks
  -- "Send now". Non-null = broadcasts stays draft until this time,
  -- then a cron / admin can trigger fan-out.
  ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ,

  -- Per-broadcast throttle between sends. 8s is the "safe on cold
  -- WhatsApp accounts" default; range 3..60 covers slow-drip campaigns
  -- and urgent burst-sends.
  ADD COLUMN IF NOT EXISTS interval_seconds INTEGER NOT NULL DEFAULT 8,

  -- Business-hours window in BRT (America/Sao_Paulo, UTC-3, no DST
  -- since 2019). Sends outside the window get their scheduled_slot
  -- bumped to the next in-window time at fan-out. Defaults 08:00..21:00.
  -- Overridable per broadcast (e.g. a "match starting" nudge might
  -- widen to 07:00..23:00).
  ADD COLUMN IF NOT EXISTS window_start_hour_brt INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS window_end_hour_brt INTEGER NOT NULL DEFAULT 21,

  -- Days-of-week filter as a text array of short weekday codes
  -- (mon/tue/wed/thu/fri/sat/sun). Default excludes Sunday per
  -- product decision. Add 'sun' explicitly for broadcasts that need
  -- Sunday sends (rare).
  ADD COLUMN IF NOT EXISTS send_on_days TEXT[] NOT NULL
    DEFAULT ARRAY['mon','tue','wed','thu','fri','sat'],

  -- If this broadcast was auto-generated from a recurring template,
  -- FK back so we can show provenance in the admin UI + roll up
  -- "how many sends has this template produced" metrics later.
  ADD COLUMN IF NOT EXISTS generated_from_template_id UUID;

-- CHECK constraints via DO block (Postgres <15 lacks IF NOT EXISTS
-- on ADD CONSTRAINT).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_broadcasts_interval_check') THEN
    ALTER TABLE whatsapp_broadcasts
      ADD CONSTRAINT whatsapp_broadcasts_interval_check
      CHECK (interval_seconds >= 3 AND interval_seconds <= 60);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_broadcasts_window_start_check') THEN
    ALTER TABLE whatsapp_broadcasts
      ADD CONSTRAINT whatsapp_broadcasts_window_start_check
      CHECK (window_start_hour_brt >= 0 AND window_start_hour_brt <= 23);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_broadcasts_window_end_check') THEN
    ALTER TABLE whatsapp_broadcasts
      ADD CONSTRAINT whatsapp_broadcasts_window_end_check
      CHECK (window_end_hour_brt >= 1 AND window_end_hour_brt <= 24
             AND window_end_hour_brt > window_start_hour_brt);
  END IF;
END$$;

-- ─── whatsapp_broadcast_recipients extension ────────────────────

-- Per-recipient send moment. Computed at fan-out time so the
-- dispatcher's decision reduces to "any pending rows due yet?".
-- Default now() covers pre-Phase-6 rows that predate the column
-- (they get dispatched on the next tick, matching Phase 5 behaviour).
ALTER TABLE whatsapp_broadcast_recipients
  ADD COLUMN IF NOT EXISTS scheduled_slot TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_recipients_pending_slot
  ON whatsapp_broadcast_recipients (scheduled_slot)
  WHERE status = 'pending';

-- ─── whatsapp_broadcast_templates ───────────────────────────────
--
-- Recurring templates. Same body/filter shape as broadcasts; adds
-- cadence controls + an active flag.
--
-- cadence: 'daily' | 'weekly' | 'monthly'
--   daily   → fires every day at cadence_hour_brt
--   weekly  → fires on cadence_day_of_week (0=sun..6=sat) at cadence_hour_brt
--   monthly → fires on cadence_day_of_month (1..28) at cadence_hour_brt
--
-- The cron generator (hourly) checks each active template. When the
-- cadence hits AND last_generated_at is not within the current
-- period, it creates a fresh whatsapp_broadcasts row from the template
-- (setting generated_from_template_id) and fans out. If the current
-- day is blocked by send_on_days, generation is DELAYED to the next
-- allowed day (message still lands — just later), not skipped.

CREATE TABLE IF NOT EXISTS whatsapp_broadcast_templates (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name                   TEXT NOT NULL,
  body                   JSONB NOT NULL,               -- {pt?, en?, es?}
  target_filter          JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Cadence
  cadence                TEXT NOT NULL
                         CHECK (cadence IN ('daily', 'weekly', 'monthly')),
  cadence_day_of_week    INTEGER
                         CHECK (cadence_day_of_week IS NULL
                             OR (cadence_day_of_week >= 0 AND cadence_day_of_week <= 6)),
  cadence_day_of_month   INTEGER
                         CHECK (cadence_day_of_month IS NULL
                             OR (cadence_day_of_month >= 1 AND cadence_day_of_month <= 28)),
  cadence_hour_brt       INTEGER NOT NULL DEFAULT 9
                         CHECK (cadence_hour_brt >= 0 AND cadence_hour_brt <= 23),

  -- Same scheduling knobs as broadcasts — get copied onto every
  -- generated broadcast row.
  interval_seconds       INTEGER NOT NULL DEFAULT 8
                         CHECK (interval_seconds >= 3 AND interval_seconds <= 60),
  window_start_hour_brt  INTEGER NOT NULL DEFAULT 8
                         CHECK (window_start_hour_brt >= 0 AND window_start_hour_brt <= 23),
  window_end_hour_brt    INTEGER NOT NULL DEFAULT 21
                         CHECK (window_end_hour_brt >= 1 AND window_end_hour_brt <= 24),
  send_on_days           TEXT[] NOT NULL
                         DEFAULT ARRAY['mon','tue','wed','thu','fri','sat'],

  active                 BOOLEAN NOT NULL DEFAULT true,
  last_generated_at      TIMESTAMPTZ,

  created_by             UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_templates_active
  ON whatsapp_broadcast_templates (active, cadence, cadence_hour_brt);

ALTER TABLE whatsapp_broadcast_templates ENABLE ROW LEVEL SECURITY;
-- Deny-by-default.

-- Now that templates exists, add the FK back-ref on broadcasts.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_broadcasts_template_fk') THEN
    ALTER TABLE whatsapp_broadcasts
      ADD CONSTRAINT whatsapp_broadcasts_template_fk
      FOREIGN KEY (generated_from_template_id)
      REFERENCES whatsapp_broadcast_templates(id) ON DELETE SET NULL;
  END IF;
END$$;

COMMIT;

-- Verify:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'whatsapp_broadcasts' AND column_name LIKE 'window%';
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'whatsapp_broadcast_recipients' AND column_name = 'scheduled_slot';
--   SELECT count(*) FROM whatsapp_broadcast_templates;  -- expect 0

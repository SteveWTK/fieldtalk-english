-- WHATSAPP_PHASE_6b_SCHEMA.sql
--
-- Phase 6b — automated per-user system messages (welcome + inactivity
-- reminder). These are triggered by user events (opt-in transition,
-- N-day inactivity), NOT admin-composed like Phase 5/6a broadcasts.
--
--   whatsapp_welcomed_at        — set the moment we send a user their
--                                  first-time welcome. If null, they
--                                  haven't been welcomed yet.
--   whatsapp_last_reminder_at   — throttle inactivity reminders so a
--                                  user doesn't get pinged every hour
--                                  while they stay inactive.
--
-- Bodies for both message types live in src/lib/whatsapp/system-messages.js
-- with an optional DB override table below for live-editing without a
-- deploy. Keep the defaults in code as the authoritative fallback so a
-- missing / typo'd row can't silently silence the whole flow.
--
-- Idempotent. Safe to re-run.

BEGIN;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS whatsapp_welcomed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_last_reminder_at TIMESTAMPTZ;

-- Fast lookup for the inactivity cron: opted-in + phone + not paused
-- + welcomed + not recently reminded. Partial index keeps the working
-- set small — most players don't match all conditions at any given
-- moment.
CREATE INDEX IF NOT EXISTS idx_players_whatsapp_inactivity_pool
  ON players (whatsapp_last_reminder_at)
  WHERE whatsapp_opted_in = true
    AND phone_e164 IS NOT NULL
    AND whatsapp_agent_paused = false
    AND whatsapp_welcomed_at IS NOT NULL;

-- ─── Optional: DB-backed body override ──────────────────────────
--
-- Each row is one message-kind. body is JSONB {pt, en, es?} — same
-- shape as broadcasts. `active = false` = fall back to the bundled
-- default in src/lib/whatsapp/system-messages.js.
--
-- Two seed rows created below (empty body, active=false) so the admin
-- can INSERT / UPDATE to override without needing to know the schema.
-- Change body to a non-empty JSONB + flip active=true to activate.

CREATE TABLE IF NOT EXISTS whatsapp_system_messages (
  kind        TEXT PRIMARY KEY,
  body        JSONB NOT NULL DEFAULT '{}'::jsonb,
  active      BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);

ALTER TABLE whatsapp_system_messages ENABLE ROW LEVEL SECURITY;
-- Deny-by-default; only service-role reads/writes.

-- Seed placeholder rows so admins can find them and edit inline.
INSERT INTO whatsapp_system_messages (kind, body, active)
VALUES ('welcome', '{}'::jsonb, false)
ON CONFLICT (kind) DO NOTHING;

INSERT INTO whatsapp_system_messages (kind, body, active)
VALUES ('inactivity_reminder', '{}'::jsonb, false)
ON CONFLICT (kind) DO NOTHING;

COMMIT;

-- Verify with:
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'players'
--      AND column_name LIKE 'whatsapp_%';
--   SELECT kind, active FROM whatsapp_system_messages;

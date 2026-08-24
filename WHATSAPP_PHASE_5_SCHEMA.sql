-- WHATSAPP_PHASE_5_SCHEMA.sql
--
-- Phase 5 — broadcasts (bulk WhatsApp messaging).
--
--   1. whatsapp_broadcasts — one row per composed message. Body is
--      stored as JSONB {pt, en, es?} so a single broadcast can carry
--      multiple languages; the dispatcher picks the right one per
--      recipient. Missing language keys = skip recipients on that
--      language ("no_translation" skip reason) — decouples storage
--      shape from per-broadcast delivery scope.
--
--   2. whatsapp_broadcast_recipients — one row per intended send,
--      fanned out at "send" time. Snapshots phone_e164 + language so
--      later changes to the player row don't retroactively alter what
--      was sent to whom. UNIQUE on (broadcast_id, player_id) prevents
--      double-sends.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ─── whatsapp_broadcasts ────────────────────────────────────────
--
-- The composed message + audience filter + lifecycle state.
--
-- body shape:
--   { "pt": "olá jogador...", "en": "hey player..." }
--   Any subset of {pt, en, es} — recipients whose preferred_language
--   isn't in the keys get skipped at dispatch (skip_reason).
--
-- target_filter shape (all optional; empty = no restriction):
--   {
--     "edition": "propath_26_27" | "wc2026" | null,
--     "subscription_statuses": ["active", "trialing"] | null,
--     "nudge_frequencies": ["daily", "every_3_days", "weekly"] | null,
--     "positions": ["GK", "CB"] | null,
--     "propath_goals": ["trials", "academy"] | null,
--     "onboarding_completed": true | false | null
--   }
--
-- status lifecycle:
--   'draft'      — composed but not yet sent
--   'sending'    — recipients fanned out; dispatcher working through them
--   'complete'   — all recipients processed (sent/failed/skipped)
--   'cancelled'  — admin halted mid-flight; remaining recipients skipped

CREATE TABLE IF NOT EXISTS whatsapp_broadcasts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,          -- internal admin label, e.g. "5 tips — week 3"
  body              JSONB NOT NULL,         -- {pt?, en?, es?}
  target_filter     JSONB NOT NULL DEFAULT '{}'::jsonb,

  status            TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'sending', 'complete', 'cancelled')),

  -- Aggregate counters — updated as recipients transition through
  -- their lifecycle. Cheap to keep in sync at send time; expensive
  -- to reconstruct from the recipients table for large broadcasts.
  recipient_count   INTEGER NOT NULL DEFAULT 0,
  sent_count        INTEGER NOT NULL DEFAULT 0,
  failed_count      INTEGER NOT NULL DEFAULT 0,
  skipped_count     INTEGER NOT NULL DEFAULT 0,

  created_by        UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_started_at   TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcasts_status_created
  ON whatsapp_broadcasts (status, created_at DESC);

ALTER TABLE whatsapp_broadcasts ENABLE ROW LEVEL SECURITY;
-- Deny-by-default. Only service-role (via admin API routes) touches this.

-- ─── whatsapp_broadcast_recipients ──────────────────────────────
--
-- One row per (broadcast, player) intended send. Created at send-time
-- by fanning out the target_filter against the current players table.
--
-- Lifecycle:
--   'pending'  — waiting for dispatcher to pick up
--   'sent'     — Z-API accepted; provider_message_id populated
--   'failed'   — send attempt raised an error; error field populated
--   'skipped'  — dispatcher decided to skip (opted out, no translation,
--                subscription changed, etc.); skip_reason populated

CREATE TABLE IF NOT EXISTS whatsapp_broadcast_recipients (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id          UUID NOT NULL REFERENCES whatsapp_broadcasts(id) ON DELETE CASCADE,

  player_id             UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Snapshots taken at fan-out time — surviving later profile edits.
  phone_e164            TEXT NOT NULL,
  language              TEXT NOT NULL DEFAULT 'pt',

  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),

  provider_message_id   TEXT,
  error                 TEXT,
  skip_reason           TEXT,
  sent_at               TIMESTAMPTZ,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (broadcast_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_recipients_status
  ON whatsapp_broadcast_recipients (status, created_at);

CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_recipients_broadcast
  ON whatsapp_broadcast_recipients (broadcast_id);

ALTER TABLE whatsapp_broadcast_recipients ENABLE ROW LEVEL SECURITY;
-- Deny-by-default.

COMMIT;

-- ─── Post-migration one-off ────────────────────────────────────
-- Grant your admin users access to /admin/* routes by setting their
-- players.user_type to 'platform_admin'. Run once per person:
--
--   UPDATE players SET user_type = 'platform_admin'
--    WHERE email IN ('steveinspirewtk@gmail.com', 'david@...');
--
-- (Or by player id — however you identify them in your table.)
--
-- Verify:
--   SELECT count(*) FROM whatsapp_broadcasts;              -- 0
--   SELECT count(*) FROM whatsapp_broadcast_recipients;    -- 0
--   SELECT full_name, user_type FROM players
--    WHERE user_type = 'platform_admin';

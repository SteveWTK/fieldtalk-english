-- WHATSAPP_INTEGRATION_SCHEMA.sql
--
-- Phase 2 foundation for the Z-API WhatsApp integration:
--
--   1. Extends players with phone + WhatsApp consent + nudge prefs
--      + agent state. All columns nullable / defaulted so existing
--      rows aren't broken.
--   2. Creates webhook_events (shared idempotency store for Z-API and
--      any future provider — Asaas, etc. — mirroring the LGP pattern).
--   3. Creates whatsapp_messages (conversation log; every inbound and
--      outbound goes here for audit + admin visibility).
--
-- Idempotent. Safe to re-run.
--
-- Naming: everything WhatsApp-related on `players` is prefixed
-- `whatsapp_*` for grep-ability and to keep the intent obvious when
-- reading queries months later. The prefix is verbose but the alternative
-- (agent_paused, opted_in, etc.) collides with terminology in other
-- systems (Stripe agent_paused doesn't exist but broader "agent" naming
-- would be ambiguous in a codebase that also has AI feedback + speech).

BEGIN;

-- ─── players extensions ───────────────────────────────────────────

ALTER TABLE players
  -- Canonical E.164-flavoured digits (no `+`), Z-API-ready. UNIQUE
  -- because one phone maps to at most one FieldTalk account —
  -- prevents family-sharing accidents where two players use the
  -- same number and one's coach messages hit the other.
  ADD COLUMN IF NOT EXISTS phone_e164 TEXT UNIQUE,

  -- Consent (LGPD requirement). Stored with a timestamp AND a
  -- snapshot of the exact consent copy the user agreed to, so if
  -- we ever change the wording we still have the original for
  -- audit. `whatsapp_opted_in=true` is the ONLY gate the broadcast
  -- dispatcher checks — do not send to opted-out numbers even if
  -- phone_e164 is populated.
  ADD COLUMN IF NOT EXISTS whatsapp_opted_in BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opted_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_consent_text TEXT,

  -- Nudge preferences (chosen in onboarding). Nulls fall back to
  -- defaults in the cron job (every_3_days / morning) so we don't
  -- have to backfill every existing row.
  ADD COLUMN IF NOT EXISTS whatsapp_nudge_frequency TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_nudge_time_slot TEXT,

  -- Agent state. `whatsapp_agent_paused` flips true when an admin
  -- takes over a conversation (either via a manual reply on the
  -- shared WhatsApp Web or via an admin UI action). The processor
  -- respects it and won't auto-reply until an admin explicitly
  -- resumes the agent.
  ADD COLUMN IF NOT EXISTS whatsapp_agent_paused BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_agent_paused_at TIMESTAMPTZ,

  -- Timestamps for rate-limiting + admin visibility. Cheap to
  -- update on every send/receive; expensive to reconstruct from
  -- whatsapp_messages later.
  ADD COLUMN IF NOT EXISTS whatsapp_last_inbound_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_last_outbound_at TIMESTAMPTZ;

-- CHECK constraints for the enum-ish columns. Added via DO blocks
-- so re-runs don't fail (ALTER TABLE ADD CONSTRAINT has no
-- IF NOT EXISTS equivalent pre-PG 15).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'players_whatsapp_nudge_frequency_check'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_whatsapp_nudge_frequency_check
      CHECK (whatsapp_nudge_frequency IS NULL
          OR whatsapp_nudge_frequency IN ('daily', 'every_3_days', 'weekly', 'off'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'players_whatsapp_nudge_time_slot_check'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_whatsapp_nudge_time_slot_check
      CHECK (whatsapp_nudge_time_slot IS NULL
          OR whatsapp_nudge_time_slot IN ('morning', 'afternoon', 'evening'));
  END IF;
END$$;

-- Partial index for the broadcast dispatcher's hot query:
-- "who's opted in, has a phone, and isn't paused?"
CREATE INDEX IF NOT EXISTS idx_players_whatsapp_broadcast_pool
  ON players (edition, whatsapp_nudge_frequency)
  WHERE whatsapp_opted_in = true
    AND phone_e164 IS NOT NULL
    AND whatsapp_agent_paused = false;

-- ─── webhook_events (shared provider idempotency store) ──────────

CREATE TABLE IF NOT EXISTS webhook_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider          TEXT NOT NULL,               -- 'zapi', later maybe 'asaas', 'stripe' (if we ever consolidate)
  provider_event_id TEXT NOT NULL,               -- Z-API's messageId or SHA256 fallback for oddball payloads
  event_type        TEXT,                        -- Z-API's `type` field
  payload           JSONB NOT NULL,
  status            TEXT NOT NULL DEFAULT 'received',   -- 'received' | 'processed' | 'failed'
  processed_at      TIMESTAMPTZ,
  error             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_event_id)           -- the idempotency guarantee
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_provider_status_created
  ON webhook_events (provider, status, created_at);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies = deny-by-default. Only the service-role client
-- (webhook route + cron drain) touches this table.

-- ─── whatsapp_messages (conversation log) ────────────────────────

CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Nullable so unmatched inbounds (unknown number) can still be
  -- persisted for admin review without breaking the FK.
  player_id            UUID REFERENCES players(id) ON DELETE SET NULL,

  -- Snapshot at send/receive time — survives player deletion and
  -- lets us group unmatched inbounds by phone in the admin UI.
  phone_e164           TEXT NOT NULL,

  direction            TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),

  -- Z-API's messageId (or equivalent for other providers). Nullable
  -- for outbounds we log before the provider ack (e.g. failed sends
  -- with an error but no id). UNIQUE with provider so duplicate
  -- webhook processing is a no-op.
  provider             TEXT NOT NULL DEFAULT 'zapi',
  provider_message_id  TEXT,

  -- Where this message came from on OUR side:
  --   'agent'             — AI agent auto-reply
  --   'atendente_manual'  — admin typed it in WhatsApp Web directly
  --                         (captured via fromMe=true webhook)
  --   'broadcast'         — bulk send
  --   'system'            — automated notification (streak, lesson-complete)
  --   'user'              — inbound from the user
  via                  TEXT,

  body                 TEXT NOT NULL,

  -- Free-form extras: broadcast_id, agent persona used, error
  -- details, etc. Keep the schema stable by pushing evolving
  -- fields here.
  metadata             JSONB,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT whatsapp_messages_provider_msgid_uniq
    UNIQUE (provider, provider_message_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_player_created
  ON whatsapp_messages (player_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_created
  ON whatsapp_messages (phone_e164, created_at DESC);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
-- Deny-by-default. Admin UI reads via service-role or a future
-- staff-only policy.

COMMIT;

-- After running: verify with
--
--   SELECT column_name, data_type, column_default
--     FROM information_schema.columns
--    WHERE table_name = 'players'
--      AND column_name LIKE 'whatsapp_%' OR column_name = 'phone_e164'
--    ORDER BY column_name;
--
--   SELECT count(*) FROM webhook_events;      -- expect 0
--   SELECT count(*) FROM whatsapp_messages;   -- expect 0

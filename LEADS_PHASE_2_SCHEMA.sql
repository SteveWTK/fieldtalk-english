-- LEADS_PHASE_2_SCHEMA.sql
--
-- Phase 2 additions to the leads CRM:
--
--   1. lead_message_templates            — reusable WhatsApp openers
--                                            per lead_type. Bilingual
--                                            body ({pt, en}) with the
--                                            same substitution vars
--                                            already documented in
--                                            system-messages.js
--                                            ({name} + {org}).
--
--   2. whatsapp_broadcasts extensions    — target_kind lets one row
--                                            represent EITHER a
--                                            player-targeted or a
--                                            lead-targeted broadcast.
--
--   3. whatsapp_broadcast_recipients     — player_id becomes nullable
--         extensions                       + a lead_id column added.
--                                            CHECK ensures exactly
--                                            one is set. Same table
--                                            because dispatch logic
--                                            is 90% shared; a per-row
--                                            branch handles the small
--                                            differences.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ─── lead_message_templates ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead_message_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Internal label — e.g. "Academy director — warm intro".
  name          TEXT NOT NULL,

  -- Bilingual body. Same shape as broadcasts + system_messages. Both
  -- keys should be present in practice; the picker falls back to the
  -- other language if one is empty.
  body          JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Optional filter — if set, this template shows only when the
  -- lead being messaged is this type. NULL means "applies to all
  -- lead types".
  lead_type     TEXT
                CHECK (lead_type IS NULL OR lead_type IN (
                  'individual_player', 'academy', 'school',
                  'club', 'partner_other'
                )),

  -- Soft-delete flag — inactive templates hide from pickers but
  -- stay in the audit trail so historical sends remain traceable.
  active        BOOLEAN NOT NULL DEFAULT true,

  -- Optional label array for organising ("event", "warm", "cold").
  tags          TEXT[] NOT NULL DEFAULT '{}',

  created_by    UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_templates_active_type
  ON lead_message_templates (active, lead_type);

DROP TRIGGER IF EXISTS trg_lead_templates_updated_at
  ON lead_message_templates;
CREATE OR REPLACE FUNCTION set_lead_templates_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_lead_templates_updated_at
  BEFORE UPDATE ON lead_message_templates
  FOR EACH ROW EXECUTE FUNCTION set_lead_templates_updated_at();

ALTER TABLE lead_message_templates ENABLE ROW LEVEL SECURITY;
-- Deny-by-default. Only service-role (via admin routes) touches.

-- ─── whatsapp_broadcasts — target_kind ──────────────────────────
--
-- 'players' (default, current behaviour) or 'leads' (new). Drives
-- fan-out lookup source + dispatcher's per-recipient checks.

ALTER TABLE whatsapp_broadcasts
  ADD COLUMN IF NOT EXISTS target_kind TEXT NOT NULL DEFAULT 'players';

-- Idempotent CHECK — wrapped in DO block for Postgres <15.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'whatsapp_broadcasts_target_kind_check'
  ) THEN
    ALTER TABLE whatsapp_broadcasts
      ADD CONSTRAINT whatsapp_broadcasts_target_kind_check
      CHECK (target_kind IN ('players', 'leads'));
  END IF;
END$$;

-- ─── whatsapp_broadcast_recipients — lead_id + player_id nullable ─

-- player_id is currently NOT NULL. Drop the NOT NULL so lead-only
-- rows can exist. The CHECK below preserves the "exactly one of
-- player_id / lead_id must be set" invariant so we never end up
-- with orphan or ambiguous rows.
ALTER TABLE whatsapp_broadcast_recipients
  ALTER COLUMN player_id DROP NOT NULL;

ALTER TABLE whatsapp_broadcast_recipients
  ADD COLUMN IF NOT EXISTS lead_id UUID
    REFERENCES leads(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'whatsapp_broadcast_recipients_target_xor_check'
  ) THEN
    ALTER TABLE whatsapp_broadcast_recipients
      ADD CONSTRAINT whatsapp_broadcast_recipients_target_xor_check
      CHECK (
        (player_id IS NOT NULL AND lead_id IS NULL)
        OR
        (player_id IS NULL AND lead_id IS NOT NULL)
      );
  END IF;
END$$;

-- Per-broadcast uniqueness for lead recipients (mirrors existing
-- UNIQUE (broadcast_id, player_id) for players). Nullable-friendly
-- unique via an index rather than a table constraint — Postgres treats
-- NULL as distinct in table UNIQUE constraints, so a plain UNIQUE
-- won't dedupe a lead-only row against another lead-only row.
CREATE UNIQUE INDEX IF NOT EXISTS uq_whatsapp_broadcast_recipients_lead
  ON whatsapp_broadcast_recipients (broadcast_id, lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_whatsapp_broadcast_recipients_lead
  ON whatsapp_broadcast_recipients (lead_id)
  WHERE lead_id IS NOT NULL;

COMMIT;

-- Verify:
--   SELECT count(*) FROM lead_message_templates;   -- expect 0
--   \d whatsapp_broadcasts       -- target_kind column present
--   \d whatsapp_broadcast_recipients   -- lead_id column present,
--                                       player_id nullable

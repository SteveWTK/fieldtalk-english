-- WHATSAPP_PHASE_4_SCHEMA.sql
--
-- Phase 4 — AI agent + escalation trail.
--
--   1. whatsapp_prompts — DB-backed prompt storage so product owners
--      can edit the router / coach / support prompts without a deploy.
--      Falls back to bundled defaults in src/lib/whatsapp/prompts.js
--      when a row is absent (or `active = false`).
--   2. whatsapp_escalations — audit trail of every hand-off the agent
--      makes to a human. Notification email is fired from the executor;
--      this table is the durable source of truth for "who needs help
--      right now" and "how did we resolve X last month".
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ─── whatsapp_prompts ───────────────────────────────────────────
--
-- One row per prompt kind. Content is plain text — the agent code
-- concatenates it with per-turn context (user profile, recent
-- messages) before sending to the LLM.
--
-- To edit a prompt: UPDATE whatsapp_prompts SET content = '...',
--                          updated_at = now(), updated_by = 'stephen'
--                    WHERE kind = 'coach';
-- To temporarily fall back to the bundled default:
--   UPDATE whatsapp_prompts SET active = false WHERE kind = 'coach';

CREATE TABLE IF NOT EXISTS whatsapp_prompts (
  kind        TEXT PRIMARY KEY,          -- 'router' | 'coach' | 'support'
  content     TEXT NOT NULL,
  active      BOOLEAN NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  TEXT
);

ALTER TABLE whatsapp_prompts ENABLE ROW LEVEL SECURITY;
-- Deny-by-default. Only service-role reads/writes (agent code + admin UI).

-- ─── whatsapp_escalations ───────────────────────────────────────
--
-- Every agent escalation logs a row here. UI at /admin/whatsapp/
-- escalations (future) will list open ones and let a human resolve.
-- For MVP the team reads directly from the Supabase table editor
-- + gets an email notification on every insert.

CREATE TABLE IF NOT EXISTS whatsapp_escalations (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user being escalated. Nullable so unmatched inbounds can also
  -- be escalated (an unknown number asking to speak to a person).
  player_id                   UUID REFERENCES players(id) ON DELETE SET NULL,
  phone_e164                  TEXT NOT NULL,

  -- The inbound message that triggered the escalation, and the persona
  -- that raised it — helps humans see the context at a glance.
  inbound_whatsapp_message_id UUID REFERENCES whatsapp_messages(id) ON DELETE SET NULL,
  intent                      TEXT,   -- 'COACH' | 'SUPPORT'
  reason                      TEXT NOT NULL,

  -- Snapshot of the context we fed to the agent when it decided to
  -- escalate: player profile, recent conversation, subscription state,
  -- etc. Priceless for debugging "why did the agent bail here?".
  agent_context               JSONB,

  -- Lifecycle. Team member picks up an escalation, works it, marks
  -- resolved with a short note. `assigned_to` is free-form text (email
  -- or name) since we don't have staff-user rows yet.
  status                      TEXT NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open', 'assigned', 'resolved')),
  assigned_to                 TEXT,
  resolved_at                 TIMESTAMPTZ,
  resolution_note             TEXT,

  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_escalations_status_created
  ON whatsapp_escalations (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_whatsapp_escalations_player_created
  ON whatsapp_escalations (player_id, created_at DESC);

ALTER TABLE whatsapp_escalations ENABLE ROW LEVEL SECURITY;
-- Deny-by-default. Only service-role reads/writes.

COMMIT;

-- After running: verify with
--
--   SELECT count(*) FROM whatsapp_prompts;       -- expect 0 (falls back
--                                                --   to bundled defaults)
--   SELECT count(*) FROM whatsapp_escalations;   -- expect 0

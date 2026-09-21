-- WHATSAPP_LEAD_FUNNEL_SCHEMA.sql
--
-- WhatsApp lead-funnel — an "irresistible" pre-signup sales flow that
-- runs entirely on the existing Z-API business number.
--
--   1. Team launches an outreach for a NEW lead in /admin/leads/outreach
--      (or from an existing lead's detail page). System mints a unique
--      token and returns a wa.me link the salesperson pastes into their
--      personal WhatsApp DM.
--   2. Lead clicks the link → WhatsApp opens with our business number
--      and a pre-filled "Oi <token>" message.
--   3. Business number receives it. lead-funnel-router matches the token,
--      captures the lead's phone/name, freezes Q1 into funnel_q1_snapshot,
--      sends Z-API buttons.
--   4. Lead taps a button → router grades, sends confirmation + Q2.
--   5. Lead taps Q2 → router grades, sends CTA link (globalplayerpro.com/
--      demo/<token>).
--   6. Lead lands on the 90-second demo page. Signs up. converted_player_id
--      is set + funnel_stage='converted'.
--
-- Schema surface (all additive, no rewrites of existing tables):
--   1. leads columns: outreach_token, funnel_stage, funnel_role,
--      funnel_q1_* + funnel_q2_* answer-tracking, funnel_nudged_at.
--   2. leads.source CHECK: add 'whatsapp_funnel' so reporting can
--      distinguish funnel-originated leads from other sources.
--   3. whatsapp_lead_questions: authoring bank for Q1 + Q2. Two-slot
--      pool; David/Paul rotate live questions via 'active' toggle.
--   4. whatsapp_escalations.intent CHECK: add 'LEAD_SALES' so a lead
--      going off-script pings Paul/David, not the tech triage path.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ─── leads: outreach + funnel-state columns ─────────────────────

ALTER TABLE leads
  -- Unique per-outreach token. Encoded into the wa.me link's message
  -- body ("Oi <token>") so the first inbound can be matched to a lead
  -- record even when we don't yet know the lead's phone_e164.
  ADD COLUMN IF NOT EXISTS outreach_token TEXT,

  -- CTA-varying role. Distinct from lead_type ('individual_player',
  -- 'academy', 'school', 'club', 'partner_other') — a partner_other
  -- could be an agent, a school could have a coach, etc. This column
  -- is the copy-lever for the /demo CTA button label.
  ADD COLUMN IF NOT EXISTS funnel_role TEXT,

  -- Where the lead is in the WhatsApp funnel. Orthogonal to `stage`
  -- (the sales pipeline). A lead can be stage='engaged' AND
  -- funnel_stage='q2_sent'.
  ADD COLUMN IF NOT EXISTS funnel_stage TEXT,

  -- Frozen at send-time so grading is stable if the admin edits
  -- questions after the fact. Mirrors whatsapp_review_sessions
  -- .question_snapshot on the review-quiz side.
  ADD COLUMN IF NOT EXISTS funnel_q1_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS funnel_q1_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS funnel_q1_answered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS funnel_q1_button_id TEXT,
  ADD COLUMN IF NOT EXISTS funnel_q1_is_correct BOOLEAN,

  ADD COLUMN IF NOT EXISTS funnel_q2_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS funnel_q2_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS funnel_q2_answered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS funnel_q2_button_id TEXT,
  ADD COLUMN IF NOT EXISTS funnel_q2_is_correct BOOLEAN,

  -- One 24h nudge per stage. When funnel_stage flips forward, this is
  -- reset to NULL so the next stage can nudge in its own 24h window.
  ADD COLUMN IF NOT EXISTS funnel_nudged_at TIMESTAMPTZ;

-- CHECKs on new enum columns. Wrapped in DO blocks so re-runs don't
-- error if the constraint already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_funnel_stage_check'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_funnel_stage_check
      CHECK (funnel_stage IS NULL OR funnel_stage IN (
        'pending_oi',   -- token minted, waiting for the "Oi <token>" inbound
        'q1_sent',      -- Q1 message sent, waiting for button reply
        'q2_sent',      -- Q1 answered, Q2 message sent, waiting for reply
        'cta_sent',     -- Q2 answered, CTA link sent, waiting for signup
        'converted',    -- lead created a player account via the CTA
        'escalated',    -- free-text mid-flow → paused, humans took over
        'cold'          -- 24h+ silent at a stage → funnel gave up
      ));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_funnel_role_check'
  ) THEN
    ALTER TABLE leads
      ADD CONSTRAINT leads_funnel_role_check
      CHECK (funnel_role IS NULL OR funnel_role IN (
        'agent',
        'coach',
        'club_staff',
        'academy_director',
        'other'
      ));
  END IF;
END $$;

-- Uniqueness on the outreach token (case-insensitive because the lead
-- types "Oi <token>" and we shouldn't care if their keyboard was in
-- caps). Partial index so NULLs aren't indexed.
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_outreach_token_ci
  ON leads (lower(outreach_token))
  WHERE outreach_token IS NOT NULL;

-- Hot query for the nudge cron: find leads in a "waiting" stage whose
-- last funnel send is ~24h old and haven't been nudged yet.
CREATE INDEX IF NOT EXISTS idx_leads_funnel_stage_updated
  ON leads (funnel_stage, updated_at DESC)
  WHERE funnel_stage IS NOT NULL;

-- Amend leads.source CHECK to include 'whatsapp_funnel'. Drop-and-add
-- because Postgres doesn't have "ALTER CHECK". Wrapped in a guard so
-- we don't drop something that isn't there on a fresh install.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'leads_source_check'
  ) THEN
    ALTER TABLE leads DROP CONSTRAINT leads_source_check;
  END IF;

  ALTER TABLE leads
    ADD CONSTRAINT leads_source_check
    CHECK (source IN (
      'manual',
      'qr_campaign',
      'landing_form',
      'partner_referral',
      'event',
      'cold_outreach',
      'import',
      'whatsapp_funnel'
    ));
END $$;

-- ─── whatsapp_lead_questions ────────────────────────────────────
--
-- Two-slot authoring pool (q1 + q2). Multiple candidate questions
-- per slot; exactly one active at a time per slot via the partial
-- unique index below. Same JSONB shape as lessons.review_questions[i]
-- so the review-quiz router's grading helpers work verbatim.

CREATE TABLE IF NOT EXISTS whatsapp_lead_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Which of the two funnel slots this question feeds.
  slot          TEXT NOT NULL CHECK (slot IN ('q1', 'q2')),

  -- Team's internal label — "Park the bus v1", "Nutmeg — casual variant",
  -- etc. Not shown to the lead; visible in admin UI.
  name          TEXT NOT NULL,

  -- Message + button + explanation. Bundle shape matches the review-
  -- quiz side: { pt, en? }. PT is required; EN is optional for
  -- lead-funnel (Portuguese-first for BR outreach).
  prompt        JSONB NOT NULL,
  buttons       JSONB NOT NULL,   -- [{ id, label: {pt, en?}, correct }]
  explanation   JSONB NOT NULL,

  -- Only one active per slot; toggled via admin UI. When the router
  -- freezes a question into funnel_q*_snapshot it uses the active row.
  active        BOOLEAN NOT NULL DEFAULT false,

  created_by    UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enforce "exactly one active per slot" via partial unique index. The
-- admin UI toggling "active" for a new question must first flip the
-- previous winner to false — otherwise this constraint would reject.
CREATE UNIQUE INDEX IF NOT EXISTS idx_wlq_active_per_slot
  ON whatsapp_lead_questions (slot)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_wlq_slot_updated
  ON whatsapp_lead_questions (slot, updated_at DESC);

DROP TRIGGER IF EXISTS trg_wlq_updated_at ON whatsapp_lead_questions;
CREATE OR REPLACE FUNCTION set_wlq_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_wlq_updated_at
  BEFORE UPDATE ON whatsapp_lead_questions
  FOR EACH ROW EXECUTE FUNCTION set_wlq_updated_at();

ALTER TABLE whatsapp_lead_questions ENABLE ROW LEVEL SECURITY;
-- Deny-by-default. Only service-role via /api/admin/* routes.

-- ─── whatsapp_escalations.intent — add LEAD_SALES ───────────────
--
-- Existing CHECK: intent IN ('COACH', 'SUPPORT'). We add 'LEAD_SALES'
-- so a lead going off-script mid-funnel routes to Paul/David via the
-- sales notify branch (see src/lib/whatsapp/notify.js), separate from
-- tech triage.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname LIKE 'whatsapp_escalations_intent_check%'
  ) THEN
    -- Older instances may have used a different name — best-effort drop.
    EXECUTE (
      SELECT format('ALTER TABLE whatsapp_escalations DROP CONSTRAINT %I', conname)
      FROM pg_constraint
      WHERE conname LIKE 'whatsapp_escalations_intent_check%'
      LIMIT 1
    );
  END IF;

  ALTER TABLE whatsapp_escalations
    ADD CONSTRAINT whatsapp_escalations_intent_check
    CHECK (intent IS NULL OR intent IN ('COACH', 'SUPPORT', 'LEAD_SALES'));
END $$;

COMMIT;

-- After running: verify with
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'leads'
--      AND column_name IN (
--        'outreach_token', 'funnel_stage', 'funnel_role',
--        'funnel_q1_snapshot', 'funnel_q2_snapshot', 'funnel_nudged_at'
--      );
--
--   SELECT count(*) FROM whatsapp_lead_questions;   -- expect 0
--
--   -- Confirm escalations CHECK now permits LEAD_SALES:
--   INSERT INTO whatsapp_escalations (phone_e164, intent, reason)
--        VALUES ('+5511900000000', 'LEAD_SALES', 'schema smoke test');
--   DELETE FROM whatsapp_escalations
--    WHERE reason = 'schema smoke test';

-- LEADS_ADMIN_SCHEMA.sql
--
-- Phase 1 — Leads CRM for Paul (PR & Sales) and any future team members.
--
-- Three tables:
--   1. leads               — the record itself, one row per lead.
--   2. lead_activities     — chronological audit trail. Every touch
--                            (WhatsApp send, note added, stage change,
--                            call logged) inserts one row here so the
--                            detail view can render a full history.
--   3. lead_notes          — separate from activities so we can
--                            search / edit / delete freeform notes
--                            independently. Notes ALSO get mirrored
--                            into lead_activities as a summary row so
--                            the timeline view sees them inline.
--
-- Notes on design:
--   - One `leads` table for BOTH individual-player and organisation
--     lead types. Type-specific fields are nullable (positions[],
--     age_group, organization_name, role_at_org, staff_count).
--     Progressive disclosure in the UI keeps unused fields hidden.
--   - assigned_to references players(id) — Paul, David, or any
--     future team member with platform_admin user_type.
--   - converted_player_id references players(id) — populated when
--     the lead signs up. Lets us measure "leads-in → conversions"
--     without duplicating the player row.
--   - tags TEXT[] for free-form labels. GIN index for fast filter.
--   - next_action_at nullable — reminder timestamp Paul can set.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ─── leads ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leads (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Contact basics — every lead has at least name; email/phone
  -- nullable because some leads come in without one (e.g. captured
  -- at an event via QR that only asks name).
  full_name              TEXT NOT NULL,
  email                  TEXT,
  phone_e164             TEXT,

  -- Lead type + type-specific fields. All type fields are nullable;
  -- the UI shows only the section matching lead_type.
  lead_type              TEXT NOT NULL DEFAULT 'individual_player'
                         CHECK (lead_type IN (
                           'individual_player',
                           'academy',
                           'school',
                           'club',
                           'partner_other'
                         )),

  -- Individual-player fields.
  age_group              TEXT
                         CHECK (age_group IS NULL OR age_group IN (
                           'youth', 'senior', 'pro'
                         )),
  positions              TEXT[],
  english_level          TEXT
                         CHECK (english_level IS NULL OR english_level IN (
                           'beginner', 'intermediate', 'advanced'
                         )),

  -- Organisation fields (academy, school, club, partner_other).
  organization_name      TEXT,
  role_at_org            TEXT,     -- free-form: "director", "head coach", etc.
  staff_count            INTEGER,

  -- Pipeline state.
  stage                  TEXT NOT NULL DEFAULT 'new'
                         CHECK (stage IN (
                           'new',
                           'contacted',
                           'engaged',
                           'qualified',
                           'proposal',
                           'won',
                           'lost',
                           'dormant'
                         )),

  -- Where the lead came from — powers Source ROI reporting later.
  source                 TEXT NOT NULL DEFAULT 'manual'
                         CHECK (source IN (
                           'manual',
                           'qr_campaign',
                           'landing_form',
                           'partner_referral',
                           'event',
                           'cold_outreach',
                           'import'
                         )),
  source_detail          TEXT,     -- event name, partner id, campaign slug

  -- Ownership (Paul, David, or future team member).
  assigned_to            UUID REFERENCES players(id) ON DELETE SET NULL,

  -- Geographic — nullable, filled where relevant.
  country                TEXT,
  state                  TEXT,     -- BR: "SP", "RJ", "PI"; INT: full name
  city                   TEXT,

  -- Rough pipeline value in cents (BRL by default). Paul's estimate
  -- for reporting; not strict accounting. Nullable.
  estimated_value_cents  INTEGER,

  -- Post-conversion link back to the player that signed up. Set once,
  -- never cleared — leaves a permanent audit trail.
  converted_player_id    UUID REFERENCES players(id) ON DELETE SET NULL,
  converted_at           TIMESTAMPTZ,

  -- Free-form labels (["warm","event-carioca","hot-2026"]). GIN index
  -- below makes tag-filter queries fast.
  tags                   TEXT[] NOT NULL DEFAULT '{}',

  -- Compact freeform notes on the lead itself (recent-touch summary).
  -- Full history lives in lead_notes; this column is the "quick
  -- description" that shows in the list row so Paul doesn't have to
  -- open detail to remember who someone is.
  summary                TEXT,

  -- Reminder — "call back Tuesday", "follow up after the tournament".
  -- The list view can filter on overdue / today / this week.
  next_action_at         TIMESTAMPTZ,
  next_action_note       TEXT,

  -- Contact suppression — respects opt-outs. Any WhatsApp / broadcast
  -- send checks this column and skips if true.
  do_not_contact         BOOLEAN NOT NULL DEFAULT false,

  -- Who created / last edited (for the future team-of-multiple case).
  created_by             UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the hot filter/sort paths on the list view.
CREATE INDEX IF NOT EXISTS idx_leads_stage_updated
  ON leads (stage, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to
  ON leads (assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_lead_type
  ON leads (lead_type);
CREATE INDEX IF NOT EXISTS idx_leads_source
  ON leads (source);
CREATE INDEX IF NOT EXISTS idx_leads_next_action_at
  ON leads (next_action_at)
  WHERE next_action_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_phone_e164
  ON leads (phone_e164)
  WHERE phone_e164 IS NOT NULL;
-- GIN on tags[] — supports `tags && ARRAY['warm']` filter.
CREATE INDEX IF NOT EXISTS idx_leads_tags_gin
  ON leads USING GIN (tags);

-- updated_at auto-bump. Idempotent — DROP first so re-runs are clean.
DROP TRIGGER IF EXISTS trg_leads_updated_at ON leads;
CREATE OR REPLACE FUNCTION set_leads_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_leads_updated_at();

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- Deny-by-default. Only service-role (via /api/admin/leads/* routes)
-- reads / writes. Team access is gated in the API layer via
-- assertAdmin(), matching the broadcasts + review-questions pattern.

-- ─── lead_activities ────────────────────────────────────────────
--
-- One row per touch. Types:
--   'stage_change'      — stage moved (from → to)
--   'whatsapp_outbound' — WhatsApp message sent (via admin)
--   'whatsapp_inbound'  — WhatsApp reply received (auto-logged
--                          in Phase 2 when we wire the router hook)
--   'note_added'        — freeform note (also inserted in lead_notes)
--   'call_logged'       — Paul recorded a phone call
--   'email_logged'      — Paul recorded an outbound email
--   'assigned'          — ownership changed
--   'tag_change'        — tags added / removed
--   'converted'         — linked to a signed-up player row
--
-- payload JSONB carries type-specific extras (from/to for
-- stage_change, message body for whatsapp_outbound, etc.).

CREATE TABLE IF NOT EXISTS lead_activities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,

  activity_type TEXT NOT NULL
                CHECK (activity_type IN (
                  'stage_change',
                  'whatsapp_outbound',
                  'whatsapp_inbound',
                  'note_added',
                  'call_logged',
                  'email_logged',
                  'assigned',
                  'tag_change',
                  'converted'
                )),

  -- Free-form JSONB — old:new for stage_change, {body, provider_message_id}
  -- for whatsapp_outbound, {duration_minutes, outcome} for call_logged, etc.
  payload       JSONB,

  -- Short human-readable summary shown in the timeline. Optional —
  -- when null, the UI renders a type-specific default from payload.
  summary       TEXT,

  -- Who performed the action (null for auto-triggered rows like
  -- whatsapp_inbound).
  actor_id      UUID REFERENCES players(id) ON DELETE SET NULL,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_created
  ON lead_activities (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_activities_type
  ON lead_activities (activity_type, created_at DESC);

ALTER TABLE lead_activities ENABLE ROW LEVEL SECURITY;

-- ─── lead_notes ─────────────────────────────────────────────────
--
-- Threaded freeform notes. Separate from activities so Paul can:
--   - Search across notes without wading through auto-logged rows
--   - Edit / delete a note without losing the audit trail (the
--     lead_activities 'note_added' row stays)

CREATE TABLE IF NOT EXISTS lead_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  body         TEXT NOT NULL,
  author_id    UUID REFERENCES players(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes_lead_created
  ON lead_notes (lead_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_lead_notes_updated_at ON lead_notes;
CREATE OR REPLACE FUNCTION set_lead_notes_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_lead_notes_updated_at
  BEFORE UPDATE ON lead_notes
  FOR EACH ROW EXECUTE FUNCTION set_lead_notes_updated_at();

ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

COMMIT;

-- After running: verify with
--
--   SELECT count(*) FROM leads;              -- expect 0
--   SELECT count(*) FROM lead_activities;    -- expect 0
--   SELECT count(*) FROM lead_notes;         -- expect 0
--
--   -- Sanity check the enum columns
--   \d+ leads

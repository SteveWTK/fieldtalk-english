-- WHATSAPP_PHASE_7_SCHEMA.sql
--
-- Phase 7 — T+24h WhatsApp mini-review quizzes.
--
-- One row per (player, lesson, question_id) captures the lifecycle of
-- ONE quiz attempt: queued → sent → answered | deferred (→ re-queued)
-- | skipped | expired.
--
-- Additions:
--   1. players.last_whatsapp_activity_at  — bumped on every inbound and
--      outbound WhatsApp message. Cron uses this as the "don't quiz
--      during a support conversation" gate (30 min of inactivity).
--   2. players.timezone                   — nullable IANA name (e.g.
--      "America/Sao_Paulo"). MVP defaults ALL players to Sao_Paulo
--      when null; the column exists so we can onboard international
--      players later without a schema change.
--   3. lessons.review_questions           — JSONB array of question
--      objects (see docs/whatsapp-review-questions.md for the shape).
--      NULL / empty array = no quiz for that lesson (silently skipped
--      by the cron). Enables gradual authoring.
--   4. whatsapp_review_sessions           — one row per attempt.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ─── players extensions ─────────────────────────────────────────

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS last_whatsapp_activity_at TIMESTAMPTZ,
  -- IANA timezone name. Null → cron treats as America/Sao_Paulo
  -- (MVP default). Column exists so a future "add players outside
  -- BR" rollout is a data migration, not a schema change.
  ADD COLUMN IF NOT EXISTS timezone TEXT;

-- Partial index for the quiz-spawn cron's hot query — same shape as
-- the inactivity-reminder pool but keyed on last_whatsapp_activity_at
-- so the 30-min gate is a fast range scan.
CREATE INDEX IF NOT EXISTS idx_players_whatsapp_quiz_pool
  ON players (last_whatsapp_activity_at)
  WHERE whatsapp_opted_in = true
    AND phone_e164 IS NOT NULL
    AND whatsapp_agent_paused = false
    AND whatsapp_welcomed_at IS NOT NULL;

-- ─── lessons.review_questions ───────────────────────────────────
--
-- JSONB array of question objects. Rendered per-recipient using the
-- player's preferred_language. See docs/whatsapp-review-questions.md
-- for the full shape + examples.
--
-- MVP: only the first entry ([0]) is used. Column shaped as an array
-- so future N-questions-per-lesson rollout is trivial.

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS review_questions JSONB;

-- Partial index for the cron's "which lessons even have a quiz?" join
-- — most lessons will start life with review_questions IS NULL, so a
-- partial index is much smaller than a full one.
CREATE INDEX IF NOT EXISTS idx_lessons_review_questions_present
  ON lessons ((jsonb_array_length(review_questions)))
  WHERE review_questions IS NOT NULL;

-- ─── whatsapp_review_sessions ───────────────────────────────────
--
-- One row per (player, lesson, question_id) attempt.
--
-- status lifecycle:
--   queued   → cron picked eligible but hasn't sent yet (rare; usually
--              set→sent in the same tick). Also used when a session is
--              deferred and re-queued for a later slot.
--   sent     → the quiz message was sent; waiting for reply.
--   answered → user tapped a button (or typed 1/2/3, a/b/c).
--              is_correct + selected_button_id are populated.
--   deferred → user replied to the quiz with unrelated text. The
--              defer_count is bumped. If < DEFER_LIMIT (2), the router
--              flips status back to 'queued' for the next cron pass;
--              at the limit, the router flips it to 'skipped'.
--   skipped  → hit the defer limit; don't nag again for this lesson.
--   expired  → too much time passed (see EXPIRY window in cron). We
--              never got a good moment to send.
--
-- question_snapshot: the exact JSONB question object as it was at
-- send-time. We grade against the snapshot, NOT the current lesson
-- row, so admin edits after a quiz was sent never retroactively flip
-- a player's answer from wrong to right.

CREATE TABLE IF NOT EXISTS whatsapp_review_sessions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  player_id             UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  lesson_id             UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,

  -- Which question in lessons.review_questions this row is tracking.
  -- MVP uses the first question's id (typically "q1"). Column exists
  -- so multi-question rollout is a code change, not a schema one.
  question_id           TEXT NOT NULL,

  -- Frozen at send time. Grading + explanation rendering both read
  -- from here, not the live lesson row.
  question_snapshot     JSONB,

  status                TEXT NOT NULL DEFAULT 'queued'
                        CHECK (status IN (
                          'queued', 'sent', 'answered',
                          'deferred', 'skipped', 'expired'
                        )),

  -- Populated once the user answers.
  selected_button_id    TEXT,
  is_correct            BOOLEAN,

  -- Z-API messageId of the outbound quiz message — lets the router
  -- optionally correlate to whatsapp_messages if we ever want that.
  provider_message_id   TEXT,

  -- How many times this session was deferred (user replied with
  -- unrelated text). At DEFER_LIMIT we mark 'skipped' instead of
  -- re-queuing.
  defer_count           INTEGER NOT NULL DEFAULT 0,

  -- Lifecycle timestamps — mostly for admin visibility / debugging.
  -- queued_at also acts as "when did we last make this eligible for
  -- the cron to pick up" so re-queued sessions naturally sort behind
  -- fresh ones.
  queued_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at               TIMESTAMPTZ,
  answered_at           TIMESTAMPTZ,
  deferred_at           TIMESTAMPTZ,
  skipped_at            TIMESTAMPTZ,
  expired_at            TIMESTAMPTZ,

  -- Free-form debug metadata (send error, cron tick id, etc.).
  metadata              JSONB,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One row per (player, lesson, question) — protects against
  -- concurrent cron ticks double-spawning.
  UNIQUE (player_id, lesson_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_review_sessions_status_queued
  ON whatsapp_review_sessions (queued_at)
  WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_whatsapp_review_sessions_player_sent
  ON whatsapp_review_sessions (player_id)
  WHERE status = 'sent';

CREATE INDEX IF NOT EXISTS idx_whatsapp_review_sessions_player_lesson
  ON whatsapp_review_sessions (player_id, lesson_id);

ALTER TABLE whatsapp_review_sessions ENABLE ROW LEVEL SECURITY;
-- Deny-by-default. Only service-role (cron + router) touches this.

COMMIT;

-- After running: verify with
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'players'
--      AND column_name IN ('last_whatsapp_activity_at', 'timezone');
--
--   SELECT column_name FROM information_schema.columns
--    WHERE table_name = 'lessons'
--      AND column_name = 'review_questions';
--
--   SELECT count(*) FROM whatsapp_review_sessions;   -- expect 0

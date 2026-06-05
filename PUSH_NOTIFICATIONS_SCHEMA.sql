-- FieldTalk — PWA push notifications schema
-- -----------------------------------------
-- Run once in the Supabase SQL editor. Idempotent.
--
-- Two tables:
--
--   push_subscriptions  — one row per (player, device). A player who
--                          installs FieldTalk on phone + laptop will
--                          have two rows. The endpoint URL is the
--                          unique key (provided by the browser's
--                          PushManager.subscribe()).
--
--   notification_log    — append-only audit + dedup. Used by the
--                          daily cron to avoid re-nudging the same
--                          player on the same kind in a short window.
--
-- We don't need cross-user reads on either table, so RLS is owner-
-- scoped. The send-from-server path uses the service-role client and
-- bypasses RLS automatically.


-- =====================================================
-- PART 1: push_subscriptions
-- =====================================================
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- The browser-provided endpoint URL. Unique across the table —
  -- if the same device re-subscribes after a permission reset, we
  -- upsert on this column rather than creating duplicates.
  endpoint      TEXT NOT NULL UNIQUE,
  -- The two crypto secrets returned by PushManager.subscribe().
  p256dh        TEXT NOT NULL,
  auth          TEXT NOT NULL,
  user_agent    TEXT,
  -- The user's preferredLanguage at subscribe time, so the sender
  -- can localise the notification text without a separate join.
  -- Kept in sync on resubscribe; not used as a source of truth for
  -- the rest of the app.
  language      TEXT NOT NULL DEFAULT 'en',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Updated each time we successfully send a push. A subscription
  -- that hasn't been used in months has likely been revoked silently;
  -- a future cleanup job can prune entries where last_used_at is
  -- null AND created_at is older than 90 days.
  last_used_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_player_id
  ON push_subscriptions(player_id);


-- =====================================================
-- PART 2: notification_log
-- =====================================================
-- One row per push we actually send (or attempt). The (player_id,
-- kind) pair lets us answer "have we sent X to this player in the
-- last N hours" cheaply for dedup.

CREATE TABLE IF NOT EXISTS notification_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- Short identifier for the notification template:
  --   'welcome_pack'         — first-pack nudge ~24h after signup
  --   'pack_reminder'        — generic day-2 unopened-pack nudge
  --   'match_starting'       — 1h before a match the user can predict
  --   'streak_save'          — (future) end-of-day streak protect
  kind          TEXT NOT NULL,
  -- Optional payload reference (e.g. match id, pack id, lesson id)
  -- so the dedup query can be even tighter (don't notify about the
  -- same match twice).
  ref_id        TEXT,
  -- Whether the send actually went out (false on dead-subscription
  -- cleanup, dry-run admin tests, etc.). Kept so an audit can tell
  -- "attempted but not delivered" from "skipped by dedup".
  delivered     BOOLEAN NOT NULL DEFAULT true,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notification_log_player_kind
  ON notification_log(player_id, kind, sent_at DESC);


-- =====================================================
-- PART 3: Row-level security
-- =====================================================
-- A player can see their own subscription rows (so the settings UI
-- can show "you've enabled notifications on N devices") and delete
-- them (the unsubscribe button). Inserts come through the API
-- which validates via service-role, but we also permit authenticated
-- insert as long as player_id = auth.uid() so a client-side
-- registerSubscription that bypasses our API still doesn't leak
-- across users.

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_subscriptions_select_own"  ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_insert_own"  ON push_subscriptions;
DROP POLICY IF EXISTS "push_subscriptions_delete_own"  ON push_subscriptions;
CREATE POLICY "push_subscriptions_select_own"
  ON push_subscriptions FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());
CREATE POLICY "push_subscriptions_insert_own"
  ON push_subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());
CREATE POLICY "push_subscriptions_delete_own"
  ON push_subscriptions FOR DELETE
  TO authenticated
  USING (player_id = auth.uid());

-- notification_log is server-only. The sending path uses the
-- service-role key (bypasses RLS); nothing in the UI needs to read
-- this directly.
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

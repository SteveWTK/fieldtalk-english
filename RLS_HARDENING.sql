-- FieldTalk — Row-Level Security hardening
-- ------------------------------------------
-- Run once in the Supabase SQL editor. Idempotent — every statement
-- uses IF EXISTS / IF NOT EXISTS / OR REPLACE patterns so re-running
-- is safe and won't error if a policy already exists.
--
-- Why this file exists
-- --------------------
-- Supabase has been warning that RLS is disabled on several public
-- tables. Without RLS, anyone holding the anon key (which ships in
-- our browser bundle by design) can SELECT / INSERT / UPDATE / DELETE
-- any row through the REST endpoint, regardless of who's logged in.
-- For our user-data tables that's a hard data leak: player A could
-- pull player B's XP history, sticker collection, lesson completions,
-- AI conversation transcripts, etc.
--
-- Mental model
-- ------------
-- Three categories of table:
--
--   1. User-owned data   →   owner can read + write their own rows,
--                            nobody else can see them via anon key.
--                            Server-side code that genuinely needs
--                            cross-user reads (leaderboard, admin
--                            pages) already uses getSupabaseAdmin()
--                            with the service-role key, which
--                            bypasses RLS automatically.
--
--   2. Public content    →   anyone (including signed-out users) can
--                            SELECT. No public INSERT / UPDATE — only
--                            the service-role key writes content.
--
--   3. Server-only       →   RLS enabled with zero permissive policies.
--                            Anon/auth role gets nothing back; the
--                            service-role key is the only way in.
--
-- Tables already covered by previous migrations
-- ---------------------------------------------
--   STRIPE_BILLING_SCHEMA.sql  — player_edition_access, seat_licenses,
--                                seat_redemptions (server-only)
--   GUEST_ACCESS_SCHEMA.sql    — users, guest_access_codes,
--                                guest_sessions (owner-scoped + admin)
--
-- This file leaves those untouched and only adds what's missing.


-- =====================================================
-- PART 1: User-owned data  (auth.uid() = player_id)
-- =====================================================
-- Tables here all use `player_id UUID` as the owner reference, except
-- `players` itself, which uses `id` (the row IS the user).

-- ─── players ───
-- A user can read and update their own row (profile edits). Inserts
-- happen via the handle_new_user trigger (SECURITY DEFINER) on signup,
-- so anon-role INSERT is not needed. Deletes go through admin paths.
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "players_select_own"   ON players;
DROP POLICY IF EXISTS "players_update_own"   ON players;
CREATE POLICY "players_select_own"
  ON players FOR SELECT
  TO authenticated
  USING (id = auth.uid());
CREATE POLICY "players_update_own"
  ON players FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ─── player_progress ───
-- One row per (player, edition) tracking total_xp + last_activity_date.
-- The lesson flow writes to this from the browser when a step is
-- completed, so authenticated users need INSERT + UPDATE on their own.
ALTER TABLE player_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "player_progress_select_own"  ON player_progress;
DROP POLICY IF EXISTS "player_progress_insert_own"  ON player_progress;
DROP POLICY IF EXISTS "player_progress_update_own"  ON player_progress;
CREATE POLICY "player_progress_select_own"
  ON player_progress FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());
CREATE POLICY "player_progress_insert_own"
  ON player_progress FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());
CREATE POLICY "player_progress_update_own"
  ON player_progress FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());


-- ─── player_xp_events ───
-- Append-only XP ledger. The browser inserts rows (lesson XP,
-- step XP, etc.); nothing ever updates or deletes. No UPDATE/DELETE
-- policy means even the owner can't tamper with history.
ALTER TABLE player_xp_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "player_xp_events_select_own"  ON player_xp_events;
DROP POLICY IF EXISTS "player_xp_events_insert_own"  ON player_xp_events;
CREATE POLICY "player_xp_events_select_own"
  ON player_xp_events FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());
CREATE POLICY "player_xp_events_insert_own"
  ON player_xp_events FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());


-- ─── lesson_completions ───
-- One row per (player, lesson) recording xp_earned + time_spent.
-- The browser inserts on completion; updates happen via service-role
-- (e.g. the explicit INSERT-or-UPDATE in markLessonComplete).
ALTER TABLE lesson_completions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lesson_completions_select_own"  ON lesson_completions;
DROP POLICY IF EXISTS "lesson_completions_insert_own"  ON lesson_completions;
DROP POLICY IF EXISTS "lesson_completions_update_own"  ON lesson_completions;
CREATE POLICY "lesson_completions_select_own"
  ON lesson_completions FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());
CREATE POLICY "lesson_completions_insert_own"
  ON lesson_completions FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());
CREATE POLICY "lesson_completions_update_own"
  ON lesson_completions FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());


-- ─── pack_openings ───
-- Audit row inserted when a player opens a sticker pack.
-- Browser-insert, never updated.
ALTER TABLE pack_openings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pack_openings_select_own"  ON pack_openings;
DROP POLICY IF EXISTS "pack_openings_insert_own"  ON pack_openings;
CREATE POLICY "pack_openings_select_own"
  ON pack_openings FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());
CREATE POLICY "pack_openings_insert_own"
  ON pack_openings FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());


-- ─── player_stickers ───
-- (player_id, sticker_id, quantity). Browser updates quantity on
-- pack-open and trade-in.
ALTER TABLE player_stickers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "player_stickers_select_own"  ON player_stickers;
DROP POLICY IF EXISTS "player_stickers_insert_own"  ON player_stickers;
DROP POLICY IF EXISTS "player_stickers_update_own"  ON player_stickers;
CREATE POLICY "player_stickers_select_own"
  ON player_stickers FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());
CREATE POLICY "player_stickers_insert_own"
  ON player_stickers FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());
CREATE POLICY "player_stickers_update_own"
  ON player_stickers FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());


-- ─── player_squads ───
-- The squad-positions JSONB. Browser writes the placement map.
ALTER TABLE player_squads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "player_squads_select_own"  ON player_squads;
DROP POLICY IF EXISTS "player_squads_insert_own"  ON player_squads;
DROP POLICY IF EXISTS "player_squads_update_own"  ON player_squads;
CREATE POLICY "player_squads_select_own"
  ON player_squads FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());
CREATE POLICY "player_squads_insert_own"
  ON player_squads FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());
CREATE POLICY "player_squads_update_own"
  ON player_squads FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());


-- ─── player_achievements ───
-- Read-own. Writes happen via server-side admin client (achievement
-- evaluator). No browser INSERT policy on purpose.
ALTER TABLE player_achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "player_achievements_select_own"  ON player_achievements;
CREATE POLICY "player_achievements_select_own"
  ON player_achievements FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());


-- ─── predictions ───
-- One row per (player, lesson, step) holding the user's prediction
-- payload. Browser inserts on prediction submit.
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "predictions_select_own"  ON predictions;
DROP POLICY IF EXISTS "predictions_insert_own"  ON predictions;
DROP POLICY IF EXISTS "predictions_update_own"  ON predictions;
CREATE POLICY "predictions_select_own"
  ON predictions FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());
CREATE POLICY "predictions_insert_own"
  ON predictions FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());
CREATE POLICY "predictions_update_own"
  ON predictions FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());


-- ─── lesson_votes ───
-- One vote per (player, lesson). Browser inserts on rating submit.
ALTER TABLE lesson_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lesson_votes_select_own"  ON lesson_votes;
DROP POLICY IF EXISTS "lesson_votes_insert_own"  ON lesson_votes;
DROP POLICY IF EXISTS "lesson_votes_update_own"  ON lesson_votes;
CREATE POLICY "lesson_votes_select_own"
  ON lesson_votes FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());
CREATE POLICY "lesson_votes_insert_own"
  ON lesson_votes FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());
CREATE POLICY "lesson_votes_update_own"
  ON lesson_votes FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid())
  WITH CHECK (player_id = auth.uid());


-- ─── conversation_attendance ───
-- Marks who attended a conversation session. Browser inserts.
ALTER TABLE conversation_attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversation_attendance_select_own"  ON conversation_attendance;
DROP POLICY IF EXISTS "conversation_attendance_insert_own"  ON conversation_attendance;
CREATE POLICY "conversation_attendance_select_own"
  ON conversation_attendance FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());
CREATE POLICY "conversation_attendance_insert_own"
  ON conversation_attendance FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());


-- =====================================================
-- PART 2: User-owned data  (auth.uid() = user_id)
-- =====================================================
-- The AI history tables happen to use `user_id` instead of
-- `player_id` (legacy naming from earlier scaffolding). Same shape
-- of policy, different column.

ALTER TABLE ai_conversation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_conversation_history_select_own"  ON ai_conversation_history;
DROP POLICY IF EXISTS "ai_conversation_history_insert_own"  ON ai_conversation_history;
CREATE POLICY "ai_conversation_history_select_own"
  ON ai_conversation_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "ai_conversation_history_insert_own"
  ON ai_conversation_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER TABLE ai_feedback_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_feedback_history_select_own"  ON ai_feedback_history;
DROP POLICY IF EXISTS "ai_feedback_history_insert_own"  ON ai_feedback_history;
CREATE POLICY "ai_feedback_history_select_own"
  ON ai_feedback_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "ai_feedback_history_insert_own"
  ON ai_feedback_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

ALTER TABLE ai_speech_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_speech_feedback_select_own"  ON ai_speech_feedback;
DROP POLICY IF EXISTS "ai_speech_feedback_insert_own"  ON ai_speech_feedback;
CREATE POLICY "ai_speech_feedback_select_own"
  ON ai_speech_feedback FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "ai_speech_feedback_insert_own"
  ON ai_speech_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());


-- =====================================================
-- PART 3: Public content tables
-- =====================================================
-- Lesson content, pillars, sticker roster, prediction answer key
-- and conversation topics are global content — no PII, intended to
-- be visible to all callers including signed-out visitors browsing
-- the lesson catalogue or preview pages.
--
-- We still ENABLE RLS so writes are blocked by default. Only the
-- admin CMS writes to these, and it does so via the service-role key.

ALTER TABLE pillars ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "pillars_public_read"  ON pillars;
CREATE POLICY "pillars_public_read"
  ON pillars FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lessons_public_read"  ON lessons;
CREATE POLICY "lessons_public_read"
  ON lessons FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE sticker_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sticker_players_public_read"  ON sticker_players;
CREATE POLICY "sticker_players_public_read"
  ON sticker_players FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE prediction_answers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prediction_answers_public_read"  ON prediction_answers;
CREATE POLICY "prediction_answers_public_read"
  ON prediction_answers FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE conversation_topics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conversation_topics_public_read"  ON conversation_topics;
CREATE POLICY "conversation_topics_public_read"
  ON conversation_topics FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE clubs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "clubs_public_read"  ON clubs;
CREATE POLICY "clubs_public_read"
  ON clubs FOR SELECT
  TO anon, authenticated
  USING (true);

ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "videos_public_read"  ON videos;
CREATE POLICY "videos_public_read"
  ON videos FOR SELECT
  TO anon, authenticated
  USING (true);


-- =====================================================
-- PART 4: Server-only tables
-- =====================================================
-- Partner/admin tables: schools, academies, classes, client_admins,
-- platform_admins, app_settings. Every read or write goes through an
-- admin API route using the service-role key, so RLS with zero
-- policies is exactly what we want — the anon/auth client gets an
-- empty result rather than a leaked list of partner schools.

ALTER TABLE schools          ENABLE ROW LEVEL SECURITY;
ALTER TABLE academies        ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_admins    ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_admins  ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings     ENABLE ROW LEVEL SECURITY;


-- =====================================================
-- PART 5: Verification queries (run after migrating)
-- =====================================================
-- These won't change anything — they just print what RLS looks like
-- afterwards so you can confirm before going live with partner
-- schools. Run them in the SQL editor and eyeball the results.
--
--   -- Every table in public + its rls_enabled flag
--   SELECT schemaname, tablename, rowsecurity
--     FROM pg_tables
--    WHERE schemaname = 'public'
--    ORDER BY tablename;
--
--   -- Every policy currently attached
--   SELECT schemaname, tablename, policyname, cmd, roles
--     FROM pg_policies
--    WHERE schemaname = 'public'
--    ORDER BY tablename, policyname;
--
--   -- Smoke test: pretend to be the anon key and try to read a
--   -- player row. Should return zero rows.
--   SET ROLE anon;
--   SELECT count(*) FROM players;        -- expected: 0
--   SELECT count(*) FROM lessons;        -- expected: > 0 (public)
--   RESET ROLE;


-- =====================================================
-- NOTES
-- =====================================================
-- 1. The Supabase service-role key bypasses RLS. Every existing
--    /api/* route that uses getSupabaseAdmin() continues to work
--    unchanged.
--
-- 2. The browser anon client now only sees the current user's rows
--    on the owner-scoped tables. usePlayerProfile, usePlayerProgress,
--    the lesson page, the album page, the squad editor — all already
--    filter by player_id = current user, so this is a no-op for the
--    UI; we're just enforcing at the DB level what the UI already
--    assumes.
--
-- 3. Cross-user data (leaderboard, admin user-tracking, partner
--    dashboards) goes through admin routes — those already use the
--    service-role key, so they bypass RLS automatically.
--
-- 4. If a feature breaks after this migration, the most likely cause
--    is a query running on the anon client that needs to read another
--    user's row. Fix that by moving the query behind an /api/ route
--    that uses getSupabaseAdmin(), not by loosening the policy.

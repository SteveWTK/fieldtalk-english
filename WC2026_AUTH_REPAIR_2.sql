-- WC2026_AUTH_REPAIR_2.sql (v2 — permission-aware)
-- ============================================================
-- This version avoids ALTER TABLE on auth.users (which Supabase blocks
-- with "must be owner of table users") by editing the *function* the
-- trigger calls. The function lives in the public schema, which we own,
-- so CREATE OR REPLACE FUNCTION works fine.
--
-- What this script does:
--   1. Hardens the reverse-cascade trigger with a depth guard so it
--      can't deadlock the auth panel's delete button.
--   2. Re-installs handle_new_user with the full set of fields
--      (edition, preferred_language, etc.) + creates a player_progress
--      row in the same transaction, so that's not dependent on the
--      legacy trigger anymore.
--   3. Replaces the legacy handle_confirmed_user_registration with a
--      no-op. The trigger on auth.users still fires but does nothing,
--      so it can't error during signups or overwrite anything.
--      All useful work is now handled by handle_new_user.
--   4. Backfills edition from auth metadata for existing players whose
--      DB row says 'players' but whose signup metadata says wc2026.
--
-- Fully idempotent. Safe to run more than once.
-- ============================================================

-- ============================================================
-- STEP 1: HARDEN THE REVERSE-CASCADE TRIGGER
-- ============================================================
-- Same as before: skip the reverse delete when we're already inside a
-- cascade from auth.users, so the Auth panel's delete button stops failing.

CREATE OR REPLACE FUNCTION public.delete_auth_user_when_player_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF pg_trigger_depth() = 1 THEN
    BEGIN
      DELETE FROM auth.users WHERE id = OLD.id;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;
  RETURN OLD;
END;
$$;

-- ============================================================
-- STEP 2: RE-INSTALL handle_new_user WITH A SUPERSET OF BEHAVIOUR
-- ============================================================
-- Includes everything we need:
--   - Writes the players row with edition + preferred_language from
--     metadata (with sensible defaults).
--   - Creates the initial player_progress row (was previously done by
--     the legacy trigger we're about to neutralise).
--   - Idempotent via ON CONFLICT.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_full_name TEXT;
  v_user_type TEXT;
BEGIN
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    SPLIT_PART(NEW.email, '@', 1),
    ''
  );
  v_user_type := COALESCE(NEW.raw_user_meta_data->>'user_type', 'player');

  -- Players row
  INSERT INTO public.players (
    id,
    email,
    full_name,
    user_type,
    position,
    nationality,
    role_title,
    club_name,
    preferred_language,
    edition
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_user_type,
    COALESCE(NEW.raw_user_meta_data->>'position', ''),
    COALESCE(NEW.raw_user_meta_data->>'nationality', ''),
    COALESCE(NEW.raw_user_meta_data->>'role_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'club_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    COALESCE(NEW.raw_user_meta_data->>'edition', 'players')
  )
  ON CONFLICT (id) DO UPDATE
    SET
      edition = COALESCE(EXCLUDED.edition, public.players.edition),
      preferred_language = COALESCE(
        EXCLUDED.preferred_language,
        public.players.preferred_language
      ),
      full_name = COALESCE(
        NULLIF(EXCLUDED.full_name, ''),
        public.players.full_name
      );

  -- player_progress row (previously created by the legacy trigger).
  -- ON CONFLICT DO NOTHING so we don't overwrite existing XP/level data.
  INSERT INTO public.player_progress (player_id, total_xp, current_level)
  VALUES (NEW.id, 0, 1)
  ON CONFLICT (player_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 3: NEUTRALISE THE LEGACY TRIGGER VIA FUNCTION REPLACEMENT
-- ============================================================
-- We can't disable the auth.users trigger directly (Supabase blocks
-- ALTER TABLE on the auth schema). Instead, replace the function body
-- with a no-op. The trigger keeps firing but does nothing — so it can't
-- overwrite edition, can't error on OAuth, and can't block deletes.

CREATE OR REPLACE FUNCTION public.handle_confirmed_user_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Intentionally empty. All useful logic lives in handle_new_user now.
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 4: BACKFILL EDITION FROM METADATA
-- ============================================================
UPDATE public.players p
SET edition = u.raw_user_meta_data->>'edition'
FROM auth.users u
WHERE p.id = u.id
  AND u.raw_user_meta_data->>'edition' IS NOT NULL
  AND u.raw_user_meta_data->>'edition' <> p.edition;

-- ============================================================
-- STEP 5: SANITY CHECKS — UNCOMMENT TO RUN
-- ============================================================

-- Verify the new function body is in place
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user';

-- Verify the legacy function is now a no-op
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_confirmed_user_registration';

-- Recent users + their edition status
-- SELECT u.email, p.edition AS players_edition,
--        u.raw_user_meta_data->>'edition' AS metadata_edition,
--        p.preferred_language, u.created_at
-- FROM auth.users u
-- LEFT JOIN public.players p ON p.id = u.id
-- ORDER BY u.created_at DESC LIMIT 5;

-- ============================================================
-- ROLLBACK (if anything breaks)
-- ============================================================
-- The legacy function as it was: re-run the original CREATE OR REPLACE
-- from your diagnostic output. We saved that function definition in
-- this conversation, so it's recoverable.

-- WC2026_AUTH_REPAIR.sql
-- =====================================================
-- Run this in the Supabase SQL editor AFTER WC2026_EDITIONS_SCHEMA.sql.
-- Idempotent — safe to run multiple times.
--
-- Fixes the following observed issues:
--   1. New email signups land with edition = 'players' even though they
--      came in via /wc2026 → /join (signup metadata carried 'wc2026').
--      Root cause: the handle_new_user trigger was either missing,
--      pointed at the wrong function, or wasn't reading raw_user_meta_data.
--   2. New users were getting preferred_language = 'pt-BR' (legacy default)
--      instead of 'en'.
--   3. Deleting rows from public.players left orphan rows in auth.users,
--      blocking re-signup with the same email.
-- =====================================================

-- =====================================================
-- STEP 1: DIAGNOSTIC SNAPSHOT (run first, paste output)
-- =====================================================
-- The following are pure SELECTs — they don't change anything but show
-- you what state your project is in. If you want, run these first, share
-- the output, then run the rest of the script.

-- 1a. What triggers exist on auth.users?
-- (Expected: one trigger, on_auth_user_created, calling handle_new_user)
-- SELECT t.tgname, p.proname AS function_name
-- FROM pg_trigger t
-- JOIN pg_proc p ON t.tgfoid = p.oid
-- WHERE t.tgrelid = 'auth.users'::regclass AND NOT t.tgisinternal;

-- 1b. What's the current default for preferred_language?
-- (Expected: 'en'. If it shows 'pt-BR', step 3 below will fix it.)
-- SELECT column_name, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' AND table_name = 'players'
--   AND column_name IN ('edition', 'preferred_language');

-- 1c. What does the most recent auth user look like? Does the metadata
--     show the right edition? (Expected: raw_user_meta_data->>'edition'
--     should be 'wc2026' for WC signups.)
-- SELECT id, email, raw_user_meta_data, created_at
-- FROM auth.users
-- ORDER BY created_at DESC
-- LIMIT 5;

-- =====================================================
-- STEP 2: REINSTALL THE handle_new_user TRIGGER (FIXES THE EDITION COPY)
-- =====================================================

-- Drop any prior triggers on auth.users that we may own, then recreate.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user_trigger ON auth.users;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.players (
    id,
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
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      ''
    ),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'player'),
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
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 3: FIX DEFAULTS ON public.players
-- =====================================================
-- Change preferred_language default from any legacy value to 'en'.
ALTER TABLE public.players
  ALTER COLUMN preferred_language SET DEFAULT 'en';

-- Make sure edition has the right default too (idempotent).
ALTER TABLE public.players
  ALTER COLUMN edition SET DEFAULT 'players';

-- =====================================================
-- STEP 4: BACKFILL EXISTING USERS' EDITION FROM AUTH METADATA
-- =====================================================
-- One-time cleanup: any player whose auth metadata says they signed up via
-- a WC2026 link but whose player row defaulted to 'players' gets corrected.
UPDATE public.players p
SET edition = u.raw_user_meta_data->>'edition'
FROM auth.users u
WHERE p.id = u.id
  AND u.raw_user_meta_data->>'edition' IS NOT NULL
  AND u.raw_user_meta_data->>'edition' <> p.edition;

-- =====================================================
-- STEP 5: REVERSE CASCADE — DELETING A PLAYER ALSO DELETES auth.users
-- =====================================================
-- This makes test cleanup easier: deleting a row in public.players also
-- removes the auth.users row, so you can re-register the same email.
-- The EXCEPTION clause makes it safe when the auth row is already being
-- removed (e.g. when delete originates from auth.users → cascades to
-- players → fires this trigger → tries to delete auth.users again).

CREATE OR REPLACE FUNCTION public.delete_auth_user_when_player_deleted()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  BEGIN
    DELETE FROM auth.users WHERE id = OLD.id;
  EXCEPTION WHEN OTHERS THEN
    -- auth.users row already gone (e.g. cascade source) — that's fine
    NULL;
  END;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_player_deleted ON public.players;
CREATE TRIGGER on_player_deleted
  AFTER DELETE ON public.players
  FOR EACH ROW EXECUTE FUNCTION public.delete_auth_user_when_player_deleted();

-- =====================================================
-- STEP 6: TEST-CLEANUP HELPER FUNCTION
-- =====================================================
-- Quick helper to nuke a test account by email. Wraps the
-- "delete from auth.users which cascades to players" pattern.
-- Usage:
--   SELECT public.delete_test_user('test@example.com');

CREATE OR REPLACE FUNCTION public.delete_test_user(user_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid UUID;
BEGIN
  SELECT id INTO uid FROM auth.users WHERE email = lower(trim(user_email));
  IF uid IS NULL THEN
    RETURN 'No user found with email: ' || user_email;
  END IF;
  DELETE FROM auth.users WHERE id = uid;
  RETURN 'Deleted user: ' || user_email;
END;
$$;

-- =====================================================
-- DONE.
-- =====================================================
-- Quick verification queries you can run now:
--
--   -- New WC signups now end up tagged correctly:
--   SELECT id, email, p.edition, p.preferred_language
--   FROM public.players p
--   JOIN auth.users u USING (id)
--   ORDER BY u.created_at DESC
--   LIMIT 5;
--
--   -- Nuke a test account in one line:
--   SELECT public.delete_test_user('test_user@example.com');

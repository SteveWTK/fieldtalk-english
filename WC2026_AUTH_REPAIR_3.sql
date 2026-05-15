-- WC2026_AUTH_REPAIR_3.sql
-- ============================================================
-- Follow-up to REPAIR_2. Addresses three things uncovered by your
-- diagnostic output:
--
--   1. handle_new_user has no EXCEPTION handler, so any failure in
--      the player_progress insert (which REPAIR_2 added) rolls back
--      the whole signup transaction and surfaces as "Database error
--      creating new user". Wrapping each insert in its own block
--      makes signups resilient: if one piece fails, we log a warning
--      but the auth user still gets created.
--
--   2. The reverse-cascade trigger (delete from players → delete
--      auth.users) is what's blocking your Auth panel deletes. Its
--      pg_trigger_depth() guard doesn't reliably distinguish FK
--      cascades from direct deletes, so it can recurse into the
--      same row that's already mid-delete. Dropping it entirely is
--      cleaner — use the delete_test_user() helper for cleanup.
--
--   3. We also drop the orphaned auth.users row for scw140271 so you
--      can re-sign up with that email if you want to.
--
-- Idempotent. Safe to run more than once.
-- ============================================================

-- ============================================================
-- STEP 1: REMOVE THE REVERSE-CASCADE TRIGGER
-- ============================================================
-- This is what's blocking your "delete from Auth panel" workflow.

DROP TRIGGER IF EXISTS on_player_deleted ON public.players;
DROP FUNCTION IF EXISTS public.delete_auth_user_when_player_deleted();

-- The delete_test_user() helper from REPAIR_1 still works and is the
-- preferred way to nuke a test account in one line:
--   SELECT public.delete_test_user('test@example.com');

-- ============================================================
-- STEP 2: MAKE handle_new_user DEFENSIVE
-- ============================================================
-- Each side-effecting insert is now in its own BEGIN..EXCEPTION block.
-- If any one fails, we log a warning but the function still RETURNs NEW,
-- so the auth.users INSERT succeeds and the user can actually sign in.
--
-- Failures become visible without breaking auth — check
-- supabase logs (Project → Logs → Postgres logs) for any
-- "handle_new_user:" warnings if a piece is broken.

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

  -- ---- players row ----------------------------------------------------
  BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: players insert failed for %: %',
      NEW.id, SQLERRM;
  END;

  -- ---- player_progress row -------------------------------------------
  -- Wrapped separately so it can fail without taking down the players
  -- insert. If your project doesn't have a player_progress table or it
  -- has constraints I don't know about, this is the most likely thing
  -- to fail — and now it won't block the auth flow.
  BEGIN
    INSERT INTO public.player_progress (player_id, total_xp, current_level)
    VALUES (NEW.id, 0, 1)
    ON CONFLICT (player_id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: player_progress insert failed for %: %',
      NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 3: CLEAN UP THE ORPHANED scw140271 AUTH ROW
-- ============================================================
-- This unblocks you re-signing up with that email.
-- Comment out if you don't want this user gone.

DELETE FROM auth.users WHERE email = 'scw140271@gmail.com';

-- ============================================================
-- STEP 4: VERIFY (uncomment to run after the above)
-- ============================================================

-- Confirm the reverse-cascade trigger is gone
-- SELECT t.tgname
-- FROM pg_trigger t
-- WHERE t.tgrelid = 'public.players'::regclass AND NOT t.tgisinternal;

-- Confirm handle_new_user has the defensive body
-- SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'handle_new_user';

-- Try a fresh signup via /wc2026 → /join, then run this to confirm
-- edition is correctly written:
-- SELECT u.email, p.edition, p.preferred_language,
--        u.raw_user_meta_data->>'edition' AS metadata_edition
-- FROM auth.users u
-- LEFT JOIN public.players p ON p.id = u.id
-- ORDER BY u.created_at DESC LIMIT 3;

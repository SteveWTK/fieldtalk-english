-- FieldTalk Editions — schema additions to support multiple editions
-- (Players, World Cup 2026, future editions like "Fans", "Academies", etc.).
-- Run once in your Supabase SQL editor.

-- =====================================================
-- PART 1: ADD `edition` COLUMN TO `pillars`
-- =====================================================
-- Existing pillars default to 'players' (the original FieldTalk edition).
-- World Cup pillars should be set to 'wc2026' after this migration:
--   UPDATE pillars SET edition = 'wc2026' WHERE name IN ('wc_intro', 'wc_history', ...);

ALTER TABLE pillars
  ADD COLUMN IF NOT EXISTS edition TEXT NOT NULL DEFAULT 'players';

CREATE INDEX IF NOT EXISTS idx_pillars_edition ON pillars(edition);

-- =====================================================
-- PART 2: ADD `edition` COLUMN TO `players`
-- =====================================================
-- A player's edition determines which pillars they see in the lesson list.
-- Existing players default to 'players'; new signups arriving via the WC
-- landing page will be created with 'wc2026' (set by the signup flow).

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS edition TEXT NOT NULL DEFAULT 'players';

CREATE INDEX IF NOT EXISTS idx_players_edition ON players(edition);

-- =====================================================
-- PART 3: UPDATE THE handle_new_user TRIGGER FUNCTION
-- =====================================================
-- The existing trigger copies user_metadata into the players row on signup.
-- We extend it to also copy `edition` if it was provided in the metadata
-- (the WC2026 signup page passes edition: 'wc2026' through).
--
-- NOTE: this assumes a `handle_new_user` function exists. If your trigger
-- has a different name, adapt accordingly. You can find it via:
--   SELECT proname FROM pg_proc WHERE proname ILIKE '%new_user%';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'player'),
    COALESCE(NEW.raw_user_meta_data->>'position', ''),
    COALESCE(NEW.raw_user_meta_data->>'nationality', ''),
    COALESCE(NEW.raw_user_meta_data->>'role_title', ''),
    COALESCE(NEW.raw_user_meta_data->>'club_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'preferred_language', 'en'),
    COALESCE(NEW.raw_user_meta_data->>'edition', 'players')
  )
  ON CONFLICT (id) DO UPDATE
    SET edition = COALESCE(EXCLUDED.edition, public.players.edition);
  RETURN NEW;
END;
$$;

-- =====================================================
-- PART 4: TAGGING WORLD CUP PILLARS
-- =====================================================
-- After running the above, mark the pillars that belong to the WC edition.
-- Replace the names below with the actual pillar names you've created for
-- the World Cup edition.
--
-- Example:
--   UPDATE pillars SET edition = 'wc2026' WHERE name IN (
--     'wc_warmup',
--     'wc_matchday',
--     'wc_history',
--     'wc_fans_chants'
--   );

-- =====================================================
-- DONE
-- =====================================================
--
-- After running:
--   1. Verify pillars table now has the edition column (default 'players').
--   2. Verify players table now has the edition column (default 'players').
--   3. Tag your WC pillars with edition = 'wc2026' using the UPDATE above.
--   4. The new signup flow will tag WC signups automatically via metadata.
--   5. Existing players continue to see only 'players' pillars. WC signups
--      see only 'wc2026' pillars.

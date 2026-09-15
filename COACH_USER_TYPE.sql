-- COACH_USER_TYPE.sql
--
-- Adds `coach` as a valid user_type on the players table. Coach users
-- are the customer-facing role for agents, academy directors, and
-- head coaches — they see a roster of the players linked to their
-- academy_id (via /coach and /coach/player/[id]).
--
-- Existing valid types (from DATABASE_UPDATES.sql):
--   'player', 'client_admin', 'platform_admin',
--   'student', 'teacher', 'school_admin'
--
-- After running this, `coach` is also valid and any UI that checks
-- user_type against ['coach', 'platform_admin'] will start working
-- for coach-role users.
--
-- Safe to re-run — drops the old constraint first if it exists.

ALTER TABLE players
  DROP CONSTRAINT IF EXISTS players_user_type_check;

ALTER TABLE players
  ADD CONSTRAINT players_user_type_check
  CHECK (
    user_type IN (
      'player',
      'client_admin',
      'platform_admin',
      'student',
      'teacher',
      'school_admin',
      'coach'
    )
  );

-- Sanity check — see how many rows are in each type after the change.
--   SELECT user_type, count(*) FROM players GROUP BY user_type;

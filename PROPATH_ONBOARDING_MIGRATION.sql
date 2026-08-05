-- PROPATH_ONBOARDING_MIGRATION.sql
--
-- Captures what a Pro Path 26/27 player tells us during their
-- 3-slide onboarding: their playing position and their goal
-- ("preparing for trials", "at an academy", "going pro", "general").
--
-- Two additions on players, both nullable:
--
--   position TEXT
--     Football position code (e.g. 'GK', 'CB', 'RB', 'DM', 'CM', 'AM',
--     'LW', 'RW', 'ST', 'CF'). Kept short + code-based so it's stable
--     across renames of user-facing labels. Rendered in the Pro Path
--     dashboard hero as a badge.
--
--     Named `position` (not `preferred_position` or similar) because
--     the dashboard code already reads `profile.position` — this makes
--     the existing fallback ('Player') resolve to the real value.
--
--   propath_goal TEXT
--     One of a small set: 'trials' | 'academy' | 'going_pro' |
--     'general'. Drives downstream personalisation (which lessons to
--     recommend, which nudges to send, later analytics on user
--     segments). Stored as a stable slug so a copy tweak on the
--     onboarding cards doesn't invalidate historical rows.
--
-- Legacy WC users have both fields NULL — safe: the Pro Path dashboard
-- treats a missing position as "not set" (badge hides) and the goal is
-- currently only used for recommendation logic that hasn't shipped yet.

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS position     TEXT,
  ADD COLUMN IF NOT EXISTS propath_goal TEXT;

-- Optional cleanup: constrain propath_goal to the known values so a
-- future typo in the onboarding UI can't insert garbage. Kept as a
-- CHECK constraint (not an enum) so adding a new goal is one ALTER
-- rather than a full enum recreate.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'players_propath_goal_check'
  ) THEN
    ALTER TABLE players
      ADD CONSTRAINT players_propath_goal_check
      CHECK (
        propath_goal IS NULL
        OR propath_goal IN ('trials', 'academy', 'going_pro', 'general')
      );
  END IF;
END $$;

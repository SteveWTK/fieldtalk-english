-- FieldTalk — onboarding-completed flag on players
-- -------------------------------------------------
-- Single boolean that gates the WelcomeOnboarding modal. The modal
-- shows whenever this is false on a wc2026 player row; clicking the
-- final CTA flips it to true via /api/onboarding/complete.
--
-- To re-arm the onboarding for a Cultura director or any other test
-- account, flip the column back to false in the Supabase Table
-- Editor (or via the UPDATE in PART 2 below).
--
-- Default is false so brand-new signups always see the flow, AND so
-- core-team accounts that previously dismissed the onboarding via
-- localStorage will see it once more after this migration runs. If
-- you'd rather skip the re-show for the core team, run the targeted
-- UPDATE in PART 3 with their player ids.

-- =====================================================
-- PART 1: schema
-- =====================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;


-- =====================================================
-- PART 2: re-arm a single player's onboarding
-- =====================================================
-- Replace <player-id> with the auth user / players.id of the
-- Cultura director (or whoever else needs the intro again).

-- UPDATE players
-- SET onboarding_completed = false
-- WHERE id = '<player-id>';


-- =====================================================
-- PART 3: opt OUT specific players (so they don't see it)
-- =====================================================
-- Run this once if you want to grandfather your core team out of
-- the modal — list the player ids that have already seen it.

-- UPDATE players
-- SET onboarding_completed = true
-- WHERE id IN ('<your-id>', '<teammate-id>');

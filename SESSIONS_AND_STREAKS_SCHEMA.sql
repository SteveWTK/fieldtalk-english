-- FieldTalk Sessions & Streaks - Database Schema
-- Run this in your Supabase SQL Editor
--
-- This adds:
-- 1. Sessions table (groups of challenges within pillars)
-- 2. Streaks tracking system
-- 3. Updates to existing tables for the new structure

-- =====================================================
-- PART 1: SESSIONS TABLE
-- =====================================================
-- Sessions group related challenges (lessons) together
-- Structure: Pillars → Sessions → Challenges (lessons)

CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id INTEGER REFERENCES pillars(id) ON DELETE SET NULL,

  -- Basic info
  title TEXT NOT NULL,
  title_pt TEXT,  -- Portuguese translation
  title_th TEXT,  -- Thai translation
  description TEXT,
  description_pt TEXT,
  description_th TEXT,

  -- Visual/theming
  icon TEXT,  -- Icon name for UI (e.g., 'MessageCircle', 'Mic', 'Trophy')
  color_theme TEXT DEFAULT 'accent',  -- Color class prefix
  image_url TEXT,

  -- Content metadata
  difficulty TEXT CHECK (difficulty IN ('beginner', 'intermediate', 'advanced', 'all')) DEFAULT 'all',
  estimated_duration INTEGER DEFAULT 15,  -- Total estimated minutes
  xp_reward INTEGER DEFAULT 50,  -- Bonus XP for completing all challenges in session

  -- Ordering & visibility
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,  -- Show prominently on dashboard

  -- Unlock requirements
  unlock_type TEXT CHECK (unlock_type IN ('free', 'sequential', 'premium')) DEFAULT 'free',
  prerequisite_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_pillar_id ON sessions(pillar_id);
CREATE INDEX IF NOT EXISTS idx_sessions_sort_order ON sessions(sort_order);
CREATE INDEX IF NOT EXISTS idx_sessions_is_active ON sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_sessions_difficulty ON sessions(difficulty);

-- =====================================================
-- PART 2: UPDATE LESSONS TABLE FOR SESSIONS
-- =====================================================
-- Add session_id to lessons table to group challenges

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES sessions(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lessons_session_id ON lessons(session_id);

-- Add challenge-specific fields
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS challenge_type TEXT CHECK (challenge_type IN ('listen', 'speak', 'quiz', 'match', 'conversation', 'video')) DEFAULT 'listen';

ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS is_bonus BOOLEAN DEFAULT false;

-- =====================================================
-- PART 3: STREAKS TABLE
-- =====================================================
-- Track user daily learning streaks

CREATE TABLE IF NOT EXISTS player_streaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  -- Current streak
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,

  -- Last activity tracking
  last_activity_date DATE,
  last_activity_at TIMESTAMP WITH TIME ZONE,

  -- Streak freeze (skip days without losing streak)
  freeze_count INTEGER DEFAULT 0,  -- Available freezes
  freeze_used_at DATE,  -- Last freeze used

  -- Timezone for midnight calculation
  user_timezone TEXT DEFAULT 'America/Sao_Paulo',

  -- Achievements
  total_days_active INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(player_id)
);

CREATE INDEX IF NOT EXISTS idx_player_streaks_player_id ON player_streaks(player_id);
CREATE INDEX IF NOT EXISTS idx_player_streaks_current ON player_streaks(current_streak DESC);

-- =====================================================
-- PART 4: STREAK ACTIVITY LOG
-- =====================================================
-- Track each day's activity for streak history

CREATE TABLE IF NOT EXISTS streak_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,

  activity_date DATE NOT NULL,
  challenges_completed INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  sessions_completed INTEGER DEFAULT 0,

  -- Was streak continued or broken?
  streak_continued BOOLEAN DEFAULT true,
  freeze_used BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(player_id, activity_date)
);

CREATE INDEX IF NOT EXISTS idx_streak_activity_player_date ON streak_activity_log(player_id, activity_date DESC);

-- =====================================================
-- PART 5: STREAK BADGES/MILESTONES
-- =====================================================

CREATE TABLE IF NOT EXISTS streak_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Badge info
  name TEXT NOT NULL,
  name_pt TEXT,
  name_th TEXT,
  description TEXT,
  description_pt TEXT,
  description_th TEXT,

  -- Visual
  icon TEXT,  -- e.g., 'Flame', 'Trophy', 'Star'
  color TEXT DEFAULT 'orange',

  -- Requirements
  required_streak INTEGER NOT NULL,  -- Days needed
  badge_type TEXT CHECK (badge_type IN ('streak', 'total_days', 'special')) DEFAULT 'streak',

  sort_order INTEGER DEFAULT 0
);

-- Seed default badges
INSERT INTO streak_badges (name, name_pt, required_streak, icon, color, sort_order) VALUES
  ('On Fire', 'Em Chamas', 3, 'Flame', 'orange', 1),
  ('In Form', 'Em Forma', 7, 'TrendingUp', 'yellow', 2),
  ('Match Ready', 'Pronto pro Jogo', 14, 'Target', 'green', 3),
  ('Peak Performance', 'Performance Máxima', 30, 'Trophy', 'blue', 4),
  ('Champion Mentality', 'Mentalidade de Campeão', 60, 'Crown', 'purple', 5),
  ('Legend Status', 'Status de Lenda', 100, 'Star', 'gold', 6)
ON CONFLICT DO NOTHING;

-- =====================================================
-- PART 6: PLAYER EARNED BADGES
-- =====================================================

CREATE TABLE IF NOT EXISTS player_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES streak_badges(id) ON DELETE CASCADE,

  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(player_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_player_badges_player ON player_badges(player_id);

-- =====================================================
-- PART 7: SESSION PROGRESS TRACKING
-- =====================================================
-- Track player progress through sessions

CREATE TABLE IF NOT EXISTS session_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,

  -- Progress
  challenges_completed INTEGER DEFAULT 0,
  total_challenges INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,

  -- Status
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed')) DEFAULT 'not_started',
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(player_id, session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_progress_player ON session_progress(player_id);
CREATE INDEX IF NOT EXISTS idx_session_progress_session ON session_progress(session_id);

-- =====================================================
-- PART 8: ROW LEVEL SECURITY
-- =====================================================

-- Sessions: Everyone can read active sessions
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active sessions"
  ON sessions FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage sessions"
  ON sessions FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.user_id = auth.uid()
      AND players.user_type = 'platform_admin'
    )
  );

-- Streaks: Users can only see their own
ALTER TABLE player_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streaks"
  ON player_streaks FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "Users can update their own streaks"
  ON player_streaks FOR UPDATE
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "System can create streaks"
  ON player_streaks FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

-- Streak activity log
ALTER TABLE streak_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
  ON streak_activity_log FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "System can log activity"
  ON streak_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

-- Player badges
ALTER TABLE player_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own badges"
  ON player_badges FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "System can award badges"
  ON player_badges FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

-- Session progress
ALTER TABLE session_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON session_progress FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "Users can update their own progress"
  ON session_progress FOR ALL
  TO authenticated
  USING (player_id = auth.uid());

-- =====================================================
-- PART 9: HELPER FUNCTIONS
-- =====================================================

-- Function to update streak when user completes a challenge
CREATE OR REPLACE FUNCTION update_player_streak(p_player_id UUID, p_timezone TEXT DEFAULT 'America/Sao_Paulo')
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_today DATE;
  v_last_activity DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_result JSON;
BEGIN
  -- Get today's date in user's timezone
  v_today := (NOW() AT TIME ZONE p_timezone)::DATE;

  -- Get or create streak record
  INSERT INTO player_streaks (player_id, user_timezone)
  VALUES (p_player_id, p_timezone)
  ON CONFLICT (player_id) DO NOTHING;

  -- Get current streak info
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM player_streaks
  WHERE player_id = p_player_id;

  -- Already active today? Just return
  IF v_last_activity = v_today THEN
    RETURN json_build_object(
      'streak_updated', false,
      'current_streak', v_current_streak,
      'message', 'Already active today'
    );
  END IF;

  -- Check if streak continues (yesterday) or resets
  IF v_last_activity = v_today - 1 THEN
    -- Streak continues!
    v_current_streak := v_current_streak + 1;
  ELSIF v_last_activity IS NULL OR v_last_activity < v_today - 1 THEN
    -- Streak broken, reset to 1
    v_current_streak := 1;
  END IF;

  -- Update longest streak if needed
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
  END IF;

  -- Update streak record
  UPDATE player_streaks
  SET
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_activity_date = v_today,
    last_activity_at = NOW(),
    total_days_active = total_days_active + 1,
    updated_at = NOW()
  WHERE player_id = p_player_id;

  -- Log the activity
  INSERT INTO streak_activity_log (player_id, activity_date, streak_continued)
  VALUES (p_player_id, v_today, v_last_activity = v_today - 1)
  ON CONFLICT (player_id, activity_date) DO NOTHING;

  RETURN json_build_object(
    'streak_updated', true,
    'current_streak', v_current_streak,
    'longest_streak', v_longest_streak,
    'is_new_record', v_current_streak = v_longest_streak AND v_current_streak > 1
  );
END;
$$;

-- =====================================================
-- DONE!
-- =====================================================

-- Summary:
-- 1. Created 'sessions' table to group challenges within pillars
-- 2. Added 'session_id' to lessons table
-- 3. Created streak tracking tables (player_streaks, streak_activity_log)
-- 4. Created badge system for streak milestones
-- 5. Created session_progress table for tracking user progress
-- 6. Set up RLS policies
-- 7. Created helper function for updating streaks

-- Next steps in app code:
-- 1. Update lesson queries to include session data
-- 2. Create streak UI components
-- 3. Call update_player_streak() RPC after challenge completion
-- 4. Build session-based navigation UI

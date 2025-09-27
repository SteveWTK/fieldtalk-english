-- FieldTalk for Schools - Database Schema Updates
-- Run these commands in your Supabase SQL Editor

-- =====================================================
-- PHASE 1: ADD NEW COLUMNS TO EXISTING TABLES
-- =====================================================

-- 1. Update players table for new user types and client types
ALTER TABLE players
  DROP CONSTRAINT IF EXISTS players_user_type_check;

ALTER TABLE players
  ADD CONSTRAINT players_user_type_check
  CHECK (user_type IN ('player', 'client_admin', 'platform_admin', 'student', 'teacher', 'school_admin'));

-- Add client_type column (distinguishes players vs students)
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'player'
  CHECK (client_type IN ('player', 'student'));

-- Add school_id and class_id columns
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE SET NULL;

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_client_type ON players(client_type);
CREATE INDEX IF NOT EXISTS idx_players_school_id ON players(school_id);
CREATE INDEX IF NOT EXISTS idx_players_class_id ON players(class_id);

-- 2. Update lessons table for target audience filtering
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'players'
  CHECK (target_audience IN ('players', 'schools', 'both'));

CREATE INDEX IF NOT EXISTS idx_lessons_target_audience ON lessons(target_audience);

-- =====================================================
-- PHASE 2: CREATE NEW TABLES FOR SCHOOLS FUNCTIONALITY
-- =====================================================

-- 1. Schools table
CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  country TEXT,
  city TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  subscription_type TEXT, -- For future use
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schools_is_active ON schools(is_active);

-- 2. Classes table
CREATE TABLE IF NOT EXISTS classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL, -- e.g., "Class 7A", "Year 9 Football"
  teacher_id UUID REFERENCES players(id) ON DELETE SET NULL,
  level TEXT, -- e.g., "beginner", "intermediate"
  schedule TEXT, -- e.g., "Mondays 3pm"
  max_students INTEGER DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX IF NOT EXISTS idx_classes_is_active ON classes(is_active);

-- 3. Conversation topics table (for voting)
CREATE TABLE IF NOT EXISTS conversation_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  vote_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversation_topics_class_id ON conversation_topics(class_id);
CREATE INDEX IF NOT EXISTS idx_conversation_topics_deadline ON conversation_topics(vote_deadline);

-- 4. Topic votes table
CREATE TABLE IF NOT EXISTS topic_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES conversation_topics(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(topic_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_topic_votes_topic_id ON topic_votes(topic_id);
CREATE INDEX IF NOT EXISTS idx_topic_votes_player_id ON topic_votes(player_id);

-- 5. Conversation attendance table
CREATE TABLE IF NOT EXISTS conversation_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  conversation_date DATE NOT NULL,
  topic_title TEXT,
  attended BOOLEAN DEFAULT false,
  notes TEXT,
  marked_by UUID REFERENCES players(id), -- Teacher who marked attendance
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, player_id, conversation_date)
);

CREATE INDEX IF NOT EXISTS idx_conversation_attendance_class_id ON conversation_attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_conversation_attendance_player_id ON conversation_attendance(player_id);
CREATE INDEX IF NOT EXISTS idx_conversation_attendance_date ON conversation_attendance(conversation_date);

-- =====================================================
-- PHASE 3: ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE topic_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_attendance ENABLE ROW LEVEL SECURITY;

-- Schools policies
CREATE POLICY "Platform admins can view all schools"
  ON schools FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.user_type = 'platform_admin'
    )
  );

CREATE POLICY "School admins can view their school"
  ON schools FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT school_id FROM players
      WHERE players.id = auth.uid()
      AND players.user_type = 'school_admin'
    )
  );

CREATE POLICY "Platform admins can manage schools"
  ON schools FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.user_type = 'platform_admin'
    )
  );

-- Classes policies
CREATE POLICY "Students can view their own class"
  ON classes FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT class_id FROM players
      WHERE players.id = auth.uid()
      AND players.user_type = 'student'
    )
  );

CREATE POLICY "Teachers can view their classes"
  ON classes FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND (players.user_type = 'school_admin' OR players.user_type = 'platform_admin')
    )
  );

CREATE POLICY "Admins can manage classes"
  ON classes FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND (players.user_type = 'school_admin' OR players.user_type = 'platform_admin')
    )
  );

-- Conversation topics policies
CREATE POLICY "Students can view topics for their class"
  ON conversation_topics FOR SELECT
  TO authenticated
  USING (
    class_id IN (
      SELECT class_id FROM players
      WHERE players.id = auth.uid()
    )
  );

CREATE POLICY "Teachers and admins can manage topics"
  ON conversation_topics FOR ALL
  TO authenticated
  USING (
    class_id IN (
      SELECT id FROM classes
      WHERE teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND (players.user_type IN ('school_admin', 'platform_admin'))
    )
  );

-- Topic votes policies
CREATE POLICY "Students can view and create their own votes"
  ON topic_votes FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "Students can insert their votes"
  ON topic_votes FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

CREATE POLICY "Admins can view all votes"
  ON topic_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.user_type IN ('teacher', 'school_admin', 'platform_admin')
    )
  );

-- Attendance policies
CREATE POLICY "Students can view their own attendance"
  ON conversation_attendance FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "Teachers can manage attendance for their classes"
  ON conversation_attendance FOR ALL
  TO authenticated
  USING (
    class_id IN (
      SELECT id FROM classes
      WHERE teacher_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.user_type IN ('school_admin', 'platform_admin')
    )
  );

-- Update existing lessons RLS to respect target_audience
CREATE POLICY "Users see lessons for their audience"
  ON lessons FOR SELECT
  TO authenticated
  USING (
    -- Platform admins see everything
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.user_type = 'platform_admin'
    )
    OR
    -- Players see player lessons and 'both'
    (
      target_audience IN ('players', 'both')
      AND EXISTS (
        SELECT 1 FROM players
        WHERE players.id = auth.uid()
        AND players.client_type = 'player'
      )
    )
    OR
    -- Students see school lessons and 'both'
    (
      target_audience IN ('schools', 'both')
      AND EXISTS (
        SELECT 1 FROM players
        WHERE players.id = auth.uid()
        AND players.client_type = 'student'
      )
    )
  );

-- =====================================================
-- PHASE 4: HELPER VIEWS (OPTIONAL BUT USEFUL)
-- =====================================================

-- View for class summaries
CREATE OR REPLACE VIEW class_summaries AS
SELECT
  c.id,
  c.name,
  c.school_id,
  s.name as school_name,
  c.teacher_id,
  p.full_name as teacher_name,
  COUNT(DISTINCT students.id) as student_count,
  c.is_active,
  c.created_at
FROM classes c
LEFT JOIN schools s ON c.school_id = s.id
LEFT JOIN players p ON c.teacher_id = p.id
LEFT JOIN players students ON students.class_id = c.id
GROUP BY c.id, c.name, c.school_id, s.name, c.teacher_id, p.full_name, c.is_active, c.created_at;

-- =====================================================
-- DONE!
-- =====================================================
-- After running this, update your application code to:
-- 1. Add middleware checks for new roles
-- 2. Filter lessons by target_audience
-- 3. Build voting components
-- 4. Build teacher/admin dashboards
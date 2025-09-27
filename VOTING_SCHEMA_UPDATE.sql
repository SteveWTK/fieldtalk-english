-- Simplified Voting Schema for Embedded Topics
-- This creates a simpler voting system where topics are stored in lesson JSON
-- and votes reference the lesson step + topic index

-- Create lesson_votes table (replaces conversation_topics and topic_votes)
CREATE TABLE IF NOT EXISTS lesson_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL, -- The step.id from lesson JSON
  topic_index INTEGER NOT NULL, -- Index of topic in step.topics array
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL, -- Optional: track which class
  voted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lesson_id, step_id, player_id) -- One vote per lesson step per student
);

CREATE INDEX IF NOT EXISTS idx_lesson_votes_lesson_step ON lesson_votes(lesson_id, step_id);
CREATE INDEX IF NOT EXISTS idx_lesson_votes_player ON lesson_votes(player_id);
CREATE INDEX IF NOT EXISTS idx_lesson_votes_class ON lesson_votes(class_id);

-- Enable RLS
ALTER TABLE lesson_votes ENABLE ROW LEVEL SECURITY;

-- Students can view and create their own votes
CREATE POLICY "Students can view their own votes"
  ON lesson_votes FOR SELECT
  TO authenticated
  USING (player_id = auth.uid());

CREATE POLICY "Students can insert their votes"
  ON lesson_votes FOR INSERT
  TO authenticated
  WITH CHECK (player_id = auth.uid());

-- Teachers can view votes from their classes
CREATE POLICY "Teachers can view class votes"
  ON lesson_votes FOR SELECT
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

-- Platform admins can view all votes
CREATE POLICY "Admins can view all votes"
  ON lesson_votes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM players
      WHERE players.id = auth.uid()
      AND players.user_type = 'platform_admin'
    )
  );
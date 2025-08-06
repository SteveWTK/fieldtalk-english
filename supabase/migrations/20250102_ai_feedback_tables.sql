-- Create AI feedback history table
CREATE TABLE IF NOT EXISTS ai_feedback_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('writing', 'gap_fill', 'conversation')),
  content TEXT NOT NULL,
  feedback TEXT NOT NULL,
  score INTEGER CHECK (score >= 1 AND score <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create AI conversation history table
CREATE TABLE IF NOT EXISTS ai_conversation_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  user_message TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  error_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create writing submissions table
CREATE TABLE IF NOT EXISTS writing_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  submission TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  ai_score INTEGER CHECK (ai_score >= 1 AND ai_score <= 10),
  ai_feedback JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add indexes for performance
CREATE INDEX idx_ai_feedback_user_id ON ai_feedback_history(user_id);
CREATE INDEX idx_ai_feedback_lesson_id ON ai_feedback_history(lesson_id);
CREATE INDEX idx_ai_feedback_created_at ON ai_feedback_history(created_at DESC);

CREATE INDEX idx_ai_conversation_user_id ON ai_conversation_history(user_id);
CREATE INDEX idx_ai_conversation_lesson_id ON ai_conversation_history(lesson_id);
CREATE INDEX idx_ai_conversation_created_at ON ai_conversation_history(created_at DESC);

CREATE INDEX idx_writing_submissions_user_id ON writing_submissions(user_id);
CREATE INDEX idx_writing_submissions_lesson_id ON writing_submissions(lesson_id);
CREATE INDEX idx_writing_submissions_created_at ON writing_submissions(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE ai_feedback_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_submissions ENABLE ROW LEVEL SECURITY;

-- Policies for ai_feedback_history
CREATE POLICY "Users can view their own feedback" ON ai_feedback_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own feedback" ON ai_feedback_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for ai_conversation_history
CREATE POLICY "Users can view their own conversations" ON ai_conversation_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversations" ON ai_conversation_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for writing_submissions
CREATE POLICY "Users can view their own submissions" ON writing_submissions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own submissions" ON writing_submissions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own submissions" ON writing_submissions
  FOR UPDATE USING (auth.uid() = user_id);
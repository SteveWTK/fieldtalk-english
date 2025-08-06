-- Migration: Insert Academy Demo Lesson for Brazilian Players
-- Target: Young academy players (15-19) from Brazil learning beginner English
-- Theme: First Call-Up to Professional Club Academy

-- First, ensure we have the Survival pillar
INSERT INTO pillars (id, name, display_name, description, icon, color_gradient, sort_order)
VALUES (
  1,
  'survival',
  'Survival English',
  'Essential communication for your first days at the club',
  'Globe',
  'from-blue-500 to-green-500',
  1
) ON CONFLICT (id) DO NOTHING;

-- Create supporting tables if they don't exist
CREATE TABLE IF NOT EXISTS lesson_metadata (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lesson_id, key)
);

CREATE TABLE IF NOT EXISTS lesson_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  access_type TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lesson_id, access_type, user_id)
);

-- Create a partial unique index for public access (when user_id is NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_access_public 
ON lesson_access (lesson_id, access_type) 
WHERE user_id IS NULL;

-- Use a DO block to insert lesson and capture the UUID for subsequent operations
DO $$
DECLARE
  lesson_uuid UUID;
BEGIN
  -- Insert the Academy Demo Lesson and capture the generated UUID
  INSERT INTO lessons (
    id,
    pillar_id,
    title,
    description,
    difficulty,
    xp_reward,
    estimated_duration,
    sort_order,
    content,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    1, -- Survival pillar
    'Your Academy Trial - The First Step to Your Dream',
    'Essential English for your professional academy trial - make a great first impression!',
    'Beginner',
    100,
    20,
    1,
    '{
      "type": "multi_step",
      "learning_objectives": [
        "Introduce yourself confidently at an academy trial",
        "Understand basic football academy vocabulary",
        "Communicate your dreams and goals in simple English",
        "Have a basic conversation with academy coaches"
      ],
      "steps": [
        {
          "type": "scenario",
          "title": "Your Big Opportunity Arrives!",
          "content": "You are 17 years old, playing for your local club in Brazil. Yesterday, a scout from a professional academy saw you play and invited you for a trial! This is your chance to join a real academy - where players like Neymar, Vinicius Jr., and Gabriel Jesus started their journey. Tomorrow is your trial day. You feel nervous but excited. This could change your life and your family''s future.",
          "image_url": "/images/academy-entrance.jpg",
          "cultural_context": "Many Brazilian stars started in small clubs before getting their chance at professional academies. Your English skills can open doors to international opportunities.",
          "reflection_questions": [
            "What would this opportunity mean for you and your family?",
            "How can learning English help your football career?",
            "Which Brazilian player''s journey inspires you most?"
          ]
        },
        {
          "type": "vocabulary",
          "title": "Essential Academy Words",
          "content": "Learn these important words for your trial day:",
          "vocabulary": [
            {
              "english": "trial",
              "translation": "peneira / teste",
              "pronunciation": "/ˈtraɪəl/",
              "example": "I have a trial at the academy tomorrow",
              "tip": "This is your chance to show your skills"
            },
            {
              "english": "academy",
              "translation": "academia / centro de formação",
              "pronunciation": "/əˈkædəmi/",
              "example": "The academy trains young players",
              "tip": "Where future professionals are developed"
            },
            {
              "english": "opportunity",
              "translation": "oportunidade",
              "pronunciation": "/ˌɒpəˈtjuːnɪti/",
              "example": "This is a great opportunity for me",
              "tip": "Your chance to change your life"
            },
            {
              "english": "dream",
              "translation": "sonho",
              "pronunciation": "/driːm/",
              "example": "My dream is to be a professional player",
              "tip": "Never give up on your dreams"
            },
            {
              "english": "practice",
              "translation": "treinar / praticar",
              "pronunciation": "/ˈpræktɪs/",
              "example": "I practice every day",
              "tip": "Hard work beats talent"
            },
            {
              "english": "improve",
              "translation": "melhorar",
              "pronunciation": "/ɪmˈpruːv/",
              "example": "I want to improve my skills",
              "tip": "Always focus on getting better"
            },
            {
              "english": "coach",
              "translation": "treinador / técnico",
              "pronunciation": "/koʊtʃ/",
              "example": "The coach will watch your trial",
              "tip": "Show respect and listen carefully"
            },
            {
              "english": "teammates",
              "translation": "companheiros de equipe",
              "pronunciation": "/ˈtiːmmeɪts/",
              "example": "I work well with my teammates",
              "tip": "Football is a team sport"
            }
          ]
        },
        {
          "type": "ai_gap_fill",
          "title": "Prepare for Your Trial - Complete the Sentences",
          "content": "Practice sentences you might need at your trial. Click ''Get Hint'' if you need help!",
          "sentences": [
            {
              "id": "trial-1",
              "text": "My name is ___ and I play as a midfielder",
              "correct_answers": ["João", "Pedro", "Lucas", "Gabriel"],
              "context": "Introducing yourself to the coach"
            },
            {
              "id": "trial-2",
              "text": "I am ___ years old and I love football",
              "correct_answers": ["17", "sixteen", "seventeen", "18", "eighteen"],
              "context": "Telling your age"
            },
            {
              "id": "trial-3",
              "text": "I ___ every day to improve my skills",
              "correct_answers": ["practice", "train", "work"],
              "context": "Showing your dedication"
            },
            {
              "id": "trial-4",
              "text": "This trial is a great ___ for me",
              "correct_answers": ["opportunity", "chance"],
              "context": "Expressing gratitude for the chance"
            },
            {
              "id": "trial-5",
              "text": "My ___ is to become a professional player",
              "correct_answers": ["dream", "goal", "aim"],
              "context": "Sharing your ambitions"
            },
            {
              "id": "trial-6",
              "text": "I am ready to work ___ for the team",
              "correct_answers": ["hard", "together"],
              "context": "Showing team spirit and dedication"
            }
          ]
        },
        {
          "type": "ai_writing",
          "title": "Write About Your Football Dreams",
          "prompt": "Write about your football dreams and goals. Why do you want to be a professional player? What will you do to achieve your dream? (30-50 words)",
          "context": "This is for the academy application form. Keep it simple but heartfelt. Show your passion and determination.",
          "minWords": 30,
          "maxWords": 50
        },
        {
          "type": "ai_conversation",
          "title": "Talk to the Academy Coach",
          "scenario": "You are meeting the academy coach for the first time. He wants to know about you, your position, and why you love football. Remember to be polite and enthusiastic!",
          "context": "Academy trial interview - be yourself but show respect",
          "maxTurns": 6
        },
        {
          "type": "completion",
          "title": "You''re Ready for Your Trial!",
          "content": "Congratulations! You''ve learned essential English for your academy trial. Remember, every professional player started where you are now. Your dedication, talent, and new English skills will open doors!",
          "achievements": [
            "✅ Learned 8 essential academy vocabulary words",
            "✅ Practiced introducing yourself in English",
            "✅ Wrote about your football dreams",
            "✅ Had a conversation with a coach in English",
            "✅ Built confidence for real-world situations"
          ],
          "motivational_message": "Remember: Neymar, Vinicius Jr., Gabriel Jesus - they all started with a dream and worked hard to achieve it. Learning English is part of your journey to international football. Keep practicing, keep believing, and never give up! Your family and community are proud of you. This is just the beginning!",
          "next_steps": [
            "Practice these phrases every day",
            "Watch football videos in English with subtitles",
            "Learn one new football word each day",
            "Believe in yourself - you can do this!"
          ]
        }
      ]
    }'::jsonb,
    NOW(),
    NOW()
  ) RETURNING id INTO lesson_uuid;

  -- Store the lesson UUID for later reference (helps with debugging)
  RAISE NOTICE 'Academy Demo Lesson created with UUID: %', lesson_uuid;

  -- Add metadata for tracking this as a demo lesson
  INSERT INTO lesson_metadata (
    lesson_id,
    key,
    value,
    created_at
  ) VALUES
    (lesson_uuid, 'is_demo', 'true', NOW()),
    (lesson_uuid, 'target_audience', 'brazilian_academy_players', NOW()),
    (lesson_uuid, 'age_range', '15-19', NOW()),
    (lesson_uuid, 'language_level', 'beginner', NOW()),
    (lesson_uuid, 'portuguese_support', 'full', NOW()),
    (lesson_uuid, 'original_id', 'academy-demo-001', NOW()) -- For reference in code
  ON CONFLICT (lesson_id, key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = NOW();

  -- Grant access to all authenticated users for demo purposes
  INSERT INTO lesson_access (
    lesson_id,
    access_type,
    user_id,
    created_at
  ) VALUES
    (lesson_uuid, 'public_demo', NULL, NOW())
  ON CONFLICT (lesson_id, access_type) WHERE user_id IS NULL DO NOTHING;

END $$;

-- Create a sample completion record for testing (optional - remove in production)
-- This shows how the system tracks progress
/*
INSERT INTO lesson_completions (
  id,
  user_id,
  lesson_id,
  completed_at,
  score,
  xp_earned,
  time_spent
) VALUES (
  gen_random_uuid(),
  'YOUR_TEST_USER_ID', -- Replace with actual user ID for testing
  'academy-demo-001',
  NOW(),
  85,
  100,
  1200 -- 20 minutes in seconds
);
*/

-- Add achievement definitions for academy players
-- Note: Using integer IDs starting from 12 (assuming 1-11 are taken)
-- Using 'conditions' instead of 'requirements' to match schema
INSERT INTO achievements (
  id,
  name,
  description,
  icon,
  xp_reward,
  conditions
) VALUES
  (
    12,
    'Academy Trial Completed',
    'Completed your first academy trial preparation lesson',
    'Trophy',
    50,
    '{"lesson_type": "academy_demo", "min_score": 70}'::jsonb
  ),
  (
    13,
    'Dream Chaser',
    'Wrote about your football dreams in English',
    'Star',
    25,
    '{"completed_ai_writing": true, "lesson_type": "academy_demo"}'::jsonb
  ),
  (
    14,
    'First Conversation',
    'Had your first English conversation with a coach',
    'MessageSquare',
    30,
    '{"completed_ai_conversation": true, "lesson_type": "academy_demo"}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Academy Demo Lesson created successfully!';
  RAISE NOTICE 'Lesson ID: academy-demo-001';
  RAISE NOTICE 'Target: Brazilian academy players (15-19, beginners)';
  RAISE NOTICE 'Features: AI writing, AI gap-fill with hints, AI conversation';
END $$;
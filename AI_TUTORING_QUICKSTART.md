# FieldTalk English AI Tutoring - Quick Start Guide

## Overview
This AI tutoring system provides real-time feedback for writing exercises, intelligent hints for gap-fill exercises, and conversational practice with an AI coach specialized in football English.

## Setup Instructions

### 1. Environment Variables
Add the following to your `.env.local` file:
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Database Setup
Run the migration to create AI feedback tables:
```bash
# Run this in your Supabase SQL editor
-- Copy contents from: supabase/migrations/20250102_ai_feedback_tables.sql
```

### 3. Install Dependencies
The system uses the built-in fetch API, so no additional packages are needed.

## Features Implemented

### 1. AI Writing Feedback (`AIWritingExercise`)
- Real-time grammar and vocabulary analysis
- Football-context specific feedback
- Scoring system (1-10)
- Constructive improvement suggestions

**Usage Example:**
```javascript
{
  type: "ai_writing",
  title: "Introduce Yourself",
  prompt: "Write an email to your new teammates introducing yourself",
  minWords: 50,
  maxWords: 100
}
```

### 2. Smart Gap Fill (`AIGapFillExercise`)
- AI-powered hints without revealing answers
- Multiple correct answer support
- Context-aware assistance

**Usage Example:**
```javascript
{
  type: "ai_gap_fill",
  title: "Complete the Sentences",
  sentences: [
    {
      id: 1,
      text: "I play as a ___ in the team.",
      correct_answers: ["midfielder", "striker", "defender"],
      context: "Position in team"
    }
  ]
}
```

### 3. AI Conversation Practice (`AIConversationPractice`)
- Natural dialogue with AI coach
- Real-time error correction
- Speech recognition support (Chrome/Edge)
- Text-to-speech for AI responses

**Usage Example:**
```javascript
{
  type: "ai_conversation",
  title: "Talk to Your Coach",
  scenario: "Discuss your training goals with the coach",
  maxTurns: 6
}
```

## Integration Steps

### Step 1: Update Lesson Content
Add AI exercise types to your lesson content:

```javascript
// In your lesson data
{
  content: {
    type: "multi_step",
    steps: [
      // ... existing steps ...
      {
        type: "ai_writing",
        title: "Write About Your Goals",
        prompt: "Describe your football goals for this season (50-100 words)",
        minWords: 50,
        maxWords: 100
      }
    ]
  }
}
```

### Step 2: Update Lesson Page
Add the AI components to your lesson page's switch statement:

```javascript
// In src/app/(site)/lesson/[id]/page.js

// Import AI components
import AIWritingExercise from '@/components/exercises/AIWritingExercise';
import AIConversationPractice from '@/components/exercises/AIConversationPractice';
import AIGapFillExercise from '@/components/exercises/AIGapFillExercise';

// Add cases to renderStepContent()
case "ai_writing":
  return <AIWritingExercise {...currentStepData} lessonId={lessonId} onComplete={handleComplete} />;

case "ai_conversation":
  return <AIConversationPractice {...currentStepData} lessonId={lessonId} onComplete={handleComplete} />;

case "ai_gap_fill":
  return <AIGapFillExercise {...currentStepData} lessonId={lessonId} onComplete={handleComplete} />;
```

## Testing the AI Features

1. **Test Writing Feedback:**
   - Create a lesson with `type: "ai_writing"`
   - Write a sample text
   - Submit for AI feedback

2. **Test Gap Fill Hints:**
   - Create a lesson with `type: "ai_gap_fill"`
   - Click "Hint" button for AI assistance

3. **Test Conversation:**
   - Create a lesson with `type: "ai_conversation"`
   - Have a natural conversation with the AI coach

## API Endpoint

The AI feedback is handled by `/api/ai-feedback` which:
- Authenticates users via Supabase
- Calls OpenAI API with football-specific context
- Stores feedback history in database
- Returns structured feedback

## Cost Considerations

- Each API call uses GPT-4 tokens
- Writing feedback: ~500-1000 tokens per submission
- Conversation: ~200-400 tokens per turn
- Gap fill hints: ~100-200 tokens per hint

## Monitoring & Analytics

Track AI usage in Supabase:
```sql
-- View recent AI feedback
SELECT * FROM ai_feedback_history 
ORDER BY created_at DESC 
LIMIT 20;

-- View conversation history
SELECT * FROM ai_conversation_history 
ORDER BY created_at DESC 
LIMIT 20;

-- User engagement metrics
SELECT 
  user_id,
  COUNT(*) as total_interactions,
  AVG(score) as avg_score
FROM ai_feedback_history
GROUP BY user_id;
```

## Next Steps

1. **Add AI to existing lessons** - Update your current lesson content
2. **Create AI-focused lessons** - Design lessons specifically for AI practice
3. **Monitor usage** - Track API costs and user engagement
4. **Gather feedback** - Use analytics to improve prompts

## Support

For issues or questions:
- Check API key configuration
- Verify database migrations ran successfully
- Monitor browser console for errors
- Review Supabase logs for auth issues
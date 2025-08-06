// src/app/(site)/lesson/ai-enhanced-example.js
// This is an example of how to integrate AI components into the lesson structure

import AIWritingExercise from "@/components/exercises/AIWritingExercise";
import AIConversationPractice from "@/components/exercises/AIConversationPractice";
import AIGapFillExercise from "@/components/exercises/AIGapFillExercise";

// Example lesson content with AI-enhanced exercises
export const aiEnhancedLesson = {
  id: 101,
  title: "First Day at Training - AI Enhanced",
  description: "Practice essential communication with AI-powered feedback",
  pillar_id: 1, // Survival
  difficulty: "Beginner",
  xp_reward: 200,
  estimated_duration: 30,
  content: {
    type: "multi_step",
    steps: [
      {
        id: "step-1",
        type: "scenario",
        title: "Welcome to Watford FC",
        content:
          "You are João, a new midfielder who just signed with Watford FC. Today is your first day at the training ground.",
        image_url: "/images/training-ground-entrance.jpg",
      },
      {
        id: "step-2",
        type: "vocabulary",
        title: "Key Training Ground Vocabulary",
        words: [
          {
            english: "changing room",
            translation: "vestiário",
            pronunciation: "/ˈtʃeɪndʒɪŋ ruːm/",
          },
          {
            english: "training pitch",
            translation: "campo de treinamento",
            pronunciation: "/ˈtreɪnɪŋ pɪtʃ/",
          },
          {
            english: "physio room",
            translation: "sala de fisioterapia",
            pronunciation: "/ˈfɪziəʊ ruːm/",
          },
        ],
      },
      {
        id: "step-3",
        type: "ai_gap_fill",
        title: "Complete the Sentences",
        content: "Fill in the missing words about your first day at training.",
        component: "AIGapFillExercise",
        data: {
          sentences: [
            {
              id: "gap-1",
              text: "Good morning! I'm the new ___. Where is the changing room?",
              correct_answers: ["player", "midfielder", "signing"],
              context: "Introducing yourself at reception",
            },
            {
              id: "gap-2",
              text: "I need to collect my training ___ from the kit manager.",
              correct_answers: ["kit", "gear", "equipment"],
              context: "Getting your training clothes",
            },
            {
              id: "gap-3",
              text: "What time does ___ start today?",
              correct_answers: ["training", "practice"],
              context: "Asking about the schedule",
            },
          ],
        },
      },
      {
        id: "step-4",
        type: "ai_writing",
        title: "Write an Introduction Email",
        content:
          "Write a short email to introduce yourself to your new teammates.",
        component: "AIWritingExercise",
        data: {
          prompt:
            "Write an email (50-100 words) to your new teammates at Watford FC. Introduce yourself, mention your position (midfielder), where you're from (Brazil), and express your excitement about joining the team. Be friendly but professional.",
          context: "First day email introduction",
          minWords: 50,
          maxWords: 100,
        },
      },
      {
        id: "step-5",
        type: "ai_conversation",
        title: "Practice with Your Coach",
        content: "Have a conversation with your new coach about training.",
        component: "AIConversationPractice",
        data: {
          scenario:
            "You're meeting your coach for the first time. He wants to know about your playing style, your fitness level, and what position you prefer. Ask him about training schedules and team tactics.",
          context: "First meeting with coach",
          maxTurns: 6,
        },
      },
      {
        id: "step-6",
        type: "completion",
        title: "Great First Day!",
        content: "You've successfully completed your first day at Watford FC!",
        xp_reward: 200,
      },
    ],
  },
};

// Function to render AI components based on step type
export function renderAIComponent(step, lessonId, onComplete) {
  switch (step.component) {
    case "AIWritingExercise":
      return (
        <AIWritingExercise
          prompt={step.data.prompt}
          context={step.data.context}
          lessonId={lessonId}
          onComplete={onComplete}
          minWords={step.data.minWords}
          maxWords={step.data.maxWords}
        />
      );

    case "AIGapFillExercise":
      return (
        <AIGapFillExercise
          sentences={step.data.sentences}
          lessonId={lessonId}
          onComplete={onComplete}
        />
      );

    case "AIConversationPractice":
      return (
        <AIConversationPractice
          scenario={step.data.scenario}
          context={step.data.context}
          lessonId={lessonId}
          onComplete={onComplete}
          maxTurns={step.data.maxTurns}
        />
      );

    default:
      return null;
  }
}

// Example of how to add AI exercises to existing lesson types
export const AI_EXERCISE_TYPES = {
  ai_writing: {
    icon: "✍️",
    color: "from-purple-500 to-pink-500",
    title: "AI Writing Practice",
  },
  ai_gap_fill: {
    icon: "🎯",
    color: "from-blue-500 to-cyan-500",
    title: "Smart Gap Fill",
  },
  ai_conversation: {
    icon: "💬",
    color: "from-green-500 to-teal-500",
    title: "AI Conversation",
  },
};

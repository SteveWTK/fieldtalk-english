// src/app/demo/gap-fill-hints/page.js
"use client";

import { useState } from "react";
import AIGapFillExercise from "@/components/exercises/AIGapFillExercise";
import { Lightbulb, Target, ArrowLeft, Trophy } from "lucide-react";
import Link from "next/link";

export default function GapFillHintsDemo() {
  const [completedExercises, setCompletedExercises] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  // Sample football-context gap-fill sentences for testing
  const footballSentences = [
    {
      id: "sentence1",
      text: "The striker needs to ___ the ball into the net to score a goal.",
      correct_answers: ["kick", "put", "shoot", "place"],
      context: "Football scoring action",
    },
    {
      id: "sentence2",
      text: "Before the match, all players must ___ up properly to avoid injury.",
      correct_answers: ["warm", "heat"],
      context: "Pre-match preparation",
    },
    {
      id: "sentence3",
      text: "The goalkeeper made an amazing ___ to stop the penalty shot.",
      correct_answers: ["save", "stop"],
      context: "Goalkeeper action during penalty",
    },
    {
      id: "sentence4",
      text: "The coach told the team to ___ harder during the second half.",
      correct_answers: ["press", "push", "work"],
      context: "Tactical instruction from coach",
    },
    {
      id: "sentence5",
      text: "The defender needs to ___ his opponent to prevent a goal.",
      correct_answers: ["mark", "cover", "guard"],
      context: "Defensive strategy",
    },
  ];

  const handleExerciseComplete = (xpEarned) => {
    setCompletedExercises((prev) => prev + 1);
    setTotalXP((prev) => prev + xpEarned);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Dashboard</span>
              </Link>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span className="font-semibold text-gray-900 dark:text-white">
                  {totalXP} XP
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5 text-green-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  Completed: {completedExercises}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4 flex items-center justify-center space-x-3">
              <Lightbulb className="w-10 h-10 text-yellow-400" />
              <span>AI Hint System Demo</span>
            </h1>
            <p className="text-xl text-blue-100 mb-6">
              Enhanced Gap-Fill Exercise with Smart Football Hints
            </p>
            <div className="flex justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <Lightbulb className="w-5 h-5" />
                <span>2 Hints Per Gap</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Football Context</span>
              </div>
              <div className="flex items-center space-x-2">
                <Trophy className="w-5 h-5" />
                <span>Smart AI Coaching</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Smart Hint System
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get progressive hints that guide without giving away the
                  answer
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Football Context
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  All hints relate to real football situations and terminology
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Performance Tracking
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  XP adjusts based on hint usage and attempt efficiency
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 mb-8">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-4 flex items-center space-x-2">
            <Lightbulb className="w-5 h-5" />
            <span>How the AI Hint System Works</span>
          </h3>

          <div className="grid md:grid-cols-2 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                🎯 First Hint
              </h4>
              <ul className="space-y-1 text-yellow-700 dark:text-yellow-400">
                <li>• Identifies word type (noun, verb, adjective)</li>
                <li>• Relates to football context</li>
                <li>• Encourages thinking without revealing answer</li>
              </ul>
            </div>

            <div>
              <h4 className="font-medium text-yellow-800 dark:text-yellow-300 mb-2">
                ⚡ Second Hint
              </h4>
              <ul className="space-y-1 text-yellow-700 dark:text-yellow-400">
                <li>• More specific contextual clue</li>
                <li>• References common football actions</li>
                <li>• Final guidance before no more hints</li>
              </ul>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
            <p className="text-xs text-yellow-800 dark:text-yellow-300">
              <strong>Visual Indicators:</strong> Yellow button for first hint,
              orange for second hint, gray when hints are exhausted. Input
              border changes color to show hint usage.
            </p>
          </div>
        </div>

        {/* Main Exercise Component */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6">
          <AIGapFillExercise
            sentences={footballSentences}
            lessonId="demo-gap-fill-hints"
            onComplete={handleExerciseComplete}
          />
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 dark:text-blue-300 mb-3">
            📋 How to Test the Hint System
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800 dark:text-blue-400">
            <div>
              <p className="mb-2">
                <strong>1. Try without hints first:</strong> Type an answer and
                click &quot;Check&quot;
              </p>
              <p className="mb-2">
                <strong>2. Get your first hint:</strong> Click &quot;Get
                Hint&quot; for word type guidance
              </p>
              <p>
                <strong>3. Need more help?:</strong> Click &quot;Another
                Hint&quot; for context clues
              </p>
            </div>
            <div>
              <p className="mb-2">
                <strong>4. Watch the visual changes:</strong> Colors change as
                you use hints
              </p>
              <p className="mb-2">
                <strong>5. Check XP impact:</strong> Less XP awarded when using
                hints
              </p>
              <p>
                <strong>6. Review all hints:</strong> Expand &quot;View all
                hints&quot; after using multiple
              </p>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        {completedExercises > 0 && (
          <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Your Progress
            </h3>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Exercises completed:{" "}
                  <span className="font-bold text-gray-900 dark:text-white">
                    {completedExercises}
                  </span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total XP earned:{" "}
                  <span className="font-bold text-green-600 dark:text-green-400">
                    +{totalXP}
                  </span>
                </p>
              </div>
              <div className="text-4xl">
                {totalXP >= 90 ? "🏆" : totalXP >= 70 ? "⭐" : "💪"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

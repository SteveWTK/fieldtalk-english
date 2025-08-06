// src/app/demo/football-writing/page.js
"use client";

import { useState } from "react";
import AIFootballWritingExercise from "@/components/exercises/AIFootballWritingExercise";
import { Trophy, Globe, Target, ChevronLeft, Star } from "lucide-react";
import Link from "next/link";

export default function FootballWritingDemo() {
  const [completedExercises, setCompletedExercises] = useState([]);
  const [totalXP, setTotalXP] = useState(0);

  const handleExerciseComplete = (xpEarned, exerciseId) => {
    setCompletedExercises([...completedExercises, exerciseId]);
    setTotalXP(totalXP + xpEarned);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
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
                <Star className="w-5 h-5 text-purple-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {completedExercises.length} Completed
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
              <Trophy className="w-10 h-10 text-yellow-400" />
              <span>Football Writing Practice</span>
            </h1>
            <p className="text-xl text-blue-100 mb-6">
              Designed for Brazilian Players Moving to UK Football
            </p>
            <div className="flex justify-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5" />
                <span>Portuguese Feedback</span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>Football Context</span>
              </div>
              <div className="flex items-center space-x-2">
                <Star className="w-5 h-5" />
                <span>Cultural Tips</span>
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
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🇧🇷</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Bilingual Instructions
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Toggle between Portuguese and English instructions with PT/EN button
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚽</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Real Football Scenarios
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Practice writing about situations you&apos;ll face at your UK club
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🇬🇧</span>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  UK Culture Tips
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Learn about British football culture while improving your English
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Exercise Component */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700">
          <AIFootballWritingExercise
            lessonId="demo-football-writing"
            onComplete={handleExerciseComplete}
            initialScenario="first_training"
          />
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-3">
            💡 Success Tips for Brazilian Players
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-yellow-800 dark:text-yellow-400">
            <div>
              <p className="mb-2">
                <strong>Use the PT/EN toggle:</strong> Start with Portuguese instructions, switch to English as you improve
              </p>
              <p className="mb-2">
                <strong>Don&apos;t translate directly from Portuguese!</strong> English has different structures.
              </p>
              <p>
                <strong>Practice daily:</strong> 10 minutes of writing = rapid improvement
              </p>
            </div>
            <div>
              <p className="mb-2">
                <strong>Learn football phrases:</strong> &quot;man on&quot;, &quot;time&quot;, &quot;switch play&quot;
              </p>
              <p>
                <strong>Ask teammates for help:</strong> British players appreciate the effort
              </p>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        {completedExercises.length > 0 && (
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">
              Your Progress Today
            </h3>
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Exercises completed: <span className="font-bold text-gray-900 dark:text-white">{completedExercises.length}</span>
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total XP earned: <span className="font-bold text-green-600 dark:text-green-400">+{totalXP}</span>
                </p>
              </div>
              <div className="text-4xl">
                {completedExercises.length >= 3 ? "🏆" : completedExercises.length >= 2 ? "⭐" : "💪"}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
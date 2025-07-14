// src/components/DebugDashboard.js
// Add this to your dashboard temporarily to debug data flow

"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import {
  getPlayerProfile,
  getPlayerProgress,
  getAllPillars,
  getPlayerLessonCompletions,
  markLessonComplete,
} from "@/lib/supabase/queries";

export default function DebugDashboard() {
  const { user } = useAuth();
  const [debugResults, setDebugResults] = useState("");
  const [loading, setLoading] = useState(false);

  const runDebugTests = async () => {
    if (!user) {
      setDebugResults("❌ No user logged in");
      return;
    }

    setLoading(true);
    let results = `🔍 Debug Results for User: ${user.email}\n\n`;

    try {
      // Test 1: User Profile
      results += "1️⃣ Testing Player Profile...\n";
      const profile = await getPlayerProfile(user.id);
      results += profile
        ? `✅ Profile found: ${profile.full_name || "No name"}\n`
        : `❌ No profile found\n`;

      // Test 2: Progress
      results += "\n2️⃣ Testing Player Progress...\n";
      const progress = await getPlayerProgress(user.id);
      results += progress
        ? `✅ Progress found: Level ${progress.current_level}, ${progress.total_xp} XP\n`
        : `❌ No progress found\n`;

      // Test 3: Pillars
      results += "\n3️⃣ Testing Pillars...\n";
      const pillars = await getAllPillars();
      results += `✅ Found ${pillars.length} pillars: ${pillars.map((p) => p.name).join(", ")}\n`;

      // Test 4: Lesson Completions
      results += "\n4️⃣ Testing Lesson Completions...\n";
      const completions = await getPlayerLessonCompletions(user.id);
      results += `✅ Found ${completions.length} completed lessons\n`;
      if (completions.length > 0) {
        results += `Latest: ${completions[0].lesson?.title || "Unknown"}\n`;
      }

      // Test 5: Database Connection
      results += "\n5️⃣ Testing Database Write...\n";
      try {
        // Try to mark a dummy completion (won't actually save due to constraints)
        await markLessonComplete(user.id, "test-lesson-id", 100, 50, 1000);
        results += `✅ Database write permissions working\n`;
      } catch (error) {
        results += `⚠️ Database write test failed (expected): ${error.message}\n`;
      }
    } catch (error) {
      results += `\n❌ Debug test failed: ${error.message}\n`;
      results += `Error details: ${JSON.stringify(
        {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        },
        null,
        2
      )}\n`;
    }

    setDebugResults(results);
    setLoading(false);
  };

  const testLessonUnlocking = async () => {
    if (!user) return;

    setLoading(true);
    let results = `🔓 Lesson Unlocking Test\n\n`;

    try {
      const pillars = await getAllPillars();

      for (const pillar of pillars) {
        results += `📚 ${pillar.display_name}:\n`;

        // Get lessons for this pillar
        const { getLessonsByPillar } = await import("@/lib/supabase/queries");
        const lessons = await getLessonsByPillar(pillar.id);

        results += `Found ${lessons.length} lessons\n`;

        // Get completions for this pillar
        const completions = await getPlayerLessonCompletions(user.id);
        const pillarCompletions = completions.filter((c) =>
          lessons.some((l) => l.id === c.lesson_id)
        );

        results += `Completed: ${pillarCompletions.length} lessons\n`;

        // Check which lessons should be unlocked
        const sortedLessons = lessons.sort(
          (a, b) => a.sort_order - b.sort_order
        );
        sortedLessons.forEach((lesson, index) => {
          const isCompleted = pillarCompletions.some(
            (c) => c.lesson_id === lesson.id
          );
          const shouldBeUnlocked =
            index === 0 ||
            sortedLessons
              .slice(0, index)
              .every((prevLesson) =>
                pillarCompletions.some((c) => c.lesson_id === prevLesson.id)
              );

          const status = isCompleted ? "✅" : shouldBeUnlocked ? "🔓" : "🔒";
          results += `  ${status} ${lesson.title}\n`;
        });

        results += "\n";
      }
    } catch (error) {
      results += `❌ Test failed: ${error.message}\n`;
    }

    setDebugResults(results);
    setLoading(false);
  };

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <p className="text-yellow-800">Please log in to use debug tools</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg p-6 mb-8">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
        🔧 Debug Dashboard
      </h3>

      <div className="flex space-x-4 mb-4">
        <button
          onClick={runDebugTests}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Testing..." : "Run Data Tests"}
        </button>

        <button
          onClick={testLessonUnlocking}
          disabled={loading}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? "Testing..." : "Test Lesson Unlocking"}
        </button>
      </div>

      {debugResults && (
        <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
          {debugResults}
        </div>
      )}

      <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
        <p>
          <strong>User ID:</strong> {user.id}
        </p>
        <p>
          <strong>Email:</strong> {user.email}
        </p>
        <p>
          <strong>Name:</strong> {user.user_metadata?.full_name || "Not set"}
        </p>
      </div>
    </div>
  );
}

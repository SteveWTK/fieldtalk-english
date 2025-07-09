/* eslint-disable @typescript-eslint/no-unused-vars */
// src/components/LessonNavigation.js
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, List } from "lucide-react";
import { getLessonsByPillar } from "@/lib/supabase/queries";

export default function LessonNavigation({ currentLesson }) {
  const router = useRouter();
  const [pillarLessons, setPillarLessons] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [showLessonList, setShowLessonList] = useState(false);

  useEffect(() => {
    async function fetchPillarLessons() {
      if (currentLesson?.pillar_id) {
        try {
          const lessons = await getLessonsByPillar(currentLesson.pillar_id);
          const sortedLessons = lessons.sort(
            (a, b) => a.sort_order - b.sort_order
          );
          setPillarLessons(sortedLessons);

          const index = sortedLessons.findIndex(
            (l) => l.id === currentLesson.id
          );
          setCurrentIndex(index);
        } catch (error) {
          console.error("Error fetching pillar lessons:", error);
        }
      }
    }

    fetchPillarLessons();
  }, [currentLesson]);

  const previousLesson =
    currentIndex > 0 ? pillarLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex < pillarLessons.length - 1
      ? pillarLessons[currentIndex + 1]
      : null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center space-x-3">
          {/* Previous Lesson */}
          {previousLesson ? (
            <Link
              href={`/lesson/${previousLesson.id}`}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Previous</span>
            </Link>
          ) : (
            <div className="px-3 py-2 text-gray-400 text-sm">
              <ArrowLeft className="w-4 h-4" />
            </div>
          )}

          {/* Lesson List Toggle */}
          <button
            onClick={() => setShowLessonList(!showLessonList)}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/40 transition-colors text-sm"
          >
            <List className="w-4 h-4" />
            <span>
              {currentIndex + 1}/{pillarLessons.length}
            </span>
          </button>

          {/* Next Lesson */}
          {nextLesson ? (
            <Link
              href={`/lesson/${nextLesson.id}`}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
            >
              <span>Next</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <div className="px-3 py-2 text-gray-400 text-sm">
              <ArrowRight className="w-4 h-4" />
            </div>
          )}
        </div>

        {/* Lesson List Dropdown */}
        {showLessonList && (
          <div className="absolute bottom-full right-0 mb-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-60 overflow-y-auto">
            <div className="p-2">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2 px-2">
                {currentLesson?.pillar?.display_name || "Lessons"}
              </h3>
              {pillarLessons.map((lesson, index) => (
                <Link
                  key={lesson.id}
                  href={`/lesson/${lesson.id}`}
                  className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                    lesson.id === currentLesson.id
                      ? "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                  }`}
                  onClick={() => setShowLessonList(false)}
                >
                  <div className="font-medium">{lesson.title}</div>
                  <div className="text-xs opacity-75">
                    {lesson.difficulty} • {lesson.xp_reward} XP
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/(site)/lesson/page.js
"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Target,
  Globe,
  Calendar,
  Star,
  ChevronRight,
  Play,
  Lock,
  CheckCircle,
  Medal,
  TrendingUp,
  BookOpen,
  MessageSquare,
  Mic,
  Construction,
} from "lucide-react";
import AnimatedProgressBar from "@/components/AnimatedProgressBar";
// import AnimatedCounter from "@/components/AnimatedCounter";
import XPGainAnimation from "@/components/XPGainAnimation";
// import MatchCountdown from "@/components/MatchCountdown";
import { usePlayerDashboard } from "@/lib/hooks/usePlayerData";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/lib/contexts/LanguageContext";

function PlayerLessonsMenu() {
  const [selectedPillar, setSelectedPillar] = useState("survival");
  const [showXPGain, setShowXPGain] = useState(false);
  const [showConstructionModal, setShowConstructionModal] = useState(false);

  const { user } = useAuth();
  const { userLanguage } = useTranslation(user);
  const { lang } = useLanguage();

  const t = {
    en: {
      subtitle: "Your learning journey",
    },
    pt: {
      subtitle: "Sua jornada de aprendizagem",
    },
  };

  const copy = t[lang];

  // Use the actual logged-in user's ID
  const userId = user?.id;

  const {
    profile,
    progress,
    pillars,
    lessons,
    completions,
    achievements,
    loading,
    refetchProgress,
  } = usePlayerDashboard(userId);

  // Loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
            ))}
          </div>
          <div className="bg-gray-200 h-64 rounded-xl mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-gray-200 h-96 rounded-xl"></div>
            <div className="bg-gray-200 h-96 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  // If no user, show error
  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-primary-900 dark:text-white mb-4">
            Please sign in to view your Lesson Menu
          </h2>
        </div>
      </div>
    );
  }

  // Use real data or fallback to sensible defaults
  const playerData = {
    name:
      profile?.full_name ||
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "Player",
    position: profile?.position || user.user_metadata?.position || "Player",
    club: profile?.club?.name || "FieldTalk English",
    current_level: progress?.current_level || 1,
    total_xp: progress?.total_xp || 0,
    completedLessons: completions?.length || 0,
    current_streak: progress?.current_streak || 0,
    joinDate: progress?.created_at || new Date().toISOString(),
  };

  const currentPillar =
    pillars.find((p) => p.name === selectedPillar) || pillars[0];
  const currentLessons = currentPillar?.lessons || [];

  // Improved lesson status calculation
  const getLessonStatus = (lesson) => {
    // Check if lesson is under construction
    if (lesson.under_construction) return "construction";

    // Check if this lesson is completed
    const isCompleted = completions?.some((c) => c.lesson_id === lesson.id);
    if (isCompleted) return "completed";

    // Get all lessons in this pillar, sorted by sort_order
    const pillarLessons = currentLessons
      .filter((l) => l.pillar_id === lesson.pillar_id)
      .sort((a, b) => a.sort_order - b.sort_order);

    const lessonIndex = pillarLessons.findIndex((l) => l.id === lesson.id);

    // First lesson is always available
    if (lessonIndex === 0) {
      return "current";
    }

    // Check if all previous lessons in this pillar are completed
    const previousLessons = pillarLessons.slice(0, lessonIndex);
    const allPreviousCompleted = previousLessons.every((prevLesson) =>
      completions?.some((c) => c.lesson_id === prevLesson.id)
    );

    if (allPreviousCompleted) {
      return "current";
    }

    return "locked";
  };

  const recentAchievements = achievements?.slice(0, 3) || [
    {
      achievement: {
        name: "Welcome to FieldTalk",
        description: "Started your English learning journey",
        icon: "Star",
      },
      earned_at: "Today",
    },
  ];

  // const upcomingMatches = [
  //   { opponent: "Brighton", date: "Dec 28", type: "Premier League" },
  //   { opponent: "Arsenal", date: "Jan 2", type: "Premier League" },
  //   { opponent: "Man City", date: "Jan 15", type: "FA Cup" },
  // ];

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "current":
        return <Play className="w-5 h-5 text-blue-500" />;
      case "locked":
        return <Lock className="w-5 h-5 text-gray-400" />;
      case "construction":
        return <Construction className="w-5 h-5 text-orange-500" />;
      default:
        return null;
    }
  };

  const getDifficultyColor = (level_name) => {
    switch (level_name) {
      case "Survival":
        return "bg-attention-100 text-attention-800";
      case "Survival Absolute":
        return "bg-accent-100 text-accent-800";
      case "Precision":
        return "bg-attention-100 text-attention-800";
      case "Fluency":
        return "bg-rose-100 text-rose-800";
      default:
        return "bg-primary-100 text-primary-800";
    }
  };

  const getIconComponent = (iconName) => {
    const icons = {
      Globe,
      Target,
      MessageSquare,
      Star,
      Calendar,
      Medal,
    };
    return icons[iconName] || Star;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Message */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-primary-900 dark:text-white">
          Welcome back, {playerData.name}!
        </h1>
        {/* <p className="text-gray-600 dark:text-gray-300 mt-2">
          Continue your English learning journey
        </p> */}
      </div>

      {/* Three Pillars Navigation */}
      <div className="bg-white dark:bg-primary-800 rounded-xl p-6 shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          {userLanguage === "pt-BR"
            ? "Sua jornada de aprendizagem"
            : "Your learning journey"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {pillars.map((pillar, index) => {
            const IconComponent = getIconComponent(pillar.icon);
            return (
              <button
                key={pillar.name}
                onClick={() => setSelectedPillar(pillar.name)}
                className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                  selectedPillar === pillar.name
                    ? "border-accent-500 bg-accent-50/20 dark:bg-accent-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                {/* ${currentPillar.color_gradient}  */}
                <div
                  className={`w-12 h-12 bg-gradient-to-r from-accent-600 to-accent-400 rounded-lg flex items-center justify-center mb-4`}
                >
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {pillar.display_name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {pillar.description_pt}
                </p>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Level {pillar.level}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {pillar.progress}%
                  </span>
                </div>
                <div className="mt-2">
                  <AnimatedProgressBar
                    value={pillar.progress}
                    maxValue={100}
                    color="bg-gradient-to-r from-accent-600 to-accent-400"
                    showPercentage={false}
                    animationDelay={index * 200 + 500}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Pillar Lessons */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentPillar?.display_name}
              </h3>
              <div
                className={`px-3 py-1 bg-gradient-to-r from-accent-600 to-accent-400 text-white rounded-full text-sm font-medium`}
              >
                Level {currentPillar?.level}
              </div>
            </div>

            <div className="space-y-4">
              {currentLessons.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    No lessons available for this pillar yet.
                  </p>
                </div>
              ) : (
                currentLessons.map((lesson) => {
                  const status = getLessonStatus(lesson);
                  const isClickable =
                    status !== "locked" && status !== "construction";

                  return (
                    <div
                      key={lesson.id}
                      className={`p-4 rounded-lg border hover:scale-[1.01] transition-all duration-200 ${
                        status === "current"
                          ? "border-fieldtalk-500 bg-fieldtalk-50 dark:bg-fieldtalk-900/20"
                          : status === "completed"
                            ? "border-accent-200 bg-accent-50/50 dark:bg-accent-900/20"
                            : status === "construction"
                              ? "border-orange-200 bg-orange-50/50 dark:bg-orange-900/20 opacity-75"
                              : "border-primary-200 dark:border-primary-700"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 flex-grow">
                          {getStatusIcon(status)}
                          <div className="flex-grow">
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {lesson.title}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                              {lesson.description_pt}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(lesson.difficulty)}`}
                              >
                                {lesson.level_name}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {lesson.xp_reward} XP
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-300">
                                {lesson.estimated_duration} min
                              </span>
                            </div>
                          </div>
                        </div>
                        {isClickable ? (
                          <Link
                            href={`/lesson/${lesson.id}`}
                            className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors ml-4"
                          >
                            {status === "completed" ? (
                              <CheckCircle className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                          </Link>
                        ) : status === "construction" ? (
                          <button
                            onClick={() => setShowConstructionModal(true)}
                            className="p-2 text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/20 rounded-lg transition-colors ml-4"
                          >
                            <Construction className="w-5 h-5" />
                          </button>
                        ) : (
                          <div className="p-2 text-gray-400 ml-4">
                            <Lock className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                      {status === "locked" && (
                        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                          Complete previous lessons to unlock
                        </div>
                      )}
                      {status === "construction" && (
                        <div className="mt-3 text-xs text-orange-600 dark:text-orange-400">
                          {userLanguage === "pt-BR"
                            ? "Aula em construção"
                            : "Lesson under construction"}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Match Day Countdown */}

          {/* Recent Achievements */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Achievements
            </h3>
            <div className="space-y-3">
              {recentAchievements.map((achievement, index) => {
                return (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Medal className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">
                        {achievement.achievement.name}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        {achievement.achievement.description}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {achievement.earned_at}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Practice
            </h3>
            <div className="space-y-3">
              <button className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center space-x-2">
                <Mic className="w-4 h-4" />
                <span>Pronunciation Practice</span>
              </button>
              <button className="w-full p-3 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors flex items-center space-x-2">
                <MessageSquare className="w-4 h-4" />
                <span>Daily Dialogue</span>
              </button>
              <button className="w-full p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors flex items-center space-x-2">
                <Play className="w-4 h-4" />
                <span>Video Analysis</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* XP Gain Animation */}
      <XPGainAnimation
        xp={50}
        show={showXPGain}
        onComplete={() => setShowXPGain(false)}
      />

      {/* Under Construction Modal */}
      {showConstructionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full shadow-xl">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 dark:bg-attention-900/20 rounded-full flex items-center justify-center">
                <Construction className="w-8 h-8 text-attention-500" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-3">
              {userLanguage === "pt-BR"
                ? "Aula em Construção"
                : "Lesson Under Construction"}
            </h3>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              {userLanguage === "pt-BR"
                ? "Estamos desenvolvendo esta aula e em breve a disponibilizaremos para você."
                : "We are developing this lesson and will soon make it available to you."}
            </p>
            <button
              onClick={() => setShowConstructionModal(false)}
              className="w-full bg-attention-500 hover:bg-attention-600 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {userLanguage === "pt-BR" ? "Ok" : "Ok"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlayerDashboard() {
  return (
    <ProtectedRoute>
      <PlayerLessonsMenu />
    </ProtectedRoute>
  );
}

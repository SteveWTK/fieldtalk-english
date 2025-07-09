/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/(site)/dashboard/page.js - Fixed version with real user data
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
} from "lucide-react";
import AnimatedProgressBar from "@/components/AnimatedProgressBar";
import AnimatedCounter from "@/components/AnimatedCounter";
import XPGainAnimation from "@/components/XPGainAnimation";
import MatchCountdown from "@/components/MatchCountdown";
import { usePlayerDashboard } from "@/lib/hooks/usePlayerData";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

function PlayerDashboardContent() {
  const [selectedPillar, setSelectedPillar] = useState("survival");
  const [showXPGain, setShowXPGain] = useState(false);

  const { user } = useAuth();

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
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Please sign in to view your dashboard
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

  const upcomingMatches = [
    { opponent: "Brighton", date: "Dec 28", type: "Premier League" },
    { opponent: "Arsenal", date: "Jan 2", type: "Premier League" },
    { opponent: "Man City", date: "Jan 15", type: "FA Cup" },
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "current":
        return <Play className="w-5 h-5 text-blue-500" />;
      case "locked":
        return <Lock className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "Advanced":
        return "bg-orange-100 text-orange-800";
      case "Expert":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
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
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {playerData.name}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          Continue your English learning journey
        </p>
      </div>

      {/* Player Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Level</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                <AnimatedCounter
                  value={playerData.current_level}
                  duration={800}
                />
              </p>
            </div>
            <div
              className={`w-12 h-12 bg-gradient-to-r ${currentPillar?.color_gradient || "from-blue-500 to-green-500"} rounded-lg flex items-center justify-center`}
            >
              <Star className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <AnimatedProgressBar
              value={playerData.total_xp % 500} // XP towards next level
              maxValue={500}
              color="from-blue-500 to-green-500"
              animationDelay={200}
            />
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              <AnimatedCounter
                value={playerData.total_xp % 500}
                duration={1000}
                animationDelay={300}
              />
              /500 XP to Level {playerData.current_level + 1}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Lessons Completed
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                <AnimatedCounter
                  value={playerData.completedLessons}
                  duration={1200}
                  animationDelay={100}
                />
              </p>
            </div>
            <BookOpen className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Learning Streak
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                <AnimatedCounter
                  value={playerData.current_streak}
                  duration={800}
                  animationDelay={200}
                />
              </p>
            </div>
            <div className="text-orange-500">
              <Calendar className="w-8 h-8" />
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-300 mt-2">
            Days in a row
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Total XP
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                <AnimatedCounter
                  value={playerData.total_xp}
                  duration={1500}
                  animationDelay={400}
                />
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Three Pillars Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Your Learning Journey
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
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-12 h-12 bg-gradient-to-r ${pillar.color_gradient} rounded-lg flex items-center justify-center mb-4`}
                >
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {pillar.display_name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                  {pillar.description}
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
                    color={pillar.color_gradient}
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
                className={`px-3 py-1 bg-gradient-to-r ${currentPillar?.color_gradient} text-white rounded-full text-sm font-medium`}
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
                  const isClickable = status !== "locked";

                  return (
                    <div
                      key={lesson.id}
                      className={`p-4 rounded-lg border transition-all duration-200 ${
                        status === "current"
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                          : status === "completed"
                            ? "border-green-200 bg-green-50 dark:bg-green-900/20"
                            : "border-gray-200 dark:border-gray-700"
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
                              {lesson.description}
                            </p>
                            <div className="flex items-center space-x-2 mt-2">
                              <span
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(lesson.difficulty)}`}
                              >
                                {lesson.difficulty}
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
          <MatchCountdown
            opponent="Brighton"
            matchDate="2025-01-15T15:00:00"
            competition="Premier League"
          />

          {/* Upcoming Matches */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Upcoming Matches
            </h3>
            <div className="space-y-3">
              {upcomingMatches.map((match, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      vs {match.opponent}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {match.type}
                    </p>
                  </div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {match.date}
                  </p>
                </div>
              ))}
            </div>
            <button
              className="w-full mt-4 py-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              onClick={() => setShowXPGain(true)}
            >
              Practice Match Communication
            </button>
          </div>

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
    </div>
  );
}

export default function PlayerDashboard() {
  return (
    <ProtectedRoute>
      <PlayerDashboardContent />
    </ProtectedRoute>
  );
}

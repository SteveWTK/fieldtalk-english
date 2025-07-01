// src/app/(site)/dashboard/page.js
"use client";

import React, { useState } from "react";
import {
  // Trophy,
  Target,
  Globe,
  // Users,
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

export default function PlayerDashboard() {
  const [selectedPillar, setSelectedPillar] = useState("survival");
  const [showXPGain, setShowXPGain] = useState(false);

  // Mock player data - would come from Supabase in real app
  const playerData = {
    name: "João Silva",
    position: "Midfielder",
    club: "Watford FC",
    level: 7,
    xp: 2450,
    xpToNext: 550,
    totalXp: 3000,
    completedLessons: 23,
    streak: 12,
    joinDate: "2024-10-15",
  };

  const pillars = {
    survival: {
      title: "Survival English",
      description: "Essential daily communication",
      color: "from-red-500 to-orange-500",
      icon: Globe,
      progress: 85,
      level: 8,
      lessons: [
        {
          id: 1,
          title: "First Day at Training",
          status: "completed",
          xp: 150,
          difficulty: "Beginner",
        },
        {
          id: 2,
          title: "Ordering Food",
          status: "completed",
          xp: 120,
          difficulty: "Beginner",
        },
        {
          id: 3,
          title: "Bank Account Setup",
          status: "completed",
          xp: 180,
          difficulty: "Intermediate",
        },
        {
          id: 4,
          title: "Medical Appointments",
          status: "current",
          xp: 200,
          difficulty: "Intermediate",
        },
        {
          id: 5,
          title: "Housing & Utilities",
          status: "locked",
          xp: 220,
          difficulty: "Intermediate",
        },
      ],
    },
    precision: {
      title: "Precision English",
      description: "Technical football language",
      color: "from-blue-500 to-cyan-500",
      icon: Target,
      progress: 65,
      level: 6,
      lessons: [
        {
          id: 6,
          title: "Tactical Instructions",
          status: "completed",
          xp: 180,
          difficulty: "Intermediate",
        },
        {
          id: 7,
          title: "Match Communication",
          status: "completed",
          xp: 200,
          difficulty: "Intermediate",
        },
        {
          id: 8,
          title: "Training Drills Vocabulary",
          status: "current",
          xp: 250,
          difficulty: "Advanced",
        },
        {
          id: 9,
          title: "Injury Reporting",
          status: "locked",
          xp: 220,
          difficulty: "Intermediate",
        },
        {
          id: 10,
          title: "Performance Analysis",
          status: "locked",
          xp: 300,
          difficulty: "Advanced",
        },
      ],
    },
    fluency: {
      title: "Fluency English",
      description: "Advanced communication & media",
      color: "from-green-500 to-emerald-500",
      icon: MessageSquare,
      progress: 35,
      level: 4,
      lessons: [
        {
          id: 11,
          title: "Press Interviews",
          status: "completed",
          xp: 300,
          difficulty: "Advanced",
        },
        {
          id: 12,
          title: "Team Leadership",
          status: "current",
          xp: 350,
          difficulty: "Expert",
        },
        {
          id: 13,
          title: "Community Events",
          status: "locked",
          xp: 280,
          difficulty: "Advanced",
        },
        {
          id: 14,
          title: "Contract Negotiations",
          status: "locked",
          xp: 400,
          difficulty: "Expert",
        },
        {
          id: 15,
          title: "Coaching Communication",
          status: "locked",
          xp: 380,
          difficulty: "Expert",
        },
      ],
    },
  };

  const recentAchievements = [
    {
      title: "Survival Master",
      description: "Completed 10 survival lessons",
      icon: Globe,
      date: "2 days ago",
    },
    {
      title: "Week Warrior",
      description: "7-day learning streak",
      icon: Calendar,
      date: "1 week ago",
    },
    {
      title: "First Goal",
      description: "Completed first lesson",
      icon: Target,
      date: "2 weeks ago",
    },
  ];

  const upcomingMatches = [
    { opponent: "Brighton", date: "Dec 28", type: "Premier League" },
    { opponent: "Arsenal", date: "Jan 2", type: "Premier League" },
    { opponent: "Man City", date: "Jan 15", type: "FA Cup" },
  ];

  const currentPillar = pillars[selectedPillar];
  // const progressPercentage = (playerData.xp / playerData.totalXp) * 100;

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Player Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">Level</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                <AnimatedCounter value={playerData.level} duration={800} />
              </p>
            </div>
            <div
              className={`w-12 h-12 bg-gradient-to-r ${currentPillar.color} rounded-lg flex items-center justify-center`}
            >
              <Star className="w-6 h-6 text-white" />
            </div>
          </div>
          <div className="mt-4">
            <AnimatedProgressBar
              value={playerData.xp}
              maxValue={playerData.totalXp}
              color="from-blue-500 to-green-500"
              animationDelay={200}
            />
            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
              <AnimatedCounter
                value={playerData.xp}
                duration={1000}
                animationDelay={300}
              />
              /{playerData.totalXp} XP to Level {playerData.level + 1}
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
                  value={playerData.streak}
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
                  value={playerData.xp}
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
          {Object.entries(pillars).map(([key, pillar], index) => (
            <button
              key={key}
              onClick={() => setSelectedPillar(key)}
              className={`p-6 rounded-xl border-2 transition-all duration-200 ${
                selectedPillar === key
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
              }`}
            >
              <div
                className={`w-12 h-12 bg-gradient-to-r ${pillar.color} rounded-lg flex items-center justify-center mb-4`}
              >
                <pillar.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {pillar.title}
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
                  color={pillar.color}
                  showPercentage={false}
                  animationDelay={index * 200 + 500}
                />
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Pillar Lessons */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentPillar.title}
              </h3>
              <div
                className={`px-3 py-1 bg-gradient-to-r ${currentPillar.color} text-white rounded-full text-sm font-medium`}
              >
                Level {currentPillar.level}
              </div>
            </div>

            <div className="space-y-4">
              {currentPillar.lessons.map((lesson) => (
                <div
                  key={lesson.id}
                  className={`p-4 rounded-lg border transition-all duration-200 ${
                    lesson.status === "current"
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : lesson.status === "completed"
                        ? "border-green-200 bg-green-50 dark:bg-green-900/20"
                        : "border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(lesson.status)}
                      <div>
                        <h4 className="font-medium text-gray-900 dark:text-white">
                          {lesson.title}
                        </h4>
                        <div className="flex items-center space-x-2 mt-1">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(lesson.difficulty)}`}
                          >
                            {lesson.difficulty}
                          </span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">
                            {lesson.xp} XP
                          </span>
                        </div>
                      </div>
                    </div>
                    {lesson.status !== "locked" && (
                      <button className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                        {lesson.status === "completed" ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
              {recentAchievements.map((achievement, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Medal className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {achievement.title}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {achievement.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {achievement.date}
                    </p>
                  </div>
                </div>
              ))}
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

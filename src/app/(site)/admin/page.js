/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/(site)/admin/page.js
"use client";

import React, { useState } from "react";
import {
  Users,
  TrendingUp,
  Trophy,
  Target,
  Globe,
  MessageSquare,
  Download,
  Plus,
  Search,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useClubStats, useDemoClubData } from "@/lib/hooks/useClubData";
import ProtectedRoute from "@/components/ProtectedRoute";

function ClubAdminPanelContent() {
  const [selectedView, setSelectedView] = useState("overview");
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  // For demo purposes, use demo data
  // In production, this would use real club ID from auth
  const demoClubId = "demo-club-watford";

  // Use demo data for now - replace with real data when auth is ready
  const { stats, players, recentActivity, loading, error } = useDemoClubData();

  const upcomingMatches = [
    {
      opponent: "Brighton",
      date: "Dec 28",
      players: ["João Silva", "Carlos Rodriguez", "Ahmed Hassan"],
    },
    {
      opponent: "Arsenal",
      date: "Jan 2",
      players: ["João Silva", "Pierre Dubois", "Ahmed Hassan"],
    },
    {
      opponent: "Man City",
      date: "Jan 15",
      players: ["Carlos Rodriguez", "Ahmed Hassan"],
    },
  ];

  const customLessons = [
    {
      title: "Watford Tactical System",
      status: "active",
      players: 23,
      created: "Nov 15",
    },
    {
      title: "Vicarage Road Stadium Guide",
      status: "draft",
      players: 0,
      created: "Dec 1",
    },
    {
      title: "Press Conference Prep",
      status: "active",
      players: 8,
      created: "Oct 20",
    },
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case "active":
        return "text-green-600 bg-green-100";
      case "needs-attention":
        return "text-red-600 bg-red-100";
      case "inactive":
        return "text-gray-600 bg-gray-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  const formatLastActive = (lastActivityDate) => {
    if (!lastActivityDate) return "Never";

    const today = new Date();
    const activityDate = new Date(lastActivityDate);
    const diffTime = Math.abs(today - activityDate);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return `${Math.floor(diffDays / 7)} weeks ago`;
  };

  const calculatePlayerStatus = (player) => {
    const lastActive = formatLastActive(player.progress?.last_activity_date);
    if (lastActive === "Today" || lastActive === "Yesterday") return "active";
    if (lastActive.includes("days ago") && parseInt(lastActive) <= 3)
      return "active";
    return "needs-attention";
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Active Players
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.activePlayers}
              </p>
              <p className="text-sm text-gray-500">
                of {stats.totalPlayers} total
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Average Progress
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.averageProgress}%
              </p>
              <p className="text-sm text-green-600">↗ +5% this week</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Lessons Completed
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.totalLessonsCompleted}
              </p>
              <p className="text-sm text-blue-600">+23 this week</p>
            </div>
            <Trophy className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Weekly Activity
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {stats.weeklyActivity || 89}%
              </p>
              <p className="text-sm text-gray-500">engagement rate</p>
            </div>
            <Target className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Match Preparation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Upcoming Matches
          </h3>
          <div className="space-y-3">
            {upcomingMatches.map((match, index) => (
              <div
                key={index}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      vs {match.opponent}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {match.date}
                    </p>
                  </div>
                  <button className="text-blue-600 hover:text-blue-700 text-sm">
                    Prep Players
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {match.players.length} players ready for communication prep
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          <div className="space-y-3">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                <div className="flex-grow">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-medium">{activity.player}</span>{" "}
                    {activity.action}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.time}
                    </p>
                    <span className="text-xs text-green-600">
                      +{activity.xp} XP
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderPlayers = () => (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search players..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option>All Positions</option>
            <option>Goalkeeper</option>
            <option>Defender</option>
            <option>Midfielder</option>
            <option>Forward</option>
          </select>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="w-4 h-4 inline mr-2" />
          Export Report
        </button>
      </div>

      {/* Players Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Player
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Pillars
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {players.map((player) => {
                const lastActive = formatLastActive(
                  player.progress?.last_activity_date
                );
                const status = calculatePlayerStatus(player);

                return (
                  <tr
                    key={player.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gray-300 rounded-full flex-shrink-0"></div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {player.full_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {player.position} • {player.nationality}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        Level {player.progress?.current_level || 1}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {(player.progress?.total_xp || 0).toLocaleString()} XP
                      </div>
                      <div className="text-xs text-gray-400">
                        {player.lessonsCompleted} lessons
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Globe className="w-3 h-3 text-red-500 mr-1" />
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            Survival: {player.progress?.survival_progress || 0}%
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Target className="w-3 h-3 text-blue-500 mr-1" />
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            Precision:{" "}
                            {player.progress?.precision_progress || 0}%
                          </span>
                        </div>
                        <div className="flex items-center">
                          <MessageSquare className="w-3 h-3 text-green-500 mr-1" />
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            Fluency: {player.progress?.fluency_progress || 0}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {lastActive}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {(player.progress?.current_streak || 0) > 0
                          ? `${player.progress.current_streak} day streak`
                          : "No current streak"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}
                      >
                        {status === "active"
                          ? "Active"
                          : status === "needs-attention"
                            ? "Needs Attention"
                            : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <button
                        onClick={() => setSelectedPlayer(player)}
                        className="text-blue-600 hover:text-blue-700 mr-3"
                      >
                        View Details
                      </button>
                      <button className="text-gray-600 hover:text-gray-700">
                        Message
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderCustomContent = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Custom Watford Content
        </h2>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-4 h-4 inline mr-2" />
          Create New Lesson
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customLessons.map((lesson, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {lesson.title}
              </h3>
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  lesson.status === "active"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {lesson.status}
              </span>
            </div>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <p>Players enrolled: {lesson.players}</p>
              <p>Created: {lesson.created}</p>
            </div>
            <div className="mt-4 flex space-x-2">
              <button className="text-blue-600 hover:text-blue-700 text-sm">
                Edit
              </button>
              <button className="text-gray-600 hover:text-gray-700 text-sm">
                Analytics
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-900/20 dark:to-green-900/20 p-6 rounded-xl">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Partnership Benefits
        </h3>
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          As our partner, Watford FC gets exclusive features:
        </p>
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>✅ Custom lesson creation for club-specific scenarios</li>
          <li>✅ Integration with match schedules and team events</li>
          <li>✅ Position-specific language training modules</li>
          <li>✅ Direct communication tools with players</li>
          <li>✅ Advanced analytics and progress reporting</li>
        </ul>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
              ))}
            </div>
            <div className="bg-gray-200 h-64 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview", icon: TrendingUp },
              { id: "players", label: "Players", icon: Users },
              { id: "content", label: "Custom Content", icon: Target },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedView(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  selectedView === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {selectedView === "overview" && renderOverview()}
        {selectedView === "players" && renderPlayers()}
        {selectedView === "content" && renderCustomContent()}
      </div>

      {/* Player Detail Modal */}
      {selectedPlayer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedPlayer.full_name}
                </h2>
                <p className="text-gray-600 dark:text-gray-300">
                  {selectedPlayer.position} • {selectedPlayer.nationality}
                </p>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Level
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedPlayer.progress?.current_level || 1}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">XP</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(selectedPlayer.progress?.total_xp || 0).toLocaleString()}
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Streak
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedPlayer.progress?.current_streak || 0}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Pillar Progress
                </h3>
                <div className="space-y-3">
                  {[
                    {
                      name: "Survival English",
                      value: selectedPlayer.progress?.survival_progress || 0,
                      color: "bg-red-500",
                    },
                    {
                      name: "Precision English",
                      value: selectedPlayer.progress?.precision_progress || 0,
                      color: "bg-blue-500",
                    },
                    {
                      name: "Fluency English",
                      value: selectedPlayer.progress?.fluency_progress || 0,
                      color: "bg-green-500",
                    },
                  ].map((pillar) => (
                    <div key={pillar.name}>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">
                          {pillar.name}
                        </span>
                        <span className="text-gray-900 dark:text-white">
                          {pillar.value}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`${pillar.color} h-2 rounded-full transition-all duration-300`}
                          style={{ width: `${pillar.value}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Strengths
                  </h3>
                  <ul className="space-y-1">
                    {(
                      selectedPlayer.strengths || [
                        "Daily Conversation",
                        "Training Vocabulary",
                      ]
                    ).map((strength, index) => (
                      <li
                        key={index}
                        className="text-sm text-green-600 flex items-center"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-1">
                    {(
                      selectedPlayer.weakAreas || [
                        "Match Communication",
                        "Media Interviews",
                      ]
                    ).map((area, index) => (
                      <li
                        key={index}
                        className="text-sm text-orange-600 flex items-center"
                      >
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {area}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="mt-6 flex space-x-3">
              <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                Assign Custom Lesson
              </button>
              <button className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ClubAdminPanel() {
  return (
    <ProtectedRoute>
      <ClubAdminPanelContent />
    </ProtectedRoute>
  );
}

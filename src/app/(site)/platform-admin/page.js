/* eslint-disable @typescript-eslint/no-unused-vars */
// src/app/(site)/platform-admin/page.js
"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Building2,
  BookOpen,
  TrendingUp,
  Plus,
  Search,
  Download,
  Edit,
  Trash2,
  Eye,
  Settings,
  Globe,
  Target,
  MessageSquare,
  Filter,
  MoreHorizontal,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

// Platform admin queries (we'll create these)
import {
  getAllClubs,
  getAllPlayers,
  getAllLessons,
  getPlatformStats,
  createClub,
  updateClub,
  deleteClub,
  createLesson,
  updateLesson,
  deleteLesson,
} from "@/lib/supabase/platform-admin-queries";

function PlatformAdminContent() {
  const [selectedView, setSelectedView] = useState("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState(""); // 'club', 'lesson', 'player'
  const [loading, setLoading] = useState(false);

  // Data states
  const [platformStats, setPlatformStats] = useState({
    totalClubs: 0,
    totalPlayers: 0,
    totalLessons: 0,
    totalCompletions: 0,
    activeUsers: 0,
    recentGrowth: 0,
  });
  const [clubs, setClubs] = useState([]);
  const [players, setPlayers] = useState([]);
  const [lessons, setLessons] = useState([]);

  // Load data on component mount
  useEffect(() => {
    loadPlatformData();
  }, []);

  const loadPlatformData = async () => {
    setLoading(true);
    try {
      const [statsData, clubsData, playersData, lessonsData] =
        await Promise.all([
          getPlatformStats(),
          getAllClubs(),
          getAllPlayers(),
          getAllLessons(),
        ]);

      setPlatformStats(statsData || {});
      setClubs(clubsData || []);
      setPlayers(playersData || []);
      setLessons(lessonsData || []);
    } catch (error) {
      console.error("Error loading platform data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async (clubData) => {
    try {
      await createClub(clubData);
      await loadPlatformData(); // Refresh data
      setShowModal(false);
    } catch (error) {
      console.error("Error creating club:", error);
    }
  };

  const handleCreateLesson = async (lessonData) => {
    try {
      await createLesson(lessonData);
      await loadPlatformData(); // Refresh data
      setShowModal(false);
    } catch (error) {
      console.error("Error creating lesson:", error);
    }
  };

  const filteredClubs = clubs.filter(
    (club) =>
      club.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterStatus === "all" || club.status === filterStatus)
  );

  const filteredPlayers = players.filter(
    (player) =>
      (player.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        player.club?.name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterStatus === "all" || player.status === filterStatus)
  );

  const filteredLessons = lessons.filter(
    (lesson) =>
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (filterStatus === "all" || lesson.difficulty === filterStatus)
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Platform Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Total Clubs
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {platformStats.totalClubs}
              </p>
              <p className="text-sm text-green-600">
                +{platformStats.recentGrowth}% this month
              </p>
            </div>
            <Building2 className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Total Players
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {platformStats.totalPlayers}
              </p>
              <p className="text-sm text-blue-600">
                {platformStats.activeUsers} active
              </p>
            </div>
            <Users className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Total Lessons
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {platformStats.totalLessons}
              </p>
              <p className="text-sm text-gray-500">across all pillars</p>
            </div>
            <BookOpen className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Completions
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {platformStats.totalCompletions}
              </p>
              <p className="text-sm text-gray-500">lessons completed</p>
            </div>
            <TrendingUp className="w-8 h-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Recent Club Activity
          </h3>
          <div className="space-y-3">
            {clubs.slice(0, 5).map((club, index) => (
              <div
                key={club.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {club.name}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {club.country}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {club.player_count || 0} players
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Content Performance
          </h3>
          <div className="space-y-3">
            {lessons.slice(0, 5).map((lesson, index) => (
              <div
                key={lesson.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      lesson.pillar?.name === "survival"
                        ? "bg-red-100 dark:bg-red-900"
                        : lesson.pillar?.name === "precision"
                          ? "bg-blue-100 dark:bg-blue-900"
                          : "bg-green-100 dark:bg-green-900"
                    }`}
                  >
                    {lesson.pillar?.name === "survival" ? (
                      <Globe className="w-4 h-4 text-red-600" />
                    ) : lesson.pillar?.name === "precision" ? (
                      <Target className="w-4 h-4 text-blue-600" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {lesson.title}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {lesson.difficulty}
                    </p>
                  </div>
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-300">
                  {lesson.completion_count || 0} completions
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderClubs = () => (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clubs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="trial">Trial</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex space-x-2">
          <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
            <Download className="w-4 h-4 inline mr-2" />
            Export
          </button>
          <button
            onClick={() => {
              setModalType("club");
              setSelectedItem(null);
              setShowModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 inline mr-2" />
            Add Club
          </button>
        </div>
      </div>

      {/* Clubs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Club
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  League
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Players
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredClubs.map((club) => (
                <tr
                  key={club.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {club.name}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {club.country}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {club.league || "Not specified"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {club.player_count || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        club.status === "active"
                          ? "bg-green-100 text-green-800"
                          : club.status === "trial"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                      }`}
                    >
                      {club.status || "active"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(club.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-700">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setModalType("club");
                          setSelectedItem(club);
                          setShowModal(true);
                        }}
                        className="text-gray-600 hover:text-gray-700"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-700">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderPlayers = () => (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search players..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Players</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
          <Download className="w-4 h-4 inline mr-2" />
          Export Players
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
                  Club
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPlayers.map((player) => (
                <tr
                  key={player.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {player.full_name || "Unnamed Player"}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {player.position || "No position"} •{" "}
                          {player.nationality || "Unknown"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {player.club?.name || "No club assigned"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      Level {player.progress?.current_level || 1}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {player.progress?.total_xp || 0} XP
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {player.progress?.last_activity_date || "Never"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-700">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-700">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button className="text-gray-600 hover:text-gray-700">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderLessons = () => (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search lessons..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Difficulties</option>
            <option value="Beginner">Beginner</option>
            <option value="Intermediate">Intermediate</option>
            <option value="Advanced">Advanced</option>
            <option value="Expert">Expert</option>
          </select>
        </div>
        <button
          onClick={() => {
            setModalType("lesson");
            setSelectedItem(null);
            setShowModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 inline mr-2" />
          Create Lesson
        </button>
      </div>

      {/* Lessons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLessons.map((lesson) => (
          <div
            key={lesson.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  lesson.pillar?.name === "survival"
                    ? "bg-red-100 dark:bg-red-900"
                    : lesson.pillar?.name === "precision"
                      ? "bg-blue-100 dark:bg-blue-900"
                      : "bg-green-100 dark:bg-green-900"
                }`}
              >
                {lesson.pillar?.name === "survival" ? (
                  <Globe className="w-5 h-5 text-red-600" />
                ) : lesson.pillar?.name === "precision" ? (
                  <Target className="w-5 h-5 text-blue-600" />
                ) : (
                  <MessageSquare className="w-5 h-5 text-green-600" />
                )}
              </div>
              <div className="flex space-x-1">
                <button className="text-gray-400 hover:text-gray-600">
                  <Edit className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-red-600">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {lesson.title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {lesson.description}
            </p>

            <div className="flex items-center justify-between text-sm">
              <span
                className={`px-2 py-1 rounded-full ${
                  lesson.difficulty === "Beginner"
                    ? "bg-green-100 text-green-800"
                    : lesson.difficulty === "Intermediate"
                      ? "bg-yellow-100 text-yellow-800"
                      : lesson.difficulty === "Advanced"
                        ? "bg-orange-100 text-orange-800"
                        : "bg-red-100 text-red-800"
                }`}
              >
                {lesson.difficulty}
              </span>
              <span className="text-gray-500 dark:text-gray-400">
                {lesson.xp_reward} XP
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>{lesson.completion_count || 0} completions</span>
                <span>{lesson.estimated_duration} min</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 h-32 rounded-xl"></div>
            ))}
          </div>
          <div className="bg-gray-200 h-64 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              FieldTalk Platform Admin
            </h1>
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            {[
              { id: "overview", label: "Overview", icon: TrendingUp },
              { id: "clubs", label: "Clubs", icon: Building2 },
              { id: "players", label: "Players", icon: Users },
              { id: "lessons", label: "Lessons", icon: BookOpen },
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
        {selectedView === "clubs" && renderClubs()}
        {selectedView === "players" && renderPlayers()}
        {selectedView === "lessons" && renderLessons()}
      </div>

      {/* Modal would go here for creating/editing items */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full">
            <h2 className="text-xl font-bold mb-4">
              {selectedItem ? "Edit" : "Create"} {modalType}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {modalType} form would go here...
            </p>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlatformAdmin() {
  return (
    <ProtectedRoute>
      <PlatformAdminContent />
    </ProtectedRoute>
  );
}

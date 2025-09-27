"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Users, TrendingUp, Plus } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  getAcademyById,
  getPlayersByAcademy,
  getAcademyStats,
} from "@/lib/supabase/academies-queries";

function AcademyAdminDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [academy, setAcademy] = useState(null);
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (user) {
      loadAcademyData();
    }
  }, [user]);

  async function loadAcademyData() {
    try {
      setLoading(true);

      if (!user.academy_id) {
        console.warn("User does not have an academy_id assigned");
        setLoading(false);
        return;
      }

      const [academyData, playersData, statsData] = await Promise.all([
        getAcademyById(user.academy_id),
        getPlayersByAcademy(user.academy_id),
        getAcademyStats(user.academy_id),
      ]);

      setAcademy(academyData);
      setPlayers(playersData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading academy data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!user?.academy_id) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Academy Assigned
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your account is not currently associated with an academy. Please
            contact FieldTalk support to get assigned to your academy.
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Trophy className="w-8 h-8 text-green-600 dark:text-green-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {academy?.name || "Academy Dashboard"}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Academy Administration Portal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Players
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalPlayers || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Active Players
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.activePlayers || 0}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Lessons Completed
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalLessonsCompleted || 0}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Trophy className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Average XP
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.averageXP || 0}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4">
            {["overview", "players"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border-b-2 font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? "border-blue-600 text-blue-600 dark:text-blue-400"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Academy Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Academy Name
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {academy?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Location
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {academy?.city && academy?.country
                      ? `${academy.city}, ${academy.country}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Status
                  </p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      academy?.is_active
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    {academy?.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Player Management
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                Note: Player creation functionality will be added here. Each new
                player account triggers billing.
              </p>
              <button
                disabled
                className="px-4 py-2 bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed"
              >
                <Plus className="w-4 h-4 inline-block mr-2" />
                Add Player (Coming Soon)
              </button>
            </div>
          </div>
        )}

        {activeTab === "players" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                All Players
              </h2>
            </div>

            {players.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No players yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {players.map((player, index) => (
                  <div key={player.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <span className="text-green-600 dark:text-green-400 font-semibold">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {player.full_name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {player.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            XP
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {player.total_xp || 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Lessons
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {player.completions?.[0]?.count || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AcademyAdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={["client_admin", "platform_admin"]}>
      <AcademyAdminDashboardContent />
    </ProtectedRoute>
  );
}

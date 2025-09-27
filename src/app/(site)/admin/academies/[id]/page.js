/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Edit,
  Trophy,
  Users,
  MapPin,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  getAcademyById,
  getPlayersByAcademy,
  updateAcademy,
  getAcademyStats,
} from "@/lib/supabase/academies-queries";

function AcademyDetailContent() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const academyId = params.id;

  const [academy, setAcademy] = useState(null);
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (academyId) {
      loadAcademyData();
    }
  }, [academyId]);

  async function loadAcademyData() {
    try {
      setLoading(true);
      const [academyData, playersData, statsData] = await Promise.all([
        getAcademyById(academyId),
        getPlayersByAcademy(academyId),
        getAcademyStats(academyId),
      ]);

      setAcademy(academyData);
      setPlayers(playersData);
      setStats(statsData);
      setEditData(academyData);
    } catch (error) {
      console.error("Error loading academy:", error);
      alert("Failed to load academy data.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);
      await updateAcademy(academyId, editData);
      setAcademy(editData);
      setEditing(false);
      alert("Academy updated successfully!");
    } catch (error) {
      console.error("Error updating academy:", error);
      alert("Failed to update academy. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading academy...
          </p>
        </div>
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Academy not found
          </p>
          <button
            onClick={() => router.push("/admin/academies")}
            className="text-blue-600 hover:text-blue-700"
          >
            Back to Academies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push("/admin/academies")}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Academies
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {academy.name}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  {academy.is_active ? (
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded">
                      Inactive
                    </span>
                  )}
                  {academy.subscription_type && (
                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 rounded">
                      {academy.subscription_type.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => (editing ? handleSave() : setEditing(true))}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              {editing
                ? saving
                  ? "Saving..."
                  : "Save Changes"
                : "Edit Academy"}
            </button>
          </div>
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
              {editing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Academy Name
                    </label>
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) =>
                        setEditData({ ...editData, name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={editData.city || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, city: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Country
                      </label>
                      <input
                        type="text"
                        value={editData.country || ""}
                        onChange={(e) =>
                          setEditData({ ...editData, country: e.target.value })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={editData.contact_email || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            contact_email: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={editData.contact_phone || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            contact_phone: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={editData.is_active}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          is_active: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      Academy is active
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {academy.city && academy.country && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Location
                        </p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {academy.city}, {academy.country}
                        </p>
                      </div>
                    </div>
                  )}
                  {academy.contact_email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Contact Email
                        </p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {academy.contact_email}
                        </p>
                      </div>
                    </div>
                  )}
                  {academy.contact_phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Contact Phone
                        </p>
                        <p className="text-lg font-medium text-gray-900 dark:text-white">
                          {academy.contact_phone}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Created
                      </p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        {new Date(academy.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "players" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  All Players
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Players are managed by Academy Admins
                </p>
              </div>
            </div>

            {players.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  No players yet
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Academy admin needs to create player accounts
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

export default function AcademyDetail() {
  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <AcademyDetailContent />
    </ProtectedRoute>
  );
}

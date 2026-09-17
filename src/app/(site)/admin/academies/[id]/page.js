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
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

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
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-400 mx-auto"></div>
          <p className="mt-4 text-primary-300">
            Loading academy...
          </p>
        </div>
      </div>
    );
  }

  if (!academy) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary-300 mb-4">
            Academy not found
          </p>
          <button
            onClick={() => router.push("/admin/academies")}
            className="text-accent-400 hover:text-accent-300"
          >
            Back to Academies
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <button
            onClick={() => router.push("/admin/academies")}
            className="flex items-center gap-2 text-primary-300 hover:text-primary-50 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Academies
          </button>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-accent-400" />
              <div>
                <h1 className="text-3xl font-bold text-primary-50">
                  {academy.name}
                </h1>
                <div className="flex items-center gap-3 mt-1">
                  {academy.is_active ? (
                    <span className="px-2 py-1 text-xs font-medium bg-accent-400/15 text-accent-400 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-medium bg-signal-alert/10 text-signal-alert rounded">
                      Inactive
                    </span>
                  )}
                  {academy.subscription_type && (
                    <span className="px-2 py-1 text-xs font-medium bg-signal-english/10 text-signal-english rounded">
                      {academy.subscription_type.replace("_", " ")}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="primary"
              Icon={Edit}
              loading={saving}
              onClick={() => (editing ? handleSave() : setEditing(true))}
            >
              {editing
                ? saving
                  ? "Saving..."
                  : "Save Changes"
                : "Edit Academy"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Total Players
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {stats.totalPlayers || 0}
                </p>
              </div>
              <div className="p-3 bg-signal-english/10 rounded-control">
                <Users className="w-6 h-6 text-signal-english" />
              </div>
            </div>
          </div>

          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Active Players
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {stats.activePlayers || 0}
                </p>
              </div>
              <div className="p-3 bg-accent-400/15 rounded-control">
                <TrendingUp className="w-6 h-6 text-accent-400" />
              </div>
            </div>
          </div>

          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Lessons Completed
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {stats.totalLessonsCompleted || 0}
                </p>
              </div>
              <div className="p-3 bg-signal-mental/10 rounded-control">
                <Trophy className="w-6 h-6 text-signal-mental" />
              </div>
            </div>
          </div>

          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-primary-300 mb-1">
                  Average XP
                </p>
                <p className="text-3xl font-bold text-primary-50">
                  {stats.averageXP || 0}
                </p>
              </div>
              <div className="p-3 bg-signal-performance/10 rounded-control">
                <TrendingUp className="w-6 h-6 text-signal-performance" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 border-b border-primary-700">
          <nav className="flex gap-4">
            {["overview", "players"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 border-b-2 font-medium transition-colors capitalize ${
                  activeTab === tab
                    ? "border-accent-400 text-accent-400"
                    : "border-transparent text-primary-300 hover:text-primary-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </nav>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
              <h2 className="text-xl font-semibold text-primary-50 mb-4">
                Academy Information
              </h2>
              {editing ? (
                <div className="space-y-4">
                  <Input
                    label="Academy Name"
                    type="text"
                    value={editData.name}
                    onChange={(e) =>
                      setEditData({ ...editData, name: e.target.value })
                    }
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="City"
                      type="text"
                      value={editData.city || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, city: e.target.value })
                      }
                    />
                    <Input
                      label="Country"
                      type="text"
                      value={editData.country || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, country: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Contact Email"
                      type="email"
                      value={editData.contact_email || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          contact_email: e.target.value,
                        })
                      }
                    />
                    <Input
                      label="Contact Phone"
                      type="tel"
                      value={editData.contact_phone || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          contact_phone: e.target.value,
                        })
                      }
                    />
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
                      className="w-4 h-4 text-accent-400 border-primary-600 rounded"
                    />
                    <label className="ml-2 text-sm text-primary-100">
                      Academy is active
                    </label>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {academy.city && academy.country && (
                    <div className="flex items-start gap-3">
                      <MapPin className="w-5 h-5 text-primary-500 mt-1" />
                      <div>
                        <p className="text-sm text-primary-300">
                          Location
                        </p>
                        <p className="text-lg font-medium text-primary-50">
                          {academy.city}, {academy.country}
                        </p>
                      </div>
                    </div>
                  )}
                  {academy.contact_email && (
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-primary-500 mt-1" />
                      <div>
                        <p className="text-sm text-primary-300">
                          Contact Email
                        </p>
                        <p className="text-lg font-medium text-primary-50">
                          {academy.contact_email}
                        </p>
                      </div>
                    </div>
                  )}
                  {academy.contact_phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="w-5 h-5 text-primary-500 mt-1" />
                      <div>
                        <p className="text-sm text-primary-300">
                          Contact Phone
                        </p>
                        <p className="text-lg font-medium text-primary-50">
                          {academy.contact_phone}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Calendar className="w-5 h-5 text-primary-500 mt-1" />
                    <div>
                      <p className="text-sm text-primary-300">
                        Created
                      </p>
                      <p className="text-lg font-medium text-primary-50">
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
          <div className="bg-primary-panel border border-primary-700 rounded-card">
            <div className="p-6 border-b border-primary-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-primary-50">
                  All Players
                </h2>
                <p className="text-sm text-primary-300">
                  Players are managed by Academy Admins
                </p>
              </div>
            </div>

            {players.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-primary-500 mx-auto mb-4" />
                <p className="text-primary-300 mb-2">
                  No players yet
                </p>
                <p className="text-sm text-primary-400">
                  Academy admin needs to create player accounts
                </p>
              </div>
            ) : (
              <div className="divide-y divide-primary-700">
                {players.map((player, index) => (
                  <div key={player.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-accent-400/15 flex items-center justify-center">
                          <span className="text-accent-400 font-semibold">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-primary-50">
                            {player.full_name}
                          </p>
                          <p className="text-sm text-primary-300">
                            {player.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-primary-300">
                            XP
                          </p>
                          <p className="font-medium text-primary-50">
                            {player.total_xp || 0}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-primary-300">
                            Lessons
                          </p>
                          <p className="font-medium text-primary-50">
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

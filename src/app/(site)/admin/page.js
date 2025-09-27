/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  School,
  Trophy,
  BookOpen,
  Users,
  TrendingUp,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getAllSchools } from "@/lib/supabase/schools-queries";
import { getAllAcademies } from "@/lib/supabase/academies-queries";

function PlatformAdminDashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [schools, setSchools] = useState([]);
  const [academies, setAcademies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [schoolsData, academiesData] = await Promise.all([
        getAllSchools(),
        getAllAcademies(),
      ]);
      setSchools(schoolsData);
      setAcademies(academiesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    totalSchools: schools.length,
    activeSchools: schools.filter((s) => s.is_active).length,
    totalAcademies: academies.length,
    activeAcademies: academies.filter((a) => a.is_active).length,
  };

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Platform Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            FieldTalk administration and management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Schools
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalSchools}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stats.activeSchools} active
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <School className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Academies/Clubs
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalAcademies}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {stats.activeAcademies} active
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Trophy className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div
            onClick={() => router.push("/admin/lessons")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Lessons
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  CMS
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Manage content →
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Users
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  -
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Coming soon
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Users className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => router.push("/admin/schools")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-left hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <School className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Schools Management
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Manage schools, classes, teachers, and students
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
              <span>{stats.totalSchools} schools</span>
              <span>•</span>
              <span>{stats.activeSchools} active</span>
            </div>
          </button>

          <button
            onClick={() => router.push("/admin/academies")}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 text-left hover:shadow-md transition-shadow group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Trophy className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Academies & Clubs
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Manage football academies, clubs, and players
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
              <span>{stats.totalAcademies} academies</span>
              <span>•</span>
              <span>{stats.activeAcademies} active</span>
            </div>
          </button>
        </div>

        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            Quick Links
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => router.push("/admin/lessons/new")}
              className="px-4 py-3 bg-white dark:bg-gray-800 rounded-lg text-left hover:shadow transition-shadow"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                Create Lesson
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Add new content
              </p>
            </button>
            <button
              onClick={() => router.push("/admin/schools/new")}
              className="px-4 py-3 bg-white dark:bg-gray-800 rounded-lg text-left hover:shadow transition-shadow"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                Add School
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Onboard new school
              </p>
            </button>
            <button
              onClick={() => router.push("/admin/academies/new")}
              className="px-4 py-3 bg-white dark:bg-gray-800 rounded-lg text-left hover:shadow transition-shadow"
            >
              <p className="font-medium text-gray-900 dark:text-white">
                Add Academy
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Onboard new academy
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PlatformAdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <PlatformAdminDashboardContent />
    </ProtectedRoute>
  );
}

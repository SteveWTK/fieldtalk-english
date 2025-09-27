"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, BookOpen, TrendingUp, Calendar, ChevronRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { getClassesByTeacher } from "@/lib/supabase/schools-queries";

function TeacherDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    activeClasses: 0,
  });

  useEffect(() => {
    if (user?.id) {
      loadClasses();
    }
  }, [user]);

  async function loadClasses() {
    try {
      setLoading(true);
      const classesData = await getClassesByTeacher(user.id);
      setClasses(classesData);

      const totalStudents = classesData.reduce((sum, cls) => {
        return sum + (cls.students?.length || 0);
      }, 0);

      const activeClasses = classesData.filter(cls => cls.is_active).length;

      setStats({
        totalClasses: classesData.length,
        totalStudents: totalStudents,
        activeClasses: activeClasses,
      });
    } catch (error) {
      console.error("Error loading classes:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Teacher Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back, {user?.user_metadata?.full_name || user?.email}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalClasses}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalStudents}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Users className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Classes</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.activeClasses}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">My Classes</h2>
          </div>

          {classes.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-2">No classes yet</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Contact your school administrator to be assigned to classes.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {classes.map((cls) => (
                <button
                  key={cls.id}
                  onClick={() => router.push(`/teacher/class/${cls.id}`)}
                  className="w-full p-6 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {cls.name}
                      </h3>
                      {cls.is_active ? (
                        <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 rounded">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        <span>{cls.students?.length || 0} students</span>
                      </div>
                      {cls.school && (
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          <span>{cls.school.name}</span>
                        </div>
                      )}
                      {cls.level && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded text-xs">
                          {cls.level}
                        </span>
                      )}
                    </div>
                    {cls.schedule && (
                      <div className="flex items-center gap-1 mt-2 text-sm text-gray-500 dark:text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{cls.schedule}</span>
                      </div>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TeacherDashboard() {
  return (
    <ProtectedRoute allowedRoles={["teacher", "platform_admin"]}>
      <TeacherDashboardContent />
    </ProtectedRoute>
  );
}
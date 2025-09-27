/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  School,
  ChevronRight,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  getSchoolById,
  getClassesBySchool,
  getStudentsBySchool,
} from "@/lib/supabase/schools-queries";

function SchoolAdminDashboardContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [school, setSchool] = useState(null);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (user) {
      loadSchoolData();
    }
  }, [user]);

  async function loadSchoolData() {
    try {
      setLoading(true);

      if (!user.school_id) {
        console.warn("User does not have a school_id assigned");
        setLoading(false);
        return;
      }

      const [schoolData, classesData, studentsData] = await Promise.all([
        getSchoolById(user.school_id),
        getClassesBySchool(user.school_id),
        getStudentsBySchool(user.school_id),
      ]);

      setSchool(schoolData);
      setClasses(classesData);
      setStudents(studentsData);
    } catch (error) {
      console.error("Error loading school data:", error);
    } finally {
      setLoading(false);
    }
  }

  const stats = {
    totalClasses: classes.length,
    activeClasses: classes.filter((c) => c.is_active).length,
    totalStudents: students.length,
    totalTeachers: new Set(classes.map((c) => c.teacher_id).filter(Boolean))
      .size,
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

  if (!user?.school_id) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <School className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No School Assigned
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your account is not currently associated with a school. Please contact FieldTalk support to get assigned to your school.
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
            <School className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {school?.name || "School Dashboard"}
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            School Administration Portal
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Classes
                </p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Total Students
                </p>
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
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Teachers
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.totalTeachers}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <GraduationCap className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                  Active Classes
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats.activeClasses}
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
            <button
              onClick={() => setActiveTab("overview")}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === "overview"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("classes")}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === "classes"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Classes
            </button>
            <button
              onClick={() => setActiveTab("students")}
              className={`px-4 py-2 border-b-2 font-medium transition-colors ${
                activeTab === "students"
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              }`}
            >
              Students
            </button>
          </nav>
        </div>

        {activeTab === "overview" && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                School Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    School Name
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {school?.name || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Location
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {school?.city && school?.country
                      ? `${school.city}, ${school.country}`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Contact Email
                  </p>
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    {school?.contact_email || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Status
                  </p>
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      school?.is_active
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                    }`}
                  >
                    {school?.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Recent Activity
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Activity tracking coming soon...
              </p>
            </div>
          </div>
        )}

        {activeTab === "classes" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                All Classes
              </h2>
            </div>

            {classes.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  No classes yet
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Classes will appear here once they are created.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
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
                            <GraduationCap className="w-4 h-4" />
                            <span>
                              {cls.teacher?.full_name || "No teacher assigned"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            <span>{cls.students?.length || 0} students</span>
                          </div>
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
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "students" && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                All Students
              </h2>
            </div>

            {students.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No students enrolled yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {students.map((student, index) => (
                  <div
                    key={student.id}
                    className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {student.full_name}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {student.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Class
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {student.class?.name || "Not assigned"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            XP
                          </p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {student.total_xp || 0}
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

export default function SchoolAdminDashboard() {
  return (
    <ProtectedRoute allowedRoles={["school_admin", "platform_admin"]}>
      <SchoolAdminDashboardContent />
    </ProtectedRoute>
  );
}

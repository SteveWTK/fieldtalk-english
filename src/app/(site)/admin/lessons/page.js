/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Edit,
  Copy,
  Trash2,
  Eye,
  BookOpen,
  Filter,
  Download,
} from "lucide-react";
import {
  getAllLessonsForCMS,
  deleteLesson,
  cloneLesson,
  getAllPillarsForCMS,
} from "@/lib/supabase/lesson-queries";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";

function LessonsListContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPillar, setFilterPillar] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [lessonsData, pillarsData] = await Promise.all([
        getAllLessonsForCMS(),
        getAllPillarsForCMS(),
      ]);
      setLessons(lessonsData);
      setPillars(pillarsData);
    } catch (error) {
      console.error("Error loading data:", error);
      alert("Failed to load lessons. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(lessonId) {
    if (
      !confirm(
        "Are you sure you want to delete this lesson? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      await deleteLesson(lessonId);
      setLessons(lessons.filter((l) => l.id !== lessonId));
      alert("Lesson deleted successfully!");
    } catch (error) {
      console.error("Error deleting lesson:", error);
      alert("Failed to delete lesson. Please try again.");
    }
  }

  async function handleClone(lessonId) {
    try {
      const clonedLesson = await cloneLesson(lessonId);
      setLessons([clonedLesson, ...lessons]);
      alert("Lesson cloned successfully!");
    } catch (error) {
      console.error("Error cloning lesson:", error);
      alert("Failed to clone lesson. Please try again.");
    }
  }

  const filteredLessons = lessons.filter((lesson) => {
    const matchesSearch =
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPillar =
      filterPillar === "all" || lesson.pillar_id === parseInt(filterPillar);
    const matchesStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && lesson.is_active) ||
      (filterStatus === "inactive" && !lesson.is_active);
    return matchesSearch && matchesPillar && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Loading lessons...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Lesson Management
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Create and manage lesson content for FieldTalk
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/lessons/new")}
            className="bg-accent-600 hover:bg-accent-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create New Lesson
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search lessons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={filterPillar}
              onChange={(e) => setFilterPillar(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            >
              <option value="all">All Pillars</option>
              {pillars.map((pillar) => (
                <option key={pillar.id} value={pillar.id}>
                  {pillar.name}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-accent-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredLessons.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                No lessons found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || filterPillar !== "all" || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first lesson"}
              </p>
              {!searchTerm &&
                filterPillar === "all" &&
                filterStatus === "all" && (
                  <button
                    onClick={() => router.push("/admin/lessons/new")}
                    className="bg-accent-600 hover:bg-accent-700 text-white px-6 py-2 rounded-lg inline-flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Lesson
                  </button>
                )}
            </div>
          ) : (
            filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {lesson.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          lesson.is_active
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {lesson.is_active ? "Active" : "Inactive"}
                      </span>
                      {lesson.pillar && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {lesson.pillar.name}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {lesson.description || "No description"}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>Difficulty: {lesson.difficulty || "Not set"}</span>
                      <span>•</span>
                      <span>XP: {lesson.xp_reward || 0}</span>
                      <span>•</span>
                      <span>Steps: {lesson.content?.steps?.length || 0}</span>
                      <span>•</span>
                      <span>Order: {lesson.sort_order}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => router.push(`/lesson/${lesson.id}`)}
                      className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/admin/lessons/${lesson.id}/edit`)
                      }
                      className="p-2 text-gray-600 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleClone(lesson.id)}
                      className="p-2 text-gray-600 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 transition-colors"
                      title="Clone"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(lesson.id)}
                      className="p-2 text-gray-600 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredLessons.length > 0 && (
          <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredLessons.length} of {lessons.length} lessons
          </div>
        )}
      </div>
    </div>
  );
}

export default function LessonsList() {
  return (
    <ProtectedRoute>
      <LessonsListContent />
    </ProtectedRoute>
  );
}

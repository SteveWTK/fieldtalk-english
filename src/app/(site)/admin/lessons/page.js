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
  Megaphone,
} from "lucide-react";
import {
  getAllLessonsForCMS,
  deleteLesson,
  cloneLesson,
  getAllPillarsForCMS,
} from "@/lib/supabase/lesson-queries";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Button from "@/components/ui/button";

function LessonsListContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPillar, setFilterPillar] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  // "Notify users about new content" — fires a push to every
  // subscribed player AND lights up the in-app banner. Use after
  // flipping under_construction = false on a batch of lessons.
  const [announcing, setAnnouncing] = useState(false);
  const [announceResult, setAnnounceResult] = useState(null);

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

  async function handleAnnounceNewContent() {
    // Default count is "however many lessons are NOT under construction
    // right now". Admin can override on the prompt. Used only in the
    // notification body, not for any gating logic — the banner reads
    // open-lesson count from the DB independently.
    const openCount = lessons.filter((l) => !l.under_construction).length;
    const raw = window.prompt(
      "How many lessons did you just release?\n" +
        "Used in the push title. Leave blank for the default message.",
      "1"
    );
    if (raw === null) return;
    const count = Number(raw);
    if (
      !confirm(
        `This will send a push notification to every subscribed player and light up the "New content available" banner in the app. Continue?`
      )
    ) {
      return;
    }
    setAnnouncing(true);
    setAnnounceResult(null);
    try {
      const res = await fetch("/api/admin/announce-new-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          count: Number.isFinite(count) && count > 0 ? count : 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setAnnounceResult({ ok: false, message: json.error || "Failed" });
        return;
      }
      setAnnounceResult({
        ok: true,
        message: `Sent to ${json.playersTargeted} player(s) — ${json.sent} delivered, ${json.dead} dead subs cleaned up.`,
      });
    } catch (err) {
      setAnnounceResult({ ok: false, message: err.message });
    } finally {
      setAnnouncing(false);
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
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-400 mx-auto"></div>
          <p className="mt-4 text-primary-300">
            Loading lessons...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-primary-50">
              Lesson Management
            </h1>
            <p className="text-primary-300 mt-2">
              Create and manage lesson content for Global Player
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              Icon={Megaphone}
              loading={announcing}
              onClick={handleAnnounceNewContent}
              title="Send push notification + light up the in-app banner"
            >
              {announcing ? "Sending..." : "Notify of new content"}
            </Button>
            <Button
              variant="primary"
              Icon={Plus}
              onClick={() => router.push("/admin/lessons/new")}
            >
              Create New Lesson
            </Button>
          </div>
        </div>

        {announceResult && (
          <div
            className={`mb-4 px-4 py-3 rounded-control text-sm ${
              announceResult.ok
                ? "bg-accent-400/10 text-accent-400 border border-accent-400/40"
                : "bg-signal-alert/10 text-signal-alert border border-signal-alert/40"
            }`}
          >
            {announceResult.message}
          </div>
        )}

        <div className="bg-primary-panel border border-primary-700 rounded-card p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-primary-500" />
                <input
                  type="text"
                  placeholder="Search lessons..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-primary-600 rounded-control bg-primary-900 text-primary-100 placeholder-primary-500 focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400"
                />
              </div>
            </div>
            <select
              value={filterPillar}
              onChange={(e) => setFilterPillar(e.target.value)}
              className="px-4 py-2 border border-primary-600 rounded-control bg-primary-900 text-primary-100 focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400"
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
              className="px-4 py-2 border border-primary-600 rounded-control bg-primary-900 text-primary-100 focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {filteredLessons.length === 0 ? (
            <div className="bg-primary-panel border border-primary-700 rounded-card p-12 text-center">
              <BookOpen className="w-16 h-16 text-primary-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-primary-50 mb-2">
                No lessons found
              </h3>
              <p className="text-primary-300 mb-4">
                {searchTerm || filterPillar !== "all" || filterStatus !== "all"
                  ? "Try adjusting your filters"
                  : "Get started by creating your first lesson"}
              </p>
              {!searchTerm &&
                filterPillar === "all" &&
                filterStatus === "all" && (
                  <Button
                    variant="primary"
                    Icon={Plus}
                    onClick={() => router.push("/admin/lessons/new")}
                  >
                    Create First Lesson
                  </Button>
                )}
            </div>
          ) : (
            filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="bg-primary-panel border border-primary-700 rounded-card p-6 transition-colors hover:border-primary-600"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-primary-50">
                        {lesson.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          lesson.is_active
                            ? "bg-accent-400/15 text-accent-400"
                            : "bg-primary-800 text-primary-300"
                        }`}
                      >
                        {lesson.is_active ? "Active" : "Inactive"}
                      </span>
                      {lesson.pillar && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-signal-english/15 text-signal-english">
                          {lesson.pillar.name}
                        </span>
                      )}
                    </div>
                    <p className="text-primary-300 mb-3">
                      {lesson.description || "No description"}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-primary-400">
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
                      className="p-2 text-primary-300 hover:text-signal-english transition-colors"
                      title="Preview"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        router.push(`/admin/lessons/${lesson.id}/edit`)
                      }
                      className="p-2 text-primary-300 hover:text-signal-english transition-colors"
                      title="Edit"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleClone(lesson.id)}
                      className="p-2 text-primary-300 hover:text-accent-400 transition-colors"
                      title="Clone"
                    >
                      <Copy className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(lesson.id)}
                      className="p-2 text-primary-300 hover:text-signal-alert transition-colors"
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
          <div className="mt-6 text-center text-sm text-primary-300">
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

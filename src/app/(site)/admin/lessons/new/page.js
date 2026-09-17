/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import {
  createLesson,
  getAllPillarsForCMS,
} from "@/lib/supabase/lesson-queries";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";

function NewLessonContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [pillars, setPillars] = useState([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    description_pt: "",
    pillar_id: "",
    difficulty: "Beginner",
    xp_reward: 100,
    sort_order: 0,
    target_audience: "players",
    is_active: false,
    content: {
      type: "multi_step",
      steps: [],
    },
  });

  useEffect(() => {
    loadPillars();
  }, []);

  async function loadPillars() {
    try {
      const pillarsData = await getAllPillarsForCMS();
      setPillars(pillarsData);
    } catch (error) {
      console.error("Error loading pillars:", error);
    }
  }

  function updateField(field, value) {
    setFormData({ ...formData, [field]: value });
  }

  async function handleCreate() {
    if (!formData.title) {
      alert("Please enter a lesson title");
      return;
    }

    if (!formData.pillar_id) {
      alert("Please select a pillar");
      return;
    }

    try {
      setSaving(true);
      const newLesson = await createLesson(formData);
      alert("Lesson created successfully!");
      router.push(`/admin/lessons/${newLesson.id}/edit`);
    } catch (error) {
      console.error("Error creating lesson:", error);
      alert("Failed to create lesson. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-primary-900">
      <div className="sticky top-0 z-10 bg-primary-panel border-b border-primary-700 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/lessons")}
              className="p-2 hover:bg-primary-800 rounded-control text-primary-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-primary-50">
                Create New Lesson
              </h1>
              <p className="text-sm text-primary-300">
                Set up basic information, then add steps
              </p>
            </div>
          </div>
          <Button
            variant="primary"
            Icon={Save}
            loading={saving}
            onClick={handleCreate}
          >
            {saving ? "Creating..." : "Create Lesson"}
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
          <div className="space-y-6">
            <Input
              label="Lesson Title *"
              type="text"
              value={formData.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="e.g., Welcome to the Academy"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Pillar *"
                value={formData.pillar_id}
                onChange={(e) => updateField("pillar_id", e.target.value)}
              >
                <option value="">Select a pillar</option>
                {pillars.map((pillar) => (
                  <option key={pillar.id} value={pillar.id}>
                    {pillar.name}
                  </option>
                ))}
              </Select>

              <Select
                label="Difficulty"
                value={formData.difficulty}
                onChange={(e) => updateField("difficulty", e.target.value)}
              >
                <option value="Survival Absolute">Survival Absolute</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </Select>

              <Select
                label="Target Audience"
                hint="Who should see this lesson?"
                value={formData.target_audience}
                onChange={(e) => updateField("target_audience", e.target.value)}
              >
                <option value="players">Players (Academies/Clubs)</option>
                <option value="schools">Schools (Students)</option>
                <option value="both">Both</option>
              </Select>
            </div>

            <Input
              label="Description (English)"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Brief description of what students will learn"
            />

            <Input
              label="Description (Portuguese)"
              multiline
              rows={3}
              value={formData.description_pt}
              onChange={(e) => updateField("description_pt", e.target.value)}
              placeholder="Descrição breve do que os alunos aprenderão"
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="XP Reward"
                type="number"
                value={formData.xp_reward}
                onChange={(e) =>
                  updateField("xp_reward", parseInt(e.target.value) || 0)
                }
              />

              <Input
                label="Sort Order"
                type="number"
                hint="Lower numbers appear first"
                value={formData.sort_order}
                onChange={(e) =>
                  updateField("sort_order", parseInt(e.target.value) || 0)
                }
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => updateField("is_active", e.target.checked)}
                  className="w-4 h-4 text-accent-400 border-primary-600 rounded focus:ring-accent-400/30"
                />
                <label className="ml-2 text-sm font-medium text-primary-100">
                  Make lesson active (visible to students)
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.under_construction || false}
                  onChange={(e) =>
                    updateField("under_construction", e.target.checked)
                  }
                  className="w-4 h-4 text-accent-400 border-primary-600 rounded focus:ring-accent-400/30"
                />
                <label className="ml-2 text-sm font-medium text-primary-100">
                  Under Construction (shows as unclickable)
                </label>
              </div>
            </div>

            <div className="border-t border-primary-700 pt-6">
              <div className="bg-signal-english/10 border border-signal-english/40 rounded-control p-4">
                <p className="text-sm text-signal-english">
                  <strong>Next Step:</strong> After creating the lesson,
                  you&apos;ll be able to add steps (scenarios, vocabulary,
                  exercises, etc.) in the lesson editor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewLesson() {
  return (
    <ProtectedRoute>
      <NewLessonContent />
    </ProtectedRoute>
  );
}

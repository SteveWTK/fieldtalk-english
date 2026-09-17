/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Save,
  X,
  Plus,
  GripVertical,
  Trash2,
  Eye,
  Code,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  getLessonByIdForCMS,
  updateLesson,
  getAllPillarsForCMS,
} from "@/lib/supabase/lesson-queries";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";

import ScenarioStepForm from "@/components/admin/step-forms/ScenarioStepForm";
import VocabularyStepForm from "@/components/admin/step-forms/VocabularyStepForm";
import AISpeechPracticeStepForm from "@/components/admin/step-forms/AISpeechPracticeStepForm";
import AIGapFillStepForm from "@/components/admin/step-forms/AIGapFillStepForm";
import AIWritingStepForm from "@/components/admin/step-forms/AIWritingStepForm";
import MemoryMatchStepForm from "@/components/admin/step-forms/MemoryMatchStepForm";
import CompletionStepForm from "@/components/admin/step-forms/CompletionStepForm";
import ConversationVoteStepForm from "@/components/admin/step-forms/ConversationVoteStepForm";
import AudioComprehensionStepForm from "@/components/admin/step-forms/AudioComprehensionStepForm";
import DragDropFormationStepForm from "@/components/admin/step-forms/DragDropFormationStepForm";
import InteractivePitchFormationStepForm from "@/components/admin/step-forms/InteractivePitchFormationStepForm";
import InteractiveGameFormationStepForm from "@/components/admin/step-forms/InteractiveGameFormationStepForm";
import TimelineDragStepForm from "@/components/admin/step-forms/TimelineDragStepForm";
import DragDropVocabularyStepForm from "@/components/admin/step-forms/DragDropVocabularyStepForm";
import DragDropGroupsStepForm from "@/components/admin/step-forms/DragDropGroupsStepForm";
import JSONStepForm from "@/components/admin/step-forms/JSONStepForm";

function LessonEditorContent() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const lessonId = params.id;

  const [lesson, setLesson] = useState(null);
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [expandedStep, setExpandedStep] = useState(null);
  const [draggedIndex, setDraggedIndex] = useState(null);

  const STEP_TYPES = [
    { value: "scenario", label: "Scenario" },
    { value: "vocabulary", label: "Vocabulary" },
    { value: "ai_speech_practice", label: "AI Speech Practice" },
    { value: "ai_gap_fill", label: "AI Gap Fill" },
    { value: "ai_writing", label: "AI Writing" },
    { value: "interactive_pitch", label: "Interactive Pitch" },
    { value: "interactive_game", label: "Interactive Game" },
    { value: "memory_match", label: "Memory Match" },
    { value: "ai_conversation", label: "AI Conversation" },
    { value: "ai_listening_challenge", label: "AI Listening Challenge" },
    { value: "audio_comprehension", label: "Audio Comprehension" },
    { value: "drag_drop_formation", label: "Drag & Drop Formation" },
    {
      value: "interactive_pitch_formation",
      label: "Interactive Pitch (Formation)",
    },
    {
      value: "interactive_game_formation",
      label: "Interactive Game (Formation)",
    },
    { value: "timeline_drag", label: "Timeline Drag" },
    { value: "drag_drop_vocab", label: "Drag & Drop Vocabulary" },
    { value: "drag_drop_groups", label: "Drag & Drop Groups" },
    { value: "conversation_vote", label: "Conversation Vote" },
    { value: "completion", label: "Completion" },
  ];

  useEffect(() => {
    loadLesson();
  }, [lessonId]);

  async function loadLesson() {
    try {
      setLoading(true);
      const [lessonData, pillarsData] = await Promise.all([
        getLessonByIdForCMS(lessonId),
        getAllPillarsForCMS(),
      ]);
      setLesson(lessonData);
      setPillars(pillarsData);
      setJsonText(JSON.stringify(lessonData.content, null, 2));
    } catch (error) {
      console.error("Error loading lesson:", error);
      alert("Failed to load lesson. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    try {
      setSaving(true);

      let contentToSave = lesson.content;
      if (jsonMode) {
        try {
          contentToSave = JSON.parse(jsonText);
        } catch (err) {
          alert("Invalid JSON. Please fix the errors before saving.");
          return;
        }
      }

      await updateLesson(lessonId, {
        ...lesson,
        content: contentToSave,
      });

      alert("Lesson saved successfully!");
      router.push("/admin/lessons");
    } catch (error) {
      console.error("Error saving lesson:", error);
      alert("Failed to save lesson. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function updateLessonField(field, value) {
    setLesson({ ...lesson, [field]: value });
  }

  function addStep(type) {
    const newStep = {
      id: `step-${Date.now()}`,
      type: type,
      title: "",
    };
    const steps = [...(lesson.content?.steps || []), newStep];
    updateLessonField("content", { ...lesson.content, steps });
    setExpandedStep(steps.length - 1);
  }

  function updateStep(index, updatedStep) {
    const steps = [...(lesson.content?.steps || [])];
    steps[index] = updatedStep;
    updateLessonField("content", { ...lesson.content, steps });
  }

  function deleteStep(index) {
    if (!confirm("Are you sure you want to delete this step?")) return;
    const steps = (lesson.content?.steps || []).filter((_, i) => i !== index);
    updateLessonField("content", { ...lesson.content, steps });
    if (expandedStep === index) setExpandedStep(null);
  }

  function moveStep(fromIndex, toIndex) {
    const steps = [...(lesson.content?.steps || [])];
    const [movedStep] = steps.splice(fromIndex, 1);
    steps.splice(toIndex, 0, movedStep);
    updateLessonField("content", { ...lesson.content, steps });
  }

  function handleDragStart(index) {
    setDraggedIndex(index);
  }

  function handleDragOver(e, index) {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    moveStep(draggedIndex, index);
    setDraggedIndex(index);
  }

  function handleDragEnd() {
    setDraggedIndex(null);
  }

  function renderStepForm(step, index) {
    const commonProps = {
      step,
      onChange: (updatedStep) => updateStep(index, updatedStep),
    };

    switch (step.type) {
      case "scenario":
        return <ScenarioStepForm {...commonProps} />;
      case "vocabulary":
        return <VocabularyStepForm {...commonProps} />;
      case "ai_speech_practice":
        return <AISpeechPracticeStepForm {...commonProps} />;
      case "ai_gap_fill":
        return <AIGapFillStepForm {...commonProps} />;
      case "ai_writing":
        return <AIWritingStepForm {...commonProps} />;
      case "memory_match":
        return (
          <MemoryMatchStepForm
            {...commonProps}
            allSteps={lesson.content?.steps || []}
          />
        );
      case "conversation_vote":
        return <ConversationVoteStepForm {...commonProps} />;
      case "audio_comprehension":
        return <AudioComprehensionStepForm {...commonProps} />;
      case "drag_drop_formation":
        return <DragDropFormationStepForm {...commonProps} />;
      case "interactive_pitch_formation":
        return <InteractivePitchFormationStepForm {...commonProps} />;
      case "interactive_game_formation":
        return <InteractiveGameFormationStepForm {...commonProps} />;
      case "timeline_drag":
        return <TimelineDragStepForm {...commonProps} />;
      case "drag_drop_vocab":
        return (
          <DragDropVocabularyStepForm
            {...commonProps}
            allSteps={lesson.content?.steps || []}
          />
        );
      case "drag_drop_groups":
        return <DragDropGroupsStepForm {...commonProps} />;
      case "completion":
        return <CompletionStepForm {...commonProps} />;
      case "interactive_pitch":
      case "interactive_game":
      case "ai_conversation":
      case "ai_listening_challenge":
        return <JSONStepForm {...commonProps} stepType={step.type} />;
      default:
        return <JSONStepForm {...commonProps} stepType={step.type} />;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-400 mx-auto"></div>
          <p className="mt-4 text-primary-300">
            Loading lesson...
          </p>
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-primary-300">Lesson not found</p>
          <button
            onClick={() => router.push("/admin/lessons")}
            className="mt-4 text-accent-400 hover:text-accent-300"
          >
            Back to Lessons
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900">
      <div className="sticky top-0 z-10 bg-primary-panel border-b border-primary-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/lessons")}
              className="p-2 hover:bg-primary-800 rounded-control text-primary-100"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-primary-50">
                Edit Lesson
              </h1>
              <p className="text-sm text-primary-300">
                {lesson.title || "Untitled Lesson"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              Icon={Code}
              onClick={() => {
                if (jsonMode) {
                  try {
                    const parsed = JSON.parse(jsonText);
                    updateLessonField("content", parsed);
                  } catch (err) {
                    alert(
                      "Invalid JSON. Please fix errors before switching modes."
                    );
                    return;
                  }
                } else {
                  setJsonText(JSON.stringify(lesson.content, null, 2));
                }
                setJsonMode(!jsonMode);
              }}
            >
              {jsonMode ? "Form Mode" : "JSON Mode"}
            </Button>
            <Button
              variant="secondary"
              Icon={Eye}
              onClick={() => router.push(`/lesson/${lessonId}`)}
            >
              Preview
            </Button>
            <Button
              variant="secondary"
              Icon={X}
              onClick={() => router.push("/admin/lessons")}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              Icon={Save}
              loading={saving}
              onClick={handleSave}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {jsonMode ? (
          <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
            <h2 className="text-lg font-semibold text-primary-50 mb-4">
              JSON Editor
            </h2>
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              rows={30}
              className="w-full px-3 py-2 border border-primary-600 rounded-control bg-primary-900 text-primary-100 font-mono text-sm focus:border-accent-400 focus:ring-accent-400/30 outline-none"
              style={{ fontFamily: "monospace" }}
            />
          </div>
        ) : (
          <>
            <div className="bg-primary-panel border border-primary-700 rounded-card p-6 mb-6">
              <h2 className="text-lg font-semibold text-primary-50 mb-4">
                Lesson Settings
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Title"
                  type="text"
                  value={lesson.title || ""}
                  onChange={(e) => updateLessonField("title", e.target.value)}
                />
                <Select
                  label="Pillar"
                  value={lesson.pillar_id || ""}
                  onChange={(e) =>
                    updateLessonField("pillar_id", e.target.value)
                  }
                >
                  <option value="">Select a pillar</option>
                  {pillars.map((pillar) => (
                    <option key={pillar.id} value={pillar.id}>
                      {pillar.name}
                    </option>
                  ))}
                </Select>
                <Input
                  label="Description (English)"
                  multiline
                  rows={3}
                  value={lesson.description || ""}
                  onChange={(e) =>
                    updateLessonField("description", e.target.value)
                  }
                />
                <Input
                  label="Description (Portuguese)"
                  multiline
                  rows={3}
                  value={lesson.description_pt || ""}
                  onChange={(e) =>
                    updateLessonField("description_pt", e.target.value)
                  }
                />
                <Select
                  label="Difficulty"
                  value={lesson.difficulty || ""}
                  onChange={(e) =>
                    updateLessonField("difficulty", e.target.value)
                  }
                >
                  <option value="">Select difficulty</option>
                  <option value="Survival Absolute">Survival Absolute</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </Select>
                <Select
                  label="Target Audience"
                  value={lesson.target_audience || "players"}
                  onChange={(e) => updateLessonField("target_audience", e.target.value)}
                >
                  <option value="players">Players (Academies/Clubs)</option>
                  <option value="schools">Schools (Students)</option>
                  <option value="both">Both</option>
                </Select>
                <Input
                  label="XP Reward"
                  type="number"
                  value={lesson.xp_reward || 0}
                  onChange={(e) =>
                    updateLessonField(
                      "xp_reward",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
                <Input
                  label="Sort Order"
                  type="number"
                  value={lesson.sort_order || 0}
                  onChange={(e) =>
                    updateLessonField(
                      "sort_order",
                      parseInt(e.target.value) || 0
                    )
                  }
                />
                <div className="space-y-3">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={lesson.is_active || false}
                      onChange={(e) =>
                        updateLessonField("is_active", e.target.checked)
                      }
                      className="w-4 h-4 text-accent-400 border-primary-600 rounded focus:ring-accent-400/30"
                    />
                    <label className="ml-2 text-sm font-medium text-primary-100">
                      Active (visible to students)
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={lesson.under_construction || false}
                      onChange={(e) =>
                        updateLessonField(
                          "under_construction",
                          e.target.checked
                        )
                      }
                      className="w-4 h-4 text-accent-400 border-primary-600 rounded focus:ring-accent-400/30"
                    />
                    <label className="ml-2 text-sm font-medium text-primary-100">
                      Under Construction (shows as unclickable)
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-primary-panel border border-primary-700 rounded-card p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-semibold text-primary-50">
                  Lesson Steps ({(lesson.content?.steps || []).length})
                </h2>
                <div className="relative">
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addStep(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="px-4 py-2 bg-primary-800 hover:bg-primary-700 border border-primary-600 text-primary-100 rounded-control appearance-none pr-10 cursor-pointer focus:border-accent-400 focus:ring-accent-400/30 outline-none"
                  >
                    <option value="">+ Add Step</option>
                    {STEP_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  <Plus className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary-300 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-4">
                {(lesson.content?.steps || []).map((step, index) => (
                  <div
                    key={step.id || index}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`border border-primary-700 rounded-control ${
                      draggedIndex === index ? "opacity-50" : ""
                    }`}
                  >
                    <div
                      className="flex items-center justify-between p-4 bg-primary-800 rounded-t-lg cursor-pointer"
                      onClick={() =>
                        setExpandedStep(expandedStep === index ? null : index)
                      }
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="w-5 h-5 text-primary-500 cursor-move" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-primary-400">
                              Step {index + 1}
                            </span>
                            <span className="px-2 py-1 text-xs font-medium rounded bg-signal-english/15 text-signal-english">
                              {STEP_TYPES.find((t) => t.value === step.type)
                                ?.label || step.type}
                            </span>
                          </div>
                          <p className="text-sm text-primary-50 mt-1">
                            {step.title || "Untitled Step"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteStep(index);
                          }}
                          className="p-2 text-signal-alert hover:text-signal-alert/80"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        {expandedStep === index ? (
                          <ChevronUp className="w-5 h-5 text-primary-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-primary-400" />
                        )}
                      </div>
                    </div>
                    {expandedStep === index && (
                      <div className="p-4 border-t border-primary-700">
                        {renderStepForm(step, index)}
                      </div>
                    )}
                  </div>
                ))}

                {(lesson.content?.steps || []).length === 0 && (
                  <div className="text-center py-12 text-primary-400">
                    <p>
                      No steps yet. Click &quot;+ Add Step&quot; to create your
                      first step.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function LessonEditor() {
  return (
    <ProtectedRoute>
      <LessonEditorContent />
    </ProtectedRoute>
  );
}

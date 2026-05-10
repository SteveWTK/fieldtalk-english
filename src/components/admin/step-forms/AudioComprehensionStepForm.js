"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function AudioComprehensionStepForm({ step, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const updateAudioConfig = (field, value) => {
    onChange({
      ...step,
      audio_config: { ...(step.audio_config || {}), [field]: value },
    });
  };

  const addQuestion = () => {
    const newQuestion = {
      id: `q${Date.now()}`,
      type: "multiple_choice",
      text: "",
      options: ["", "", "", ""],
      correct_answer: "",
    };
    updateField("questions", [...(step.questions || []), newQuestion]);
  };

  const updateQuestion = (index, field, value) => {
    const updated = [...(step.questions || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateField("questions", updated);
  };

  const updateQuestionOption = (qIndex, oIndex, value) => {
    const updated = [...(step.questions || [])];
    const options = [...(updated[qIndex].options || [])];
    options[oIndex] = value;
    updated[qIndex] = { ...updated[qIndex], options };
    updateField("questions", updated);
  };

  const addQuestionOption = (qIndex) => {
    const updated = [...(step.questions || [])];
    const options = [...(updated[qIndex].options || []), ""];
    updated[qIndex] = { ...updated[qIndex], options };
    updateField("questions", updated);
  };

  const removeQuestionOption = (qIndex, oIndex) => {
    const updated = [...(step.questions || [])];
    const options = (updated[qIndex].options || []).filter(
      (_, i) => i !== oIndex
    );
    updated[qIndex] = { ...updated[qIndex], options };
    updateField("questions", updated);
  };

  const removeQuestion = (index) => {
    const updated = (step.questions || []).filter((_, i) => i !== index);
    updateField("questions", updated);
  };

  const audioConfig = step.audio_config || {};
  const inputClass =
    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white";

  return (
    <div className="space-y-4">
      {/* Title & content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Title
        </label>
        <input
          type="text"
          value={step.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          className={inputClass}
          placeholder="e.g. Listen to the commentator"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Instructional content
        </label>
        <textarea
          value={step.content || ""}
          onChange={(e) => updateField("content", e.target.value)}
          rows={2}
          className={inputClass}
          placeholder="Listen to the clip and answer the questions..."
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content (Portuguese, optional)
        </label>
        <textarea
          value={step.content_pt || ""}
          onChange={(e) => updateField("content_pt", e.target.value)}
          rows={2}
          className={inputClass}
        />
      </div>

      {/* Audio Configuration */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Audio Configuration
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Audio URL *
            </label>
            <input
              type="text"
              value={audioConfig.audio_url || ""}
              onChange={(e) => updateAudioConfig("audio_url", e.target.value)}
              placeholder="/audio/comprehension/eng-bra-goal.mp3"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Duration (seconds)
            </label>
            <input
              type="number"
              value={audioConfig.duration_seconds || ""}
              onChange={(e) =>
                updateAudioConfig(
                  "duration_seconds",
                  parseInt(e.target.value) || 0
                )
              }
              placeholder="28"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Max replays for full XP
            </label>
            <input
              type="number"
              value={audioConfig.max_replays_for_full_xp || 3}
              onChange={(e) =>
                updateAudioConfig(
                  "max_replays_for_full_xp",
                  parseInt(e.target.value) || 3
                )
              }
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Transcript
            </label>
            <textarea
              value={audioConfig.transcript || ""}
              onChange={(e) => updateAudioConfig("transcript", e.target.value)}
              rows={3}
              placeholder="Full text of what is said in the audio..."
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Transcript reveal mode
            </label>
            <select
              value={audioConfig.transcript_reveal || "after_completion"}
              onChange={(e) =>
                updateAudioConfig("transcript_reveal", e.target.value)
              }
              className={inputClass}
            >
              <option value="always">Always visible</option>
              <option value="on_request">On request (toggle button)</option>
              <option value="after_first_attempt">
                After first answer attempt
              </option>
              <option value="after_completion">
                After all questions answered
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Comprehension Questions
          </h4>
          <button
            type="button"
            onClick={addQuestion}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Question
          </button>
        </div>

        <div className="space-y-4">
          {(step.questions || []).map((question, qIndex) => (
            <div
              key={qIndex}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-medium text-gray-900 dark:text-white">
                  Question {qIndex + 1}
                </h5>
                <button
                  type="button"
                  onClick={() => removeQuestion(qIndex)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Type
                  </label>
                  <select
                    value={question.type || "multiple_choice"}
                    onChange={(e) =>
                      updateQuestion(qIndex, "type", e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="gap_fill">
                      Gap Fill (use ___ for the blank)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Question text
                    {question.type === "gap_fill" && (
                      <span className="text-xs text-amber-600 ml-2">
                        (Use ___ to mark the gap)
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={question.text || ""}
                    onChange={(e) =>
                      updateQuestion(qIndex, "text", e.target.value)
                    }
                    placeholder={
                      question.type === "gap_fill"
                        ? "And it's in the back of the ___!"
                        : "Who scored the goal?"
                    }
                    className={inputClass}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm text-gray-600 dark:text-gray-400">
                      Options
                    </label>
                    <button
                      type="button"
                      onClick={() => addQuestionOption(qIndex)}
                      className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded"
                    >
                      + Add option
                    </button>
                  </div>
                  <div className="space-y-2">
                    {(question.options || []).map((option, oIndex) => (
                      <div key={oIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) =>
                            updateQuestionOption(qIndex, oIndex, e.target.value)
                          }
                          placeholder={`Option ${oIndex + 1}`}
                          className={`${inputClass} flex-1`}
                        />
                        <button
                          type="button"
                          onClick={() => removeQuestionOption(qIndex, oIndex)}
                          className="px-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Correct answer (must match one option exactly)
                  </label>
                  <select
                    value={question.correct_answer || ""}
                    onChange={(e) =>
                      updateQuestion(qIndex, "correct_answer", e.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select correct option...</option>
                    {(question.options || []).map((option, oIndex) => (
                      <option key={oIndex} value={option}>
                        {option || `(empty option ${oIndex + 1})`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}

          {(step.questions || []).length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No questions yet. Click &quot;Add Question&quot; to start.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

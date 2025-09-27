"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function ConversationVoteStepForm({ step, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const addTopic = () => {
    const newTopic = {
      id: `topic-${Date.now()}`,
      title: "",
      description: ""
    };
    updateField("topics", [...(step.topics || []), newTopic]);
  };

  const updateTopic = (index, field, value) => {
    const updated = [...(step.topics || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateField("topics", updated);
  };

  const removeTopic = (index) => {
    const updated = (step.topics || []).filter((_, i) => i !== index);
    updateField("topics", updated);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Title
        </label>
        <input
          type="text"
          value={step.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          placeholder="e.g., Choose Next Conversation Topic"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content
        </label>
        <textarea
          value={step.content || ""}
          onChange={(e) => updateField("content", e.target.value)}
          rows={2}
          placeholder="Instructions for students"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Vote Deadline
        </label>
        <input
          type="datetime-local"
          value={step.vote_deadline ? new Date(step.vote_deadline).toISOString().slice(0, 16) : ""}
          onChange={(e) => updateField("vote_deadline", e.target.value ? new Date(e.target.value).toISOString() : "")}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Students can vote until this date/time
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Target Group (Class ID)
        </label>
        <input
          type="text"
          value={step.target_group || ""}
          onChange={(e) => updateField("target_group", e.target.value)}
          placeholder="Leave empty to use student's class automatically"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Optional: Specify a class ID, or leave blank to auto-detect from student
        </p>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Conversation Topics (Students will choose one)
          </h4>
          <button
            type="button"
            onClick={addTopic}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Topic
          </button>
        </div>

        <div className="space-y-4">
          {(step.topics || []).map((topic, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-medium text-gray-900 dark:text-white">
                  Topic {index + 1}
                </h5>
                <button
                  type="button"
                  onClick={() => removeTopic(index)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={topic.title || ""}
                  onChange={(e) => updateTopic(index, "title", e.target.value)}
                  placeholder="Topic title (e.g., Football Legends)"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <textarea
                  value={topic.description || ""}
                  onChange={(e) => updateTopic(index, "description", e.target.value)}
                  placeholder="Brief description of the topic"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          ))}
        </div>

        {(step.topics || []).length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p className="text-sm">No topics yet. Add at least 2-3 topics for students to vote on.</p>
          </div>
        )}

        {(step.topics || []).length > 0 && (
          <button
            type="button"
            onClick={addTopic}
            className="w-full mt-4 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Another Topic
          </button>
        )}
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>How it works:</strong> Students will see this voting step in their lesson.
          They can vote once before the deadline. After the deadline, results are shown automatically.
        </p>
      </div>
    </div>
  );
}
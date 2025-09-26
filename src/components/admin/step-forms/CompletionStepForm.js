"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function CompletionStepForm({ step, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const addAchievement = () => {
    updateField("achievements", [...(step.achievements || []), ""]);
  };

  const updateAchievement = (index, value) => {
    const updated = [...(step.achievements || [])];
    updated[index] = value;
    updateField("achievements", updated);
  };

  const removeAchievement = (index) => {
    const updated = (step.achievements || []).filter((_, i) => i !== index);
    updateField("achievements", updated);
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
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          XP Reward
        </label>
        <input
          type="number"
          value={step.xp_reward || 150}
          onChange={(e) => updateField("xp_reward", parseInt(e.target.value))}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Badge Unlocked
        </label>
        <input
          type="text"
          value={step.badge_unlocked || ""}
          onChange={(e) => updateField("badge_unlocked", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Next Lesson Preview
        </label>
        <textarea
          value={step.next_lesson_preview || ""}
          onChange={(e) => updateField("next_lesson_preview", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={step.translation_available || false}
          onChange={(e) => updateField("translation_available", e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Translation Available
        </label>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Achievements</h4>
          <button
            type="button"
            onClick={addAchievement}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Achievement
          </button>
        </div>

        <div className="space-y-2">
          {(step.achievements || []).map((achievement, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={achievement}
                onChange={(e) => updateAchievement(index, e.target.value)}
                placeholder="Achievement text"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => removeAchievement(index)}
                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
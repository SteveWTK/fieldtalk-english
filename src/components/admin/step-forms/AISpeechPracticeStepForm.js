"use client";

import React from "react";

export default function AISpeechPracticeStepForm({ step, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const updateInstructions = (lang, value) => {
    const instructions = step.instructions || {};
    updateField("instructions", { ...instructions, [lang]: value });
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
          Prompt
        </label>
        <textarea
          value={step.prompt || ""}
          onChange={(e) => updateField("prompt", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Instructions for the student"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Context
        </label>
        <input
          type="text"
          value={step.context || ""}
          onChange={(e) => updateField("context", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Speaking context"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Expected Text (Example)
        </label>
        <textarea
          value={step.expectedText || ""}
          onChange={(e) => updateField("expectedText", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Example text for students to follow"
        />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">Instructions (Bilingual)</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              English Instructions
            </label>
            <textarea
              value={step.instructions?.en || ""}
              onChange={(e) => updateInstructions("en", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Portuguese Instructions
            </label>
            <textarea
              value={step.instructions?.pt || ""}
              onChange={(e) => updateInstructions("pt", e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
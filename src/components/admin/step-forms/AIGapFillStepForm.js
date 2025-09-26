"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function AIGapFillStepForm({ step, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const addSentence = () => {
    const newSentence = {
      id: `gap-${Date.now()}`,
      text: "",
      context: "",
      options: ["", "", "", ""],
      hint_context: "",
      correct_answers: [""]
    };
    updateField("sentences", [...(step.sentences || []), newSentence]);
  };

  const updateSentence = (index, field, value) => {
    const updated = [...(step.sentences || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateField("sentences", updated);
  };

  const updateOption = (sentenceIndex, optionIndex, value) => {
    const updated = [...(step.sentences || [])];
    const options = [...(updated[sentenceIndex].options || [])];
    options[optionIndex] = value;
    updated[sentenceIndex] = { ...updated[sentenceIndex], options };
    updateField("sentences", updated);
  };

  const removeSentence = (index) => {
    const updated = (step.sentences || []).filter((_, i) => i !== index);
    updateField("sentences", updated);
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
          rows={2}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-4">
          <h4 className="font-medium text-gray-900 dark:text-white">Gap Fill Sentences</h4>
          <button
            type="button"
            onClick={addSentence}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Sentence
          </button>
        </div>

        <div className="space-y-4">
          {(step.sentences || []).map((sentence, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-medium text-gray-900 dark:text-white">Sentence {index + 1}</h5>
                <button
                  type="button"
                  onClick={() => removeSentence(index)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="text"
                  value={sentence.text || ""}
                  onChange={(e) => updateSentence(index, "text", e.target.value)}
                  placeholder="Sentence with ___ for gaps"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={sentence.context || ""}
                  onChange={(e) => updateSentence(index, "context", e.target.value)}
                  placeholder="Context"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={sentence.hint_context || ""}
                  onChange={(e) => updateSentence(index, "hint_context", e.target.value)}
                  placeholder="Hint context"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Options (4 choices)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(sentence.options || ["", "", "", ""]).map((option, optIndex) => (
                      <input
                        key={optIndex}
                        type="text"
                        value={option}
                        onChange={(e) => updateOption(index, optIndex, e.target.value)}
                        placeholder={`Option ${optIndex + 1}`}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    ))}
                  </div>
                </div>

                <input
                  type="text"
                  value={(sentence.correct_answers || [])[0] || ""}
                  onChange={(e) => updateSentence(index, "correct_answers", [e.target.value])}
                  placeholder="Correct answer"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
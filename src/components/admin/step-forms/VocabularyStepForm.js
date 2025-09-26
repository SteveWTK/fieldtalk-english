"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";
import MediaUploader from "../MediaUploader";

export default function VocabularyStepForm({ step, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const addVocabItem = () => {
    const newItem = {
      english: "",
      example: "",
      audio_url: "",
      usage_tip: "",
      translation: "",
      pronunciation: ""
    };
    updateField("vocabulary", [...(step.vocabulary || []), newItem]);
  };

  const updateVocabItem = (index, field, value) => {
    const updated = [...(step.vocabulary || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateField("vocabulary", updated);
  };

  const removeVocabItem = (index) => {
    const updated = (step.vocabulary || []).filter((_, i) => i !== index);
    updateField("vocabulary", updated);
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
          <h4 className="font-medium text-gray-900 dark:text-white">Vocabulary Items</h4>
          <button
            type="button"
            onClick={addVocabItem}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        <div className="space-y-4">
          {(step.vocabulary || []).map((item, index) => (
            <div key={index} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-medium text-gray-900 dark:text-white">Item {index + 1}</h5>
                <button
                  type="button"
                  onClick={() => removeVocabItem(index)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={item.english || ""}
                  onChange={(e) => updateVocabItem(index, "english", e.target.value)}
                  placeholder="English phrase"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={item.translation || ""}
                  onChange={(e) => updateVocabItem(index, "translation", e.target.value)}
                  placeholder="Portuguese translation"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={item.example || ""}
                  onChange={(e) => updateVocabItem(index, "example", e.target.value)}
                  placeholder="Example sentence"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={item.pronunciation || ""}
                  onChange={(e) => updateVocabItem(index, "pronunciation", e.target.value)}
                  placeholder="Pronunciation (IPA)"
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <input
                  type="text"
                  value={item.usage_tip || ""}
                  onChange={(e) => updateVocabItem(index, "usage_tip", e.target.value)}
                  placeholder="Usage tip"
                  className="col-span-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <div className="col-span-2">
                  <MediaUploader
                    label="Audio URL"
                    value={item.audio_url || ""}
                    onChange={(url) => updateVocabItem(index, "audio_url", url)}
                    accept="audio/*"
                    folder="vocab-audio"
                  />
                </div>
              </div>
            </div>
          ))}

          {(step.vocabulary || []).length > 0 && (
            <button
              type="button"
              onClick={addVocabItem}
              className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Another Item
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
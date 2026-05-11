"use client";

import React from "react";
import { Plus, Trash2, Info } from "lucide-react";

export default function DragDropVocabularyStepForm({ step, onChange, allSteps }) {
  const config = step.vocab_config || {};
  const items = config.items || [];

  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const updateConfig = (field, value) => {
    onChange({
      ...step,
      vocab_config: { ...(step.vocab_config || {}), [field]: value },
    });
  };

  const addItem = () => {
    const newItem = {
      id: `vocab-${Date.now()}`,
      english: "",
      translation: "",
      image_url: "",
    };
    updateConfig("items", [...items, newItem]);
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    updateConfig("items", updated);
  };

  const removeItem = (idx) => {
    updateConfig("items", items.filter((_, i) => i !== idx));
  };

  const importFromVocabularyStep = (sourceStepId) => {
    const vocabStep = allSteps?.find(
      (s) => s.id === sourceStepId && s.type === "vocabulary"
    );
    if (!vocabStep || !vocabStep.vocabulary) {
      alert("No vocabulary found in selected step");
      return;
    }
    const imported = vocabStep.vocabulary.map((item, idx) => ({
      id: `vocab-${Date.now()}-${idx}`,
      english: item.english || item.en || "",
      translation: item.translation || item.pt || "",
      image_url: item.image_url || "",
    }));
    updateConfig("items", imported);
    alert(`Imported ${imported.length} vocabulary items`);
  };

  const vocabularySteps = (allSteps || []).filter(
    (s) => s.type === "vocabulary"
  );

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white";
  const smallInputClass =
    "px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";

  return (
    <div className="space-y-4">
      {/* Title + content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Title
        </label>
        <input
          type="text"
          value={step.title || ""}
          onChange={(e) => updateField("title", e.target.value)}
          className={inputClass}
          placeholder="e.g. Football Position Vocabulary"
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
          placeholder="Drag each English word onto its matching image or translation..."
        />
      </div>

      {/* Display mode + info */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Target display mode
        </label>
        <select
          value={config.display_mode || "auto"}
          onChange={(e) => updateConfig("display_mode", e.target.value)}
          className={inputClass}
        >
          <option value="auto">
            Auto (image if available, else translation)
          </option>
          <option value="image">Image (always — items need image URL)</option>
          <option value="translation">Translation (always)</option>
        </select>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-blue-800 dark:text-blue-300">
            Each item needs a unique <code>id</code>, an{" "}
            <code>english</code> word, and either a <code>translation</code>{" "}
            or <code>image_url</code> (or both). Source and target order are
            both shuffled at runtime.
          </div>
        </div>
      </div>

      {/* Vocabulary items */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Vocabulary Items ({items.length})
          </h4>
          <button
            type="button"
            onClick={addItem}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>

        {vocabularySteps.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Import from a vocabulary step
            </label>
            <select
              onChange={(e) => {
                if (e.target.value) {
                  importFromVocabularyStep(e.target.value);
                  e.target.value = "";
                }
              }}
              className={`${inputClass} text-sm`}
            >
              <option value="">Select a vocabulary step...</option>
              {vocabularySteps.map((vs, idx) => (
                <option key={vs.id} value={vs.id}>
                  {vs.title || `Vocabulary Step ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Item {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeItem(idx)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 mb-2">
                <input
                  type="text"
                  value={item.id || ""}
                  onChange={(e) => updateItem(idx, "id", e.target.value)}
                  placeholder="ID (unique)"
                  className={`${smallInputClass} md:col-span-2`}
                />
                <input
                  type="text"
                  value={item.english || ""}
                  onChange={(e) => updateItem(idx, "english", e.target.value)}
                  placeholder="English word/phrase"
                  className={`${smallInputClass} md:col-span-3`}
                />
                <input
                  type="text"
                  value={item.translation || ""}
                  onChange={(e) =>
                    updateItem(idx, "translation", e.target.value)
                  }
                  placeholder="Translation"
                  className={`${smallInputClass} md:col-span-3`}
                />
                <input
                  type="text"
                  value={item.image_url || ""}
                  onChange={(e) =>
                    updateItem(idx, "image_url", e.target.value)
                  }
                  placeholder="Image URL (optional)"
                  className={`${smallInputClass} md:col-span-4`}
                />
              </div>
              {item.image_url && (
                <div className="flex items-center gap-2 mt-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.english || "preview"}
                    className="w-12 h-12 object-cover rounded border border-gray-300 dark:border-gray-600"
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    🖼️ Will show as image (auto/image mode)
                  </span>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No vocabulary items yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

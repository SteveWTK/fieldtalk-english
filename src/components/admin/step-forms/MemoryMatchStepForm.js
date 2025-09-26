"use client";

import React from "react";
import { Plus, Trash2, Download } from "lucide-react";

export default function MemoryMatchStepForm({ step, onChange, allSteps }) {
  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const addVocabPair = () => {
    const newPair = {
      id: (step.vocabulary || []).length + 1,
      en: "",
      pt: ""
    };
    updateField("vocabulary", [...(step.vocabulary || []), newPair]);
  };

  const updateVocabPair = (index, field, value) => {
    const updated = [...(step.vocabulary || [])];
    updated[index] = { ...updated[index], [field]: value };
    updateField("vocabulary", updated);
  };

  const removeVocabPair = (index) => {
    const updated = (step.vocabulary || []).filter((_, i) => i !== index);
    updateField("vocabulary", updated);
  };

  const importFromVocabularyStep = (sourceStepId) => {
    const vocabStep = allSteps?.find(s => s.id === sourceStepId && s.type === "vocabulary");
    if (!vocabStep || !vocabStep.vocabulary) {
      alert("No vocabulary found in selected step");
      return;
    }

    const importedPairs = vocabStep.vocabulary.map((item, idx) => ({
      id: idx + 1,
      en: item.english || "",
      pt: item.translation || ""
    }));

    updateField("vocabulary", importedPairs);
    alert(`Imported ${importedPairs.length} vocabulary pairs!`);
  };

  const vocabularySteps = (allSteps || []).filter(s => s.type === "vocabulary");

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
          <h4 className="font-medium text-gray-900 dark:text-white">Vocabulary Pairs</h4>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addVocabPair}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Pair
            </button>
          </div>
        </div>

        {vocabularySteps.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Import from Vocabulary Step
            </label>
            <div className="flex gap-2">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    importFromVocabularyStep(e.target.value);
                    e.target.value = "";
                  }
                }}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              >
                <option value="">Select a vocabulary step...</option>
                {vocabularySteps.map((vocabStep, idx) => (
                  <option key={vocabStep.id} value={vocabStep.id}>
                    {vocabStep.title || `Vocabulary Step ${idx + 1}`}
                  </option>
                ))}
              </select>
              <Download className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-2" />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              This will replace all current pairs with vocabulary from the selected step
            </p>
          </div>
        )}

        <div className="space-y-3">
          {(step.vocabulary || []).map((pair, index) => (
            <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <input
                type="text"
                value={pair.en || ""}
                onChange={(e) => updateVocabPair(index, "en", e.target.value)}
                placeholder="English"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <span className="text-gray-500">↔</span>
              <input
                type="text"
                value={pair.pt || ""}
                onChange={(e) => updateVocabPair(index, "pt", e.target.value)}
                placeholder="Portuguese"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="button"
                onClick={() => removeVocabPair(index)}
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
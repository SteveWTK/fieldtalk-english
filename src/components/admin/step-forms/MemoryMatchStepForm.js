"use client";

import React from "react";
import { Plus, Trash2, Download, Info } from "lucide-react";

export default function MemoryMatchStepForm({ step, onChange, allSteps }) {
  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const addVocabPair = () => {
    const newPair = {
      id: (step.vocabulary || []).length + 1,
      en: "",
      pt: "",
      enImage: "",
      ptImage: "",
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

      {/* Mode explanation banner */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <p className="font-semibold mb-1">Visual Memory Match modes:</p>
            <ul className="list-disc ml-4 space-y-1">
              <li>
                <strong>Word ↔ Word:</strong> Leave image URLs blank for traditional vocabulary matching
              </li>
              <li>
                <strong>Word ↔ Image:</strong> Add an image URL to one side to match words with pictures (e.g. &quot;goalkeeper&quot; ↔ goalkeeper photo)
              </li>
              <li>
                <strong>Image ↔ Image:</strong> Add image URLs to both sides for visual matching (e.g. two football flags)
              </li>
            </ul>
          </div>
        </div>
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

        <div className="space-y-4">
          {(step.vocabulary || []).map((pair, index) => (
            <div
              key={index}
              className="p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Pair {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeVocabPair(index)}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* English side */}
                <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                  <label className="block text-sm font-medium text-blue-800 dark:text-blue-300">
                    English Side
                  </label>
                  <input
                    type="text"
                    value={pair.en || ""}
                    onChange={(e) => updateVocabPair(index, "en", e.target.value)}
                    placeholder="English word/phrase"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <input
                    type="text"
                    value={pair.enImage || ""}
                    onChange={(e) => updateVocabPair(index, "enImage", e.target.value)}
                    placeholder="Image URL (optional)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  {pair.enImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pair.enImage}
                      alt="English preview"
                      className="w-20 h-20 object-cover rounded border border-gray-300 dark:border-gray-600"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  )}
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {pair.enImage ? "🖼️ Will show as image" : "📝 Will show as text"}
                  </p>
                </div>

                {/* Portuguese side */}
                <div className="space-y-2 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <label className="block text-sm font-medium text-green-800 dark:text-green-300">
                    Portuguese Side
                  </label>
                  <input
                    type="text"
                    value={pair.pt || ""}
                    onChange={(e) => updateVocabPair(index, "pt", e.target.value)}
                    placeholder="Portuguese word/phrase"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <input
                    type="text"
                    value={pair.ptImage || ""}
                    onChange={(e) => updateVocabPair(index, "ptImage", e.target.value)}
                    placeholder="Image URL (optional)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  {pair.ptImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pair.ptImage}
                      alt="Portuguese preview"
                      className="w-20 h-20 object-cover rounded border border-gray-300 dark:border-gray-600"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  )}
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {pair.ptImage ? "🖼️ Will show as image" : "📝 Will show as text"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
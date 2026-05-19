"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function DragDropGroupsStepForm({ step, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const updateConfig = (field, value) => {
    onChange({
      ...step,
      groups_config: {
        ...(step.groups_config || {}),
        [field]: value,
      },
    });
  };

  const config = step.groups_config || {};
  const containers = config.containers || [];
  const cards = config.cards || [];
  const validation = config.validation === "match_group" ? "match_group" : "free";

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white";
  const smallInputClass =
    "px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";

  // ---- Containers ----
  const addContainer = () => {
    updateConfig("containers", [
      ...containers,
      { id: `c-${Date.now()}`, label: "", slot_count: 1 },
    ]);
  };

  const updateContainer = (idx, field, value) => {
    const next = [...containers];
    next[idx] = { ...next[idx], [field]: value };
    updateConfig("containers", next);
  };

  const removeContainer = (idx) => {
    updateConfig(
      "containers",
      containers.filter((_, i) => i !== idx)
    );
  };

  // ---- Cards ----
  const addCard = () => {
    updateConfig("cards", [
      ...cards,
      { id: `card-${Date.now()}`, label: "", group: "" },
    ]);
  };

  const updateCard = (idx, field, value) => {
    const next = [...cards];
    next[idx] = { ...next[idx], [field]: value };
    updateConfig("cards", next);
  };

  const removeCard = (idx) => {
    updateConfig(
      "cards",
      cards.filter((_, i) => i !== idx)
    );
  };

  // Map a card's group → container label for the unmapped-warning surface.
  const containerIds = new Set(containers.map((c) => c.id));
  const cardsMissingGroup =
    validation === "match_group"
      ? cards.filter((c) => !c.group || !containerIds.has(c.group))
      : [];

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
          placeholder="e.g. Predict the finish — Group A"
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
          placeholder="Drag each team to your predicted finish..."
        />
      </div>

      {/* Validation mode */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateConfig("validation", "free")}
            className={`px-3 py-2 rounded-lg border text-left transition-colors ${
              validation === "free"
                ? "bg-accent-50 dark:bg-accent-900/30 border-accent-400 text-accent-800 dark:text-accent-200"
                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-accent-300"
            }`}
          >
            <div className="font-semibold text-sm">Free placement</div>
            <div className="text-xs opacity-80">
              No correct answer (e.g. predictions). Any card → any container.
            </div>
          </button>
          <button
            type="button"
            onClick={() => updateConfig("validation", "match_group")}
            className={`px-3 py-2 rounded-lg border text-left transition-colors ${
              validation === "match_group"
                ? "bg-accent-50 dark:bg-accent-900/30 border-accent-400 text-accent-800 dark:text-accent-200"
                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-accent-300"
            }`}
          >
            <div className="font-semibold text-sm">Match group</div>
            <div className="text-xs opacity-80">
              Each card&apos;s group must match a container. Wrong placements
              bounce back.
            </div>
          </button>
        </div>
      </div>

      {/* Containers */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Containers ({containers.length})
          </h4>
          <button
            type="button"
            onClick={addContainer}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Container
          </button>
        </div>
        <div className="space-y-3">
          {containers.map((c, idx) => (
            <div
              key={idx}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  {idx + 1}. {c.label || c.id}
                </span>
                <button
                  type="button"
                  onClick={() => removeContainer(idx)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <input
                  type="text"
                  value={c.id || ""}
                  onChange={(e) => updateContainer(idx, "id", e.target.value)}
                  placeholder="ID (A, 1st, etc.)"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={c.label || ""}
                  onChange={(e) =>
                    updateContainer(idx, "label", e.target.value)
                  }
                  placeholder="Label"
                  className={smallInputClass}
                />
                <input
                  type="number"
                  min="1"
                  value={c.slot_count || 1}
                  onChange={(e) =>
                    updateContainer(
                      idx,
                      "slot_count",
                      Number(e.target.value) || 1
                    )
                  }
                  placeholder="Slots"
                  className={smallInputClass}
                />
              </div>
            </div>
          ))}
          {containers.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No containers yet. Add at least one.
            </p>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Cards ({cards.length})
          </h4>
          <button
            type="button"
            onClick={addCard}
            disabled={containers.length === 0 && validation === "match_group"}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Card
          </button>
        </div>
        <div className="space-y-2">
          {cards.map((card, idx) => (
            <div
              key={idx}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Card {idx + 1}: {card.label || card.id}
                </span>
                <button
                  type="button"
                  onClick={() => removeCard(idx)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div
                className={`grid gap-2 ${
                  validation === "match_group"
                    ? "grid-cols-1 sm:grid-cols-3"
                    : "grid-cols-1 sm:grid-cols-2"
                }`}
              >
                <input
                  type="text"
                  value={card.id || ""}
                  onChange={(e) => updateCard(idx, "id", e.target.value)}
                  placeholder="ID (unique)"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={card.label || ""}
                  onChange={(e) => updateCard(idx, "label", e.target.value)}
                  placeholder="Label (e.g. Brazil)"
                  className={smallInputClass}
                />
                {validation === "match_group" && (
                  <select
                    value={card.group || ""}
                    onChange={(e) => updateCard(idx, "group", e.target.value)}
                    className={smallInputClass}
                  >
                    <option value="">Group...</option>
                    {containers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label || c.id} ({c.id})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={card.image_url || ""}
                  onChange={(e) =>
                    updateCard(idx, "image_url", e.target.value)
                  }
                  placeholder="Image URL (optional — e.g. country flag)"
                  className={`${smallInputClass} flex-1`}
                />
                {card.image_url && (
                  /* Tiny live preview so admins can verify the URL */
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={card.image_url}
                    alt=""
                    className="h-6 w-9 rounded-sm object-cover border border-gray-300 dark:border-gray-600"
                    onError={(e) => {
                      e.currentTarget.style.visibility = "hidden";
                    }}
                  />
                )}
              </div>
            </div>
          ))}
          {cards.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No cards yet.
            </p>
          )}
        </div>
      </div>

      {/* Warnings */}
      {cardsMissingGroup.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-300">
          ⚠️ {cardsMissingGroup.length}{" "}
          {cardsMissingGroup.length === 1 ? "card has" : "cards have"} no
          group set or reference a container that doesn&apos;t exist. They
          will never have a valid drop target.
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
        💡 <strong>Free placement</strong>: ideal for predictions like
        &ldquo;1st, 2nd, 3rd, 4th&rdquo;. Set 4 single-slot containers and
        leave each card&apos;s group blank.
        <br />
        <strong>Match group</strong>: ideal for &ldquo;Which group?&rdquo;
        activities. Containers with multiple slots accept several matching
        cards; total cards across all containers must equal the sum of
        slot counts.
      </div>
    </div>
  );
}

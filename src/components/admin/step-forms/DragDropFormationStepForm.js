"use client";

import React, { useState } from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";

// Common position values used across both modes
const POSITION_OPTIONS = [
  "goalkeeper",
  "right-back",
  "left-back",
  "full-back",
  "center-back",
  "defensive-midfielder",
  "central-midfielder",
  "attacking-midfielder",
  "left-winger",
  "right-winger",
  "winger",
  "striker",
  "second-striker",
  "forward",
];

// Preset formations with sensible default x/y coordinates (tray view: GK at bottom)
const FORMATION_PRESETS = {
  "4-3-3": [
    { id: "GK", label: "Goalkeeper", x: "50%", y: "92%", accepts: ["goalkeeper"] },
    { id: "LB", label: "Left Back", x: "15%", y: "75%", accepts: ["left-back", "full-back"] },
    { id: "CB1", label: "Center Back", x: "37%", y: "78%", accepts: ["center-back"] },
    { id: "CB2", label: "Center Back", x: "63%", y: "78%", accepts: ["center-back"] },
    { id: "RB", label: "Right Back", x: "85%", y: "75%", accepts: ["right-back", "full-back"] },
    { id: "CM1", label: "Central Mid", x: "30%", y: "55%", accepts: ["central-midfielder", "defensive-midfielder"] },
    { id: "CM2", label: "Central Mid", x: "50%", y: "50%", accepts: ["central-midfielder"] },
    { id: "CM3", label: "Central Mid", x: "70%", y: "55%", accepts: ["central-midfielder", "attacking-midfielder"] },
    { id: "LW", label: "Left Wing", x: "18%", y: "28%", accepts: ["left-winger", "winger", "forward"] },
    { id: "ST", label: "Striker", x: "50%", y: "18%", accepts: ["striker", "forward"] },
    { id: "RW", label: "Right Wing", x: "82%", y: "28%", accepts: ["right-winger", "winger", "forward"] },
  ],
  "4-4-2": [
    { id: "GK", label: "Goalkeeper", x: "50%", y: "92%", accepts: ["goalkeeper"] },
    { id: "LB", label: "Left Back", x: "15%", y: "75%", accepts: ["left-back", "full-back"] },
    { id: "CB1", label: "Center Back", x: "37%", y: "78%", accepts: ["center-back"] },
    { id: "CB2", label: "Center Back", x: "63%", y: "78%", accepts: ["center-back"] },
    { id: "RB", label: "Right Back", x: "85%", y: "75%", accepts: ["right-back", "full-back"] },
    { id: "LM", label: "Left Mid", x: "15%", y: "50%", accepts: ["left-winger", "winger", "central-midfielder"] },
    { id: "CM1", label: "Central Mid", x: "38%", y: "55%", accepts: ["central-midfielder"] },
    { id: "CM2", label: "Central Mid", x: "62%", y: "55%", accepts: ["central-midfielder"] },
    { id: "RM", label: "Right Mid", x: "85%", y: "50%", accepts: ["right-winger", "winger", "central-midfielder"] },
    { id: "ST1", label: "Striker", x: "38%", y: "20%", accepts: ["striker", "forward"] },
    { id: "ST2", label: "Striker", x: "62%", y: "20%", accepts: ["striker", "forward"] },
  ],
  "3-5-2": [
    { id: "GK", label: "Goalkeeper", x: "50%", y: "92%", accepts: ["goalkeeper"] },
    { id: "CB1", label: "Center Back", x: "25%", y: "78%", accepts: ["center-back"] },
    { id: "CB2", label: "Center Back", x: "50%", y: "82%", accepts: ["center-back"] },
    { id: "CB3", label: "Center Back", x: "75%", y: "78%", accepts: ["center-back"] },
    { id: "LWB", label: "Left Wing-back", x: "10%", y: "55%", accepts: ["left-back", "full-back", "left-winger"] },
    { id: "CM1", label: "Central Mid", x: "32%", y: "55%", accepts: ["central-midfielder", "defensive-midfielder"] },
    { id: "CM2", label: "Central Mid", x: "50%", y: "50%", accepts: ["central-midfielder", "attacking-midfielder"] },
    { id: "CM3", label: "Central Mid", x: "68%", y: "55%", accepts: ["central-midfielder", "defensive-midfielder"] },
    { id: "RWB", label: "Right Wing-back", x: "90%", y: "55%", accepts: ["right-back", "full-back", "right-winger"] },
    { id: "ST1", label: "Striker", x: "38%", y: "20%", accepts: ["striker", "forward"] },
    { id: "ST2", label: "Striker", x: "62%", y: "20%", accepts: ["striker", "forward"] },
  ],
};

export default function DragDropFormationStepForm({ step, onChange }) {
  const [contentMode, setContentMode] = useState(
    step.formation_config?.player_cards?.[0]?.image_url
      ? "named"
      : "generic"
  );

  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const updateFormationConfig = (field, value) => {
    onChange({
      ...step,
      formation_config: {
        ...(step.formation_config || {}),
        [field]: value,
      },
    });
  };

  const config = step.formation_config || {};
  const slots = config.position_slots || [];
  const cards = config.player_cards || [];

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white";
  const smallInputClass =
    "px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";

  // ---- Slots ----
  const applyPreset = (formationName) => {
    const preset = FORMATION_PRESETS[formationName];
    if (!preset) return;
    if (
      slots.length > 0 &&
      !window.confirm("Replace existing position slots with the preset?")
    ) {
      return;
    }
    onChange({
      ...step,
      formation_config: {
        ...config,
        formation_name: formationName,
        position_slots: preset,
      },
    });
  };

  const addSlot = () => {
    const newSlot = {
      id: `slot-${Date.now()}`,
      label: "",
      x: "50%",
      y: "50%",
      accepts: [],
    };
    updateFormationConfig("position_slots", [...slots, newSlot]);
  };

  const updateSlot = (idx, field, value) => {
    const updated = [...slots];
    updated[idx] = { ...updated[idx], [field]: value };
    updateFormationConfig("position_slots", updated);
  };

  const toggleSlotAccept = (idx, position) => {
    const slot = slots[idx];
    const accepts = slot.accepts || [];
    const next = accepts.includes(position)
      ? accepts.filter((p) => p !== position)
      : [...accepts, position];
    updateSlot(idx, "accepts", next);
  };

  const removeSlot = (idx) => {
    updateFormationConfig(
      "position_slots",
      slots.filter((_, i) => i !== idx)
    );
  };

  // ---- Cards ----
  const addCard = () => {
    const newCard =
      contentMode === "named"
        ? {
            id: `card-${Date.now()}`,
            name: "",
            position: "",
            image_url: "",
          }
        : {
            id: `card-${Date.now()}`,
            name: "",
            position: "",
          };
    updateFormationConfig("player_cards", [...cards, newCard]);
  };

  const updateCard = (idx, field, value) => {
    const updated = [...cards];
    updated[idx] = { ...updated[idx], [field]: value };
    updateFormationConfig("player_cards", updated);
  };

  const removeCard = (idx) => {
    updateFormationConfig(
      "player_cards",
      cards.filter((_, i) => i !== idx)
    );
  };

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
          placeholder="e.g. Build England's 4-3-3"
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
          placeholder="Drag each player to their correct position..."
        />
      </div>

      {/* Formation settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Formation
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Formation name
            </label>
            <input
              type="text"
              value={config.formation_name || ""}
              onChange={(e) =>
                updateFormationConfig("formation_name", e.target.value)
              }
              className={inputClass}
              placeholder="4-3-3"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Pitch image URL (optional — defaults to inline pitch)
            </label>
            <input
              type="text"
              value={config.pitch_image || ""}
              onChange={(e) =>
                updateFormationConfig("pitch_image", e.target.value)
              }
              className={inputClass}
              placeholder="/images/pitch-empty.svg"
            />
          </div>
        </div>

        {/* Preset chooser */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Load preset:
          </span>
          {Object.keys(FORMATION_PRESETS).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => applyPreset(name)}
              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 flex items-center gap-1"
            >
              <Wand2 className="w-3 h-3" />
              {name}
            </button>
          ))}
        </div>
      </div>

      {/* Position slots */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Position Slots ({slots.length})
          </h4>
          <button
            type="button"
            onClick={addSlot}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Slot
          </button>
        </div>

        <div className="space-y-3">
          {slots.map((slot, idx) => (
            <div
              key={idx}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  Slot {idx + 1}: {slot.label || slot.id}
                </span>
                <button
                  type="button"
                  onClick={() => removeSlot(idx)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <input
                  type="text"
                  value={slot.id || ""}
                  onChange={(e) => updateSlot(idx, "id", e.target.value)}
                  placeholder="ID (e.g. GK)"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={slot.label || ""}
                  onChange={(e) => updateSlot(idx, "label", e.target.value)}
                  placeholder="Label"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={slot.x || ""}
                  onChange={(e) => updateSlot(idx, "x", e.target.value)}
                  placeholder="X (e.g. 50%)"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={slot.y || ""}
                  onChange={(e) => updateSlot(idx, "y", e.target.value)}
                  placeholder="Y (e.g. 92%)"
                  className={smallInputClass}
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Accepts (positions valid for this slot):
                </p>
                <div className="flex flex-wrap gap-1">
                  {POSITION_OPTIONS.map((pos) => (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => toggleSlotAccept(idx, pos)}
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        (slot.accepts || []).includes(pos)
                          ? "bg-green-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {slots.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No slots yet. Load a preset or add slots manually.
            </p>
          )}
        </div>
      </div>

      {/* Player cards */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              Player Cards ({cards.length})
            </h4>
            <div className="flex gap-1 mt-1">
              <button
                type="button"
                onClick={() => setContentMode("generic")}
                className={`text-xs px-2 py-0.5 rounded ${
                  contentMode === "generic"
                    ? "bg-accent-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                Generic positions
              </button>
              <button
                type="button"
                onClick={() => setContentMode("named")}
                className={`text-xs px-2 py-0.5 rounded ${
                  contentMode === "named"
                    ? "bg-accent-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                Named players
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={addCard}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
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
                  Card {idx + 1}
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
                className={`grid grid-cols-1 ${
                  contentMode === "named" ? "md:grid-cols-4" : "md:grid-cols-3"
                } gap-2`}
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
                  value={card.name || ""}
                  onChange={(e) => updateCard(idx, "name", e.target.value)}
                  placeholder={
                    contentMode === "named" ? "Harry Kane" : "Striker 1"
                  }
                  className={smallInputClass}
                />
                <select
                  value={card.position || ""}
                  onChange={(e) => updateCard(idx, "position", e.target.value)}
                  className={smallInputClass}
                >
                  <option value="">Position...</option>
                  {POSITION_OPTIONS.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
                {contentMode === "named" && (
                  <input
                    type="text"
                    value={card.image_url || ""}
                    onChange={(e) =>
                      updateCard(idx, "image_url", e.target.value)
                    }
                    placeholder="Image URL"
                    className={smallInputClass}
                  />
                )}
              </div>
            </div>
          ))}
          {cards.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No player cards yet.
            </p>
          )}
        </div>
      </div>

      {/* Helper hint */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
        💡 Tip: Slot count and card count should match. Each card&apos;s
        position must match at least one slot&apos;s accepts list, otherwise
        that card will never have a valid place to go.
      </div>
    </div>
  );
}

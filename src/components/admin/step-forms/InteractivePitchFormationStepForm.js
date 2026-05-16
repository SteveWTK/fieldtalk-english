"use client";

import React from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";

// Position presets (same coordinates as DragDropFormation — minus the
// `accepts` field, which doesn't apply here).
const FORMATION_PRESETS = {
  "4-3-3": [
    { id: "GK", label: "Goalkeeper", x: "50%", y: "92%" },
    { id: "LB", label: "Left Back", x: "15%", y: "75%" },
    { id: "CB1", label: "Center Back", x: "37%", y: "78%" },
    { id: "CB2", label: "Center Back", x: "63%", y: "78%" },
    { id: "RB", label: "Right Back", x: "85%", y: "75%" },
    { id: "CM1", label: "Central Mid", x: "30%", y: "55%" },
    { id: "CM2", label: "Central Mid", x: "50%", y: "50%" },
    { id: "CM3", label: "Central Mid", x: "70%", y: "55%" },
    { id: "LW", label: "Left Wing", x: "18%", y: "28%" },
    { id: "ST", label: "Striker", x: "50%", y: "18%" },
    { id: "RW", label: "Right Wing", x: "82%", y: "28%" },
  ],
  "4-4-2": [
    { id: "GK", label: "Goalkeeper", x: "50%", y: "92%" },
    { id: "LB", label: "Left Back", x: "15%", y: "75%" },
    { id: "CB1", label: "Center Back", x: "37%", y: "78%" },
    { id: "CB2", label: "Center Back", x: "63%", y: "78%" },
    { id: "RB", label: "Right Back", x: "85%", y: "75%" },
    { id: "LM", label: "Left Mid", x: "15%", y: "50%" },
    { id: "CM1", label: "Central Mid", x: "38%", y: "55%" },
    { id: "CM2", label: "Central Mid", x: "62%", y: "55%" },
    { id: "RM", label: "Right Mid", x: "85%", y: "50%" },
    { id: "ST1", label: "Striker", x: "38%", y: "20%" },
    { id: "ST2", label: "Striker", x: "62%", y: "20%" },
  ],
  "3-5-2": [
    { id: "GK", label: "Goalkeeper", x: "50%", y: "92%" },
    { id: "CB1", label: "Center Back", x: "25%", y: "78%" },
    { id: "CB2", label: "Center Back", x: "50%", y: "82%" },
    { id: "CB3", label: "Center Back", x: "75%", y: "78%" },
    { id: "LWB", label: "Left Wing-back", x: "10%", y: "55%" },
    { id: "CM1", label: "Central Mid", x: "32%", y: "55%" },
    { id: "CM2", label: "Central Mid", x: "50%", y: "50%" },
    { id: "CM3", label: "Central Mid", x: "68%", y: "55%" },
    { id: "RWB", label: "Right Wing-back", x: "90%", y: "55%" },
    { id: "ST1", label: "Striker", x: "38%", y: "20%" },
    { id: "ST2", label: "Striker", x: "62%", y: "20%" },
  ],
};

// Common pitch-geography labels for quick-add convenience
const COMMON_AREAS = [
  { id: "halfway-line", label: "Halfway Line", x: "50%", y: "50%" },
  { id: "center-circle", label: "Center Circle", x: "50%", y: "50%" },
  { id: "penalty-area", label: "Penalty Area", x: "50%", y: "10%" },
  { id: "penalty-spot", label: "Penalty Spot", x: "50%", y: "13%" },
  { id: "goal-area", label: "Goal Area", x: "50%", y: "5%" },
  { id: "corner-flag", label: "Corner Flag", x: "5%", y: "5%" },
  { id: "sideline", label: "Sideline", x: "5%", y: "50%" },
  { id: "goal-line", label: "Goal Line", x: "50%", y: "2%" },
];

export default function InteractivePitchFormationStepForm({ step, onChange }) {
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
  const areas = config.click_areas || [];

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
        position_slots: preset.map((p) => ({ ...p })),
      },
    });
  };

  const addSlot = () => {
    const newSlot = {
      id: `slot-${Date.now()}`,
      label: "",
      label_pt: "",
      description: "",
      description_pt: "",
      audio_url: "",
      x: "50%",
      y: "50%",
    };
    updateFormationConfig("position_slots", [...slots, newSlot]);
  };

  const updateSlot = (idx, field, value) => {
    const updated = [...slots];
    updated[idx] = { ...updated[idx], [field]: value };
    updateFormationConfig("position_slots", updated);
  };

  const removeSlot = (idx) => {
    updateFormationConfig(
      "position_slots",
      slots.filter((_, i) => i !== idx)
    );
  };

  // ---- Areas ----
  const addArea = (template) => {
    const base = template || {
      id: `area-${Date.now()}`,
      label: "",
      x: "50%",
      y: "50%",
    };
    const newArea = {
      ...base,
      id: `${base.id}-${Date.now()}`,
      label_pt: base.label_pt || "",
      description: base.description || "",
      description_pt: base.description_pt || "",
      audio_url: base.audio_url || "",
    };
    updateFormationConfig("click_areas", [...areas, newArea]);
  };

  const updateArea = (idx, field, value) => {
    const updated = [...areas];
    updated[idx] = { ...updated[idx], [field]: value };
    updateFormationConfig("click_areas", updated);
  };

  const removeArea = (idx) => {
    updateFormationConfig(
      "click_areas",
      areas.filter((_, i) => i !== idx)
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
          placeholder="e.g. Explore the pitch and positions"
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
          placeholder="Tap each player or area to learn the vocabulary..."
        />
      </div>

      {/* Mode */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mode
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateFormationConfig("mode", "revision")}
            className={`px-3 py-2 rounded-lg border text-left transition-colors ${
              (config.mode || "revision") === "revision"
                ? "bg-accent-50 dark:bg-accent-900/30 border-accent-400 text-accent-800 dark:text-accent-200"
                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-accent-300"
            }`}
          >
            <div className="font-semibold text-sm">Revision</div>
            <div className="text-xs opacity-80">
              Only the most recent label is shown — good for self-quizzing.
            </div>
          </button>
          <button
            type="button"
            onClick={() => updateFormationConfig("mode", "presentation")}
            className={`px-3 py-2 rounded-lg border text-left transition-colors ${
              config.mode === "presentation"
                ? "bg-accent-50 dark:bg-accent-900/30 border-accent-400 text-accent-800 dark:text-accent-200"
                : "bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-accent-300"
            }`}
          >
            <div className="font-semibold text-sm">Presentation</div>
            <div className="text-xs opacity-80">
              Labels stay visible — the pitch fills up as the user explores.
            </div>
          </button>
        </div>
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
              Pitch image URL (optional)
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

        <div className="flex items-center gap-2 mb-3 flex-wrap">
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
            Player Positions ({slots.length})
          </h4>
          <button
            type="button"
            onClick={addSlot}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Position
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
                  {idx + 1}. {slot.label || slot.id}
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
                  placeholder="ID (GK)"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={slot.label || ""}
                  onChange={(e) => updateSlot(idx, "label", e.target.value)}
                  placeholder="Label (English)"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={slot.x || ""}
                  onChange={(e) => updateSlot(idx, "x", e.target.value)}
                  placeholder="X (50%)"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={slot.y || ""}
                  onChange={(e) => updateSlot(idx, "y", e.target.value)}
                  placeholder="Y (92%)"
                  className={smallInputClass}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  value={slot.label_pt || ""}
                  onChange={(e) => updateSlot(idx, "label_pt", e.target.value)}
                  placeholder="Label (Portuguese)"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={slot.audio_url || ""}
                  onChange={(e) => updateSlot(idx, "audio_url", e.target.value)}
                  placeholder="Audio URL (optional)"
                  className={smallInputClass}
                />
              </div>
              <textarea
                value={slot.description || ""}
                onChange={(e) =>
                  updateSlot(idx, "description", e.target.value)
                }
                placeholder="Description (English)"
                rows={2}
                className={`${smallInputClass} w-full mb-2`}
              />
              <textarea
                value={slot.description_pt || ""}
                onChange={(e) =>
                  updateSlot(idx, "description_pt", e.target.value)
                }
                placeholder="Description (Portuguese)"
                rows={2}
                className={`${smallInputClass} w-full`}
              />
            </div>
          ))}
          {slots.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No positions yet. Load a preset or add positions manually.
            </p>
          )}
        </div>
      </div>

      {/* Click areas */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Pitch Areas ({areas.length})
          </h4>
          <button
            type="button"
            onClick={() => addArea(null)}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Area
          </button>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          <span className="text-xs text-gray-600 dark:text-gray-400 self-center mr-1">
            Quick-add:
          </span>
          {COMMON_AREAS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => addArea(a)}
              className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300"
            >
              + {a.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {areas.map((area, idx) => (
            <div
              key={idx}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  {idx + 1}. {area.label || area.id}
                </span>
                <button
                  type="button"
                  onClick={() => removeArea(idx)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                <input
                  type="text"
                  value={area.id || ""}
                  onChange={(e) => updateArea(idx, "id", e.target.value)}
                  placeholder="ID"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={area.label || ""}
                  onChange={(e) => updateArea(idx, "label", e.target.value)}
                  placeholder="Label (English)"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={area.x || ""}
                  onChange={(e) => updateArea(idx, "x", e.target.value)}
                  placeholder="X"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={area.y || ""}
                  onChange={(e) => updateArea(idx, "y", e.target.value)}
                  placeholder="Y"
                  className={smallInputClass}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  value={area.label_pt || ""}
                  onChange={(e) => updateArea(idx, "label_pt", e.target.value)}
                  placeholder="Label (Portuguese)"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={area.audio_url || ""}
                  onChange={(e) => updateArea(idx, "audio_url", e.target.value)}
                  placeholder="Audio URL (optional)"
                  className={smallInputClass}
                />
              </div>
              <textarea
                value={area.description || ""}
                onChange={(e) =>
                  updateArea(idx, "description", e.target.value)
                }
                placeholder="Description (English)"
                rows={2}
                className={`${smallInputClass} w-full mb-2`}
              />
              <textarea
                value={area.description_pt || ""}
                onChange={(e) =>
                  updateArea(idx, "description_pt", e.target.value)
                }
                placeholder="Description (Portuguese)"
                rows={2}
                className={`${smallInputClass} w-full`}
              />
            </div>
          ))}
          {areas.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No pitch areas yet. Use quick-add above or click &quot;Add
              Area&quot;.
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
        💡 Tip: Use Positions for player vocabulary (Goalkeeper, Striker, etc.)
        and Areas for pitch geography (Penalty Area, Halfway Line, etc.).
        Either or both can appear in one step.
      </div>
    </div>
  );
}

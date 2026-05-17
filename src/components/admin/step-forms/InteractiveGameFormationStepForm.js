/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import React from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";

// Same coordinate presets as the other formation forms — kept inline so the
// three formation step types stay self-contained.
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

export default function InteractiveGameFormationStepForm({ step, onChange }) {
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
  const commands = config.commands || [];

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white";
  const smallInputClass =
    "px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm";

  // ---- Preset / slots ----
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
    updateFormationConfig("position_slots", [
      ...slots,
      {
        id: `slot-${Date.now()}`,
        label: "",
        label_pt: "",
        x: "50%",
        y: "50%",
      },
    ]);
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

  // ---- Commands ----
  const addCommand = () => {
    updateFormationConfig("commands", [
      ...commands,
      {
        id: `cmd-${Date.now()}`,
        text: "",
        translation: "",
        target_slot_ids: slots[0]?.id ? [slots[0].id] : [],
        audio_url: "",
        success_message: "",
      },
    ]);
  };

  const updateCommand = (idx, field, value) => {
    const updated = [...commands];
    updated[idx] = { ...updated[idx], [field]: value };
    updateFormationConfig("commands", updated);
  };

  // Resolve the acceptable slot ids for a command, supporting both
  // target_slot_ids (preferred) and the legacy target_slot_id.
  const targetIdsFor = (cmd) => {
    if (Array.isArray(cmd?.target_slot_ids) && cmd.target_slot_ids.length > 0) {
      return cmd.target_slot_ids;
    }
    return cmd?.target_slot_id ? [cmd.target_slot_id] : [];
  };

  const toggleCommandTarget = (cmdIdx, slotId) => {
    const current = targetIdsFor(commands[cmdIdx]);
    const next = current.includes(slotId)
      ? current.filter((id) => id !== slotId)
      : [...current, slotId];
    const updated = [...commands];
    // Write to the new plural field and clear the legacy singular so the
    // JSON has a single source of truth going forward.
    const { target_slot_id: _legacy, ...rest } = updated[cmdIdx];
    updated[cmdIdx] = { ...rest, target_slot_ids: next };
    updateFormationConfig("commands", updated);
  };

  const removeCommand = (idx) => {
    updateFormationConfig(
      "commands",
      commands.filter((_, i) => i !== idx)
    );
  };

  const ballStart = config.ball_start || { x: "50%", y: "85%" };
  const timing = config.timing || {};

  const updateTiming = (field, value) => {
    updateFormationConfig("timing", { ...timing, [field]: value });
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
          placeholder="e.g. Pass the ball — listen and react"
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
          placeholder="Listen to each command and click the correct player..."
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

      {/* Interaction settings */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Interaction
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Mode
            </label>
            <select
              value={config.interaction_mode || "click"}
              onChange={(e) =>
                updateFormationConfig("interaction_mode", e.target.value)
              }
              className={inputClass}
            >
              <option value="click">Click (tap nearest player)</option>
              <option value="drag">Drag (move the ball)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Click tolerance (px)
            </label>
            <input
              type="number"
              min="10"
              max="200"
              value={config.click_tolerance_px || 50}
              onChange={(e) =>
                updateFormationConfig(
                  "click_tolerance_px",
                  Number(e.target.value)
                )
              }
              className={inputClass}
              placeholder="50"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Ball X
              </label>
              <input
                type="text"
                value={ballStart.x}
                onChange={(e) =>
                  updateFormationConfig("ball_start", {
                    ...ballStart,
                    x: e.target.value,
                  })
                }
                className={inputClass}
                placeholder="50%"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Ball Y
              </label>
              <input
                type="text"
                value={ballStart.y}
                onChange={(e) =>
                  updateFormationConfig("ball_start", {
                    ...ballStart,
                    y: e.target.value,
                  })
                }
                className={inputClass}
                placeholder="85%"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Timing / speed-progression */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Speed Progression
          </h4>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={timing.enabled === true}
              onChange={(e) => updateTiming("enabled", e.target.checked)}
              className="w-4 h-4"
            />
            Enable timer
          </label>
        </div>
        {timing.enabled ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Commands per round
              </label>
              <input
                type="number"
                min="1"
                value={timing.commands_per_round || 4}
                onChange={(e) =>
                  updateTiming("commands_per_round", Number(e.target.value))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Initial time (ms)
              </label>
              <input
                type="number"
                min="1000"
                step="500"
                value={timing.initial_ms || 8000}
                onChange={(e) =>
                  updateTiming("initial_ms", Number(e.target.value))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Decrement / round (ms)
              </label>
              <input
                type="number"
                min="0"
                step="250"
                value={timing.decrement_ms || 1500}
                onChange={(e) =>
                  updateTiming("decrement_ms", Number(e.target.value))
                }
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
                Minimum time (ms)
              </label>
              <input
                type="number"
                min="500"
                step="250"
                value={timing.min_ms || 3000}
                onChange={(e) => updateTiming("min_ms", Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <p className="col-span-2 md:col-span-4 text-xs text-gray-500 dark:text-gray-400">
              Round 1 gets the initial time; each subsequent round subtracts the
              decrement, floored at the minimum. Timeout counts as a wrong
              attempt and advances to the next command. A cheer plays after the
              last correct of each round.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No time limit — players answer at their own pace. Enable the timer
            to introduce rounds with a gradually shortening window.
          </p>
        )}
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
                  placeholder="X"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={slot.y || ""}
                  onChange={(e) => updateSlot(idx, "y", e.target.value)}
                  placeholder="Y"
                  className={smallInputClass}
                />
              </div>
              <input
                type="text"
                value={slot.label_pt || ""}
                onChange={(e) => updateSlot(idx, "label_pt", e.target.value)}
                placeholder="Label (Portuguese)"
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

      {/* Commands */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Commands ({commands.length})
          </h4>
          <button
            type="button"
            onClick={addCommand}
            disabled={slots.length === 0}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Command
          </button>
        </div>

        <div className="space-y-3">
          {commands.map((cmd, idx) => (
            <div
              key={idx}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  Command {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeCommand(idx)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={cmd.text || ""}
                onChange={(e) => updateCommand(idx, "text", e.target.value)}
                placeholder="Pass to the left winger"
                className={`${smallInputClass} w-full mb-2`}
              />
              <div className="mb-2">
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Acceptable target slots (tick more than one when several
                  positions share a name, e.g. two centre-backs):
                </p>
                <div className="flex flex-wrap gap-1">
                  {slots.map((s) => {
                    const checked = targetIdsFor(cmd).includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleCommandTarget(idx, s.id)}
                        className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                          checked
                            ? "bg-green-500 text-white"
                            : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300"
                        }`}
                      >
                        {s.label || s.id}{" "}
                        <span className="opacity-70">({s.id})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  value={cmd.translation || ""}
                  onChange={(e) =>
                    updateCommand(idx, "translation", e.target.value)
                  }
                  placeholder="Translation (Portuguese)"
                  className={smallInputClass}
                />
                <input
                  type="text"
                  value={cmd.audio_url || ""}
                  onChange={(e) =>
                    updateCommand(idx, "audio_url", e.target.value)
                  }
                  placeholder="Audio URL (optional — falls back to TTS)"
                  className={smallInputClass}
                />
              </div>
              <input
                type="text"
                value={cmd.success_message || ""}
                onChange={(e) =>
                  updateCommand(idx, "success_message", e.target.value)
                }
                placeholder="Success message (optional)"
                className={`${smallInputClass} w-full`}
              />
            </div>
          ))}
          {commands.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              {slots.length === 0
                ? "Add at least one position before adding commands."
                : "No commands yet."}
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
        💡 Tip: Pick at least one acceptable target slot per command — tick more
        than one for positions that share a name (e.g. both centre-backs accept
        &ldquo;Pass to the centre back&rdquo;). Click mode is forgiving
        (configurable tolerance); drag mode is more tactile but slower.
      </div>
    </div>
  );
}

"use client";

import React from "react";
import { Plus, Trash2 } from "lucide-react";

export default function TimelineDragStepForm({ step, onChange }) {
  const config = step.timeline_config || {};
  const events = config.events || [];

  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
  };

  const updateConfig = (field, value) => {
    onChange({
      ...step,
      timeline_config: {
        ...(step.timeline_config || {}),
        [field]: value,
      },
    });
  };

  const addEvent = () => {
    const newEvent = {
      id: `event-${Date.now()}`,
      year: config.year_min || 2000,
      title: "",
      description: "",
    };
    updateConfig("events", [...events, newEvent]);
  };

  const updateEvent = (idx, field, value) => {
    const updated = [...events];
    updated[idx] = { ...updated[idx], [field]: value };
    updateConfig("events", updated);
  };

  const removeEvent = (idx) => {
    updateConfig(
      "events",
      events.filter((_, i) => i !== idx)
    );
  };

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
          placeholder="e.g. Order the World Cup Winners"
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
          placeholder="Drag each card onto the timeline at the year it belongs..."
        />
      </div>

      {/* Timeline configuration */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="font-medium text-gray-900 dark:text-white mb-3">
          Timeline Configuration
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Year min
            </label>
            <input
              type="number"
              value={config.year_min ?? ""}
              onChange={(e) =>
                updateConfig("year_min", parseInt(e.target.value) || 0)
              }
              placeholder="1930"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Year max
            </label>
            <input
              type="number"
              value={config.year_max ?? ""}
              onChange={(e) =>
                updateConfig("year_max", parseInt(e.target.value) || 0)
              }
              placeholder="2022"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Marker interval
            </label>
            <input
              type="number"
              value={config.year_marker_interval ?? ""}
              onChange={(e) =>
                updateConfig(
                  "year_marker_interval",
                  parseInt(e.target.value) || 10
                )
              }
              placeholder="8"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">
              Tolerance (± years)
            </label>
            <input
              type="number"
              value={config.tolerance_years ?? ""}
              onChange={(e) =>
                updateConfig(
                  "tolerance_years",
                  parseInt(e.target.value) || 0
                )
              }
              placeholder="2"
              className={inputClass}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Tolerance: how many years off counts as a correct drop. Lower =
          stricter.
        </p>
      </div>

      {/* Events */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Events ({events.length})
          </h4>
          <button
            type="button"
            onClick={addEvent}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Event
          </button>
        </div>

        <div className="space-y-2">
          {events.map((event, idx) => (
            <div
              key={idx}
              className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  Event {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeEvent(idx)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                <input
                  type="text"
                  value={event.id || ""}
                  onChange={(e) => updateEvent(idx, "id", e.target.value)}
                  placeholder="ID"
                  className={`${smallInputClass} md:col-span-2`}
                />
                <input
                  type="number"
                  value={event.year ?? ""}
                  onChange={(e) =>
                    updateEvent(idx, "year", parseInt(e.target.value) || 0)
                  }
                  placeholder="Year"
                  className={`${smallInputClass} md:col-span-2`}
                />
                <input
                  type="text"
                  value={event.title || ""}
                  onChange={(e) => updateEvent(idx, "title", e.target.value)}
                  placeholder="Title (e.g. Brazil)"
                  className={`${smallInputClass} md:col-span-3`}
                />
                <input
                  type="text"
                  value={event.description || ""}
                  onChange={(e) =>
                    updateEvent(idx, "description", e.target.value)
                  }
                  placeholder="Description (shown on tray card)"
                  className={`${smallInputClass} md:col-span-5`}
                />
              </div>
            </div>
          ))}
          {events.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
              No events yet. Click &quot;Add Event&quot; to start.
            </p>
          )}
        </div>
      </div>

      {/* Helper hint */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-sm text-blue-800 dark:text-blue-300">
        💡 Tip: Make sure all event years fall between year_min and year_max.
        For tightly clustered events (e.g. multiple in the same decade), keep
        the tolerance low so the right answer feels precise.
      </div>
    </div>
  );
}

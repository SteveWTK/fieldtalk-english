"use client";

import React from "react";
import MediaUploader from "../MediaUploader";

export default function ScenarioStepForm({ step, onChange }) {
  const updateField = (field, value) => {
    onChange({ ...step, [field]: value });
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
          placeholder="Enter title"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content (English)
        </label>
        <textarea
          value={step.content || ""}
          onChange={(e) => updateField("content", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter English content"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Content (Portuguese)
        </label>
        <textarea
          value={step.content_pt || ""}
          onChange={(e) => updateField("content_pt", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          placeholder="Enter Portuguese translation"
        />
      </div>

      <MediaUploader
        label="Image URL"
        value={step.image_url || ""}
        onChange={(url) => updateField("image_url", url)}
        accept="image/*"
        folder="scenario-images"
      />

      <MediaUploader
        label="Video URL"
        value={step.video_url || ""}
        onChange={(url) => updateField("video_url", url)}
        accept="video/*"
        folder="scenario-videos"
      />

      <MediaUploader
        label="Thumbnail URL"
        value={step.thumbnail_url || ""}
        onChange={(url) => updateField("thumbnail_url", url)}
        accept="image/*"
        folder="thumbnails"
      />

      <MediaUploader
        label="Audio URL"
        value={step.audio_url || ""}
        onChange={(url) => updateField("audio_url", url)}
        accept="audio/*"
        folder="audio"
      />

      <div className="flex items-center">
        <input
          type="checkbox"
          checked={step.translation_available || false}
          onChange={(e) => updateField("translation_available", e.target.checked)}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          Translation Available
        </label>
      </div>
    </div>
  );
}
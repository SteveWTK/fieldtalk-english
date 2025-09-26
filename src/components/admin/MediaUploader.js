"use client";

import React, { useState } from "react";
import { Upload, X, Loader } from "lucide-react";
import { uploadMedia } from "@/lib/supabase/lesson-queries";

export default function MediaUploader({
  label,
  value,
  onChange,
  accept = "image/*,video/*,audio/*",
  folder = "lesson-media"
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setError(null);
      const url = await uploadMedia(file, folder);
      onChange(url);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload file. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleRemove() {
    onChange("");
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </label>

      {value ? (
        <div className="relative">
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <div className="flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
              {value}
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="p-1 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {value.startsWith('http') && value.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
            <img
              src={value}
              alt="Preview"
              className="mt-2 max-w-xs rounded-lg border border-gray-300 dark:border-gray-600"
            />
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter URL or upload file"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <label className="relative">
            <input
              type="file"
              accept={accept}
              onChange={handleFileUpload}
              disabled={uploading}
              className="hidden"
            />
            <div className={`px-4 py-2 rounded-lg flex items-center gap-2 cursor-pointer transition-colors ${
              uploading
                ? "bg-gray-300 dark:bg-gray-600 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white"
            }`}>
              {uploading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload
                </>
              )}
            </div>
          </label>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
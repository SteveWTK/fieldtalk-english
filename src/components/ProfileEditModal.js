// src/components/ProfileEditModal.js
//
// Small dark modal that lets the signed-in user change two things:
//   - Display name (players.full_name)
//   - Avatar — currently a picker of WC2026 nation flags. Later we can
//     extend the picker with preset illustrations / a photo upload tab
//     without changing the underlying field (avatar_url).
//
// Persists via PATCH /api/profile. Calls onSaved with the new fields so
// the parent can refresh local state without a full refetch.
"use client";

import React, { useRef, useState } from "react";
import Image from "next/image";
import { X, Check, Upload, Loader2 } from "lucide-react";
import { WC_NATIONS, FLAG_URL_BUILDER } from "@/lib/flags/wcNations";

export default function ProfileEditModal({
  open,
  initialName = "",
  initialAvatarUrl = "",
  onClose,
  onSaved,
}) {
  const [name, setName] = useState(initialName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Reset internal state whenever the modal is re-opened with new props.
  React.useEffect(() => {
    if (open) {
      setName(initialName || "");
      setAvatarUrl(initialAvatarUrl || "");
      setError(null);
    }
  }, [open, initialName, initialAvatarUrl]);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    // Reset the input value so picking the same file twice re-fires change.
    e.target.value = "";
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Photo must be a JPEG, PNG or WebP image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Photo must be 2MB or smaller");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: form,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not upload photo");
        return;
      }
      // Server has already updated players.avatar_url. Reflect locally
      // so the preview + parent override update immediately. Save still
      // PATCHes name on close — calling it twice with the same URL is
      // fine since validateAvatarUrl accepts our Supabase host.
      setAvatarUrl(json.avatar_url);
    } catch {
      setError("Network error during upload");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          avatar_url: avatarUrl,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || "Could not save");
        setSaving(false);
        return;
      }
      onSaved?.({ full_name: name, avatar_url: avatarUrl });
      onClose?.();
    } catch {
      setError("Network error");
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={() => !saving && !uploading && onClose?.()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-[#0b0b0b] border border-white/10 p-5 sm:p-6 text-white shadow-2xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={saving || uploading}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-bold mb-1">Edit profile</h2>
        <p className="text-xs text-white/50 mb-4">
          Change how you appear on the leaderboard and across the app.
        </p>

        {/* Display name */}
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
            Display name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="e.g. Carlos R."
            className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400"
          />
          <p className="mt-1 text-[11px] text-white/40">
            Up to 60 characters. Shown publicly on the leaderboard.
          </p>
        </div>

        {/* Upload photo */}
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
            Upload a photo
          </label>
          <div className="flex items-center gap-3">
            {/* Live preview — only shown when the current avatarUrl is
                NOT one of the flag options. Keeps the modal compact. */}
            {avatarUrl && !avatarUrl.includes("/flags/") && !avatarUrl.includes("flagcdn.com") && (
              <div className="relative w-14 h-14 rounded-full overflow-hidden ring-2 ring-white/15 shrink-0">
                <Image
                  src={avatarUrl}
                  alt="Your photo"
                  fill
                  sizes="56px"
                  className="object-cover"
                  // Already sized server-side (≤2MB user upload). Skip
                  // Vercel's image optimizer so it doesn't burn quota
                  // re-encoding every fresh upload.
                  unoptimized
                />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading || saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-semibold border border-white/15 disabled:opacity-50 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Choose photo
                </>
              )}
            </button>
            <p className="text-[11px] text-white/40 leading-tight">
              JPEG, PNG or WebP.<br />Max 2MB.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[10px] uppercase tracking-wider text-white/40">
            or
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Flag picker */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs uppercase tracking-wider text-white/60">
              Pick a flag
            </label>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="text-[11px] text-white/50 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-7 gap-2 overflow-y-auto pr-1">
            {WC_NATIONS.map((nation) => {
              const url = FLAG_URL_BUILDER(nation.code2);
              const isSelected = avatarUrl === url;
              return (
                <button
                  key={nation.code3}
                  type="button"
                  onClick={() => setAvatarUrl(url)}
                  title={nation.name}
                  className={`relative aspect-square rounded-lg overflow-hidden ring-2 transition-all ${
                    isSelected
                      ? "ring-emerald-400 scale-105"
                      : "ring-white/10 hover:ring-white/40"
                  }`}
                >
                  <Image
                    src={url}
                    alt={nation.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                    // 48 small PNGs in a grid — fetch straight from
                    // source. Optimization gives nothing back here and
                    // would burn a slot per nation on the Vercel quota.
                    unoptimized
                  />
                  {isSelected && (
                    <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/40">
                      <Check className="w-5 h-5 text-white drop-shadow" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mt-3 p-2 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs">
            {error}
          </div>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving || uploading}
            className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || uploading}
            className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#070707] text-sm font-bold disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

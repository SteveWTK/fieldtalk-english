"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Globe,
  Volume2,
  Save,
  Check,
  MessageCircle,
  Loader2,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

function SettingsContent() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    english_variant: "british", // british or american
    preferred_language: "en",
    voice_gender: "male", // male or female
  });

  // Load user settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from("players")
          .select("english_variant, preferred_language, voice_gender")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error loading settings:", error);
        } else if (data) {
          setSettings({
            english_variant: data.english_variant || "british",
            preferred_language: data.preferred_language || "en",
            voice_gender: data.voice_gender || "male",
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadSettings();
    }
  }, [user]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("players")
        .update({
          english_variant: settings.english_variant,
          preferred_language: settings.preferred_language,
          voice_gender: settings.voice_gender,
        })
        .eq("id", user.id);

      if (error) {
        console.error("Error saving settings:", error);
        alert("Failed to save settings. Please try again.");
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Failed to save settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
          <div className="space-y-6">
            <div className="h-32 bg-gray-200 rounded-lg"></div>
            <div className="h-32 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <Settings className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Settings
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          Customise your Global Player learning experience
        </p>
      </div>

      <div className="space-y-6">
        {/* English Variant Setting */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-4">
            <Globe className="w-6 h-6 text-blue-600 dark:text-blue-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                English Variant
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Choose between British and American English for AI feedback,
                pronunciation, and vocabulary.
              </p>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="english_variant"
                    value="british"
                    checked={settings.english_variant === "british"}
                    onChange={(e) =>
                      updateSetting("english_variant", e.target.value)
                    }
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      British English
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Colour, realise, centre, pitch, kit, football boots
                    </p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="english_variant"
                    value="american"
                    checked={settings.english_variant === "american"}
                    onChange={(e) =>
                      updateSetting("english_variant", e.target.value)
                    }
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      American English
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Color, realize, center, field, uniform, soccer cleats
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Voice Gender Setting */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-4">
            <Volume2 className="w-6 h-6 text-purple-600 dark:text-purple-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Voice Gender
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Choose your preferred voice gender for text-to-speech audio.
              </p>

              <div className="space-y-3">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="voice_gender"
                    value="male"
                    checked={settings.voice_gender === "male"}
                    onChange={(e) =>
                      updateSetting("voice_gender", e.target.value)
                    }
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      Male Voice
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {settings.english_variant === "british"
                        ? "British male voice (Onyx)"
                        : "American male voice (Echo)"}
                    </p>
                  </div>
                </label>

                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="voice_gender"
                    value="female"
                    checked={settings.voice_gender === "female"}
                    onChange={(e) =>
                      updateSetting("voice_gender", e.target.value)
                    }
                    className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium">
                      Female Voice
                    </span>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {settings.english_variant === "british"
                        ? "British female voice (Fable)"
                        : "American female voice (Nova)"}
                    </p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* WhatsApp phone number — separate from other settings because
            it needs its own validation + collision check (unique
            phone_e164 in players) and its own save endpoint. Hidden
            entirely for users who haven't opted in yet; those users
            still get the phone modal in onboarding. */}
        <WhatsAppPhoneSection userId={user?.id} />

        {/* Interface Language Setting */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start space-x-4">
            <Globe className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Interface Language
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Choose your preferred language for instructions, feedback, and
                interface elements.
              </p>

              <select
                value={settings.preferred_language}
                onChange={(e) =>
                  updateSetting("preferred_language", e.target.value)
                }
                className="w-full max-w-xs px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="en">English</option>
                <option value="pt">Português (Brasil)</option>
                <option value="es">Español</option>
                <option value="th">ไทย (Thai)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={saveSettings}
            disabled={saving}
            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center space-x-2 ${
              saved
                ? "bg-green-600 text-white"
                : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : saved ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * WhatsApp phone section — shows the current number (masked-ish) and
 * lets the user edit it. Uses the same check-phone + PATCH /api/profile
 * plumbing as onboarding, so validation + collision handling stay
 * identical across surfaces. Server-side, changing the phone resets
 * whatsapp_welcomed_at so the new number receives a fresh welcome.
 */
function WhatsAppPhoneSection({ userId }) {
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState(null);
  const [optedIn, setOptedIn] = useState(false);
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase
          .from("players")
          .select("phone_e164, whatsapp_opted_in")
          .eq("id", userId)
          .maybeSingle();
        if (cancelled) return;
        setPhone(data?.phone_e164 || null);
        setOptedIn(data?.whatsapp_opted_in === true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Users who haven't opted in — the PhoneCollectionModal on the
  // dashboard is the canonical entry point for them. Once opted in,
  // this section is how they change the number.
  if (!loading && !optedIn) return null;

  function beginEdit() {
    setInput(phone || "");
    setError(null);
    setSaved(false);
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      // 1. Pre-check availability so a duplicate returns a friendly
      // error instead of the raw 409 leak from PATCH.
      const checkRes = await fetch("/api/profile/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: input.trim() }),
      });
      const checkJson = await checkRes.json().catch(() => ({}));
      if (!checkRes.ok || checkJson.available === false) {
        setError(mapPhoneError(checkJson.reason || "generic"));
        setSaving(false);
        return;
      }

      // 2. Commit. Server resets welcomed_at + re-fires welcome to
      // the new number via after().
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_e164: input.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          json.error === "phone_in_use"
            ? mapPhoneError("in_use")
            : json.error || "Could not save. Please check the number.",
        );
        setSaving(false);
        return;
      }

      // Update local state to the normalized E.164 the server accepted.
      setPhone(json.updated?.phone_e164 ?? input.trim());
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start space-x-4">
        <MessageCircle className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            WhatsApp number
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your linked WhatsApp number receives the review quizzes, coaching
            replies and occasional tips. Changing it re-links your account and
            you&apos;ll get a fresh welcome on the new number.
          </p>

          {loading ? (
            <div className="inline-flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading…
            </div>
          ) : editing ? (
            <div className="space-y-2">
              <input
                type="tel"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="+55 11 91234-5678"
                autoFocus
                className="w-full max-w-sm px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Include country code (55 for Brazil) + area code.
              </p>
              {error && (
                <div className="inline-flex items-start gap-1.5 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || input.trim().length < 8}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save number
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-white text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="font-mono text-gray-900 dark:text-white text-base">
                {phone ? formatDisplayPhone(phone) : "— not set —"}
              </span>
              <button
                type="button"
                onClick={beginEdit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-gray-700 dark:text-white/80 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-white/15 text-xs font-semibold transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                Change
              </button>
              {saved && (
                <span className="inline-flex items-center gap-1 text-sm text-green-600 dark:text-green-400 font-medium">
                  <Check className="w-4 h-4" />
                  Saved
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Turn a stored E.164 phone ("5511912345678") into a display string
 * ("+55 11 91234-5678"). Falls back to the raw value on any unexpected
 * length so we never render nothing.
 */
function formatDisplayPhone(e164) {
  const digits = String(e164).replace(/\D/g, "");
  // Brazilian pattern: 55 + 2-digit DDD + 8 or 9 digit local
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const cc = digits.slice(0, 2);
    const ddd = digits.slice(2, 4);
    const local = digits.slice(4);
    const midpoint = local.length === 9 ? 5 : 4;
    return `+${cc} ${ddd} ${local.slice(0, midpoint)}-${local.slice(midpoint)}`;
  }
  return `+${digits}`;
}

function mapPhoneError(reason) {
  if (reason === "in_use") {
    return "This number is already linked to another Global Player account.";
  }
  if (reason === "invalid_format") {
    return "Invalid number. Check the country code and area code.";
  }
  return "Could not verify the number. Please try again.";
}

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

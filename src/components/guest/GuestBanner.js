"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { Clock, UserPlus, X } from "lucide-react";
import GuestExpiredOverlay from "./GuestExpiredOverlay";

const translations = {
  en: {
    remaining: "remaining",
    createAccount: "Create Account",
    timeRunningOut: "Time running out!",
    signUpToSave: "Sign up to save your progress",
    almostExpired: "Almost expired!",
    signUpNow: "Sign up now to keep your progress",
  },
  pt: {
    remaining: "restante",
    createAccount: "Criar Conta",
    timeRunningOut: "Tempo acabando!",
    signUpToSave: "Cadastre-se para salvar seu progresso",
    almostExpired: "Quase expirado!",
    signUpNow: "Cadastre-se agora para manter seu progresso",
  },
  th: {
    remaining: "เหลืออยู่",
    createAccount: "สร้างบัญชี",
    timeRunningOut: "เวลาใกล้หมด!",
    signUpToSave: "ลงทะเบียนเพื่อบันทึกความก้าวหน้า",
    almostExpired: "ใกล้หมดอายุ!",
    signUpNow: "ลงทะเบียนตอนนี้เพื่อเก็บรักษาความก้าวหน้า",
  },
};

function formatTimeRemaining(ms) {
  if (ms <= 0) return "0m";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * GuestBanner - Shows a countdown timer and sign-up CTA for guest users.
 * Escalates visual urgency as time runs out:
 * - >50% remaining: subtle teal bar, dismissible
 * - 25-50%: amber warning bar
 * - <25%: red pulsing bar, non-dismissible
 * - Expired: full-screen overlay with progress stats
 */
export default function GuestBanner() {
  const { data: session } = useSession();
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = translations[lang] || translations.en;

  const [dismissed, setDismissed] = useState(false);
  const [timeDisplay, setTimeDisplay] = useState("");
  const [percentRemaining, setPercentRemaining] = useState(100);
  const [expired, setExpired] = useState(false);
  const [stats, setStats] = useState({});

  const isGuest = session?.user?.is_guest;
  const expiresAt = session?.user?.guest_expires_at;

  // Calculate total duration from session data
  // We estimate based on typical durations; the exact start time is in the DB
  const expiresAtMs = expiresAt ? new Date(expiresAt).getTime() : 0;

  // Update countdown every second
  useEffect(() => {
    if (!isGuest || !expiresAt) return;

    const updateCountdown = () => {
      const now = Date.now();
      const remaining = expiresAtMs - now;

      if (remaining <= 0) {
        setExpired(true);
        setTimeDisplay("0m");
        setPercentRemaining(0);
        // Fetch stats for the expired overlay
        fetchStats();
        return;
      }

      setTimeDisplay(formatTimeRemaining(remaining));

      // Estimate percent remaining (assume 72h default if we can't calculate)
      // Use a rough heuristic: if remaining > 72h treat as 100%
      const maxDuration = 72 * 3600000; // 72 hours in ms
      const pct = Math.min(100, (remaining / maxDuration) * 100);
      setPercentRemaining(pct);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [isGuest, expiresAt, expiresAtMs]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/guest-access/status");
      if (res.ok) {
        const data = await res.json();
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch (err) {
      console.error("Error fetching guest stats:", err);
    }
  }, []);

  // Don't render for non-guest users
  if (!isGuest) return null;

  // Expired overlay
  if (expired) {
    return <GuestExpiredOverlay stats={stats} />;
  }

  // Determine urgency level
  const urgency =
    percentRemaining > 50
      ? "low"
      : percentRemaining > 25
        ? "medium"
        : "high";

  // Allow dismissing only at low urgency
  if (dismissed && urgency === "low") return null;

  // Banner styles based on urgency
  const bannerStyles = {
    low: "bg-primary-600/90 text-white",
    medium: "bg-amber-500/95 text-amber-950",
    high: "bg-red-600 text-white animate-pulse",
  };

  const urgencyMessage =
    urgency === "low"
      ? null
      : urgency === "medium"
        ? copy.timeRunningOut
        : copy.almostExpired;

  const urgencySubtext =
    urgency === "low"
      ? null
      : urgency === "medium"
        ? copy.signUpToSave
        : copy.signUpNow;

  return (
    <div
      className={`sticky top-0 z-50 backdrop-blur-sm ${bannerStyles[urgency]} transition-all duration-300`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center justify-between gap-3">
        {/* Left: countdown */}
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">
            {urgencyMessage && (
              <span className="font-bold mr-1">{urgencyMessage}</span>
            )}
            {timeDisplay} {copy.remaining}
          </span>
          {urgencySubtext && (
            <span className="hidden sm:inline text-xs opacity-80">
              {" "}
              &mdash; {urgencySubtext}
            </span>
          )}
        </div>

        {/* Right: CTA + dismiss */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/claim-account")}
            className={`px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors flex items-center gap-1.5 ${
              urgency === "low"
                ? "bg-white/20 hover:bg-white/30 text-white"
                : urgency === "medium"
                  ? "bg-amber-900 hover:bg-amber-950 text-white"
                  : "bg-white hover:bg-gray-100 text-red-700"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            {copy.createAccount}
          </button>
          {urgency === "low" && (
            <button
              onClick={() => setDismissed(true)}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

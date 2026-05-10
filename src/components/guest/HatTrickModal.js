"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { useGuestPrompts } from "@/lib/contexts/GuestPromptContext";
import { X, Trophy, Star, Sparkles, Flame } from "lucide-react";

const translations = {
  en: {
    title: "Hat-trick!",
    subtitle: "You've completed {count} challenges",
    message:
      "You're on fire! Create a free account to keep your winning streak and track your progress.",
    stats: {
      challenges: "Challenges",
      xp: "XP Earned",
    },
    createAccount: "Lock in My Progress",
    continuePlaying: "Keep Playing",
  },
  pt: {
    title: "Hat-trick!",
    subtitle: "Você completou {count} desafios",
    message:
      "Você está em chamas! Crie uma conta gratuita para manter sua sequência de vitórias e acompanhar seu progresso.",
    stats: {
      challenges: "Desafios",
      xp: "XP Ganho",
    },
    createAccount: "Garantir Meu Progresso",
    continuePlaying: "Continuar Jogando",
  },
  th: {
    title: "แฮตทริก!",
    subtitle: "คุณทำสำเร็จ {count} ความท้าทาย",
    message:
      "คุณกำลังร้อนแรง! สร้างบัญชีฟรีเพื่อรักษาสถิติชัยชนะและติดตามความก้าวหน้าของคุณ",
    stats: {
      challenges: "ความท้าทาย",
      xp: "XP ที่ได้รับ",
    },
    createAccount: "ล็อคความก้าวหน้า",
    continuePlaying: "เล่นต่อ",
  },
};

/**
 * HatTrickModal - Celebration modal that appears after 3rd lesson completion.
 * Sports-themed "Hat-trick!" celebration with XP stats.
 */
export default function HatTrickModal() {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = translations[lang] || translations.en;
  const { shouldShowHatTrick, stats, updatePromptState } = useGuestPrompts();

  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Show with a slight delay for better UX
  useEffect(() => {
    if (shouldShowHatTrick) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [shouldShowHatTrick]);

  if (!shouldShowHatTrick || !visible) return null;

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      updatePromptState("hatTrickShown", true);
    }, 300);
  };

  const handleCreateAccount = () => {
    updatePromptState("hatTrickShown", true);
    router.push("/claim-account");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className={`relative max-w-md w-full transition-all duration-300 ${
          exiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Celebration header */}
          <div className="relative px-6 pt-8 pb-6 bg-gradient-to-br from-accent-400 via-accent-500 to-accent-700 text-white overflow-hidden">
            {/* Animated sparkles and flames */}
            <div className="absolute inset-0 overflow-hidden">
              <Sparkles className="absolute top-4 left-8 w-6 h-6 text-white/30 animate-pulse" />
              <Star
                className="absolute top-8 right-12 w-5 h-5 text-yellow-300/50 animate-bounce"
                style={{ animationDelay: "0.2s" }}
              />
              <Flame
                className="absolute bottom-6 left-16 w-5 h-5 text-orange-300/40 animate-pulse"
                style={{ animationDelay: "0.4s" }}
              />
              <Star
                className="absolute bottom-4 right-8 w-6 h-6 text-yellow-300/40 animate-bounce"
                style={{ animationDelay: "0.6s" }}
              />
              <Flame
                className="absolute top-12 left-1/2 w-4 h-4 text-orange-300/30 animate-pulse"
                style={{ animationDelay: "0.3s" }}
              />
            </div>

            <div className="relative text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 rounded-full mb-4 animate-bounce">
                <span className="text-5xl">⚽</span>
              </div>
              <h2 className="text-3xl font-bold">{copy.title}</h2>
              <p className="text-white/90 mt-1 flex items-center justify-center gap-2">
                <Flame className="w-4 h-4 text-orange-300" />
                {copy.subtitle.replace("{count}", stats.lessons)}
                <Flame className="w-4 h-4 text-orange-300" />
              </p>
            </div>
          </div>

          {/* Stats cards */}
          <div className="px-6 -mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-accent-600 dark:text-accent-400">
                  {stats.lessons}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
                  {copy.stats.challenges}
                </p>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {stats.xp?.toLocaleString() || 0}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide mt-1">
                  {copy.stats.xp}
                </p>
              </div>
            </div>
          </div>

          {/* Message and actions */}
          <div className="px-6 py-6">
            <p className="text-center text-gray-600 dark:text-gray-300 mb-6">
              {copy.message}
            </p>

            <div className="space-y-3">
              <button
                onClick={handleCreateAccount}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-colors shadow-lg hover:shadow-xl"
              >
                <Trophy className="w-5 h-5" />
                {copy.createAccount}
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-3 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium rounded-xl transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                {copy.continuePlaying}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

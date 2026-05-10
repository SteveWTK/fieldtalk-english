"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { useGuestPrompts } from "@/lib/contexts/GuestPromptContext";
import { X, UserPlus, Clock } from "lucide-react";

const translations = {
  en: {
    title: "Leaving so soon?",
    message: "Don't lose your progress! Create a free account to save your XP and continue where you left off.",
    createAccount: "Save My Progress",
    continueAsGuest: "Continue as Guest",
  },
  pt: {
    title: "Saindo tão cedo?",
    message: "Não perca seu progresso! Crie uma conta gratuita para salvar seu XP e continuar de onde parou.",
    createAccount: "Salvar Meu Progresso",
    continueAsGuest: "Continuar como Visitante",
  },
  th: {
    title: "จะไปแล้วเหรอ?",
    message: "อย่าเสียความก้าวหน้าของคุณ! สร้างบัญชีฟรีเพื่อบันทึก XP และดำเนินการต่อจากจุดที่คุณหยุด",
    createAccount: "บันทึกความก้าวหน้า",
    continueAsGuest: "ดำเนินการต่อในฐานะแขก",
  },
};

/**
 * ExitIntentPrompt - Desktop-only prompt when mouse leaves viewport.
 * Appears once per session to encourage account creation.
 */
export default function ExitIntentPrompt() {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = translations[lang] || translations.en;
  const { isGuest, stats, promptState, updatePromptState } = useGuestPrompts();

  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Exit intent detection (desktop only)
  useEffect(() => {
    if (!isGuest || promptState.exitIntentShown || stats.lessons < 1) return;

    // Only enable on desktop (no touch)
    if ("ontouchstart" in window) return;

    const handleMouseLeave = (e) => {
      // Check if mouse is leaving through the top of the viewport
      if (e.clientY <= 0 && !visible && !promptState.exitIntentShown) {
        setVisible(true);
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);
    return () => document.removeEventListener("mouseleave", handleMouseLeave);
  }, [isGuest, promptState.exitIntentShown, stats.lessons, visible]);

  if (!visible) return null;

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      updatePromptState("exitIntentShown", true);
      setVisible(false);
    }, 300);
  };

  const handleCreateAccount = () => {
    updatePromptState("exitIntentShown", true);
    router.push("/claim-account");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 bg-black/40 backdrop-blur-sm">
      <div
        className={`relative max-w-md w-full transition-all duration-300 ${
          exiting ? "opacity-0 -translate-y-4" : "opacity-100 translate-y-0"
        }`}
      >
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors z-10"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="p-6">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-attention-100 dark:bg-attention-900/30 flex items-center justify-center">
                <Clock className="w-8 h-8 text-attention-600 dark:text-attention-400" />
              </div>
            </div>

            {/* Content */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
              {copy.title}
            </h2>
            <p className="text-gray-600 dark:text-gray-300 text-center mb-6">
              {copy.message}
            </p>

            {/* Stats preview */}
            {stats.lessons > 0 && (
              <div className="flex justify-center gap-6 mb-6 py-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="text-center">
                  <p className="text-2xl font-bold text-accent-600 dark:text-accent-400">{stats.lessons}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Challenges</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.xp || 0}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">XP</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={handleCreateAccount}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-colors shadow-md hover:shadow-lg"
              >
                <UserPlus className="w-5 h-5" />
                {copy.createAccount}
              </button>
              <button
                onClick={handleDismiss}
                className="w-full py-2.5 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 font-medium rounded-xl transition-colors"
              >
                {copy.continueAsGuest}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

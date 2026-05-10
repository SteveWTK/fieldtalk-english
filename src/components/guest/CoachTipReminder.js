"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { useGuestPrompts } from "@/lib/contexts/GuestPromptContext";
import { X, UserPlus, Target } from "lucide-react";

const translations = {
  en: {
    coachSays: "Coach's Tip",
    message:
      "You're showing real potential! Create an account to track your progress and keep building your skills.",
    createAccount: "Join the Team",
    maybeLater: "Maybe later",
  },
  pt: {
    coachSays: "Dica do Treinador",
    message:
      "Você está mostrando potencial! Crie uma conta para acompanhar seu progresso e continuar desenvolvendo suas habilidades.",
    createAccount: "Entrar no Time",
    maybeLater: "Talvez depois",
  },
  th: {
    coachSays: "เคล็ดลับจากโค้ช",
    message:
      "คุณแสดงศักยภาพที่แท้จริง! สร้างบัญชีเพื่อติดตามความก้าวหน้าและพัฒนาทักษะของคุณ",
    createAccount: "เข้าร่วมทีม",
    maybeLater: "ไว้ทีหลัง",
  },
};

/**
 * CoachTipReminder - A motivational coach message modal
 * that appears after 2nd lesson completion.
 * Sports-themed replacement for SpeciesCompanionReminder.
 */
export default function CoachTipReminder() {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = translations[lang] || translations.en;
  const { shouldShowCoachTip, updatePromptState } = useGuestPrompts();

  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Show with a slight delay for better UX
  useEffect(() => {
    if (shouldShowCoachTip) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [shouldShowCoachTip]);

  if (!shouldShowCoachTip || !visible) return null;

  const handleDismiss = () => {
    setExiting(true);
    setTimeout(() => {
      updatePromptState("coachTipShown", true);
    }, 300);
  };

  const handleCreateAccount = () => {
    updatePromptState("coachTipShown", true);
    router.push("/claim-account");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div
        className={`relative max-w-sm w-full transition-all duration-300 ${
          exiting ? "opacity-0 scale-95" : "opacity-100 scale-100"
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

          {/* Coach header section */}
          <div className="relative pt-8 pb-4 px-6 bg-gradient-to-b from-accent-50 to-white dark:from-accent-900/30 dark:to-gray-800">
            <div className="flex justify-center">
              <div className="relative">
                {/* Coach icon/avatar */}
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg bg-gradient-to-br from-accent-500 to-accent-700 flex items-center justify-center">
                  <Target className="w-10 h-10 text-white" />
                </div>
                {/* Whistle emoji indicator */}
                <div className="absolute -top-1 -right-1 text-2xl animate-bounce">
                  🏆
                </div>
              </div>
            </div>

            {/* Coach label */}
            <p className="text-center mt-3 text-sm font-semibold text-accent-700 dark:text-accent-300 uppercase tracking-wide">
              {copy.coachSays}
            </p>
          </div>

          {/* Message content */}
          <div className="px-6 py-5">
            <p className="text-center text-gray-700 dark:text-gray-200 text-lg leading-relaxed">
              &quot;{copy.message}&quot;
            </p>

            {/* Action buttons */}
            <div className="mt-6 space-y-3">
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
                {copy.maybeLater}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

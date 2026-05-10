"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { useGuestPrompts } from "@/lib/contexts/GuestPromptContext";
import { Trophy, X, ChevronUp } from "lucide-react";

const translations = {
  en: {
    lockInXP: "Lock in your XP",
    createFreeAccount: "Create free account",
  },
  pt: {
    lockInXP: "Garanta seu XP",
    createFreeAccount: "Criar conta gratuita",
  },
  th: {
    lockInXP: "ล็อค XP ของคุณ",
    createFreeAccount: "สร้างบัญชีฟรี",
  },
};

/**
 * SaveProgressButton - Floating button that appears after 1st lesson completion.
 * Sports-themed: "Lock in your XP" messaging.
 * Can be minimized to just an icon, reappears on next session.
 */
export default function SaveProgressButton() {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = translations[lang] || translations.en;
  const { shouldShowFloatingButton, updatePromptState } = useGuestPrompts();

  const [minimized, setMinimized] = useState(false);

  if (!shouldShowFloatingButton) return null;

  const handleDismiss = () => {
    updatePromptState("floatingButtonDismissed", true);
  };

  const handleClick = () => {
    router.push("/claim-account");
  };

  // Minimized state - just a small icon button
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        className="fixed bottom-24 right-4 z-40 p-3 bg-accent-600 hover:bg-accent-700 text-white rounded-full shadow-lg transition-all duration-300 hover:scale-105"
        aria-label={copy.lockInXP}
      >
        <ChevronUp className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-24 right-4 z-40 animate-in slide-in-from-bottom-4 fade-in duration-500">
      <div className="relative bg-gradient-to-r from-accent-600 to-accent-700 text-white rounded-2xl shadow-xl overflow-hidden">
        {/* Subtle shimmer effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />

        <div className="relative p-4 pr-10">
          <button
            onClick={handleClick}
            className="flex items-center gap-3 group"
          >
            <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-colors">
              <Trophy className="w-5 h-5" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm">{copy.lockInXP}</p>
              <p className="text-xs text-white/80">{copy.createFreeAccount}</p>
            </div>
          </button>

          {/* Close/minimize buttons */}
          <div className="absolute top-1 right-1 flex flex-col gap-0.5">
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
              aria-label="Dismiss"
              title="Don't show again"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setMinimized(true)}
              className="p-1 hover:bg-white/20 rounded transition-colors rotate-180"
              aria-label="Minimize"
              title="Minimize"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

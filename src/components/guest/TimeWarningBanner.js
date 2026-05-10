"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { useGuestPrompts } from "@/lib/contexts/GuestPromptContext";
import { Clock, X, UserPlus, AlertTriangle } from "lucide-react";

const translations = {
  en: {
    warning30: {
      title: "30 minutes remaining",
      message: "Your guest access expires soon. Create an account to keep your progress!",
    },
    warning10: {
      title: "Only 10 minutes left!",
      message: "Don't lose your XP! Create an account now to save everything.",
    },
    createAccount: "Save My Progress",
    dismiss: "Dismiss",
  },
  pt: {
    warning30: {
      title: "30 minutos restantes",
      message: "Seu acesso de visitante expira em breve. Crie uma conta para manter seu progresso!",
    },
    warning10: {
      title: "Apenas 10 minutos restantes!",
      message: "Não perca seu XP! Crie uma conta agora para salvar tudo.",
    },
    createAccount: "Salvar Meu Progresso",
    dismiss: "Dispensar",
  },
  th: {
    warning30: {
      title: "เหลืออีก 30 นาที",
      message: "การเข้าถึงในฐานะแขกของคุณกำลังจะหมดอายุ สร้างบัญชีเพื่อรักษาความก้าวหน้า!",
    },
    warning10: {
      title: "เหลืออีกแค่ 10 นาที!",
      message: "อย่าเสีย XP ของคุณ! สร้างบัญชีตอนนี้เพื่อบันทึกทุกอย่าง",
    },
    createAccount: "บันทึกความก้าวหน้า",
    dismiss: "ปิด",
  },
};

/**
 * TimeWarningBanner - Banners at 30min and 10min remaining.
 * Shows urgency indicators as time runs out.
 */
export default function TimeWarningBanner() {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = translations[lang] || translations.en;
  const {
    shouldShowTimeWarning30,
    shouldShowTimeWarning10,
    getTimeRemaining,
    updatePromptState,
  } = useGuestPrompts();

  const [timeDisplay, setTimeDisplay] = useState("");

  // Update time display every second
  useEffect(() => {
    if (!shouldShowTimeWarning30 && !shouldShowTimeWarning10) return;

    const updateTime = () => {
      const remaining = getTimeRemaining();
      if (remaining === null || remaining <= 0) {
        setTimeDisplay("");
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeDisplay(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [shouldShowTimeWarning30, shouldShowTimeWarning10, getTimeRemaining]);

  const handleCreateAccount = () => {
    router.push("/claim-account");
  };

  // 10-minute warning (more urgent)
  if (shouldShowTimeWarning10) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom duration-500">
        <div className="bg-gradient-to-r from-red-600 to-red-700 text-white px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold flex items-center gap-2">
                  {copy.warning10.title}
                  {timeDisplay && (
                    <span className="text-sm bg-white/20 px-2 py-0.5 rounded font-mono">
                      {timeDisplay}
                    </span>
                  )}
                </p>
                <p className="text-sm text-white/90 hidden sm:block">
                  {copy.warning10.message}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateAccount}
                className="flex items-center gap-2 px-4 py-2 bg-white text-red-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">{copy.createAccount}</span>
                <span className="sm:hidden">Save</span>
              </button>
              <button
                onClick={() => updatePromptState("timeWarning10Dismissed", true)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label={copy.dismiss}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 30-minute warning
  if (shouldShowTimeWarning30) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 animate-in slide-in-from-bottom duration-500">
        <div className="bg-gradient-to-r from-attention-500 to-attention-600 text-white px-4 py-3 shadow-lg">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold flex items-center gap-2">
                  {copy.warning30.title}
                  {timeDisplay && (
                    <span className="text-sm bg-white/20 px-2 py-0.5 rounded font-mono">
                      {timeDisplay}
                    </span>
                  )}
                </p>
                <p className="text-sm text-white/90 hidden sm:block">
                  {copy.warning30.message}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreateAccount}
                className="flex items-center gap-2 px-4 py-2 bg-white text-attention-700 font-semibold rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">{copy.createAccount}</span>
                <span className="sm:hidden">Save</span>
              </button>
              <button
                onClick={() => updatePromptState("timeWarning30Dismissed", true)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label={copy.dismiss}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// src/components/FirstLessonPrompt.js
// Elegant "start here" prompt that appears on first visit to /lesson when
// the user has no completions yet. Sits above the lessons list and points
// downward at the first lesson card (which also gets a pulsing ring via
// the lesson page's render logic).
//
// Dismissal is persistent (localStorage) so the prompt only ever shows
// once. Once we want CTA prompts for later lessons / pillar transitions,
// we'll generalise this into a small prompt-sequence system.
"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

const STORAGE_KEY = "fieldtalk_first_lesson_prompt_dismissed";

export default function FirstLessonPrompt({ shouldShow, onDismiss }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  // Honour both the parent's "shouldShow" signal AND localStorage. Either
  // suppresses the prompt.
  useEffect(() => {
    if (!shouldShow) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "true") return;
    // Delay a beat so the page paints first — feels more like a guided tour
    // than a blocking modal.
    const tid = setTimeout(() => setVisible(true), 350);
    return () => clearTimeout(tid);
  }, [shouldShow]);

  const handleDismiss = () => {
    setClosing(true);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, "true");
      } catch {
        // ignore — non-fatal
      }
    }
    // Let the close animation play, then unmount + notify parent
    setTimeout(() => {
      setVisible(false);
      onDismiss?.();
    }, 220);
  };

  if (!visible) return null;

  return (
    <div
      className={`relative mb-4 max-w-fit ${
        closing ? "fl-prompt-closing" : "fl-prompt-enter"
      }`}
    >
      <div className="relative bg-gradient-to-r from-accent-500 to-accent-600 dark:from-accent-600 dark:to-accent-700 text-white rounded-xl px-4 py-3 sm:px-5 sm:py-3 shadow-lg shadow-accent-500/20 flex items-center gap-3">
        {/* <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 fl-prompt-icon" /> */}

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-tight">
            {t("start_here")}
          </p>
          {/* <p className="text-emerald-50/90 text-xs sm:text-sm mt-0.5 leading-tight">
            {t("start_journey_sub")}
          </p> */}
        </div>

        {/* <ChevronDown className="hidden sm:block w-6 h-6 flex-shrink-0 animate-bounce" /> */}

        <button
          type="button"
          onClick={handleDismiss}
          aria-label={t("dismiss")}
          className="flex-shrink-0 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>

      {/* Triangle pointing down at the first lesson card */}
      <div
        className="absolute left-8 sm:left-10 -bottom-2 w-4 h-4 bg-accent-500 dark:bg-accent-600 rotate-45"
        aria-hidden="true"
      />

      <style jsx>{`
        @keyframes fl-prompt-enter {
          0% {
            opacity: 0;
            transform: translateY(-12px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fl-prompt-out {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-8px);
          }
        }
        @keyframes fl-prompt-icon {
          0%,
          100% {
            transform: rotate(0deg) scale(1);
          }
          50% {
            transform: rotate(-8deg) scale(1.08);
          }
        }
        :global(.fl-prompt-enter) {
          animation: fl-prompt-enter 0.45s cubic-bezier(0.16, 1, 0.3, 1)
            forwards;
        }
        :global(.fl-prompt-closing) {
          animation: fl-prompt-out 0.22s ease-in forwards;
        }
        :global(.fl-prompt-icon) {
          animation: fl-prompt-icon 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

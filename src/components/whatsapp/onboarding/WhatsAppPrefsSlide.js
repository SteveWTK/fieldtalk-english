// src/components/whatsapp/onboarding/WhatsAppPrefsSlide.js
//
// Nudge-preferences slide (frequency + time-of-day). Shared between
// ProPathOnboarding, WelcomeOnboarding, and PhoneCollectionModal.
//
// Presentational component: parent holds state (frequency, timeSlot)
// and passes lang for i18n.
//
// Copy note: the "Every 3 days" option carries the "Recommended" flag
// because it's the least likely to feel spammy while still keeping
// weekly-users engaged. That default should be revisited after we
// see real WhatsApp engagement data — for now it's the safest pick.
"use client";

import { CalendarClock } from "lucide-react";

const FREQUENCY_OPTIONS = [
  { code: "daily", en: "Every day", pt: "Todos os dias" },
  {
    code: "every_3_days",
    en: "Every 3 days",
    pt: "A cada 3 dias",
    recommended: true,
  },
  { code: "weekly", en: "Once a week", pt: "Uma vez por semana" },
  {
    code: "off",
    en: "Only for big news",
    pt: "Apenas para notícias importantes",
  },
];

const TIME_SLOT_OPTIONS = [
  { code: "morning", en: "Morning", pt: "Manhã", hint: "07:00–11:00" },
  { code: "afternoon", en: "Afternoon", pt: "Tarde", hint: "12:00–17:00" },
  { code: "evening", en: "Evening", pt: "Noite", hint: "18:00–21:00" },
];

/**
 * @param {{
 *   lang: 'en' | 'pt',
 *   frequency: string,
 *   onFrequencyChange: (v: string) => void,
 *   timeSlot: string,
 *   onTimeSlotChange: (v: string) => void,
 * }} props
 */
export default function WhatsAppPrefsSlide({
  lang,
  frequency,
  onFrequencyChange,
  timeSlot,
  onTimeSlotChange,
}) {
  const isPt = lang === "pt";

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-accent-400/20 border border-accent-400/40 mx-auto mb-4 flex items-center justify-center shadow-[0_0_28px_rgba(163,230,53,0.18)]">
        <CalendarClock className="w-7 h-7 text-accent-300" />
      </div>

      <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300/80 font-bold mb-2">
        {isPt ? "Preferências" : "Preferences"}
      </p>
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
        {isPt
          ? "Quando seu técnico deve entrar em contato?"
          : "When should your coach reach out?"}
      </h2>
      <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed mb-6">
        {isPt
          ? "Você pode alterar isso depois no seu perfil."
          : "You can change these anytime in your profile."}
      </p>

      <div className="max-w-md mx-auto text-left">
        <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
          {isPt ? "Frequência de lembretes" : "Reminder frequency"}
        </label>
        <div className="space-y-1.5 mb-5">
          {FREQUENCY_OPTIONS.map((opt) => {
            const active = frequency === opt.code;
            const label = isPt ? opt.pt : opt.en;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => onFrequencyChange(opt.code)}
                aria-pressed={active}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                  active
                    ? "border-accent-400 bg-accent-400/10 text-accent-100 shadow-[0_0_18px_rgba(163,230,53,0.14)]"
                    : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25 hover:text-white"
                }`}
              >
                <span className="font-semibold">{label}</span>
                {opt.recommended && (
                  <span className="text-[10px] uppercase tracking-wider text-accent-300/90 font-bold">
                    {isPt ? "Recomendado" : "Recommended"}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
          {isPt ? "Horário preferido" : "Preferred time of day"}
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {TIME_SLOT_OPTIONS.map((opt) => {
            const active = timeSlot === opt.code;
            const label = isPt ? opt.pt : opt.en;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => onTimeSlotChange(opt.code)}
                aria-pressed={active}
                className={`px-2 py-2.5 rounded-lg border text-xs font-semibold transition-colors ${
                  active
                    ? "border-accent-400 bg-accent-400/10 text-accent-100 shadow-[0_0_18px_rgba(163,230,53,0.14)]"
                    : "border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25 hover:text-white"
                }`}
              >
                <div>{label}</div>
                <div className="text-[10px] font-normal text-white/40 mt-0.5">
                  {opt.hint}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

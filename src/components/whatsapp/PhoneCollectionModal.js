// src/components/whatsapp/PhoneCollectionModal.js
//
// Unclosable two-step modal that collects the WhatsApp phone + nudge
// preferences from any player whose `players.phone_e164` is null.
// Both new (post-onboarding) and existing (pre-WhatsApp launch) users
// hit this — dashboards mount it and it renders only when the profile
// says the phone is missing.
//
// Why an unclosable modal? Phone is mandatory per Steve's launch plan
// (WhatsApp coaching is the retention lever) AND LGPD consent must be
// collected explicitly, not assumed. There's no ESC / backdrop dismiss
// — the only way past it is a valid phone + a ticked consent box.
//
// Persists via PATCH /api/profile with:
//   { phone_e164, whatsapp_opted_in: true, whatsapp_consent_text,
//     whatsapp_nudge_frequency, whatsapp_nudge_time_slot }
//
// The consent text is bilingual and passed by-value so the server can
// snapshot the EXACT wording the user agreed to (LGPD audit trail).
"use client";

import React, { useState } from "react";
import { MessageCircle, Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/lib/contexts/LanguageContext";

const CONSENT_TEXT_EN =
  "I agree to receive WhatsApp messages from FieldTalk with practice reminders, encouragement, tips, and updates. I can opt out at any time by replying STOP.";
const CONSENT_TEXT_PT =
  "Concordo em receber mensagens do FieldTalk no WhatsApp com lembretes de prática, incentivos, dicas e novidades. Posso cancelar a qualquer momento respondendo PARAR.";

const FREQUENCY_OPTIONS = [
  { code: "daily", en: "Every day", pt: "Todos os dias" },
  {
    code: "every_3_days",
    en: "Every 3 days",
    pt: "A cada 3 dias",
    recommended: true,
  },
  { code: "weekly", en: "Once a week", pt: "Uma vez por semana" },
  { code: "off", en: "Only for big news", pt: "Apenas para notícias importantes" },
];

const TIME_SLOT_OPTIONS = [
  { code: "morning", en: "Morning", pt: "Manhã", hint: "07:00–11:00" },
  { code: "afternoon", en: "Afternoon", pt: "Tarde", hint: "12:00–17:00" },
  { code: "evening", en: "Evening", pt: "Noite", hint: "18:00–21:00" },
];

/**
 * @param {{ open: boolean, onSaved?: () => void }} props
 * onSaved fires after a successful PATCH so the parent can trigger a
 * profile refetch and unmount the modal.
 */
export default function PhoneCollectionModal({ open, onSaved }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();

  const [step, setStep] = useState(1);
  const [phoneInput, setPhoneInput] = useState("");
  const [consent, setConsent] = useState(false);
  const [frequency, setFrequency] = useState("every_3_days");
  const [timeSlot, setTimeSlot] = useState("morning");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const consentText = lang === "pt" ? CONSENT_TEXT_PT : CONSENT_TEXT_EN;

  const step1Complete = phoneInput.trim().length >= 8 && consent;

  const handleContinue = () => {
    if (!step1Complete) return;
    setError(null);
    setStep(2);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_e164: phoneInput.trim(),
          whatsapp_opted_in: true,
          whatsapp_consent_text: consentText,
          whatsapp_nudge_frequency: frequency,
          whatsapp_nudge_time_slot: timeSlot,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Common case: invalid phone. Show the server's reason and let
        // the user correct it. Step back to 1 so the phone field is
        // reachable again.
        setError(
          json.error ||
            (lang === "pt"
              ? "Não foi possível salvar. Verifique o número."
              : "Could not save. Please check the number.")
        );
        setSaving(false);
        setStep(1);
        return;
      }
      onSaved?.();
    } catch {
      setError(
        lang === "pt" ? "Erro de rede. Tente novamente." : "Network error. Try again."
      );
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      // Intentionally no onClick to close — this modal is mandatory. See
      // header comment for the rationale.
    >
      <div className="relative w-full max-w-md rounded-2xl bg-[#0b0b0b] border border-accent-400/30 p-6 sm:p-7 text-white shadow-2xl">
        {/* Icon + step badge */}
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 rounded-full bg-accent-400/15 border border-accent-400/40 flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-accent-300" />
          </div>
          <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">
            {t("wa_step_of", "Step {n} of 2").replace("{n}", step)}
          </span>
        </div>

        {step === 1 && (
          <>
            <h2 className="text-lg sm:text-xl font-bold mb-1">
              {t(
                "wa_intro_title",
                "Turn on WhatsApp coaching"
              )}
            </h2>
            <p className="text-sm text-white/60 mb-5 leading-relaxed">
              {t(
                "wa_intro_body",
                "Your FieldTalk coach will send friendly nudges, practice tips and encouragement — right where you already are."
              )}
            </p>

            <div className="mb-4">
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
                {t("wa_phone_label", "WhatsApp number")}
              </label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="+55 86 99999-8888"
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-accent-400"
              />
              <p className="mt-1 text-[11px] text-white/40">
                {t(
                  "wa_phone_hint",
                  "Include the country code (e.g. +55 for Brazil)."
                )}
              </p>
            </div>

            <label className="flex items-start gap-2.5 mb-5 cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/30 bg-white/5 text-accent-400 focus:ring-accent-400 shrink-0"
              />
              <span className="text-xs text-white/70 leading-relaxed">
                {consentText}
              </span>
            </label>

            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={!step1Complete}
              className="w-full py-2.5 rounded-full bg-accent-500 hover:bg-accent-400 text-[#070707] text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {t("wa_continue", "Continue")}
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="text-lg sm:text-xl font-bold mb-1">
              {t("wa_prefs_title", "When should your coach reach out?")}
            </h2>
            <p className="text-sm text-white/60 mb-5 leading-relaxed">
              {t(
                "wa_prefs_body",
                "You can change these anytime in your profile settings."
              )}
            </p>

            <div className="mb-5">
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                {t("wa_prefs_frequency_label", "Reminder frequency")}
              </label>
              <div className="space-y-1.5">
                {FREQUENCY_OPTIONS.map((opt) => {
                  const active = frequency === opt.code;
                  const label = lang === "pt" ? opt.pt : opt.en;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setFrequency(opt.code)}
                      aria-pressed={active}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-colors ${
                        active
                          ? "border-accent-400 bg-accent-400/10 text-accent-200"
                          : "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      <span className="font-semibold">{label}</span>
                      {opt.recommended && (
                        <span className="text-[10px] uppercase tracking-wider text-accent-300/80 font-bold">
                          {t("wa_recommended", "Recommended")}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
                {t("wa_prefs_time_label", "Preferred time of day")}
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {TIME_SLOT_OPTIONS.map((opt) => {
                  const active = timeSlot === opt.code;
                  const label = lang === "pt" ? opt.pt : opt.en;
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => setTimeSlot(opt.code)}
                      aria-pressed={active}
                      className={`px-2 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                        active
                          ? "border-accent-400 bg-accent-400/10 text-accent-200"
                          : "border-white/10 bg-white/[0.03] text-white/75 hover:border-white/25 hover:text-white"
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

            {error && (
              <div className="mb-3 p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={saving}
                className="px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm disabled:opacity-40"
              >
                {t("wa_back", "Back")}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-full bg-accent-500 hover:bg-accent-400 text-[#070707] text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving
                  ? t("wa_saving", "Saving…")
                  : t("wa_finish", "Finish")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

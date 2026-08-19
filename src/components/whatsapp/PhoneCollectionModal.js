// src/components/whatsapp/PhoneCollectionModal.js
//
// Unclosable two-step modal for existing users who signed up before
// WhatsApp launch (their `players.phone_e164` is null). New users
// flowing through onboarding now collect this inline — see the
// WhatsAppPhoneSlide + WhatsAppPrefsSlide steps inside
// ProPathOnboarding — so this modal is the catch-up path only.
//
// Why an unclosable modal? Phone is mandatory per Steve's launch plan
// (WhatsApp coaching is the retention lever) AND LGPD consent must be
// explicit, not assumed. There's no ESC / backdrop dismiss — the only
// way past it is a valid phone + a ticked consent box.
//
// Persists via PATCH /api/profile with:
//   { phone_e164, whatsapp_opted_in: true, whatsapp_consent_text,
//     whatsapp_nudge_frequency, whatsapp_nudge_time_slot }
//
// The consent text is bilingual and passed by-value so the server can
// snapshot the EXACT wording the user agreed to (LGPD audit trail).
// Copy is inline (not via t()) because the strings are unique to this
// modal and inline conditionals match the pattern used in the two
// onboarding components — one source of truth per string, no locale-
// dictionary miss risk.
"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { getConsentText } from "@/lib/whatsapp/consent";
import WhatsAppPhoneSlide from "@/components/whatsapp/onboarding/WhatsAppPhoneSlide";
import WhatsAppPrefsSlide from "@/components/whatsapp/onboarding/WhatsAppPrefsSlide";

/**
 * @param {{ open: boolean, onSaved?: () => void }} props
 * onSaved fires after a successful PATCH so the parent can trigger a
 * profile refetch and unmount the modal.
 */
export default function PhoneCollectionModal({ open, onSaved }) {
  const { lang } = useLanguage();
  const isPt = lang === "pt";

  const [step, setStep] = useState(1);
  const [phoneInput, setPhoneInput] = useState("");
  const [consent, setConsent] = useState(false);
  const [frequency, setFrequency] = useState("every_3_days");
  const [timeSlot, setTimeSlot] = useState("morning");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const consentText = getConsentText(lang);
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
            (isPt
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
        isPt ? "Erro de rede. Tente novamente." : "Network error. Try again."
      );
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      // Intentionally no onClick to close — this modal is mandatory. See
      // header comment for the rationale.
    >
      <div className="relative w-full max-w-lg my-8 rounded-2xl bg-[#0b0b0b] border border-accent-400/30 p-6 sm:p-8 text-white shadow-2xl">
        {/* Step counter — subtle, top-right */}
        <div className="flex items-center justify-end mb-4">
          <span className="text-[11px] uppercase tracking-wider text-white/40 font-semibold">
            {isPt
              ? `Passo ${step} de 2`
              : `Step ${step} of 2`}
          </span>
        </div>

        {step === 1 && (
          <WhatsAppPhoneSlide
            lang={lang}
            phoneValue={phoneInput}
            onPhoneChange={setPhoneInput}
            consent={consent}
            onConsentChange={setConsent}
            consentText={consentText}
          />
        )}

        {step === 2 && (
          <WhatsAppPrefsSlide
            lang={lang}
            frequency={frequency}
            onFrequencyChange={setFrequency}
            timeSlot={timeSlot}
            onTimeSlotChange={setTimeSlot}
          />
        )}

        {error && (
          <div className="mt-4 mx-auto max-w-md p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-2">
          {step === 2 && (
            <button
              type="button"
              onClick={() => setStep(1)}
              disabled={saving}
              className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
            >
              {isPt ? "Voltar" : "Back"}
            </button>
          )}
          {step === 1 ? (
            <button
              type="button"
              onClick={handleContinue}
              disabled={!step1Complete}
              className="px-6 py-2.5 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isPt ? "Continuar" : "Continue"}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-sm font-bold disabled:opacity-40 inline-flex items-center justify-center gap-2 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving
                ? isPt
                  ? "Salvando…"
                  : "Saving…"
                : isPt
                  ? "Concluir"
                  : "Finish"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

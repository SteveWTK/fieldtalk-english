// src/components/whatsapp/PhoneCollectionModal.js
//
// Unclosable single-step modal for existing users who signed up before
// WhatsApp launch (their `players.phone_e164` is null). New users
// flowing through onboarding now collect this inline — see the
// WhatsAppPhoneSlide step inside ProPathOnboarding — so this modal is
// the catch-up path only.
//
// The nudge-preferences step (frequency + time-of-day) was removed on
// 2026-08-24 to simplify the flow while broadcast plans firm up. The
// columns remain on the players table; the WhatsAppPrefsSlide component
// still exists and can be re-added as step 2 when preferences are
// wanted again.
//
// Why an unclosable modal? Phone is mandatory per Steve's launch plan
// (WhatsApp coaching is the retention lever) AND LGPD consent must be
// explicit, not assumed. There's no ESC / backdrop dismiss — the only
// way past it is a valid phone + a ticked consent box.
//
// Persists via PATCH /api/profile with:
//   { phone_e164, whatsapp_opted_in: true, whatsapp_consent_text }
//
// The consent text is bilingual and passed by-value so the server can
// snapshot the EXACT wording the user agreed to (LGPD audit trail).
"use client";

import React, { useState } from "react";
import { Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { getConsentText } from "@/lib/whatsapp/consent";
import WhatsAppPhoneSlide from "@/components/whatsapp/onboarding/WhatsAppPhoneSlide";

/**
 * @param {{ open: boolean, onSaved?: () => void }} props
 * onSaved fires after a successful PATCH so the parent can trigger a
 * profile refetch and unmount the modal.
 */
export default function PhoneCollectionModal({ open, onSaved }) {
  const { lang } = useLanguage();
  const isPt = lang === "pt";

  const [phoneInput, setPhoneInput] = useState("");
  const [consent, setConsent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const consentText = getConsentText(lang);
  const canSave = phoneInput.trim().length >= 8 && consent && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      // 1. Pre-check availability so users typing a number linked to
      //    another FieldTalk account get a friendly message instead
      //    of the raw duplicate error at commit time.
      const checkRes = await fetch("/api/profile/check-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneInput.trim() }),
      });
      const checkJson = await checkRes.json().catch(() => ({}));
      if (!checkRes.ok || checkJson.available === false) {
        setError(mapPhoneError(checkJson.reason || "generic", isPt));
        setSaving(false);
        return;
      }

      // 2. Commit — opts them in + snapshots consent.
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_e164: phoneInput.trim(),
          whatsapp_opted_in: true,
          whatsapp_consent_text: consentText,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        // Belt-and-braces: even after the pre-check, the DB might
        // reject if a duplicate was inserted between our check and
        // commit. Translate known error codes.
        const knownReason =
          json.error === "phone_in_use"
            ? "in_use"
            : typeof json.error === "string" &&
                json.error.toLowerCase().includes("invalid phone")
              ? "invalid_format"
              : null;
        setError(
          knownReason
            ? mapPhoneError(knownReason, isPt)
            : json.error ||
                (isPt
                  ? "Não foi possível salvar. Verifique o número."
                  : "Could not save. Please check the number."),
        );
        setSaving(false);
        return;
      }
      onSaved?.();
    } catch {
      setError(
        isPt ? "Erro de rede. Tente novamente." : "Network error. Try again.",
      );
      setSaving(false);
    }
  };

  // Local copy of the same helper in ProPathOnboarding — both surfaces
  // must show identical wording. If we grow more phone-facing UIs,
  // promote to a shared util.
  function mapPhoneError(reason, isPt) {
    if (reason === "in_use") {
      return isPt
        ? "Esse número já está vinculado a outra conta FieldTalk. Se é seu, entre com aquela conta ou use um número diferente."
        : "This number is already linked to another FieldTalk account. If it's yours, sign in with that account or use a different number.";
    }
    if (reason === "invalid_format") {
      return isPt
        ? "Número inválido. Verifique se digitou o código do país e o DDD corretamente."
        : "Invalid number. Check that you typed the country code and area code correctly.";
    }
    return isPt
      ? "Não foi possível verificar o número. Tente novamente."
      : "Could not verify the number. Please try again.";
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      // Intentionally no onClick to close — this modal is mandatory. See
      // header comment for the rationale.
    >
      <div className="relative w-full max-w-lg my-8 rounded-2xl bg-[#0b0b0b] border border-accent-400/30 p-6 sm:p-8 text-white shadow-2xl">
        <WhatsAppPhoneSlide
          lang={lang}
          phoneValue={phoneInput}
          onPhoneChange={setPhoneInput}
          consent={consent}
          onConsentChange={setConsent}
          consentText={consentText}
        />

        {error && (
          <div className="mt-4 mx-auto max-w-md p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-xs">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
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
        </div>
      </div>
    </div>
  );
}

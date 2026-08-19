// src/components/whatsapp/onboarding/WhatsAppPhoneSlide.js
//
// Phone + LGPD-consent slide. Used in three places:
//   1. As a slide inside ProPathOnboarding (post-goal, pre-ready).
//   2. As a slide inside WelcomeOnboarding (WC edition) — future.
//   3. Wrapped by PhoneCollectionModal for existing users who signed
//      up before WhatsApp launch.
//
// Presentational component: parent holds state (phone, consent) and
// the consent text (so the parent can send the exact snapshot to the
// API for LGPD audit — different callers might tweak wording).
//
// Visual language matches ProPathOnboarding's slide shell: centred
// eyebrow → title → body → interactive content, lime accent for
// focus states. The MessageCircle icon in a lime ring signals "this
// is the WhatsApp step" without needing a label.
"use client";

import { MessageCircle } from "lucide-react";

/**
 * @param {{
 *   lang: 'en' | 'pt',
 *   phoneValue: string,
 *   onPhoneChange: (v: string) => void,
 *   consent: boolean,
 *   onConsentChange: (v: boolean) => void,
 *   consentText: string,
 * }} props
 */
export default function WhatsAppPhoneSlide({
  lang,
  phoneValue,
  onPhoneChange,
  consent,
  onConsentChange,
  consentText,
}) {
  const isPt = lang === "pt";

  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-accent-400/20 border border-accent-400/40 mx-auto mb-4 flex items-center justify-center shadow-[0_0_28px_rgba(163,230,53,0.18)]">
        <MessageCircle className="w-7 h-7 text-accent-300" />
      </div>

      <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300/80 font-bold mb-2">
        {isPt ? "Técnico virtual" : "Virtual coach"}
      </p>
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
        {isPt ? "Seu técnico no WhatsApp" : "Your coach on WhatsApp"}
      </h2>
      <p className="text-sm sm:text-base text-white/70 max-w-md mx-auto leading-relaxed mb-6">
        {isPt
          ? "Imponha um ritmo de estudo com nosso técnico virtual com mensagens diretamente no seu WhatsApp."
          : "Set a study pace with our virtual coach, receiving messages directly on your WhatsApp."}
      </p>

      <div className="max-w-md mx-auto text-left">
        <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
          {isPt ? "Número do WhatsApp" : "WhatsApp number"}
        </label>
        <input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phoneValue}
          onChange={(e) => onPhoneChange(e.target.value)}
          placeholder="+55 86 99999-8888"
          className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/25 focus:outline-none focus:border-accent-400"
        />
        <p className="mt-1 text-[11px] text-white/40">
          {isPt
            ? "Inclua o código do país (ex: +55 para Brasil)."
            : "Include the country code (e.g. +55 for Brazil)."}
        </p>

        <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => onConsentChange(e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-white/30 bg-white/5 text-accent-400 focus:ring-accent-400 shrink-0"
          />
          <span className="text-xs text-white/70 leading-relaxed">
            {consentText}
          </span>
        </label>
      </div>
    </div>
  );
}

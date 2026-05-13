// src/hooks/useTranslation.js
// Translation hook — reads the current language from LanguageContext (the
// header toggle's source of truth) and resolves keys against the locale
// dictionaries loaded by `@/utils/translations`.
//
// Phase 1 of the translation centralisation: the hook no longer hits the
// Supabase `players.preferred_language` column on every mount. That DB column
// is preserved for server-side use (e.g. emails) but is not the client-side
// signal anymore — toggling the language in the header now instantly affects
// every component that uses this hook.
//
// Phase 2: getTranslation now falls back to English before returning the raw
// key, so missing keys in non-English locales show readable text.
//
// The `user` argument is accepted for backward compatibility with existing
// callers (e.g. `useTranslation(user)`) but is ignored.
"use client";

import { useLanguage } from "@/lib/contexts/LanguageContext";
import { getTranslation, getTranslations } from "@/utils/translations";

export function useTranslation(/* user (unused, retained for back-compat) */) {
  const { lang } = useLanguage();
  const userLanguage = lang || "en";

  const t = (key, fallback = "") => getTranslation(key, userLanguage, fallback);
  const translations = (keys) => getTranslations(keys, userLanguage);

  return {
    userLanguage,
    t,
    translations,
    // Kept for back-compat with components that read `loading` — always false
    // now because the language is available synchronously from context.
    loading: false,
  };
}

// src/utils/translations.js
//
// Phase 2 of the translation centralisation. Strings now live in JSON locale
// files (one per locale) under src/locales/. This module is a thin shim that
// loads those files and provides the same lookup API the rest of the codebase
// already uses (`getTranslation`, `getTranslations`, `UI_TRANSLATIONS`,
// `getUserLanguage`) — so no caller has to change to benefit from:
//
//   1. Complete English coverage (no more raw snake_case fallbacks).
//   2. A proper fallback chain: target locale → English → caller fallback → key.
//   3. Dev-time warnings on missing keys, so gaps are visible.
//   4. Easy expansion: drop in `xx.json` and add `xx` to the languageOptions.

import en from "@/locales/en.json";
import pt from "@/locales/pt.json";
import es from "@/locales/es.json";
import th from "@/locales/th.json";

export const UI_TRANSLATIONS = { en, pt, es, th };

const SUPPORTED = new Set(["en", "pt", "es", "th"]);

function normalise(language) {
  if (!language) return "en";
  // Legacy DB rows or browser locales may still carry "pt-BR".
  if (language === "pt-BR") return "pt";
  // Generic browser locale like "en-US" → "en"
  const short = language.slice(0, 2);
  return SUPPORTED.has(short) ? short : "en";
}

const warnedKeys = new Set();

/**
 * Get translation for a key based on user's preferred language.
 * Fallback chain: target language → English → caller fallback → the key itself.
 *
 * @param {string} key - Translation key
 * @param {string} language - User's preferred language (en, pt, es, th)
 * @param {string} fallback - Fallback text if no translation found
 * @returns {string} Translated text
 */
export function getTranslation(key, language = "en", fallback = "") {
  const target = normalise(language);
  const langDict = UI_TRANSLATIONS[target] || {};
  const enDict = UI_TRANSLATIONS.en || {};

  if (langDict[key]) return langDict[key];
  if (enDict[key]) return enDict[key];

  // Surface missing keys in dev so they get filled in, not silently fall through.
  if (
    typeof process !== "undefined" &&
    process.env?.NODE_ENV !== "production" &&
    !enDict[key] &&
    !warnedKeys.has(key)
  ) {
    warnedKeys.add(key);
    // eslint-disable-next-line no-console
    console.warn(`[i18n] Missing translation key: "${key}"`);
  }

  return fallback || key;
}

/**
 * Get multiple translations at once.
 * @param {Array<string>} keys - Array of translation keys
 * @param {string} language - User's preferred language
 * @returns {Object} Object with key-value pairs of translations
 */
export function getTranslations(keys, language = "en") {
  const result = {};
  keys.forEach((key) => {
    result[key] = getTranslation(key, language);
  });
  return result;
}

/**
 * Get the user's preferred language with normalisation applied.
 * Retained for back-compat; new code should read `lang` from LanguageContext.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getUserLanguage(user, defaultLang = "pt") {
  return normalise(defaultLang);
}

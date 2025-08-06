// src/lib/hooks.js
"use client";

import { useEffect, useState } from "react";

export function useDarkMode(defaultValue = false) {
  const [darkMode, setDarkMode] = useState(defaultValue);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Get initial value from localStorage or system preference
    const stored = localStorage.getItem("fieldtalk-darkMode");
    let initialDarkMode = defaultValue;

    if (stored !== null) {
      initialDarkMode = stored === "true";
    } else {
      // Auto-detect system preference
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      initialDarkMode = prefersDark;
      // Save the initial preference
      localStorage.setItem("fieldtalk-darkMode", initialDarkMode.toString());
    }

    setDarkMode(initialDarkMode);
    setIsLoaded(true);

    // Apply immediately to document
    applyTheme(initialDarkMode);
  }, [defaultValue]);

  const applyTheme = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);

    // Update localStorage
    localStorage.setItem("fieldtalk-darkMode", newMode.toString());

    // Apply theme immediately
    applyTheme(newMode);
  };

  return { darkMode, setDarkMode: toggleDarkMode, isLoaded };
}

const languageOptions = {
  en: { label: "English", flag: "🇬🇧" },
  pt: { label: "Português", flag: "🇧🇷" },
  es: { label: "Español", flag: "🇪🇸" },
  fr: { label: "Français", flag: "🇫🇷" },
};

export function useLanguage(defaultLang = "en") {
  const [lang, setLang] = useState(defaultLang);

  useEffect(() => {
    const stored = localStorage.getItem("fieldtalk-lang");
    if (stored && languageOptions[stored]) {
      setLang(stored);
    }
  }, []);

  const changeLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem("fieldtalk-lang", newLang);
  };

  return { lang, setLang: changeLang, languageOptions };
}

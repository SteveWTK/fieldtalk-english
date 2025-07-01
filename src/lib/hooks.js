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
    }

    setDarkMode(initialDarkMode);
    setIsLoaded(true);

    // Apply immediately to document
    if (initialDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);

    // Update localStorage
    localStorage.setItem("fieldtalk-darkMode", newMode.toString());

    // Update document class immediately
    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    if (isLoaded) {
      // Sync with localStorage whenever darkMode changes
      localStorage.setItem("fieldtalk-darkMode", darkMode.toString());

      // Update document class
      if (darkMode) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  }, [darkMode, isLoaded]);

  return { darkMode, setDarkMode: toggleDarkMode, isLoaded };
}

export function useLanguage(defaultLang = "en") {
  const [lang, setLang] = useState(defaultLang);

  const languageOptions = {
    en: { label: "English", flag: "🇬🇧" },
    pt: { label: "Português", flag: "🇧🇷" },
    es: { label: "Español", flag: "🇪🇸" },
    fr: { label: "Français", flag: "🇫🇷" },
  };

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

// src/app/(site)/layout.js
"use client";

import { useState, useEffect } from "react";
import SiteHeader from "@/components/SiteHeader";
import { LanguageProvider, useLanguage } from "@/lib/contexts/LanguageContext";

function SiteLayoutContent({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  const { lang, setLang } = useLanguage();

  // Language options for the header
  const languageOptions = {
    en: { label: "English", flag: "🇬🇧" },
    pt: { label: "Português", flag: "🇵🇹" },
    // es: { label: "Español", flag: "🇪🇸" },
    // fr: { label: "Français", flag: "🇫🇷" },
  };

  // Handle dark mode toggle
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <SiteHeader
        darkMode={darkMode}
        setDarkMode={toggleDarkMode}
        lang={lang}
        setLang={setLang}
        languageOptions={languageOptions}
      />
      <main>{children}</main>
    </div>
  );
}

export default function SiteLayout({ children }) {
  return (
    <LanguageProvider>
      <SiteLayoutContent>{children}</SiteLayoutContent>
    </LanguageProvider>
  );
}

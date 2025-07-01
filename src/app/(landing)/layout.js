"use client";

import React from "react";
import { useDarkMode, useLanguage } from "@/lib/hooks";

// Import the header component dynamically to avoid SSR issues
import dynamic from "next/dynamic";

const LandingHeader = dynamic(() => import("@/components/LandingHeader"), {
  ssr: false,
  loading: () => <div className="h-16 bg-white dark:bg-gray-900"></div>,
});

export default function LandingLayout({ children }) {
  const { darkMode, setDarkMode, isLoaded } = useDarkMode();
  const { lang, setLang, languageOptions } = useLanguage();

  // Don't render until dark mode preference is loaded to avoid flash
  if (!isLoaded) {
    return (
      <html lang="en">
        <body className="min-h-screen bg-white dark:bg-gray-900">
          <div className="animate-pulse">
            <div className="h-16 bg-gray-200 dark:bg-gray-800"></div>
            <div className="h-screen bg-gray-100 dark:bg-gray-900"></div>
          </div>
        </body>
      </html>
    );
  }

  return (
    <div
    // className={`min-h-screen transition-colors duration-300 ${darkMode ? "dark bg-gray-900" : "bg-white"}`}
    >
      <LandingHeader
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        lang={lang}
        setLang={setLang}
        languageOptions={languageOptions}
      />
      {children}
    </div>
  );
}

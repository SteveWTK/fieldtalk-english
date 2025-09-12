// lib\contexts\LanguageContext.js

"use client";

import { createContext, useContext, useState, useEffect } from "react";

export const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");
  const supportedLanguages = ["en", "pt"]; // example

  // Load language from localStorage on mount

  useEffect(() => {
    const storedLang = localStorage.getItem("preferredLanguage");
    if (storedLang) {
      setLangState(storedLang);
    } else {
      const browserLang = navigator.language.slice(0, 2);
      const fallbackLang = supportedLanguages.includes(browserLang)
        ? browserLang
        : "en"; // or your default

      setLangState(fallbackLang);
      localStorage.setItem("preferredLanguage", fallbackLang);
    }
  }, []);

  // useEffect(() => {
  //   const storedLang = localStorage.getItem("preferredLanguage");
  //   if (storedLang) {
  //     setLangState(storedLang);
  //   }
  // }, []);

  const setLang = (newLang) => {
    setLangState(newLang);
    localStorage.setItem("preferredLanguage", newLang);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

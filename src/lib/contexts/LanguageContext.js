// lib/contexts/LanguageContext.js
"use client";

import { createContext, useContext, useState, useEffect, useRef } from "react";
import { useAuth } from "@/components/AuthProvider";
import { createClient } from "@/lib/supabase/client";

// Default context value keeps consumers safe if used outside the provider —
// they get English instead of a crash on `.lang`.
export const LanguageContext = createContext({
  lang: "en",
  setLang: () => {},
});

const SUPPORTED = ["en", "pt", "es", "th"];

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");
  // Track which user we've already seeded from to avoid re-syncing every render
  // and to avoid the initial localStorage load triggering a DB write.
  const seededForUserIdRef = useRef(null);
  const { user } = useAuth();
  const userId = user?.id;

  // Load language from localStorage on mount.
  // Default is English — we no longer detect browser language. Cultura
  // Inglesa's pedagogical preference is target-language immersion, so even
  // Brazilian users see English UI on first visit. Users who explicitly
  // toggle to another language have that preference honoured on return.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedLang = localStorage.getItem("preferredLanguage");
    if (storedLang && SUPPORTED.includes(storedLang)) {
      setLangState(storedLang);
    } else {
      setLangState("en");
      localStorage.setItem("preferredLanguage", "en");
    }
  }, []);

  // Optional one-time DB → context seed: when an authenticated user lands and
  // they have a server-side preference, honour it (overriding any browser
  // fallback localStorage was using). We only do this ONCE per user per session.
  useEffect(() => {
    if (!userId || seededForUserIdRef.current === userId) return;
    seededForUserIdRef.current = userId;
    (async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("players")
          .select("preferred_language")
          .eq("id", userId)
          .single();
        if (!data?.preferred_language) return;
        const dbLang =
          data.preferred_language === "pt-BR"
            ? "pt"
            : data.preferred_language;
        if (SUPPORTED.includes(dbLang) && dbLang !== lang) {
          setLangState(dbLang);
          localStorage.setItem("preferredLanguage", dbLang);
        }
      } catch {
        // Non-fatal — DB column may not exist yet, or network blip
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Public setter — writes to context state, localStorage AND (fire-and-forget)
  // to the DB so server-side use cases see the user's choice.
  const setLang = (newLang) => {
    if (!SUPPORTED.includes(newLang)) return;
    setLangState(newLang);
    if (typeof window !== "undefined") {
      localStorage.setItem("preferredLanguage", newLang);
    }
    if (userId) {
      try {
        const supabase = createClient();
        supabase
          .from("players")
          .update({ preferred_language: newLang })
          .eq("id", userId)
          .then(() => {
            /* ignore */
          });
      } catch {
        // Non-fatal — DB write is opportunistic
      }
    }
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

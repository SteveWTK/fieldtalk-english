// src/app/(landing)/layout.js
"use client";

import { useState, useEffect } from "react";
import LandingHeader from "@/components/LandingHeader";
import Footer from "@/components/Footer";
import { useLanguage } from "@/lib/contexts/LanguageContext";

export default function LandingLayout({ children }) {
  const [darkMode, setDarkMode] = useState(false);
  // Read language from the root-level LanguageProvider so the landing
  // pages share the same toggle state as the rest of the site.
  const { lang, setLang } = useLanguage();

  // Language options for the header
  const languageOptions = {
    en: { label: "English", flag: "🇬🇧" },
    pt: { label: "Português", flag: "🇧🇷" },
    es: { label: "Español", flag: "🇪🇸" },
    th: { label: "ไทย", flag: "🇹🇭" },
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
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <LandingHeader
        darkMode={darkMode}
        setDarkMode={toggleDarkMode}
        lang={lang}
        setLang={setLang}
        languageOptions={languageOptions}
      />
      <main>{children}</main>
      <Footer />
    </div>
  );
}

// "use client";

// import React from "react";
// import { useDarkMode, useLanguage } from "@/lib/hooks";

// // Import the header component dynamically to avoid SSR issues
// import dynamic from "next/dynamic";

// const LandingHeader = dynamic(() => import("@/components/LandingHeader"), {
//   ssr: false,
//   loading: () => <div className="h-16 bg-white dark:bg-gray-900"></div>,
// });

// export default function LandingLayout({ children }) {
//   const { darkMode, setDarkMode, isLoaded } = useDarkMode();
//   const { lang, setLang, languageOptions } = useLanguage();

//   // Don't render until dark mode preference is loaded to avoid flash
//   if (!isLoaded) {
//     return (
//       <html lang="en">
//         <body className="min-h-screen bg-white dark:bg-gray-900">
//           <div className="animate-pulse">
//             <div className="h-16 bg-gray-200 dark:bg-gray-800"></div>
//             <div className="h-screen bg-gray-100 dark:bg-gray-900"></div>
//           </div>
//         </body>
//       </html>
//     );
//   }

//   return (
//     <div
//     // className={`min-h-screen transition-colors duration-300 ${darkMode ? "dark bg-gray-900" : "bg-white"}`}
//     >
//       <LandingHeader
//         darkMode={darkMode}
//         setDarkMode={setDarkMode}
//         lang={lang}
//         setLang={setLang}
//         languageOptions={languageOptions}
//       />
//       {children}
//     </div>
//   );
// }

"use client";

import HeaderBase from "./HeaderBase";

function LandingHeader({
  darkMode,
  setDarkMode,
  lang,
  setLang,
  languageOptions,
}) {
  return (
    <HeaderBase
      type="landing"
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      lang={lang}
      setLang={setLang}
      languageOptions={languageOptions}
    />
  );
}

export default LandingHeader;

"use client";

import HeaderBase from "./HeaderBase";

function SiteHeader({ darkMode, setDarkMode, lang, setLang, languageOptions }) {
  return (
    <HeaderBase
      type="site"
      darkMode={darkMode}
      setDarkMode={setDarkMode}
      lang={lang}
      setLang={setLang}
      languageOptions={languageOptions}
    />
  );
}

export default SiteHeader;

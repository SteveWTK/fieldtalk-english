import React from "react";

export function LocaleSwitcher({ locale = "pt", onChange, style }) {
  const label = locale === "pt" ? "PT · EN" : "EN · PT";
  return (
    <button type="button" onClick={() => onChange && onChange(locale === "pt" ? "en" : "pt")}
      style={{ fontFamily: "var(--gp-font-text)", fontSize: 12, color: "var(--gp-text-faint)", background: "none", border: "1px solid var(--gp-border-default)", borderRadius: "var(--gp-radius-pill)", padding: "6px 12px", cursor: "pointer", whiteSpace: "nowrap", flex: "none", ...style }}>
      {label}
    </button>
  );
}

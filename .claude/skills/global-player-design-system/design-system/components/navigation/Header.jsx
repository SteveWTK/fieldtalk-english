import React from "react";
import { Logo } from "../brand/Logo.jsx";
import { NavTabs } from "./NavTabs.jsx";
import { LocaleSwitcher } from "./LocaleSwitcher.jsx";
import { Avatar } from "../data/Avatar.jsx";

export function Header({ variant = "open", items = [], active, onSelect, locale = "pt", onLocaleChange, right, style }) {
  const crest = variant === "crest";
  return (
    <header style={{ background: "var(--gp-bg-panel)", borderBottom: "1px solid var(--gp-border-default)", padding: crest ? "20px 26px" : "16px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 34, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: crest ? 13 : 12 }}>
          <Logo mark={crest ? "crest" : "open"} tone={crest ? "tonalLight" : "tonalDark"} size={crest ? 37 : 24} sting="sweep" />
          <span style={{ fontFamily: "var(--gp-font-display)", fontWeight: "var(--gp-weight-black)", fontSize: 15, letterSpacing: "0.15em", color: "var(--gp-text-primary)", whiteSpace: "nowrap" }}>GLOBAL PLAYER</span>
        </div>
        <NavTabs items={items} active={active} onSelect={onSelect} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {right}
        <LocaleSwitcher locale={locale} onChange={onLocaleChange} />
        <Avatar size={32} />
      </div>
    </header>
  );
}

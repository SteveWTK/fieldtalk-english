import React from "react";
import { Logo } from "./Logo.jsx";

export function Lockup({ orientation = "horizontal", mark = "open", tone = "tonalDark", size = 34, slogan, wordmarkColor, style }) {
  const dark = tone !== "monoInk" && tone !== "tonalLight";
  const ink = wordmarkColor || (dark ? "var(--gp-slate-50)" : "var(--gp-slate-800)");
  const vertical = orientation === "vertical";
  const wordSize = Math.round(size * (vertical ? 0.5 : 0.46));
  return (
    <div style={{ display: "flex", flexDirection: vertical ? "column" : "row", alignItems: "center", gap: vertical ? size * 0.42 : size * 0.4, ...style }}>
      <Logo mark={mark} tone={tone} size={size} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: vertical ? "center" : "flex-start", gap: 10 }}>
        <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: "var(--gp-weight-black)", fontSize: wordSize, letterSpacing: "var(--gp-track-wordmark)", color: ink, textIndent: "0.2em", lineHeight: 1, whiteSpace: "nowrap" }}>GLOBAL PLAYER</div>
        {slogan && (
          <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: "var(--gp-weight-medium)", fontStyle: "italic", fontSize: Math.max(10, Math.round(wordSize * 0.36)), letterSpacing: "var(--gp-track-eyebrow)", textTransform: "uppercase", color: dark ? "var(--gp-lime-400)" : "var(--gp-lime-700)" }}>{slogan}</div>
        )}
      </div>
    </div>
  );
}

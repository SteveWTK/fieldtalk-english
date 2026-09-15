import React from "react";

const SIGNAL = { english: "var(--gp-signal-english)", mental: "var(--gp-signal-mental)", performance: "var(--gp-signal-performance)", alert: "var(--gp-signal-alert)" };

export function Chip({ selected = false, signal, as = "span", children, style, ...rest }) {
  const Tag = as;
  const sel = selected
    ? signal
      ? { background: SIGNAL[signal], color: "var(--gp-slate-800)", borderColor: "transparent" }
      : { background: "var(--gp-lime-400)", color: "var(--gp-slate-800)", borderColor: "transparent" }
    : { background: "transparent", color: "var(--gp-text-secondary)", borderColor: "var(--gp-border-strong)" };
  return (
    <Tag style={{ fontFamily: "var(--gp-font-text)", fontSize: 12, fontWeight: "var(--gp-weight-semibold)", borderRadius: "var(--gp-radius-pill)", padding: "7px 14px", border: "1px solid", cursor: as === "button" ? "pointer" : undefined, lineHeight: 1.3, transition: "all var(--gp-dur-micro) var(--gp-ease-out)", ...sel, ...style }} {...rest}>
      {children}
    </Tag>
  );
}

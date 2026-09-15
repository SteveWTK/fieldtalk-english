import React from "react";

export function Card({ label, nested = false, padding, children, style, ...rest }) {
  return (
    <div style={{ background: nested ? "var(--gp-bg-card)" : "var(--gp-bg-panel)", border: "1px solid var(--gp-border-default)", borderRadius: "var(--gp-radius-card)", padding: padding ?? "var(--gp-pad-card)", display: "flex", flexDirection: "column", gap: "var(--gp-space-3)", ...style }} {...rest}>
      {label && <div style={{ fontSize: "var(--gp-text-label)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gp-text-label-color)" }}>{label}</div>}
      {children}
    </div>
  );
}

import React from "react";

export function StatTile({ label, value, tone = "default", caption, style, ...rest }) {
  const color = tone === "accent" ? "var(--gp-text-accent)" : "var(--gp-text-primary)";
  return (
    <div style={{ border: "1px solid var(--gp-border-default)", borderRadius: "var(--gp-radius-card)", background: "var(--gp-bg-panel)", padding: 18, display: "flex", flexDirection: "column", gap: 6, ...style }} {...rest}>
      <div style={{ fontSize: "var(--gp-text-label)", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--gp-text-label-color)" }}>{label}</div>
      <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: "var(--gp-weight-black)", fontSize: 30, lineHeight: 1, color }}>{value}</div>
      {caption && <div style={{ fontSize: 12, color: "var(--gp-text-muted)" }}>{caption}</div>}
    </div>
  );
}

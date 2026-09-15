import React from "react";

export function Eyebrow({ children, tone = "accent", size = 12, style, ...rest }) {
  return (
    <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: "var(--gp-weight-medium)", fontStyle: "italic", fontSize: size, letterSpacing: "var(--gp-track-eyebrow)", textTransform: "uppercase", color: tone === "accent" ? "var(--gp-text-accent)" : tone === "muted" ? "var(--gp-text-muted)" : "var(--gp-text-primary)", ...style }} {...rest}>
      {children}
    </div>
  );
}

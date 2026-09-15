import React from "react";

export function Input({ label, hint, invalid = false, style, wrapperStyle, ...rest }) {
  const border = invalid ? "var(--gp-signal-alert)" : "var(--gp-border-strong)";
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, ...wrapperStyle }}>
      {label && <span style={{ fontSize: 12, color: "var(--gp-text-muted)" }}>{label}</span>}
      <input style={{ border: `1px solid ${border}`, borderRadius: "var(--gp-radius-control)", background: "var(--gp-bg-input)", padding: "13px 15px", fontFamily: "var(--gp-font-text)", fontSize: 15, color: "var(--gp-text-primary)", outline: "none", ...style }} {...rest} />
      {hint && <span style={{ fontSize: 12, color: invalid ? "var(--gp-signal-alert)" : "var(--gp-text-faint)" }}>{hint}</span>}
    </label>
  );
}

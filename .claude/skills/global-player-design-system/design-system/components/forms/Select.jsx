import React from "react";

export function Select({ label, options = [], active = false, style, wrapperStyle, ...rest }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, ...wrapperStyle }}>
      {label && <span style={{ fontSize: 12, color: "var(--gp-text-muted)" }}>{label}</span>}
      <div style={{ position: "relative", display: "flex" }}>
        <select style={{ appearance: "none", width: "100%", border: `1px solid ${active ? "var(--gp-border-focus)" : "var(--gp-border-strong)"}`, borderRadius: "var(--gp-radius-control)", background: "var(--gp-bg-input)", padding: "13px 38px 13px 15px", fontFamily: "var(--gp-font-text)", fontSize: 15, color: "var(--gp-text-primary)", outline: "none", cursor: "pointer", ...style }} {...rest}>
          {options.map((o) => (typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
        </select>
        <span aria-hidden="true" style={{ position: "absolute", right: 15, top: "50%", transform: "translateY(-50%)", color: "var(--gp-text-accent)", fontSize: 14, pointerEvents: "none" }}>▾</span>
      </div>
    </label>
  );
}

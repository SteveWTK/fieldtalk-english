import React from "react";

export function Switch({ checked = false, onChange, label, disabled = false, style }) {
  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 10, cursor: disabled ? "not-allowed" : "pointer", ...style }}>
      <button type="button" role="switch" aria-checked={checked} disabled={disabled} onClick={() => onChange && onChange(!checked)}
        style={{ width: 44, height: 24, flex: "none", padding: 3, boxSizing: "border-box", border: "none", borderRadius: "var(--gp-radius-pill)", background: disabled ? "var(--gp-action-disabled-bg)" : checked ? "var(--gp-lime-400)" : "var(--gp-slate-600)", display: "inline-flex", alignItems: "center", justifyContent: checked ? "flex-end" : "flex-start", cursor: "inherit", transition: "background var(--gp-dur-micro) var(--gp-ease-out)" }}>
        <span style={{ width: 18, height: 18, borderRadius: "var(--gp-radius-pill)", background: checked ? "var(--gp-slate-800)" : "var(--gp-slate-300)", display: "block" }} />
      </button>
      {label && <span style={{ fontFamily: "var(--gp-font-text)", fontSize: 13, color: "var(--gp-text-muted)" }}>{label}</span>}
    </label>
  );
}

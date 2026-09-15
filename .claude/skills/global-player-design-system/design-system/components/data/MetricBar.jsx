import React from "react";

const SIGNAL = { english: "var(--gp-signal-english)", mental: "var(--gp-signal-mental)", performance: "var(--gp-signal-performance)", alert: "var(--gp-signal-alert)", accent: "var(--gp-lime-400)" };

export function MetricBar({ label, value, signal = "accent", style }) {
  const fill = SIGNAL[signal] || SIGNAL.accent;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--gp-font-text)", fontSize: 12, color: "var(--gp-text-muted)" }}>
        <span>{label}</span>
        <span style={{ color: signal === "accent" ? "var(--gp-text-accent)" : "var(--gp-slate-100)" }}>{value}%</span>
      </div>
      <div style={{ height: 6, borderRadius: 3, background: "var(--gp-bg-track)", overflow: "hidden" }}>
        <div style={{ height: 6, width: `${Math.max(0, Math.min(100, value))}%`, borderRadius: 3, background: fill, transition: "width var(--gp-dur-ui) var(--gp-ease-ui)" }} />
      </div>
    </div>
  );
}

import React from "react";
import { Avatar } from "./Avatar.jsx";
import { MetricBar } from "./MetricBar.jsx";
import { Logo } from "../brand/Logo.jsx";

export function PlayerCard({ name, initials, meta, metrics = [], tone = "tonalDark", onClick, style }) {
  return (
    <div onClick={onClick} style={{ border: "1px solid var(--gp-border-default)", borderRadius: "var(--gp-radius-card)", background: "var(--gp-bg-card)", padding: "var(--gp-pad-card)", display: "flex", flexDirection: "column", gap: "var(--gp-space-4)", cursor: onClick ? "pointer" : undefined, transition: "border-color var(--gp-dur-micro) var(--gp-ease-out)", ...style }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Avatar initials={initials} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: "var(--gp-weight-bold)", fontSize: 17, color: "var(--gp-text-primary)" }}>{name}</div>
          <div style={{ fontSize: 12, color: "var(--gp-text-faint)" }}>{meta}</div>
        </div>
        <Logo mark="open" tone={tone} size={22} />
      </div>
      {metrics.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {metrics.map((m) => <MetricBar key={m.label} {...m} />)}
        </div>
      )}
    </div>
  );
}

import React from "react";

const BARS = ["M14 62 L50 44 L86 62", "M14 46 L50 28 L86 46", "M14 30 L50 12 L86 30"];
const TIERS = { academia: 1, clube: 2, federacao: 3 };

export function TierBadge({ tier = "academia", size = 31, style }) {
  const n = TIERS[tier] || 1;
  const shown = BARS.slice(0, n);
  const colors = n === 1 ? ["var(--gp-lime-400)"] : n === 2 ? ["var(--gp-slate-400)", "var(--gp-lime-400)"] : ["var(--gp-slate-500)", "var(--gp-slate-400)", "var(--gp-lime-400)"];
  return (
    <svg viewBox="0 0 100 74" width={Math.round((size * 100) / 74)} height={size} role="img" aria-label={tier} style={{ display: "block", flex: "none", ...style }}>
      {shown.map((d, i) => (
        <path key={d} d={d} fill="none" stroke={colors[i]} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}

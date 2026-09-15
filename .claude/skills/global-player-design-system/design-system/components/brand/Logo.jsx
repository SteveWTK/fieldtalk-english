import React from "react";

/* Geometry is verbatim from the Global Player production SVGs in assets/logos/.
   Never edit the path data, the stroke weights, or the bar order. */
const CREST_SHIELD = "M50 5 L91 20 V57 C91 82 72 96 50 103 C28 96 9 82 9 57 V20 Z";
const CREST_BARS = ["M28 66 L50 50 L72 66", "M28 52 L50 36 L72 52", "M28 38 L50 22 L72 38"];
const OPEN_BARS = ["M14 62 L50 44 L86 62", "M14 46 L50 28 L86 46", "M14 30 L50 12 L86 30"];

const RAMP = {
  tonalDark: ["var(--gp-slate-500)", "var(--gp-slate-400)", "var(--gp-lime-400)"],
  tonalLight: ["var(--gp-slate-400)", "var(--gp-slate-500)", "var(--gp-lime-700)"],
  monoWhite: ["var(--gp-slate-50)", "var(--gp-slate-50)", "var(--gp-slate-50)"],
  monoInk: ["var(--gp-slate-800)", "var(--gp-slate-800)", "var(--gp-slate-800)"],
  monoLime: ["var(--gp-lime-800)", "var(--gp-lime-900)", "var(--gp-slate-800)"],
  currentColor: ["currentColor", "currentColor", "currentColor"],
};

const STING = {
  none: () => undefined,
  stack: (i) => ({ animation: `gp-rise var(--gp-dur-entrance) var(--gp-ease-ui) ${i * 130}ms both` }),
  sweep: (i) => ({ animation: `gp-sweep 780ms var(--gp-ease-sweep) ${i * 90}ms both` }),
  draw: (i) => ({ strokeDasharray: 120, animation: `gp-draw 420ms ease-out ${340 + i * 110}ms both` }),
};

export function Logo({ mark = "open", tone = "tonalDark", size = 32, sting = "none", shieldColor, title = "Global Player", style, ...rest }) {
  const bars = RAMP[tone] || RAMP.tonalDark;
  const anim = STING[sting] || STING.none;
  const crest = mark === "crest";
  const w = crest ? Math.round((size * 100) / 108) : size;
  const h = crest ? size : Math.round((size * 74) / 100);
  const barWeight = crest ? (size < 48 ? 8 : 7) : size < 32 ? 12 : size < 64 ? 11 : 9;
  const shield = shieldColor || (tone === "monoInk" || tone === "tonalLight" ? "var(--gp-slate-800)" : tone === "currentColor" ? "currentColor" : "var(--gp-slate-50)");
  const paths = crest ? CREST_BARS : OPEN_BARS;
  return (
    <svg viewBox={crest ? "0 0 100 108" : "0 0 100 74"} width={w} height={h} role="img" aria-label={title} style={{ display: "block", flex: "none", ...style }} {...rest}>
      {crest && (
        <path d={CREST_SHIELD} fill="none" stroke={shield} strokeWidth={size < 48 ? 4.5 : 3.2}
          style={sting === "draw" ? { strokeDasharray: 340, animation: "gp-crest 900ms cubic-bezier(.65,0,.35,1) both" } : undefined} />
      )}
      {paths.map((d, i) => (
        <path key={d} d={d} fill="none" stroke={bars[i]} strokeWidth={barWeight} strokeLinecap="round" strokeLinejoin="round" style={anim(i)} />
      ))}
    </svg>
  );
}

// src/components/brand/GlobalPlayerLogo.js
//
// The Global Player mark, drawn as inline SVG. Two variants sharing
// the same three-chevron geometry:
//
//   variant="open"  → three chevrons alone (default; product UI,
//                     header, favicon, avatar). Minimum 16px.
//   variant="crest" → chevrons inside a shield (contracts, club
//                     portal, kit, banners, pitchside). Minimum 32px.
//
// Path data is verbatim from docs/brand/handoff/GlobalPlayerLogo.tsx
// and the design system's Logo.jsx. Do NOT edit path coords, stroke
// weights or the bar order — the mark's identity depends on those.
//
// Colour ramps map to our existing tailwind primary (slate) + accent
// (lime) tokens rather than the design-system's CSS variables, so
// the component renders correctly today without needing tokens/*.css
// wired in yet.

const CREST_SHIELD =
  "M50 5 L91 20 V57 C91 82 72 96 50 103 C28 96 9 82 9 57 V20 Z";
const CREST_BARS = [
  "M28 66 L50 50 L72 66", // bottom
  "M28 52 L50 36 L72 52", // middle
  "M28 38 L50 22 L72 38", // top (the lime bar)
];
const OPEN_BARS = [
  "M14 62 L50 44 L86 62", // bottom
  "M14 46 L50 28 L86 46", // middle
  "M14 30 L50 12 L86 30", // top (the lime bar)
];

// Colour ramps per tone. Order is [bottom, middle, top] — the top
// bar is always the accent (lime) in tonal renderings.
const RAMPS = {
  // Default for dark surfaces (product header, splash, social).
  // slate-500 → slate-400 → lime-400 rising into the accent.
  tonalDark: ["#475569", "#94a3b8", "#a3e635"],
  // For light surfaces (club portal, printed material). Top bar
  // shifts to lime-700 so it holds contrast on white.
  tonalLight: ["#94a3b8", "#475569", "#4d7c0f"],
  // One-colour reductions.
  monoWhite: ["#f8fafc", "#f8fafc", "#f8fafc"],
  monoInk: ["#0f172a", "#0f172a", "#0f172a"],
  monoLime: ["#365314", "#1a2e05", "#0f172a"],
  // Inherits `color` from the surrounding element — used inside
  // buttons or coloured chips where the mark should match the
  // text colour.
  currentColor: ["currentColor", "currentColor", "currentColor"],
};

/**
 * @param {{
 *   variant?: 'open' | 'crest',
 *   tone?: 'tonalDark' | 'tonalLight' | 'monoWhite' | 'monoInk' | 'monoLime' | 'currentColor',
 *   size?: number,           // height in px for crest; wide-format width for open
 *   shieldColor?: string,    // override the shield stroke (crest only)
 *   title?: string,          // accessibility label
 *   className?: string,
 *   style?: object,
 * }} props
 */
export default function GlobalPlayerLogo({
  variant = "open",
  tone = "tonalDark",
  size = 24,
  shieldColor,
  title = "Global Player",
  className,
  style,
}) {
  const bars = RAMPS[tone] || RAMPS.tonalDark;
  const crest = variant === "crest";
  // The crest is drawn on a 100×108 viewBox; open bars use 100×74.
  // Match aspect ratio when computing width from height (crest) or
  // height from width (open).
  const w = crest ? Math.round((size * 100) / 108) : size;
  const h = crest ? size : Math.round((size * 74) / 100);
  // Stroke weight steps up at small display sizes so the mark stays
  // legible in a nav bar / favicon context.
  const barWeight = crest
    ? size < 48
      ? 8
      : 7
    : size < 32
      ? 12
      : size < 64
        ? 11
        : 9;
  const shield =
    shieldColor ||
    (tone === "monoInk" || tone === "tonalLight"
      ? "#0f172a"
      : tone === "currentColor"
        ? "currentColor"
        : "#f8fafc");
  const paths = crest ? CREST_BARS : OPEN_BARS;

  return (
    <svg
      viewBox={crest ? "0 0 100 108" : "0 0 100 74"}
      width={w}
      height={h}
      role="img"
      aria-label={title}
      className={className}
      style={{ display: "block", flex: "none", ...style }}
    >
      {crest && (
        <path
          d={CREST_SHIELD}
          fill="none"
          stroke={shield}
          strokeWidth={size < 48 ? 4.5 : 3.2}
        />
      )}
      {paths.map((d, i) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={bars[i]}
          strokeWidth={barWeight}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

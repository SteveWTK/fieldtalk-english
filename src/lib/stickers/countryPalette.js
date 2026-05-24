// src/lib/stickers/countryPalette.js
//
// Kit-inspired colour palettes used by the fallback StickerCard render
// (the one that shows before real Recraft artwork is uploaded for each
// player). Returning hex strings keeps callers free to apply colour via
// inline style or via a Tailwind arbitrary-value class — no JIT issues.
//
// Add a new entry per country as the roster grows. `default` covers any
// country not explicitly listed.

const PALETTES = {
  bra: { primary: "#FEDD00", secondary: "#009C3B", text: "#0a0a0a" },
  eng: { primary: "#FFFFFF", secondary: "#CE1126", text: "#0a0a0a" },
  arg: { primary: "#75AADB", secondary: "#FFFFFF", text: "#0a0a0a" },
  fra: { primary: "#0055A4", secondary: "#EF4135", text: "#FFFFFF" },
  esp: { primary: "#C60B1E", secondary: "#FFC400", text: "#FFFFFF" },
  ger: { primary: "#000000", secondary: "#DD0000", text: "#FFFFFF" },
  prt: { primary: "#006600", secondary: "#FF0000", text: "#FFFFFF" },
  ned: { primary: "#FF6600", secondary: "#FFFFFF", text: "#0a0a0a" },
  ita: { primary: "#0066CC", secondary: "#FFFFFF", text: "#FFFFFF" },
  uru: { primary: "#0093DD", secondary: "#FFFFFF", text: "#0a0a0a" },
  mex: { primary: "#006847", secondary: "#CE1126", text: "#FFFFFF" },
  usa: { primary: "#3C3B6E", secondary: "#B22234", text: "#FFFFFF" },
  can: { primary: "#FF0000", secondary: "#FFFFFF", text: "#FFFFFF" },
  default: { primary: "#1e293b", secondary: "#475569", text: "#FFFFFF" },
};

export function getCountryPalette(countryCode) {
  if (!countryCode) return PALETTES.default;
  const key = String(countryCode).toLowerCase();
  return PALETTES[key] || PALETTES.default;
}

// Rarity styling — used by the card border / glow.
export const RARITY = {
  5: { label: "Legend",    ring: "#FACC15", glow: "rgba(250,204,21,0.55)" }, // gold
  4: { label: "Star",      ring: "#A78BFA", glow: "rgba(167,139,250,0.45)" }, // violet
  3: { label: "Regular",   ring: "#60A5FA", glow: "rgba(96,165,250,0.35)" }, // blue
  2: { label: "Squad",     ring: "#34D399", glow: "rgba(52,211,153,0.30)" }, // emerald
  1: { label: "Fringe",    ring: "#94A3B8", glow: "rgba(148,163,184,0.20)" }, // slate
};

export function getRarity(rating) {
  return RARITY[rating] || RARITY[3];
}

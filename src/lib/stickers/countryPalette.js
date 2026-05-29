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
  por: { primary: "#006600", secondary: "#FF0000", text: "#FFFFFF" },

  // ──────────────────────────────────────────────────────────────────────
  // GROUP A — Mexico (already), South Korea, South Africa, Czech Republic
  // ──────────────────────────────────────────────────────────────────────
  kor: { primary: "#C60C30", secondary: "#003478", text: "#FFFFFF" }, // South Korea — Taeguk red + navy
  rsa: { primary: "#FCB514", secondary: "#007749", text: "#0a0a0a" }, // South Africa — Bafana gold + green
  cze: { primary: "#D7141A", secondary: "#11457E", text: "#FFFFFF" }, // Czech Republic — red + blue

  // ──────────────────────────────────────────────────────────────────────
  // GROUP B — Canada (already), Switzerland, Qatar, Bosnia and Herzegovina
  // ──────────────────────────────────────────────────────────────────────
  sui: { primary: "#DA291C", secondary: "#FFFFFF", text: "#FFFFFF" }, // Switzerland — Swiss red + white cross
  qat: { primary: "#8A1538", secondary: "#FFFFFF", text: "#FFFFFF" }, // Qatar — maroon + white
  bih: { primary: "#002F6C", secondary: "#FECB00", text: "#FFFFFF" }, // Bosnia — navy blue + yellow

  // ──────────────────────────────────────────────────────────────────────
  // GROUP C — Brazil (already), Morocco, Haiti, Scotland
  // ──────────────────────────────────────────────────────────────────────
  mar: { primary: "#C1272D", secondary: "#006233", text: "#FFFFFF" }, // Morocco — Atlas Lions red + green
  hai: { primary: "#00209F", secondary: "#D21034", text: "#FFFFFF" }, // Haiti — blue + red
  sco: { primary: "#003478", secondary: "#FFFFFF", text: "#FFFFFF" }, // Scotland — dark navy + white

  // ──────────────────────────────────────────────────────────────────────
  // GROUP D — USA (already), Paraguay, Australia, Türkiye
  // ──────────────────────────────────────────────────────────────────────
  par: { primary: "#D52B1E", secondary: "#0038A8", text: "#FFFFFF" }, // Paraguay — Albirroja red + blue
  aus: { primary: "#FFD100", secondary: "#00843D", text: "#0a0a0a" }, // Australia — Socceroos gold + green
  tur: { primary: "#E30A17", secondary: "#FFFFFF", text: "#FFFFFF" }, // Türkiye — Turkish red + white

  // ──────────────────────────────────────────────────────────────────────
  // GROUP E — Germany (already), Curaçao, Ivory Coast, Ecuador
  // ──────────────────────────────────────────────────────────────────────
  cuw: { primary: "#002B7F", secondary: "#F9E814", text: "#FFFFFF" }, // Curaçao — blue + yellow
  civ: { primary: "#F77F00", secondary: "#009E60", text: "#0a0a0a" }, // Ivory Coast — Les Éléphants orange + green
  ecu: { primary: "#FFD100", secondary: "#034EA2", text: "#0a0a0a" }, // Ecuador — La Tri yellow + blue

  // ──────────────────────────────────────────────────────────────────────
  // GROUP F — Netherlands (already), Japan, Tunisia, Sweden
  // ──────────────────────────────────────────────────────────────────────
  jpn: { primary: "#001E62", secondary: "#FFFFFF", text: "#FFFFFF" }, // Japan — Samurai Blue + white
  tun: { primary: "#E70013", secondary: "#FFFFFF", text: "#FFFFFF" }, // Tunisia — Carthage Eagles red + white
  swe: { primary: "#FFCD00", secondary: "#006AA7", text: "#0a0a0a" }, // Sweden — yellow + blue

  // ──────────────────────────────────────────────────────────────────────
  // GROUP G — Belgium, Egypt, Iran, New Zealand
  // ──────────────────────────────────────────────────────────────────────
  bel: { primary: "#ED2939", secondary: "#FAE042", text: "#FFFFFF" }, // Belgium — Red Devils + yellow
  egy: { primary: "#C8102E", secondary: "#FFFFFF", text: "#FFFFFF" }, // Egypt — Pharaohs red + white
  irn: { primary: "#FFFFFF", secondary: "#CE1126", text: "#0a0a0a" }, // Iran — Team Melli white + red
  nzl: { primary: "#FFFFFF", secondary: "#000000", text: "#0a0a0a" }, // New Zealand — All Whites + black

  // ──────────────────────────────────────────────────────────────────────
  // GROUP H — Spain (already), Uruguay (already), Cabo Verde, Saudi Arabia
  // ──────────────────────────────────────────────────────────────────────
  cpv: { primary: "#003893", secondary: "#FCD116", text: "#FFFFFF" }, // Cabo Verde — blue + yellow
  ksa: { primary: "#006C35", secondary: "#FFFFFF", text: "#FFFFFF" }, // Saudi Arabia — Saudi green + white

  // ──────────────────────────────────────────────────────────────────────
  // GROUP I — France (already), Senegal, Norway, Iraq
  // ──────────────────────────────────────────────────────────────────────
  sen: { primary: "#00853F", secondary: "#FCD116", text: "#FFFFFF" }, // Senegal — Lions of Teranga green + yellow
  nor: { primary: "#BA0C2F", secondary: "#003087", text: "#FFFFFF" }, // Norway — red + blue
  irq: { primary: "#FFFFFF", secondary: "#CE1126", text: "#0a0a0a" }, // Iraq — Lions of Mesopotamia white + red

  // ──────────────────────────────────────────────────────────────────────
  // GROUP J — Argentina (already), Algeria, Austria, Jordan
  // ──────────────────────────────────────────────────────────────────────
  alg: { primary: "#006233", secondary: "#FFFFFF", text: "#FFFFFF" }, // Algeria — Desert Foxes green + white
  aut: { primary: "#ED2939", secondary: "#FFFFFF", text: "#FFFFFF" }, // Austria — Das Team red + white
  jor: { primary: "#FFFFFF", secondary: "#CE1126", text: "#0a0a0a" }, // Jordan — Al-Nashama white + red

  // ──────────────────────────────────────────────────────────────────────
  // GROUP K — Portugal (already, see 'prt'), DR Congo, Uzbekistan, Colombia
  // ──────────────────────────────────────────────────────────────────────
  cod: { primary: "#007FFF", secondary: "#F7D618", text: "#FFFFFF" }, // DR Congo — sky blue + yellow
  uzb: { primary: "#FFFFFF", secondary: "#0099B5", text: "#0a0a0a" }, // Uzbekistan — white + cyan
  col: { primary: "#FCD116", secondary: "#003893", text: "#0a0a0a" }, // Colombia — Los Cafeteros yellow + blue

  // ──────────────────────────────────────────────────────────────────────
  // GROUP L — England (already), Croatia, Ghana, Panama
  // ──────────────────────────────────────────────────────────────────────
  cro: { primary: "#FF0000", secondary: "#FFFFFF", text: "#FFFFFF" }, // Croatia — checkerboard red + white
  gha: { primary: "#FFFFFF", secondary: "#FCD116", text: "#0a0a0a" }, // Ghana — Black Stars white + yellow
  pan: { primary: "#DA121A", secondary: "#005AA7", text: "#FFFFFF" }, // Panama — red + blue

  // ──────────────────────────────────────────────────────────────────────
  default: { primary: "#1e293b", secondary: "#475569", text: "#FFFFFF" },
};

export function getCountryPalette(countryCode) {
  if (!countryCode) return PALETTES.default;
  const key = String(countryCode).toLowerCase();
  return PALETTES[key] || PALETTES.default;
}

// Rarity styling — used by the card border / glow.
export const RARITY = {
  5: { label: "Legend", ring: "#FACC15", glow: "rgba(250,204,21,0.55)" }, // gold
  4: { label: "Star", ring: "#A78BFA", glow: "rgba(167,139,250,0.45)" }, // violet
  3: { label: "Regular", ring: "#60A5FA", glow: "rgba(96,165,250,0.35)" }, // blue
  2: { label: "Squad", ring: "#34D399", glow: "rgba(52,211,153,0.30)" }, // emerald
  1: { label: "Fringe", ring: "#94A3B8", glow: "rgba(148,163,184,0.20)" }, // slate
};

export function getRarity(rating) {
  return RARITY[rating] || RARITY[3];
}

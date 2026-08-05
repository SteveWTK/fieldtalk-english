// src/lib/players/positions.js
//
// Canonical football-position registry used by the Pro Path onboarding
// picker, the dashboard hero badge, and any future personalisation
// that pivots on position (recommended lessons, position-specific
// vocab, etc.).
//
// Codes are the stable persisted values (players.position). Labels
// are user-facing and localised. Adding a position: append a new
// entry — existing rows are unaffected since the DB column is TEXT
// with no enum. Removing/renaming: don't. The code lives in DB rows
// and would strand.
//
// Ordering below follows the natural formation walk (back to front,
// right to left within a line) so the picker reads as a formation
// rather than a random grid.

export const POSITIONS = [
  { code: "GK",  en: "Goalkeeper",             pt: "Goleiro" },
  { code: "RB",  en: "Right back",             pt: "Lateral direito" },
  { code: "CB",  en: "Centre back",            pt: "Zagueiro central" },
  { code: "LB",  en: "Left back",              pt: "Lateral esquerdo" },
  { code: "DM",  en: "Defensive midfielder",   pt: "Volante" },
  { code: "CM",  en: "Central midfielder",     pt: "Meio-campista" },
  { code: "AM",  en: "Attacking midfielder",   pt: "Meia atacante" },
  { code: "RW",  en: "Right winger",           pt: "Ponta direita" },
  { code: "LW",  en: "Left winger",            pt: "Ponta esquerda" },
  { code: "CF",  en: "Centre forward",         pt: "Centro-avante" },
  { code: "ST",  en: "Striker",                pt: "Atacante" },
];

// "Not sure yet" is offered on the picker but stored as NULL rather
// than 'UNSURE' so downstream code can treat "no position" and "hasn't
// decided" as one thing. Kept as an explicit UI option so the user
// doesn't feel forced to commit — critical for young players who
// legitimately play across the line.
export const NOT_SURE_YET = {
  code: null,
  en: "Not sure yet — I play across positions",
  pt: "Ainda não sei — jogo em várias posições",
};

export function getPosition(code) {
  if (!code) return null;
  return POSITIONS.find((p) => p.code === code) || null;
}

export function positionLabel(code, lang = "en") {
  const p = getPosition(code);
  if (!p) return null;
  return lang === "pt" ? p.pt : p.en;
}

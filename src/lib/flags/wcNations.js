// src/lib/flags/wcNations.js
//
// Curated list of (likely) WC2026 participating nations, with both:
//   - code3:  the 3-letter ISO code we use elsewhere (matches the
//             `country_code` field on sticker_players).
//   - code2:  the 2-letter ISO code, used by flagcdn.com to build URLs.
//             England / Scotland / Wales use special "gb-eng" style
//             codes that flagcdn supports natively.
//
// Adding a missing nation: append a row. Removing one: delete the row.
// The profile picker reads this directly.
//
// Flag art source — FLAG_SOURCE is the single switch that decides where
// flag images come from. Flip to "supabase" to serve them from our own
// Storage bucket if flagcdn.com is unreliable on the deploy platform.
// (Update SUPABASE_FLAG_BASE to match the exact bucket + path you
// uploaded the files to — file names are expected to be `<code2>.png`,
// e.g. `us.png`, `gb-eng.png`.)
const FLAG_SOURCE = "flagcdn"; // "flagcdn" | "supabase"

const SUPABASE_FLAG_BASE =
  "https://ojxmpejjvwfaxtlmcnuq.supabase.co/storage/v1/object/public/flags";

export const FLAG_URL_BUILDER = (code2, size = 80) => {
  if (FLAG_SOURCE === "supabase") {
    return `${SUPABASE_FLAG_BASE}/${code2}.png`;
  }
  return `https://flagcdn.com/w${size}/${code2}.png`;
};

export const WC_NATIONS = [
  // Hosts (confirmed)
  { code3: "usa", code2: "us", name: "USA" },
  { code3: "can", code2: "ca", name: "Canada" },
  { code3: "mex", code2: "mx", name: "Mexico" },
  // South America
  { code3: "bra", code2: "br", name: "Brazil" },
  { code3: "arg", code2: "ar", name: "Argentina" },
  { code3: "uru", code2: "uy", name: "Uruguay" },
  { code3: "col", code2: "co", name: "Colombia" },
  { code3: "ecu", code2: "ec", name: "Ecuador" },
  { code3: "par", code2: "py", name: "Paraguay" },
  { code3: "per", code2: "pe", name: "Peru" },
  { code3: "chi", code2: "cl", name: "Chile" },
  { code3: "ven", code2: "ve", name: "Venezuela" },
  // Europe — UEFA
  { code3: "eng", code2: "gb-eng", name: "England" },
  { code3: "fra", code2: "fr", name: "France" },
  { code3: "ger", code2: "de", name: "Germany" },
  { code3: "esp", code2: "es", name: "Spain" },
  { code3: "ita", code2: "it", name: "Italy" },
  { code3: "ned", code2: "nl", name: "Netherlands" },
  { code3: "prt", code2: "pt", name: "Portugal" },
  { code3: "bel", code2: "be", name: "Belgium" },
  { code3: "hrv", code2: "hr", name: "Croatia" },
  { code3: "srb", code2: "rs", name: "Serbia" },
  { code3: "pol", code2: "pl", name: "Poland" },
  { code3: "dnk", code2: "dk", name: "Denmark" },
  { code3: "che", code2: "ch", name: "Switzerland" },
  { code3: "aut", code2: "at", name: "Austria" },
  { code3: "sco", code2: "gb-sct", name: "Scotland" },
  { code3: "tur", code2: "tr", name: "Türkiye" },
  { code3: "nor", code2: "no", name: "Norway" },
  { code3: "swe", code2: "se", name: "Sweden" },
  { code3: "irl", code2: "ie", name: "Ireland" },
  { code3: "wal", code2: "gb-wls", name: "Wales" },
  // Africa — CAF
  { code3: "mar", code2: "ma", name: "Morocco" },
  { code3: "sen", code2: "sn", name: "Senegal" },
  { code3: "nga", code2: "ng", name: "Nigeria" },
  { code3: "gha", code2: "gh", name: "Ghana" },
  { code3: "egy", code2: "eg", name: "Egypt" },
  { code3: "civ", code2: "ci", name: "Côte d'Ivoire" },
  { code3: "tun", code2: "tn", name: "Tunisia" },
  { code3: "alg", code2: "dz", name: "Algeria" },
  { code3: "cmr", code2: "cm", name: "Cameroon" },
  // Asia — AFC
  { code3: "jpn", code2: "jp", name: "Japan" },
  { code3: "kor", code2: "kr", name: "South Korea" },
  { code3: "irn", code2: "ir", name: "Iran" },
  { code3: "sau", code2: "sa", name: "Saudi Arabia" },
  { code3: "aus", code2: "au", name: "Australia" },
  { code3: "qat", code2: "qa", name: "Qatar" },
  { code3: "uae", code2: "ae", name: "UAE" },
  { code3: "irq", code2: "iq", name: "Iraq" },
  // Oceania — OFC
  { code3: "nzl", code2: "nz", name: "New Zealand" },
];

export function findNation(code3) {
  if (!code3) return null;
  const norm = String(code3).toLowerCase();
  return WC_NATIONS.find((n) => n.code3 === norm) || null;
}

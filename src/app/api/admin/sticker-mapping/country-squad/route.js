// src/app/api/admin/sticker-mapping/country-squad/route.js
//
// Server-side helper that returns the FULL national-team squad for
// a given sticker's country, so the admin mapping modal can pick
// from ~26 candidates instead of "every player named Williams".
//
//   GET /api/admin/sticker-mapping/country-squad?country=<name>
//     → returns { team, candidates: [{ api_football_player_id,
//       name, position, number, age, photo, ... }] }
//
// Country name resolution chain (sticker_players.country is in
// Portuguese — API-Football uses English):
//   1. PT → EN translation via PT_TO_EN_COUNTRY
//   2. The raw country name verbatim (catches anything already
//      in English)
//   3. country_code fallback if the caller passed one
//
// Caching: two module-scope LRU-ish maps live for the lifetime of
// the serverless instance — country → team_id (saved across calls
// in the same warm function), team_id → squad list (same). Cuts
// the per-mapping API call count to roughly zero after the first
// click in each country.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

// Module-scope caches. Reset on cold start; safe because the
// underlying API-Football data is essentially static for the
// duration of WC2026.
const teamIdByCountry = new Map(); // english country name → { team_id, team }
const squadByTeamId = new Map(); // team_id → candidates[]

// Portuguese → English mapping for the 48 WC2026 nations. Covers
// the common spellings + a few accent-stripped variants in case
// the SQL dump dropped diacritics. Pass-through for anything
// already in English (Portugal, Honduras, Costa Rica, etc.).
const PT_TO_EN_COUNTRY = {
  // South America
  brasil: "Brazil",
  argentina: "Argentina",
  uruguai: "Uruguay",
  "colômbia": "Colombia",
  colombia: "Colombia",
  equador: "Ecuador",
  paraguai: "Paraguay",
  // CONCACAF / hosts
  "estados unidos": "USA",
  eua: "USA",
  "canadá": "Canada",
  canada: "Canada",
  "méxico": "Mexico",
  mexico: "Mexico",
  "costa rica": "Costa Rica",
  "panamá": "Panama",
  panama: "Panama",
  jamaica: "Jamaica",
  haiti: "Haiti",
  "curaçao": "Curacao",
  curacao: "Curacao",
  // Europe
  "frança": "France",
  franca: "France",
  alemanha: "Germany",
  espanha: "Spain",
  "itália": "Italy",
  italia: "Italy",
  portugal: "Portugal",
  inglaterra: "England",
  "escócia": "Scotland",
  escocia: "Scotland",
  "país de gales": "Wales",
  "pais de gales": "Wales",
  "irlanda do norte": "Northern Ireland",
  irlanda: "Republic of Ireland",
  "república da irlanda": "Republic of Ireland",
  "republica da irlanda": "Republic of Ireland",
  "bélgica": "Belgium",
  belgica: "Belgium",
  holanda: "Netherlands",
  "países baixos": "Netherlands",
  "paises baixos": "Netherlands",
  "croácia": "Croatia",
  croacia: "Croatia",
  "polônia": "Poland",
  polonia: "Poland",
  "suíça": "Switzerland",
  suica: "Switzerland",
  "áustria": "Austria",
  austria: "Austria",
  noruega: "Norway",
  "suécia": "Sweden",
  suecia: "Sweden",
  dinamarca: "Denmark",
  "sérvia": "Serbia",
  servia: "Serbia",
  "tchéquia": "Czech Republic",
  tchequia: "Czech Republic",
  "república tcheca": "Czech Republic",
  turquia: "Türkiye",
  "ucrânia": "Ukraine",
  ucrania: "Ukraine",
  "bósnia e herzegovina": "Bosnia and Herzegovina",
  "bosnia e herzegovina": "Bosnia and Herzegovina",
  hungria: "Hungary",
  "romênia": "Romania",
  romenia: "Romania",
  "eslováquia": "Slovakia",
  eslovaquia: "Slovakia",
  // Africa
  marrocos: "Morocco",
  senegal: "Senegal",
  "tunísia": "Tunisia",
  tunisia: "Tunisia",
  "argélia": "Algeria",
  argelia: "Algeria",
  egito: "Egypt",
  "nigéria": "Nigeria",
  nigeria: "Nigeria",
  "costa do marfim": "Ivory Coast",
  "camarões": "Cameroon",
  camaroes: "Cameroon",
  "cabo verde": "Cape Verde",
  gana: "Ghana",
  "áfrica do sul": "South Africa",
  "africa do sul": "South Africa",
  "rd congo": "DR Congo",
  "rdc": "DR Congo",
  "rep. dem. do congo": "DR Congo",
  "república democrática do congo": "DR Congo",
  "republica democratica do congo": "DR Congo",
  // Asia / Oceania
  "japão": "Japan",
  japao: "Japan",
  "coreia do sul": "South Korea",
  "ira": "Iran",
  "irã": "Iran",
  "arábia saudita": "Saudi Arabia",
  "arabia saudita": "Saudi Arabia",
  catar: "Qatar",
  "austrália": "Australia",
  australia: "Australia",
  "nova zelândia": "New Zealand",
  "nova zelandia": "New Zealand",
  "uzbequistão": "Uzbekistan",
  uzbequistao: "Uzbekistan",
  iraque: "Iraq",
  "jordânia": "Jordan",
  jordania: "Jordan",
};

function normaliseKey(s) {
  return (s || "").toLowerCase().trim();
}

function toEnglishCountry(raw) {
  const key = normaliseKey(raw);
  if (!key) return null;
  return PT_TO_EN_COUNTRY[key] || raw; // pass-through if not in dict
}

async function apiFetch(path, apiKey) {
  const res = await fetch(`${API_FOOTBALL_BASE}${path}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API-Football ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Find the national-team id for a country. Tries: cached lookup,
// then /teams?country=<en>, filtering to team.national === true.
async function findNationalTeamId(country, countryCode, apiKey) {
  const english = toEnglishCountry(country);
  const cacheKey = normaliseKey(english);

  if (cacheKey && teamIdByCountry.has(cacheKey)) {
    return teamIdByCountry.get(cacheKey);
  }

  const tryFetchByCountry = async (name) => {
    const payload = await apiFetch(
      `/teams?country=${encodeURIComponent(name)}`,
      apiKey
    );
    const teams = payload?.response || [];
    // Prefer team.national === true; fall back to the first match.
    const national =
      teams.find((r) => r?.team?.national === true) || teams[0] || null;
    return national?.team || null;
  };

  let team = null;
  try {
    if (english) team = await tryFetchByCountry(english);
  } catch {
    /* fall through */
  }
  // Fallback: search by 3-letter code if we got nothing
  if (!team && countryCode) {
    try {
      const payload = await apiFetch(
        `/teams?code=${encodeURIComponent(countryCode.toUpperCase())}`,
        apiKey
      );
      const teams = payload?.response || [];
      team =
        teams.find((r) => r?.team?.national === true)?.team ||
        teams[0]?.team ||
        null;
    } catch {
      /* give up */
    }
  }

  if (cacheKey && team) teamIdByCountry.set(cacheKey, { team_id: team.id, team });
  return team ? { team_id: team.id, team } : null;
}

async function fetchSquad(teamId, apiKey) {
  if (squadByTeamId.has(teamId)) return squadByTeamId.get(teamId);
  const payload = await apiFetch(`/players/squads?team=${teamId}`, apiKey);
  const players = payload?.response?.[0]?.players || [];
  const candidates = players.map((p) => ({
    api_football_player_id: p.id,
    name: p.name,
    age: p.age,
    number: p.number,
    position: p.position,
    photo: p.photo,
  }));
  squadByTeamId.set(teamId, candidates);
  return candidates;
}

export async function GET(request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY not configured" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const country = (url.searchParams.get("country") || "").trim();
  const countryCode = (url.searchParams.get("country_code") || "").trim();
  if (!country && !countryCode) {
    return NextResponse.json(
      { error: "country (or country_code) required" },
      { status: 400 }
    );
  }

  try {
    const found = await findNationalTeamId(
      country,
      countryCode,
      process.env.API_FOOTBALL_KEY
    );
    if (!found) {
      return NextResponse.json({
        team: null,
        candidates: [],
        message: `Could not find a national team for "${country || countryCode}".`,
      });
    }
    const candidates = await fetchSquad(
      found.team_id,
      process.env.API_FOOTBALL_KEY
    );
    // Sort by position so GKs first, then DEF, MID, FWD — much
    // easier for the admin to scan than the API's default order.
    const order = { Goalkeeper: 0, Defender: 1, Midfielder: 2, Attacker: 3 };
    candidates.sort((a, b) => {
      const oa = order[a.position] ?? 9;
      const ob = order[b.position] ?? 9;
      if (oa !== ob) return oa - ob;
      // Within a position, sort by shirt number when present.
      const na = a.number ?? 999;
      const nb = b.number ?? 999;
      return na - nb;
    });
    return NextResponse.json({
      team: found.team,
      candidates,
      total: candidates.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "API-Football lookup failed", details: err.message },
      { status: 502 }
    );
  }
}

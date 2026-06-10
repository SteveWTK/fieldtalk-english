// src/app/(site)/predictions/page.js
//
// Match Predictions Centre — the user-facing page where players see
// upcoming WC2026 matches and submit their picks. Linked from the
// dashboard banner and from push notifications.
//
// Auth: signed-in only (ProtectedRoute). The list API enforces
// the same — this is just for a friendlier bounce.
//
// Two tabs: Upcoming (predictable now, plus locked/awaiting matches
// you've already picked on) and Results (resolved matches with
// your scoreline of correct/wrong picks + XP earned).
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Trophy,
  Sparkles,
  Loader2,
  Filter,
  X,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { getPredictionsCopy } from "@/lib/predictions/copy";
import MatchCard from "@/components/predictions/MatchCard";

// Used for the country filter's dropdown label. Covers all 48 WC2026
// nations under both common code conventions: ISO 3166-1 alpha-2
// (lowercase, e.g. "br", "no") AND the FIFA 3-letter codes (e.g.
// "bra", "nor"). Whichever convention the matches table uses, the
// dropdown resolves to a human name. The four UK home nations don't
// have clean ISO-1 codes — they use ISO 3166-2 subdivisions
// (gb-eng, gb-sct, gb-wls, gb-nir) — those are included in both
// hyphenated form and shorthand form (eng, sco, wls, nir) for
// extra resilience.
//
// Anything not in this map falls back to the uppercased raw code
// so a country we haven't mapped still shows SOMETHING readable.
const COUNTRY_LABELS = {
  // ── Hosts ──
  us: "USA",
  usa: "USA",
  ca: "Canada",
  can: "Canada",
  mx: "Mexico",
  mex: "Mexico",
  // ── South America ──
  br: "Brasil",
  bra: "Brasil",
  ar: "Argentina",
  arg: "Argentina",
  uy: "Uruguay",
  uru: "Uruguay",
  co: "Colombia",
  col: "Colombia",
  ec: "Ecuador",
  ecu: "Ecuador",
  pe: "Peru",
  per: "Peru",
  py: "Paraguay",
  par: "Paraguay",
  cl: "Chile",
  chi: "Chile",
  bo: "Bolivia",
  bol: "Bolivia",
  ve: "Venezuela",
  ven: "Venezuela",
  // ── CONCACAF ──
  cr: "Costa Rica",
  crc: "Costa Rica",
  pa: "Panama",
  pan: "Panama",
  hn: "Honduras",
  hon: "Honduras",
  jm: "Jamaica",
  jam: "Jamaica",
  ht: "Haiti",
  hai: "Haiti",
  // Curaçao (was missing)
  cw: "Curaçao",
  cuw: "Curaçao",
  // ── Europe ──
  // England, Scotland, Wales, Northern Ireland — football competes as
  // separate nations. Subdivision codes (gb-eng) AND shorthand (eng)
  // both map. We removed the plain "gb" → "England" mapping that was
  // wrong (gb is the whole UK).
  "gb-eng": "England",
  eng: "England",
  "gb-sct": "Scotland",
  sco: "Scotland",
  "gb-wls": "Wales",
  wal: "Wales",
  wls: "Wales",
  "gb-nir": "Northern Ireland",
  nir: "Northern Ireland",
  fr: "France",
  fra: "France",
  de: "Germany",
  ger: "Germany",
  es: "Spain",
  esp: "Spain",
  it: "Italy",
  ita: "Italy",
  pt: "Portugal",
  por: "Portugal",
  nl: "Netherlands",
  ned: "Netherlands",
  be: "Belgium",
  bel: "Belgium",
  hr: "Croatia",
  cro: "Croatia",
  pl: "Poland",
  pol: "Poland",
  ch: "Switzerland",
  sui: "Switzerland",
  at: "Austria",
  aut: "Austria",
  // Norway, Sweden, Denmark (Norway + Sweden were missing)
  no: "Norway",
  nor: "Norway",
  se: "Sweden",
  swe: "Sweden",
  dk: "Denmark",
  den: "Denmark",
  rs: "Serbia",
  srb: "Serbia",
  cz: "Czechia",
  cze: "Czechia",
  tr: "Türkiye",
  tur: "Türkiye",
  ua: "Ukraine",
  ukr: "Ukraine",
  // Bosnia (was missing)
  ba: "Bosnia and Herzegovina",
  bih: "Bosnia and Herzegovina",
  // ── Africa ──
  ma: "Morocco",
  mar: "Morocco",
  sn: "Senegal",
  sen: "Senegal",
  tn: "Tunisia",
  tun: "Tunisia",
  dz: "Algeria",
  alg: "Algeria",
  eg: "Egypt",
  egy: "Egypt",
  ng: "Nigeria",
  nga: "Nigeria",
  ci: "Côte d'Ivoire",
  civ: "Côte d'Ivoire",
  cm: "Cameroon",
  cmr: "Cameroon",
  cv: "Cape Verde",
  cpv: "Cape Verde",
  gh: "Ghana",
  gha: "Ghana",
  za: "South Africa",
  rsa: "South Africa",
  // DR Congo (was missing)
  cd: "DR Congo",
  cod: "DR Congo",
  // ── Asia / Oceania ──
  jp: "Japan",
  jpn: "Japan",
  kr: "South Korea",
  kor: "South Korea",
  ir: "Iran",
  irn: "Iran",
  sa: "Saudi Arabia",
  ksa: "Saudi Arabia",
  qa: "Qatar",
  qat: "Qatar",
  au: "Australia",
  aus: "Australia",
  nz: "New Zealand",
  nzl: "New Zealand",
  uz: "Uzbekistan",
  uzb: "Uzbekistan",
  iq: "Iraq",
  irq: "Iraq",
  jo: "Jordan",
  jor: "Jordan",
};

const STAGE_LABELS = {
  group_a: "Group A",
  group_b: "Group B",
  group_c: "Group C",
  group_d: "Group D",
  group_e: "Group E",
  group_f: "Group F",
  group_g: "Group G",
  group_h: "Group H",
  group_i: "Group I",
  group_j: "Group J",
  group_k: "Group K",
  group_l: "Group L",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-finals",
  sf: "Semi-finals",
  third: "Third-place play-off",
  final: "Final",
};

const STAGE_LABELS_PT = {
  group_a: "Grupo A",
  group_b: "Grupo B",
  group_c: "Grupo C",
  group_d: "Grupo D",
  group_e: "Grupo E",
  group_f: "Grupo F",
  group_g: "Grupo G",
  group_h: "Grupo H",
  group_i: "Grupo I",
  group_j: "Grupo J",
  group_k: "Grupo K",
  group_l: "Grupo L",
  r32: "Trigésimas",
  r16: "Oitavas",
  qf: "Quartas",
  sf: "Semis",
  third: "Disputa do 3º lugar",
  final: "Final",
};

function PredictionsCentreContent() {
  const { lang } = useLanguage();
  const copy = getPredictionsCopy(lang);

  const [data, setData] = useState(null); // { upcoming, results, now }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("upcoming");
  // Country + group filters. "all" disables that axis. Match list
  // grows to ~104 matches across the tournament; client-side
  // filtering on a payload that small is instant and saves an
  // extra round-trip per filter change.
  const [countryFilter, setCountryFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/match-predictions/list");
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || "Failed to load");
        setData(null);
      } else {
        setError(null);
        setData(json);
      }
    } catch (err) {
      setError(err?.message || "Network error");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upcoming = data?.upcoming || [];
  const results = data?.results || [];

  // Available filter options derived from the loaded data — that
  // way the dropdowns never list a country/group that has no
  // matches behind it. Calculated across both buckets so flipping
  // tabs doesn't change the option set.
  const availableCountries = useMemo(() => {
    const set = new Set();
    for (const m of [...upcoming, ...results]) {
      if (m.home_team_code) set.add(m.home_team_code.toLowerCase());
      if (m.away_team_code) set.add(m.away_team_code.toLowerCase());
    }
    // Sort by display label rather than raw code so the dropdown
    // reads in alphabetical order of country names (Argentina,
    // Brasil, Cameroon…) regardless of whether the underlying code
    // is 2-letter ISO or 3-letter FIFA.
    return Array.from(set).sort((a, b) => {
      const la = COUNTRY_LABELS[a] || a.toUpperCase();
      const lb = COUNTRY_LABELS[b] || b.toUpperCase();
      return la.localeCompare(lb);
    });
  }, [upcoming, results]);

  const availableGroups = useMemo(() => {
    const set = new Set();
    for (const m of [...upcoming, ...results]) {
      if (m.stage) set.add(m.stage);
    }
    // Keep group_a..group_l ordering, then knockouts in bracket order.
    const order = [
      "group_a",
      "group_b",
      "group_c",
      "group_d",
      "group_e",
      "group_f",
      "group_g",
      "group_h",
      "group_i",
      "group_j",
      "group_k",
      "group_l",
      "r32",
      "r16",
      "qf",
      "sf",
      "third",
      "final",
    ];
    return Array.from(set).sort((a, b) => order.indexOf(a) - order.indexOf(b));
  }, [upcoming, results]);

  const filterMatch = (m) => {
    if (
      countryFilter !== "all" &&
      m.home_team_code?.toLowerCase() !== countryFilter &&
      m.away_team_code?.toLowerCase() !== countryFilter
    ) {
      return false;
    }
    if (groupFilter !== "all" && m.stage !== groupFilter) {
      return false;
    }
    return true;
  };

  const filteredUpcoming = upcoming.filter(filterMatch);
  const filteredResults = results.filter(filterMatch);
  const activeFilters =
    (countryFilter !== "all" ? 1 : 0) + (groupFilter !== "all" ? 1 : 0);

  const stageLabel = (slug) =>
    (lang === "pt" ? STAGE_LABELS_PT : STAGE_LABELS)[slug] || slug;
  const countryLabel = (code) => COUNTRY_LABELS[code] || code.toUpperCase();

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden">
      {/* Ambient glows match the dashboard / pricing aesthetic. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.18), rgba(16,185,129,0) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-25%] right-[-15%] w-[55vw] h-[55vw] rounded-full blur-3xl opacity-50"
          style={{
            background:
              "radial-gradient(circle at center, rgba(234,179,8,0.10), rgba(234,179,8,0) 70%)",
          }}
        />
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            {copy.cta.backToDashboard}
          </Link>
        </div>

        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-2">
            {copy.pageEyebrow}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {copy.pageTitle}
          </h1>
          {/* <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
            {copy.pageSubtitle}
          </p> */}
        </header>

        <Tabs
          tab={tab}
          setTab={setTab}
          upcomingCount={filteredUpcoming.length}
          resultsCount={filteredResults.length}
          copy={copy}
        />

        {/* Country + Group filters. Hide when there's nothing to
            filter (e.g. on a fresh database with one or two
            matches), surface as soon as the dataset grows. */}
        {availableCountries.length > 1 || availableGroups.length > 1 ? (
          <FilterRow
            countryFilter={countryFilter}
            setCountryFilter={setCountryFilter}
            groupFilter={groupFilter}
            setGroupFilter={setGroupFilter}
            availableCountries={availableCountries}
            availableGroups={availableGroups}
            activeFilters={activeFilters}
            countryLabel={countryLabel}
            stageLabel={stageLabel}
            copy={copy.filters}
          />
        ) : null}

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-5 text-sm text-red-200">
            {error}
          </div>
        ) : tab === "upcoming" ? (
          filteredUpcoming.length === 0 ? (
            <EmptyState
              icon={<Trophy className="w-6 h-6 text-emerald-300" />}
              title={
                activeFilters > 0
                  ? copy.filters.noMatches
                  : copy.emptyUpcomingTitle
              }
              body={activeFilters > 0 ? "" : copy.emptyUpcomingBody}
            />
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filteredUpcoming.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  mode="upcoming"
                  copy={copy}
                  lang={lang}
                  onSaved={refresh}
                />
              ))}
            </div>
          )
        ) : filteredResults.length === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-6 h-6 text-amber-300" />}
            title={
              activeFilters > 0
                ? copy.filters.noMatches
                : copy.emptyResultsTitle
            }
            body={activeFilters > 0 ? "" : copy.emptyResultsBody}
          />
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {filteredResults.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                mode="resolved"
                copy={copy}
                lang={lang}
                onSaved={refresh}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Tabs({ tab, setTab, upcomingCount, resultsCount, copy }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-full bg-white/5 border border-white/10 mb-5 sm:mb-6 w-fit">
      <TabButton active={tab === "upcoming"} onClick={() => setTab("upcoming")}>
        {copy.tabUpcoming}
        {upcomingCount > 0 && (
          <span className="ml-1.5 text-[10px] font-bold bg-emerald-500/25 text-emerald-200 rounded-full px-1.5 py-0.5">
            {upcomingCount}
          </span>
        )}
      </TabButton>
      <TabButton active={tab === "results"} onClick={() => setTab("results")}>
        {copy.tabResults}
        {resultsCount > 0 && (
          <span className="ml-1.5 text-[10px] font-bold bg-white/15 text-white/70 rounded-full px-1.5 py-0.5">
            {resultsCount}
          </span>
        )}
      </TabButton>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-colors flex items-center ${
        active
          ? "bg-emerald-500 text-[#062013]"
          : "text-white/70 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

function FilterRow({
  countryFilter,
  setCountryFilter,
  groupFilter,
  setGroupFilter,
  availableCountries,
  availableGroups,
  activeFilters,
  countryLabel,
  stageLabel,
  copy,
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 mb-5 sm:mb-6 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-center">
      <FilterSelect
        value={countryFilter}
        onChange={setCountryFilter}
        options={[
          { value: "all", label: copy.countryAll },
          ...availableCountries.map((c) => ({
            value: c,
            label: countryLabel(c),
          })),
        ]}
      />
      <FilterSelect
        value={groupFilter}
        onChange={setGroupFilter}
        options={[
          { value: "all", label: copy.groupAll },
          ...availableGroups.map((g) => ({ value: g, label: stageLabel(g) })),
        ]}
      />
      {activeFilters > 0 ? (
        <button
          type="button"
          onClick={() => {
            setCountryFilter("all");
            setGroupFilter("all");
          }}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs text-white/70 hover:text-white border border-white/15 hover:border-white/30 transition-colors"
        >
          <X className="w-3 h-3" />
          {copy.clear}
        </button>
      ) : (
        <span className="hidden sm:block" />
      )}
    </div>
  );
}

function FilterSelect({ value, onChange, options }) {
  return (
    <div className="relative">
      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/45 pointer-events-none" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-400 appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0f0f0f]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyState({ icon, title, body }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
        {icon}
      </div>
      <h2 className="font-bold text-white text-base mb-1">{title}</h2>
      <p className="text-sm text-white/55 leading-relaxed max-w-md mx-auto">
        {body}
      </p>
    </div>
  );
}

export default function PredictionsCentrePage() {
  return (
    <ProtectedRoute>
      <PredictionsCentreContent />
    </ProtectedRoute>
  );
}

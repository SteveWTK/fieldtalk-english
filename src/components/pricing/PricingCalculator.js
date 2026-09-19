// src/components/pricing/PricingCalculator.js
//
// The "one lost signing" value calculator. David's core pricing
// argument turned into a moment the visitor participates in:
//
//   "Um contrato promissor perdido custa anos da sua comissão.
//    Este plano custa menos que a gasolina que você gasta indo
//    aos alojamentos."
//
// Three sliders drive the math:
//   1. Athletes in your portfolio     → auto-picks the recommended tier
//   2. Your typical commission (%)    → what you keep from a signing
//   3. Value of one promising contract (BRL) → the asset you'd lose
//
// Output block calls out:
//   - The cost of one lost signing (commission × contract value)
//   - The annual cost of the recommended tier (with 2 months free)
//   - The ratio: "One saved signing pays for N years of Global Player"
//
// Fully client-side, no network. Deliberately spare — the whole
// point is that a visitor can read the answer in under three seconds
// and reach for the primary CTA below.

"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ShieldCheck, TrendingUp } from "lucide-react";

// Kept in sync with the tier list on /pricing. If prices shift,
// change them here + the pricing page in one commit — the page's
// tier cards should always match the calculator's projected costs.
const TIERS = {
  squad: { name: "Squad", ptName: "Base", monthlyBrl: 397, maxAthletes: 20 },
  roster: { name: "Roster", ptName: "Elenco", monthlyBrl: 897, maxAthletes: 50 },
  agency: { name: "Agency", ptName: "Agência", monthlyBrl: 2997, maxAthletes: Infinity },
};

// Annual = 12 months priced at 10 months (i.e. 2 months free = ~17% off).
// Matches the page's Monthly/Annual toggle default.
function annualBrl(monthly) {
  return monthly * 10;
}

function pickTier(athletes) {
  if (athletes <= TIERS.squad.maxAthletes) return TIERS.squad;
  if (athletes <= TIERS.roster.maxAthletes) return TIERS.roster;
  return TIERS.agency;
}

// Brazilian real formatter. Non-currency (no "R$" prefix inside) so
// the label can use its own font-weight for the "R$" and the digits.
function formatBrl(v) {
  return v.toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

const COPY = {
  en: {
    eyebrow: "Value calculator",
    heading: "One lost signing costs more than a year of Global Player.",
    sub: "Move the sliders. The math is the sales pitch.",
    athletesLabel: "Athletes in your portfolio",
    commissionLabel: "Your typical commission",
    contractLabel: "Estimated value of one promising contract",
    outputLostHeading: "One lost signing costs you",
    outputTierHeading: "Recommended plan",
    outputTierSub: "(annual, 2 months free)",
    outputRatioA: "One saved signing pays for",
    outputRatioB: (yrs) => `${yrs} years of Global Player`,
    outputRatioBoneYear: "1 year of Global Player",
    contactTier: "for pricing",
    perYear: "/ year",
  },
  pt: {
    eyebrow: "Calculadora de valor",
    heading: "Um contrato perdido custa mais que um ano de Global Player.",
    sub: "Mexa os sliders. A matemática é o argumento de venda.",
    athletesLabel: "Atletas na sua carteira",
    commissionLabel: "Sua comissão típica",
    contractLabel: "Valor estimado de um contrato promissor",
    outputLostHeading: "Um contrato perdido te custa",
    outputTierHeading: "Plano recomendado",
    outputTierSub: "(anual, 2 meses grátis)",
    outputRatioA: "Um contrato salvo paga",
    outputRatioB: (yrs) => `${yrs} anos de Global Player`,
    outputRatioBoneYear: "1 ano de Global Player",
    contactTier: "por preço",
    perYear: "/ ano",
  },
};

/**
 * @param {{ lang?: 'pt' | 'en' }} props
 */
export default function PricingCalculator({ lang = "pt" }) {
  const t = COPY[lang === "en" ? "en" : "pt"];
  const [athletes, setAthletes] = useState(30);
  const [commissionPct, setCommissionPct] = useState(10);
  const [contractBrl, setContractBrl] = useState(500_000);

  const tier = useMemo(() => pickTier(athletes), [athletes]);
  const isAgency = tier === TIERS.agency;

  // Cost math.
  const lostSigning = Math.round((commissionPct / 100) * contractBrl);
  const planAnnual = annualBrl(tier.monthlyBrl);
  // Years-of-plan a single saved signing pays for. Guard against
  // zero-plan or zero-loss edge cases so the display always reads
  // sensibly.
  const yearsRatioRaw =
    planAnnual > 0 ? lostSigning / planAnnual : 0;
  const yearsRatio = yearsRatioRaw >= 1
    ? Math.floor(yearsRatioRaw)
    : yearsRatioRaw > 0
      ? +yearsRatioRaw.toFixed(1)
      : 0;

  const tierName = lang === "pt" ? tier.ptName : tier.name;

  return (
    <section className="rounded-panel bg-primary-panel border border-primary-700 p-5 sm:p-8">
      <div className="mb-6">
        <p className="text-[10px] uppercase tracking-label text-accent-400 font-semibold mb-2">
          {t.eyebrow}
        </p>
        <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-primary-50 leading-tight">
          {t.heading}
        </h2>
        <p className="text-sm text-primary-400 mt-2">{t.sub}</p>
      </div>

      {/* Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6">
        <SliderInput
          label={t.athletesLabel}
          value={athletes}
          min={10}
          max={200}
          step={5}
          onChange={setAthletes}
          displayValue={`${athletes}`}
        />
        <SliderInput
          label={t.commissionLabel}
          value={commissionPct}
          min={5}
          max={20}
          step={1}
          onChange={setCommissionPct}
          displayValue={`${commissionPct}%`}
        />
        <SliderInput
          label={t.contractLabel}
          value={contractBrl}
          min={100_000}
          max={5_000_000}
          step={50_000}
          onChange={setContractBrl}
          displayValue={`R$ ${formatBrl(contractBrl)}`}
        />
      </div>

      {/* Output — three-row summary. Big number, quiet math. */}
      <div className="rounded-card border border-accent-400/30 bg-accent-400/5 p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <OutputCell
            Icon={AlertTriangle}
            tone="alert"
            heading={t.outputLostHeading}
            value={`R$ ${formatBrl(lostSigning)}`}
          />
          <OutputCell
            Icon={ShieldCheck}
            tone="accent"
            heading={t.outputTierHeading}
            value={tierName}
            sub={
              isAgency
                ? t.contactTier
                : `R$ ${formatBrl(planAnnual)}${" "}${t.perYear}`
            }
            subMuted={t.outputTierSub}
          />
          <OutputCell
            Icon={TrendingUp}
            tone="accent"
            heading={t.outputRatioA}
            value={
              isAgency
                ? "—"
                : yearsRatio >= 1
                  ? t.outputRatioB(yearsRatio)
                  : t.outputRatioBoneYear
            }
          />
        </div>
      </div>
    </section>
  );
}

/* ─── slider primitive ────────────────────────────────────────── */

function SliderInput({ label, value, min, max, step, onChange, displayValue }) {
  return (
    <label className="flex flex-col gap-1.5 cursor-pointer">
      <span className="text-[11px] uppercase tracking-label text-primary-400 font-semibold">
        {label}
      </span>
      <span className="text-lg font-display font-black text-primary-50 tabular-nums">
        {displayValue}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="accent-accent-400 w-full h-1.5 rounded-full bg-primary-800 appearance-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-panel"
      />
    </label>
  );
}

/* ─── output cell primitive ───────────────────────────────────── */

function OutputCell({ Icon, tone, heading, value, sub, subMuted }) {
  const iconClass =
    tone === "alert" ? "text-signal-alert" : "text-accent-400";
  const valueClass =
    tone === "alert" ? "text-signal-alert" : "text-primary-50";
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-label font-semibold text-primary-400">
        <Icon className={`w-3 h-3 ${iconClass}`} strokeWidth={2.25} />
        {heading}
      </span>
      <span className={`text-xl sm:text-2xl font-display font-black tabular-nums leading-tight ${valueClass}`}>
        {value}
      </span>
      {sub && (
        <span className="text-xs font-medium text-primary-300 tabular-nums">
          {sub}
        </span>
      )}
      {subMuted && (
        <span className="text-[11px] text-primary-500 leading-snug">
          {subMuted}
        </span>
      )}
    </div>
  );
}

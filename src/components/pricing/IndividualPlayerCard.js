// src/components/pricing/IndividualPlayerCard.js
//
// The "one player, one subscription" card. Rendered in two places:
//   1. Bottom of the B2B /pricing page (a quiet "just for me" section
//      under the tier cards).
//   2. Centrepiece of the /pricing/individual page (the whole point
//      of that page — Paul shares the URL with parents / teens; the
//      card is the primary action).
//
// The parent page owns the pricing + billing state (via
// useIndividualPricing) and hands it in as props. Same for checkout —
// the parent owns handleBuy / loading. This component is a pure view
// so the two contexts can style / arrange it independently.

"use client";

import { ArrowRight, Check } from "lucide-react";
import Button from "@/components/ui/button";
import Eyebrow from "@/components/ui/eyebrow";
import {
  INDIVIDUAL_PRICES,
  formatBrl,
  fillTemplate,
} from "@/lib/pricing/helpers";

/**
 * @param {{
 *   copy: object,                                 // translations.individual bundle
 *   billing: 'monthly' | 'yearly',
 *   onBillingChange: (v: 'monthly' | 'yearly') => void,
 *   activeOffering: object | null,                // resolved Stripe offering
 *   checkoutLoading: string | null,               // offering id currently in-flight
 *   handleBuy: (offeringId: string) => void,
 *   yearlyEquivalentMonthly: string | null,       // "R$ 66"
 *   yearlySavingsAmount: string | null,           // "R$ 158"
 * }} props
 */
export default function IndividualPlayerCard({
  copy,
  billing,
  onBillingChange,
  activeOffering,
  checkoutLoading,
  handleBuy,
  yearlyEquivalentMonthly,
  yearlySavingsAmount,
}) {
  const isYearly = billing === "yearly";

  // Prefer live Stripe price when present; fall back to constants so
  // the card never renders "—" if Stripe offerings are misconfigured.
  const livePrice =
    activeOffering && Number.isFinite(Number(activeOffering.priceAmount))
      ? Number(activeOffering.priceAmount)
      : null;
  const fallbackPrice = isYearly
    ? INDIVIDUAL_PRICES.yearlyBrl
    : INDIVIDUAL_PRICES.monthlyBrl;
  const displayPrice = livePrice ?? fallbackPrice;
  const priceStr = `R$ ${formatBrl(displayPrice)}`;

  const yearlyEqLocal =
    yearlyEquivalentMonthly ||
    `R$ ${formatBrl(INDIVIDUAL_PRICES.yearlyBrl / 12)}`;
  const savingsLocal =
    yearlySavingsAmount ||
    `R$ ${formatBrl(
      INDIVIDUAL_PRICES.monthlyBrl * 12 - INDIVIDUAL_PRICES.yearlyBrl,
    )}`;

  return (
    <section className="max-w-2xl mx-auto rounded-panel bg-primary-panel border border-primary-700 p-5 sm:p-7">
      <div className="mb-4 text-center">
        <Eyebrow className="mb-1">{copy.eyebrow}</Eyebrow>
        <h2 className="text-lg sm:text-xl font-display font-bold tracking-tight text-primary-50">
          {copy.title}
        </h2>
        <p className="text-sm text-primary-400 mt-1">{copy.sub}</p>
      </div>

      {/* Monthly / Yearly toggle */}
      <div className="flex items-center justify-center mb-5">
        <div className="inline-flex items-center gap-1 rounded-full bg-primary-900 border border-primary-700 p-1">
          <button
            type="button"
            onClick={() => onBillingChange("monthly")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              billing === "monthly"
                ? "bg-primary-800 text-primary-50"
                : "text-primary-400 hover:text-primary-100"
            }`}
          >
            {copy.billingMonthly}
          </button>
          <button
            type="button"
            onClick={() => onBillingChange("yearly")}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
              billing === "yearly"
                ? "bg-accent-400 text-primary-900"
                : "text-primary-400 hover:text-primary-100"
            }`}
          >
            {copy.billingAnnual}
          </button>
        </div>
      </div>

      <div className="text-center mb-5">
        <p className="flex items-baseline justify-center gap-2">
          <span className="text-3xl sm:text-4xl font-display font-black text-primary-50 tabular-nums">
            {priceStr}
          </span>
          <span className="text-sm text-primary-400">
            {isYearly ? copy.yearlyPricePer : copy.monthlyPricePer}
          </span>
        </p>
        {isYearly && (
          <p className="text-xs text-primary-400 mt-1">
            {fillTemplate(copy.yearlyEquivalent, { monthly: yearlyEqLocal })}
          </p>
        )}
        {isYearly && (
          <p className="text-xs text-accent-400 font-semibold mt-1">
            {fillTemplate(copy.yearlySavings, { amount: savingsLocal })}
          </p>
        )}
      </div>

      <ul className="space-y-2 mb-5 max-w-md mx-auto">
        {copy.features.map((f, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-sm text-primary-200"
          >
            <Check
              className="w-4 h-4 text-accent-400 mt-0.5 shrink-0"
              strokeWidth={2.5}
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className="flex flex-col items-center gap-2">
        <Button
          variant="primary"
          size="md"
          Icon={ArrowRight}
          onClick={() => handleBuy(activeOffering?.id)}
          disabled={!activeOffering || checkoutLoading !== null}
          loading={checkoutLoading === activeOffering?.id}
        >
          {checkoutLoading === activeOffering?.id ? copy.loading : copy.cta}
        </Button>
        <p className="text-[11px] text-primary-500">{copy.couponHint}</p>
      </div>
    </section>
  );
}

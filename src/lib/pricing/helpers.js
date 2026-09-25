// src/lib/pricing/helpers.js
//
// Shared spine for both pricing pages:
//   /pricing              — B2B tiers (Base / Elenco / Agência) + the
//                            individual card at the bottom
//   /pricing/individual   — dedicated single-player page for direct
//                            share-with-parent / share-with-teen links
//
// Everything that used to live inline on the B2B page and would need
// to be duplicated on the individual page is centralised here so
// pricing tweaks (a display price change, a hook rewrite) touch one
// file, not two.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { listOfferingsForEdition } from "@/lib/editions/editions";

// Fallback display prices used when the live Stripe offering rows are
// missing/incomplete — keeps the card rendering a real number instead
// of a "—" placeholder. Actual checkout still fires against whatever
// Stripe returns; if the two drift, sync here and in editions.js /
// Stripe dashboard.
export const INDIVIDUAL_PRICES = {
  monthlyBrl: 79,
  yearlyBrl: 790, // 10 months priced ≈ 17% off
};

export function formatBrl(v) {
  return Number(v).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

/**
 * Basic {placeholder} filler for i18n strings that carry variables
 * (e.g. "Você economiza {amount} vs pagar mensalmente"). Kept as a
 * function rather than a template-lite lib so we don't pull a new
 * dep for two callsites.
 */
export function fillTemplate(s, vars = {}) {
  if (typeof s !== "string") return s;
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return out;
}

/**
 * Everything the IndividualPlayerCard needs from the offerings +
 * billing-toggle state. Both pages call this instead of hand-rolling
 * the same 30 lines of useMemo derivations.
 */
export function useIndividualPricing(editionId) {
  const offerings = useMemo(() => {
    const all = listOfferingsForEdition(editionId);
    return {
      monthly:
        all.find(
          (o) => o.mode === "subscription" && o.interval === "monthly",
        ) || null,
      yearly:
        all.find(
          (o) => o.mode === "subscription" && o.interval === "yearly",
        ) || null,
    };
  }, [editionId]);

  // Yearly-default — the annual plan carries the "save 2 months"
  // frame we want front-loaded on both pages.
  const [billing, setBilling] = useState("yearly");
  const activeOffering =
    billing === "yearly" ? offerings.yearly : offerings.monthly;

  const yearlyEquivalentMonthly = useMemo(() => {
    if (!offerings.yearly) return null;
    const price = Number(offerings.yearly.priceAmount);
    if (!Number.isFinite(price)) return null;
    return `R$ ${formatBrl(price / 12)}`;
  }, [offerings.yearly]);

  const yearlySavingsAmount = useMemo(() => {
    if (!offerings.monthly || !offerings.yearly) return null;
    const m = Number(offerings.monthly.priceAmount);
    const y = Number(offerings.yearly.priceAmount);
    if (!Number.isFinite(m) || !Number.isFinite(y)) return null;
    const saved = m * 12 - y;
    if (saved <= 0) return null;
    return `R$ ${formatBrl(saved)}`;
  }, [offerings.monthly, offerings.yearly]);

  return {
    offerings,
    billing,
    setBilling,
    activeOffering,
    yearlyEquivalentMonthly,
    yearlySavingsAmount,
  };
}

/**
 * Stripe checkout hook. Redirects unauthenticated visitors through
 * /join first (with the target edition tagged) so the checkout flow
 * always has a signed-in player row to attach the customer id to.
 */
export function useIndividualCheckout({ editionId }) {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(null);

  async function buy(offeringId) {
    if (!offeringId) return;
    if (!user) {
      router.push(`/join?edition=${encodeURIComponent(editionId)}`);
      return;
    }
    setLoading(offeringId);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ offering: offeringId }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        console.error("[pricing] checkout failed:", data);
        alert(data.error || "Could not start checkout. Please try again.");
        return;
      }
      window.location.href = data.url;
    } catch (err) {
      console.error("[pricing] checkout exception:", err);
      alert("Network error. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return { buy, loading };
}

// src/app/(landing)/pricing/page.js
//
// FieldTalk Pro Path 26/27 pricing. Pro Path is the only active
// edition (WC2026 references were stripped on 2026-08-27 — new
// content editions can be added later with fresh dedicated pages
// rather than resurrecting the edition-aware routing that used to
// live here).
//
// Layout (top of viewport → bottom):
//   1. Compact hero (eyebrow + title)
//   2. Toggle subscription card — Mensal ↔ Anual, yearly default.
//      This is the primary CTA; sits above the fold on mobile.
//   3. Full Access code panel — inline redeem for cohort codes.
//   4. Season Pass — one-time alternative, quieter styling.
//   5. FAQ
//
// The toggle-card pattern (vs two side-by-side cards) was chosen
// because it's what modern SaaS defaults to and — with yearly as
// the pre-selected option — reliably converts more users to yearly
// than a side-by-side "pick your plan" layout. Default-selected
// options carry disproportionate weight in subscription pricing.
//
// Language: syncs to the app-wide LanguageContext (works because
// (landing)/layout.js provides LanguageProvider). Local top-right
// PT/EN toggle stays for landing-page visitors who haven't clicked
// through the main site nav yet.

"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  ArrowRight,
  Shield,
  ChevronDown,
  Loader2,
  Tag,
  KeyRound,
  // Calendar,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { getEdition, listOfferingsForEdition } from "@/lib/editions/editions";

// The only edition Pro Path pricing surfaces. If we ever run a
// second concurrent edition, spawn a dedicated page rather than
// resurrecting edition-aware routing here — those trade-offs muddy
// the toggle-card conversion story.
const EDITION_ID = "propath_26_27";

const translations = {
  en: {
    hero: {
      eyebrow: "Pricing",
      titleHighlight: "Start training with",
    },
    toggle: {
      monthly: "Monthly",
      yearly: "Yearly",
      yearlyBadge: "SAVE 48%",
    },
    subscription: {
      pillLabel: "Subscription",
      title: "Pro Path 26/27",
      monthlyPricePer: "per month",
      yearlyPricePer: "per year",
      yearlyEquivalent: "≈ {monthly}/month",
      yearlySavings: "You save {amount} vs paying monthly",
      features: [
        "All 24 Pro Path lessons — 6 skill areas × 4 lessons each",
        "Skill Radar to track your progress",
        "Certificate as you complete each Level",
        "Virtual Coach on WhatsApp for practice + questions",
      ],
      cta: "Start now",
      loading: "Loading…",
    },
    couponHint:
      "Got a discount coupon? Add it at the next step on Stripe Checkout.",
    fullAccess: {
      eyebrow: "Got a Full Access code?",
      heading: "Skip checkout — redeem here",
      body: "Students of Cultura Inglesa, partner schools, and pre-paid cohorts: paste the code your coordinator gave you.",
      placeholder: "e.g. CC-CEARA-2026A-X9K3F2",
      submit: "Redeem code",
      submitting: "Redeeming…",
      successTitle: "You're in!",
      successBody: "Access granted. Heading to your dashboard…",
      signedOutNote: "Sign up first so the code can attach to your account.",
      signedOutCta: "Create your account",
      errors: {
        unknown_code:
          "We don't recognise that code. Check with your teacher / coordinator.",
        expired: "That code has expired. Ask for a new one.",
        no_seats: "All seats on that code have already been claimed.",
        already_redeemed:
          "You've already redeemed this code — you're good to go.",
        not_signed_in:
          "Sign in first so we can attach the code to your account.",
        generic: "Something went wrong. Please try again.",
      },
    },
    seasonPass: {
      eyebrow: "One-time alternative",
      title: "Season Pass",
      subtitle: "Full access until {accessEndDate} — no auto-renewal.",
      cta: "Get Season Pass",
    },
    faq: {
      title: "Questions",
      items: [
        {
          q: "What's the difference between the subscription and the Season Pass?",
          a: "The subscription (monthly or yearly) gives you continuing access as long as you're subscribed. The Season Pass is a single up-front payment for full access until {accessEndDate} — no auto-renewal.",
        },
        {
          q: "Can I cancel my subscription anytime?",
          a: "Yes. You can cancel from the Customer Portal at any time. Access stays until the end of the period you've already paid for.",
        },
        {
          q: "How do coupon codes work?",
          a: 'Stripe Checkout has a built-in "Add promotion code" field. Enter your code there — the discount applies automatically.',
        },
        {
          q: "What payment methods do you accept?",
          a: "All major credit cards and PIX (Brazilian users). Stripe handles the payment securely; we never see your card details.",
        },
      ],
    },
  },
  pt: {
    hero: {
      eyebrow: "Planos",
      titleHighlight: "Comece a treinar com",
    },
    toggle: {
      monthly: "Mensal",
      yearly: "Anual",
      yearlyBadge: "ECONOMIZE 48%",
    },
    subscription: {
      pillLabel: "Assinatura",
      title: "Pro Path 26/27",
      monthlyPricePer: "por mês",
      yearlyPricePer: "por ano",
      yearlyEquivalent: "≈ {monthly}/mês",
      yearlySavings: "Você economiza {amount} vs pagar mensalmente",
      features: [
        "Todas as 24 aulas Pro Path — 6 áreas × 4 aulas cada",
        "Radar de Habilidades pra acompanhar seu progresso",
        "Certificado a cada Nível concluído",
        "Técnico Virtual no WhatsApp pra prática + dúvidas",
      ],
      cta: "Começar agora",
      loading: "Carregando…",
    },
    couponHint:
      "Tem um cupom de desconto? Adicione no próximo passo, no Stripe Checkout.",
    fullAccess: {
      eyebrow: "Tem um código de Acesso Completo?",
      heading: "Pule o checkout — resgate aqui",
      body: "Alunos das Culturas Inglesas, escolas parceiras e turmas pré-pagas: cole o código que seu coordenador te deu.",
      placeholder: "ex: CC-CEARA-2026A-X9K3F2",
      submit: "Resgatar código",
      submitting: "Resgatando…",
      successTitle: "Pronto!",
      successBody: "Acesso liberado. Indo para o painel…",
      signedOutNote:
        "Crie sua conta primeiro para que o código fique vinculado a ela.",
      signedOutCta: "Criar conta",
      errors: {
        unknown_code:
          "Não reconhecemos esse código. Confirme com seu professor / coordenador.",
        expired: "Esse código expirou. Peça um novo.",
        no_seats: "Todas as vagas desse código já foram usadas.",
        already_redeemed: "Você já resgatou esse código — está tudo certo.",
        not_signed_in:
          "Entre primeiro para que possamos vincular o código à sua conta.",
        generic: "Algo deu errado. Tente novamente.",
      },
    },
    seasonPass: {
      eyebrow: "Alternativa avulsa",
      title: "Season Pass",
      subtitle: "Acesso total até {accessEndDate} — sem renovação automática.",
      cta: "Comprar Season Pass",
    },
    faq: {
      title: "Perguntas",
      items: [
        {
          q: "Qual a diferença entre a assinatura e o Season Pass?",
          a: "A assinatura (mensal ou anual) dá acesso contínuo enquanto você mantiver a assinatura ativa. O Season Pass é um pagamento único que libera acesso total até {accessEndDate} — sem renovação automática.",
        },
        {
          q: "Posso cancelar a assinatura a qualquer momento?",
          a: "Sim. Você pode cancelar pelo Portal do Cliente quando quiser. O acesso continua até o fim do período já pago.",
        },
        {
          q: "Como funcionam os cupons?",
          a: 'O Stripe Checkout tem um campo "Adicionar código promocional". Digite seu código lá — o desconto se aplica automaticamente.',
        },
        {
          q: "Quais formas de pagamento vocês aceitam?",
          a: "Todos os principais cartões e PIX (para usuários brasileiros). O Stripe processa o pagamento com segurança — nunca vemos seus dados de cartão.",
        },
      ],
    },
  },
};

function PricingPageFallback() {
  return (
    <div className="min-h-screen bg-[#070707] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(circle at center, rgba(132,204,22,0.20), rgba(132,204,22,0) 70%)",
          }}
        />
      </div>
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-accent-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<PricingPageFallback />}>
      <PricingPageContent />
    </Suspense>
  );
}

function PricingPageContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang, setLang } = useLanguage();
  const copy = translations[lang] || translations.pt;

  const edition = getEdition(EDITION_ID);
  const offerings = useMemo(() => {
    const all = listOfferingsForEdition(EDITION_ID);
    return {
      monthly:
        all.find(
          (o) => o.mode === "subscription" && o.interval === "monthly",
        ) || null,
      yearly:
        all.find((o) => o.mode === "subscription" && o.interval === "yearly") ||
        null,
      oneTime: all.find((o) => o.mode === "one_time") || null,
    };
  }, []);

  // Yearly default per subscription-conversion best practice — the
  // pre-selected option in a toggle disproportionately drives the
  // choice for users who don't have a strong prior preference.
  const [billingInterval, setBillingInterval] = useState("yearly");
  const activeOffering =
    billingInterval === "yearly" ? offerings.yearly : offerings.monthly;

  const accessEndDate = useMemo(() => {
    if (!edition?.oneTimeAccessEnd) return null;
    try {
      return new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date(edition.oneTimeAccessEnd));
    } catch {
      return null;
    }
  }, [edition, lang]);

  // Effective monthly cost of the yearly plan → surfaces the savings
  // narrative below the price. Formatted in BRL because Pro Path
  // pricing is BR-market-first; extend when we add USD tiers.
  const yearlyEquivalentMonthly = useMemo(() => {
    if (!offerings.yearly) return null;
    const price = Number(offerings.yearly.priceAmount);
    if (!Number.isFinite(price)) return null;
    const perMonth = price / 12;
    return `R$ ${perMonth.toFixed(0).replace(/^(\d)(\d{3})$/, "$1.$2")}`;
  }, [offerings.yearly]);

  const yearlySavingsAmount = useMemo(() => {
    if (!offerings.monthly || !offerings.yearly) return null;
    const m = Number(offerings.monthly.priceAmount);
    const y = Number(offerings.yearly.priceAmount);
    if (!Number.isFinite(m) || !Number.isFinite(y)) return null;
    const saved = m * 12 - y;
    if (saved <= 0) return null;
    return `R$ ${saved.toFixed(0).replace(/^(\d)(\d{3})$/, "$1.$2")}`;
  }, [offerings.monthly, offerings.yearly]);

  const fill = (s, vars = {}) => {
    if (typeof s !== "string") return s;
    let out = s;
    if (accessEndDate) out = out.replace(/\{accessEndDate\}/g, accessEndDate);
    for (const [k, v] of Object.entries(vars)) {
      out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    }
    return out;
  };

  const [checkoutLoading, setCheckoutLoading] = useState(null);

  const handleBuy = async (offeringId) => {
    if (!user) {
      router.push(`/join?edition=${encodeURIComponent(EDITION_ID)}`);
      return;
    }
    setCheckoutLoading(offeringId);
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
      setCheckoutLoading(null);
    }
  };

  if (!edition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707] text-white/70 p-6">
        Unknown edition. Contact support.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden">
      {/* Ambient glows — lime + slate matching /propath and the
          Pro Path dashboard so the whole funnel reads as one world. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(circle at center, rgba(163,230,53,0.16), rgba(163,230,53,0) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-25%] right-[-15%] w-[55vw] h-[55vw] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, rgba(148,163,184,0.10), rgba(148,163,184,0) 70%)",
          }}
        />
      </div>

      {/* Top-right lang toggle — synced with the shared LanguageContext
          so switching here also switches the rest of the app. */}
      <div className="absolute top-4 right-4 z-20 flex gap-1 text-[10px] sm:text-xs">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            lang === "en"
              ? "bg-accent-400 text-primary-900"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang("pt")}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            lang === "pt"
              ? "bg-accent-400 text-primary-900"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          PT
        </button>
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10">
        {/* Hero — compact + centred so the primary card lands above
            the fold on 375px iPhones. */}
        <section className="text-center pt-2">
          <p className="text-[10px] sm:text-xs tracking-[0.35em] uppercase text-accent-300/80 font-semibold mb-2 sm:mb-3">
            {copy.hero.eyebrow}
          </p>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {copy.hero.titleHighlight}{" "}
            <span className="bg-gradient-to-r from-accent-300 to-accent-200 bg-clip-text text-transparent">
              {edition.name}
            </span>
          </h1>
        </section>

        {/* Primary subscription toggle card. Sits above the fold on
            mobile so the first thing a visitor sees is the price,
            the toggle, and a single unambiguous CTA. */}
        {offerings.monthly && offerings.yearly && (
          <section className="max-w-md mx-auto">
            <div className="relative rounded-3xl bg-white/[0.04] backdrop-blur-sm border border-accent-400/30 p-5 sm:p-7 shadow-[0_0_40px_rgba(163,230,53,0.10)]">
              {/* Floating "Subscription" pill */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-accent-400 text-[10px] sm:text-xs font-bold text-primary-900 tracking-wider uppercase shadow">
                  <Sparkles className="w-3.5 h-3.5" />
                  {copy.subscription.pillLabel}
                </span>
              </div>

              {/* Title */}
              <div className="flex items-center gap-3 mb-5 mt-1">
                <div className="w-11 h-11 rounded-2xl bg-accent-400/15 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-accent-300" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold leading-tight">
                    {copy.subscription.title}
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    {edition.tagline}
                  </p>
                </div>
              </div>

              {/* Toggle: Monthly ↔ Yearly. Yearly wraps a "SAVE 48%"
                  badge above the tab to visibly tilt the choice
                  toward yearly without hiding monthly. */}
              <div className="relative mb-5">
                {billingInterval === "yearly" && (
                  <div className="absolute -top-4 right-2 z-10">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-accent-200 text-[9px] font-black text-primary-900 tracking-wider">
                      {copy.toggle.yearlyBadge}
                    </span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-1 p-1 rounded-full bg-white/5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setBillingInterval("monthly")}
                    className={`py-2 rounded-full text-sm font-bold transition-colors ${
                      billingInterval === "monthly"
                        ? "bg-white text-primary-900"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {copy.toggle.monthly}
                  </button>
                  <button
                    type="button"
                    onClick={() => setBillingInterval("yearly")}
                    className={`py-2 rounded-full text-sm font-bold transition-colors ${
                      billingInterval === "yearly"
                        ? "bg-accent-400 text-primary-900"
                        : "text-white/60 hover:text-white"
                    }`}
                  >
                    {copy.toggle.yearly}
                  </button>
                </div>
              </div>

              {/* Price + savings narrative */}
              <div className="mb-5">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black tracking-tight">
                    {activeOffering?.displayPrice ?? "—"}
                  </span>
                  <span className="text-sm text-white/40">
                    {billingInterval === "yearly"
                      ? copy.subscription.yearlyPricePer
                      : copy.subscription.monthlyPricePer}
                  </span>
                </div>
                {billingInterval === "yearly" && yearlyEquivalentMonthly && (
                  <p className="mt-1 text-xs text-accent-200/90 font-semibold">
                    {fill(copy.subscription.yearlyEquivalent, {
                      monthly: yearlyEquivalentMonthly,
                    })}
                  </p>
                )}
                {billingInterval === "yearly" && yearlySavingsAmount && (
                  <p className="mt-0.5 text-xs text-white/50">
                    {fill(copy.subscription.yearlySavings, {
                      amount: yearlySavingsAmount,
                    })}
                  </p>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {copy.subscription.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-300 shrink-0" />
                    <span className="text-white/80 leading-relaxed">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                type="button"
                onClick={() => activeOffering && handleBuy(activeOffering.id)}
                disabled={!activeOffering || checkoutLoading !== null}
                className="w-full py-3 px-5 rounded-full bg-accent-400 hover:bg-accent-300 disabled:opacity-60 text-primary-900 font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-1.5"
              >
                {checkoutLoading === activeOffering?.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {copy.subscription.loading}
                  </>
                ) : (
                  <>
                    {copy.subscription.cta}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Coupon hint — right under the CTA so users with a
                  discount code know their entry point is Stripe
                  Checkout, not a field on this page. */}
              <p className="mt-3 flex items-start gap-1.5 text-xs sm:text-sm text-white/55 leading-relaxed">
                <Tag className="w-4 h-4 text-accent-300/70 mt-0.5 shrink-0" />
                <span>{copy.couponHint}</span>
              </p>
            </div>
          </section>
        )}

        {/* Full Access code panel — sits directly under the
            subscription card so cohort students don't accidentally
            click through to Stripe when they have a code in hand. */}
        <FullAccessPanel
          copy={copy.fullAccess}
          isSignedIn={!!user}
          edition={EDITION_ID}
          onSuccess={() => {
            setTimeout(() => router.push("/dashboard"), 1200);
          }}
        />

        {/* Season Pass — one-time alternative. Quieter styling so
            the subscription card stays the primary read. */}
        {/* {offerings.oneTime && (
          <section className="max-w-md mx-auto">
            <div className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 hover:border-white/20 transition-colors p-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/45 font-bold mb-1">
                {copy.seasonPass.eyebrow}
              </p>
              <h3 className="text-base font-bold text-white">
                {copy.seasonPass.title}
              </h3>
              <p className="text-xs text-white/50 mt-0.5 mb-3 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {fill(copy.seasonPass.subtitle)}
              </p>
              <div className="flex items-baseline gap-1.5 mb-4">
                <span className="text-2xl sm:text-3xl font-black">
                  {offerings.oneTime.displayPrice}
                </span>
                <span className="text-xs text-white/40">
                  {offerings.oneTime.displayInterval}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleBuy(offerings.oneTime.id)}
                disabled={checkoutLoading !== null}
                className="w-full py-2.5 px-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {checkoutLoading === offerings.oneTime.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    {copy.seasonPass.cta}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </section>
        )} */}

        {/* FAQ */}
        <section className="max-w-2xl mx-auto pb-6">
          <h2 className="text-lg sm:text-xl font-bold text-center mb-4">
            {copy.faq.title}
          </h2>
          <div className="space-y-2">
            {copy.faq.items.map((item, i) => (
              <details
                key={i}
                className="group rounded-xl bg-white/[0.04] border border-white/10 hover:border-white/15 transition-colors"
              >
                <summary className="cursor-pointer list-none p-4 flex items-start justify-between gap-3 font-semibold text-white text-sm">
                  <span>{item.q}</span>
                  <ChevronDown className="w-4 h-4 text-accent-300 mt-0.5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-white/65 text-sm leading-relaxed">
                  {fill(item.a)}
                </p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

/**
 * Inline Full Access code panel — sits directly below the primary
 * card so partner-school students see the redeem path without having
 * to spot a small "Have a code?" link at the bottom of the page.
 *
 * Signed-out users see a sign-up nudge instead of the form — the
 * code has to attach to a real player row, so signup has to happen
 * first.
 */
function FullAccessPanel({ copy, isSignedIn, edition, onSuccess }) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (!isSignedIn) {
      setError(copy.errors.not_signed_in);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/seat-license/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        if (data.reason === "already_redeemed") {
          setSuccess(true);
          onSuccess?.();
          return;
        }
        setError(copy.errors[data.reason] || copy.errors.generic);
        return;
      }
      setSuccess(true);
      onSuccess?.();
    } catch {
      setError(copy.errors.generic);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="max-w-md mx-auto">
      <div className="relative rounded-3xl bg-amber-300/[0.06] backdrop-blur-sm border border-amber-300/40 p-5 sm:p-6 shadow-[0_0_28px_rgba(252,211,77,0.08)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-amber-300/15 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-amber-200" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs tracking-[0.25em] uppercase text-amber-200/80 font-bold">
              {copy.eyebrow}
            </p>
            <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
              {copy.heading}
            </h3>
          </div>
        </div>

        {/* <p className="text-xs sm:text-sm text-white/65 leading-relaxed mb-4">
          {copy.body}
        </p> */}

        {success ? (
          <div className="py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-accent-400/20 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-accent-300" />
            </div>
            <p className="text-base font-bold text-white mb-1">
              {copy.successTitle}
            </p>
            <p className="text-sm text-white/60">{copy.successBody}</p>
          </div>
        ) : !isSignedIn ? (
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-white/55">
              {copy.signedOutNote}
            </p>
            <Link
              href={`/join?edition=${encodeURIComponent(edition)}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-amber-300 hover:bg-amber-200 text-[#1a0e00] font-bold text-sm tracking-wide transition-colors"
            >
              {copy.signedOutCta}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={copy.placeholder}
              disabled={submitting}
              className="w-full px-3 py-3 rounded-xl border border-white/15 bg-white/5 text-white placeholder-white/30 focus:outline-none focus:border-amber-300 font-mono uppercase tracking-wide text-sm sm:text-base text-center"
            />

            {error && (
              <div className="p-2.5 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-full bg-amber-300 hover:bg-amber-200 disabled:opacity-60 text-[#1a0e00] font-bold text-sm tracking-wide transition-colors"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {copy.submitting}
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  {copy.submit}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

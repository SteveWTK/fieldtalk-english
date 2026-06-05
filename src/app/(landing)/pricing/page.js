// src/app/(landing)/pricing/page.js
//
// Edition-aware pricing page. Defaults to WC2026 but takes a
// ?edition=<slug> URL param so future editions can reuse this page
// rather than spawning per-edition pages.
//
// Visual language matches /wc2026 + /join — dark surface (#070707),
// emerald/amber ambient glows, white text, sleek minimal cards. Hero
// stays compact so the primary one-off card is visible above the fold
// on mobile.
//
// Auth: viewing is open; clicking "Buy" while signed out routes the
// user to /join?edition=<edition> rather than /signup so they land on
// the streamlined fan-edition signup with the right edition tag
// pre-applied.

"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Trophy,
  Building2,
  Users,
  Mail,
  ArrowRight,
  Star,
  Shield,
  ChevronDown,
  Loader2,
  Tag,
  KeyRound,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { getEdition, listOfferingsForEdition } from "@/lib/editions/editions";

// EN/PT copy. Same translation-map shape as before so the lang toggle
// stays one-click and adding a third language is a single object.
const translations = {
  en: {
    hero: {
      eyebrow: "Pricing",
      titleHighlight: "Full access to",
    },
    primary: {
      flag: "One-time",
      cta: "Get the WC2026 edition",
      // {accessEndDate} is substituted at render time from
      // edition.oneTimeAccessEnd so the on-page copy stays in sync
      // with the actual access cutoff — change the date in
      // editions.js and this string follows.
      accessNote: "Full access through {accessEndDate}",
      features: [
        "All lessons across every pillar",
        "Sticker packs + Ultimate Squad builder",
        "Group-stage predictions with bonus XP",
        "All WC2026 content updates",
      ],
    },
    secondary: {
      heading: "Or subscribe to every FieldTalk edition",
      sub: "WC2026 plus every future edition (Champions League, Premier League, more) while you're subscribed.",
      cta: "Subscribe",
    },
    // Tiny caption under the Buy button reassuring users who already
    // hold a discount coupon that their place to use it is the Stripe
    // Checkout that opens after they click — no need to fish for it
    // on this page.
    couponHint: "Got a discount coupon? Add it at the next step on Stripe Checkout.",
    fullAccess: {
      eyebrow: "Got a Full Access code?",
      heading: "Skip checkout — redeem here",
      body:
        "Students of Cultura Inglesa, partner schools and pre-paid cohorts: paste the code your coordinator gave you and we'll unlock the edition on your account right away.",
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
    b2b: {
      eyebrow: "For schools, branches & clubs",
      title: "Buy seats in bulk for your students",
      body: "Get N logins at a discounted rate, give your students a single code, and track their progress from one admin dashboard. Affiliates earn a commission on every direct sale too.",
      bullets: [
        "Bulk pricing for 20+ seats",
        "One code, distributed to your cohort",
        "Affiliate programme for partner schools",
        "Custom branding on request",
      ],
      cta: "Contact partnerships",
      email: "partnerships@fieldtalkenglish.com",
    },
    faq: {
      title: "Questions",
      items: [
        {
          q: "What's the difference between the one-off and the subscription?",
          a: "The one-off purchase gives you full access to the WC2026 edition through {accessEndDate} — perfect for the tournament window. The subscription gives you access to WC2026 PLUS every future edition (Champions League, Premier League, etc.) for as long as you're subscribed.",
        },
        {
          q: "How do coupon codes work?",
          a: 'Stripe Checkout has a built-in "Add promotion code" field. Enter your code there — the discount applies automatically.',
        },
        {
          q: "Can I cancel my subscription anytime?",
          a: "Yes. You can cancel from the Customer Portal at any time. Access stays until the end of the period you've already paid for.",
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
      titleHighlight: "Acesso completo ao",
    },
    primary: {
      flag: "Compra única",
      cta: "Pegar a Edição WC2026",
      accessNote: "Acesso total até {accessEndDate}",
      features: [
        "Todas as lições de todos os pilares",
        "Pacotes de figurinhas + montagem do Squad",
        "Predições da fase de grupos com XP bônus",
        "Todas as atualizações da WC2026",
      ],
    },
    secondary: {
      heading: "Ou assine todas as edições FieldTalk",
      sub: "WC2026 mais todas as edições futuras (Champions League, Premier League e mais) enquanto estiver assinante.",
      cta: "Assinar",
    },
    couponHint:
      "Tem um cupom de desconto? Adicione no próximo passo, no Stripe Checkout.",
    fullAccess: {
      eyebrow: "Tem um código de Acesso Completo?",
      heading: "Pule o checkout — resgate aqui",
      body:
        "Alunos das Culturas Inglesas, escolas parceiras e turmas pré-pagas: cole o código que seu coordenador te deu e liberamos a edição na sua conta imediatamente.",
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
    b2b: {
      eyebrow: "Para escolas, Culturas e clubes",
      title: "Compre logins em volume para seus alunos",
      body: "Receba N logins com desconto, dê um único código aos seus alunos e acompanhe o progresso deles num painel administrativo. Escolas parceiras também ganham comissão como afiliadas.",
      bullets: [
        "Preço por volume para 20+ assentos",
        "Um código, distribuído à sua turma",
        "Programa de afiliados para escolas parceiras",
        "Branding personalizado sob demanda",
      ],
      cta: "Falar com parcerias",
      email: "partnerships@fieldtalkenglish.com",
    },
    faq: {
      title: "Perguntas",
      items: [
        {
          q: "Qual a diferença entre a compra única e a assinatura?",
          a: "A compra única dá acesso total à Edição WC2026 até {accessEndDate} — perfeito para a janela da Copa. A assinatura dá acesso à WC2026 MAIS todas as edições futuras (Champions League, Premier League, etc.) enquanto você estiver assinando.",
        },
        {
          q: "Como funcionam os cupons?",
          a: 'O Stripe Checkout tem um campo "Adicionar código promocional". Digite seu código lá — o desconto se aplica automaticamente.',
        },
        {
          q: "Posso cancelar a assinatura a qualquer momento?",
          a: "Sim. Você pode cancelar pelo Portal do Cliente quando quiser. O acesso continua até o fim do período já pago.",
        },
        {
          q: "Quais formas de pagamento vocês aceitam?",
          a: "Todos os principais cartões e PIX (para usuários brasileiros). O Stripe processa o pagamento com segurança — nunca vemos seus dados de cartão.",
        },
      ],
    },
  },
};

// Lightweight fallback shown while the route hydrates. Matches the
// dark theme + ambient glows of the real page so there's no flash.
function PricingPageFallback() {
  return (
    <div className="min-h-screen bg-[#070707] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.20), rgba(16,185,129,0) 70%)",
          }}
        />
      </div>
      <div className="relative z-10 min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  );
}

// `useSearchParams()` triggers Next 15's static-generation bailout,
// which requires a Suspense boundary at the route's default export.
// We wrap the actual page below so the bailout has somewhere to land.
export default function PricingPage() {
  return (
    <Suspense fallback={<PricingPageFallback />}>
      <PricingPageContent />
    </Suspense>
  );
}

function PricingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const editionId =
    (searchParams?.get("edition") || "wc2026").trim() || "wc2026";
  const edition = getEdition(editionId);

  const [lang, setLang] = useState("pt");
  const copy = translations[lang] || translations.en;

  // Format the edition's one-time access cutoff for the current
  // language ("31 August 2026" / "31 de agosto de 2026"). When a
  // translation string contains {accessEndDate}, fill() swaps it in
  // — that way changing oneTimeAccessEnd in editions.js is the only
  // edit needed when we shift the date.
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

  const fill = (s) =>
    accessEndDate && typeof s === "string"
      ? s.replace("{accessEndDate}", accessEndDate)
      : s;

  const { oneTimeOffering, subscriptionOfferings } = useMemo(() => {
    const all = listOfferingsForEdition(editionId);
    return {
      oneTimeOffering: all.find((o) => o.mode === "one_time") || null,
      subscriptionOfferings: all
        .filter((o) => o.mode === "subscription")
        .sort((a, b) =>
          a.interval === "monthly" ? -1 : b.interval === "monthly" ? 1 : 0
        ),
    };
  }, [editionId]);

  const [checkoutLoading, setCheckoutLoading] = useState(null);

  // Signed-out → route to the streamlined fan-edition signup with
  // the edition tag pre-applied. After signup users land on /lesson
  // and can navigate back to /pricing to complete the buy.
  const handleBuy = async (offeringId) => {
    if (!user) {
      router.push(`/join?edition=${encodeURIComponent(editionId)}`);
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
        Unknown edition: {editionId}.{" "}
        <Link href="/pricing" className="underline ml-1">
          Try /pricing
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden">
      {/* Ambient glows — same vocabulary as /wc2026 and /join for
          visual continuity across the funnel. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.20), rgba(16,185,129,0) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-25%] right-[-15%] w-[55vw] h-[55vw] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, rgba(234,179,8,0.12), rgba(234,179,8,0) 70%)",
          }}
        />
      </div>

      {/* Top-right lang toggle. Floating so it doesn't take vertical
          space away from the hero. */}
      <div className="absolute top-4 right-4 z-20 flex gap-1 text-[10px] sm:text-xs">
        <button
          onClick={() => setLang("en")}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            lang === "en"
              ? "bg-emerald-500 text-[#062013]"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLang("pt")}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            lang === "pt"
              ? "bg-emerald-500 text-[#062013]"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          PT
        </button>
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8 sm:space-y-10">
        {/* Hero — compact, centred. Eyebrow + headline only; no
            subtitle so the primary card sits high on mobile. */}
        <section className="text-center pt-2">
          <p className="text-[10px] sm:text-xs tracking-[0.35em] uppercase text-emerald-300/80 font-semibold mb-2 sm:mb-3">
            {copy.hero.eyebrow}
          </p>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            {copy.hero.titleHighlight}{" "}
            <span className="bg-gradient-to-r from-emerald-300 to-emerald-200 bg-clip-text text-transparent">
              {edition.name}
            </span>
          </h1>
        </section>

        {/* Primary one-off card. Centred (max-w-md), pulled to the
            top so the price + CTA are above the fold on a 375px
            iPhone after the compact hero. */}
        {oneTimeOffering && (
          <section className="max-w-md mx-auto">
            <div className="relative rounded-3xl bg-white/[0.04] backdrop-blur-sm border border-emerald-400/30 p-5 sm:p-7 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
              {/* Floating "One-time" pill */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500 text-[10px] sm:text-xs font-bold text-[#062013] tracking-wider uppercase shadow">
                  <Star className="w-3.5 h-3.5" /> {copy.primary.flag}
                </span>
              </div>

              {/* Icon + label */}
              <div className="flex items-center gap-3 mb-4 sm:mb-5 mt-1">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/15 flex items-center justify-center shrink-0">
                  <Trophy className="w-5 h-5 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold leading-tight">
                    {oneTimeOffering.label}
                  </h2>
                  <p className="text-xs text-white/50 mt-0.5">
                    {oneTimeOffering.description}
                  </p>
                </div>
              </div>

              {/* Price + access window */}
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-4xl sm:text-5xl font-black tracking-tight">
                  {oneTimeOffering.displayPrice}
                </span>
                <span className="text-sm text-white/40">
                  {oneTimeOffering.displayInterval}
                </span>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-emerald-200/80 mb-5">
                <Calendar className="w-3.5 h-3.5" />
                {fill(copy.primary.accessNote)}
              </p>

              {/* Features */}
              <ul className="space-y-2 mb-6">
                {copy.primary.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm">
                    <Check className="w-4 h-4 text-emerald-300 flex-shrink-0 mt-0.5" />
                    <span className="text-white/80">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => handleBuy(oneTimeOffering.id)}
                disabled={checkoutLoading !== null}
                className="w-full py-3 px-5 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[#062013] font-bold text-sm tracking-wide transition-colors flex items-center justify-center gap-1.5"
              >
                {checkoutLoading === oneTimeOffering.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading…
                  </>
                ) : (
                  <>
                    {copy.primary.cta}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Discount-coupon hint sits directly under the Buy
                  button so users with a Cultura/partner promo code
                  know exactly where it goes (Stripe Checkout's
                  built-in field, after they click above). */}
              <p className="mt-3 flex items-start gap-1.5 text-[11px] sm:text-xs text-white/55 leading-relaxed">
                <Tag className="w-3.5 h-3.5 text-emerald-300/70 mt-0.5 shrink-0" />
                <span>{copy.couponHint}</span>
              </p>
            </div>
          </section>
        )}

        {/* Got a Full Access code? — promoted to a prominent panel
            directly under the buy card so students with a code don't
            mistakenly click the paid CTA. Inline form (no separate
            modal) means one fewer tap to redeem. */}
        <FullAccessPanel
          copy={copy.fullAccess}
          isSignedIn={!!user}
          edition={editionId}
          onSuccess={() => {
            setTimeout(() => router.push("/dashboard"), 1200);
          }}
        />

        {/* Secondary subscription cards — quieter so they don't
            compete with the primary WC2026 offer. */}
        {subscriptionOfferings.length > 0 && (
          <section className="max-w-3xl mx-auto">
            <div className="text-center mb-5">
              <h3 className="text-base sm:text-lg font-bold text-white/85">
                {copy.secondary.heading}
              </h3>
              <p className="text-xs sm:text-sm text-white/50 max-w-xl mx-auto mt-1.5">
                {copy.secondary.sub}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
              {subscriptionOfferings.map((offering) => (
                <div
                  key={offering.id}
                  className="rounded-2xl bg-white/[0.04] backdrop-blur-sm border border-white/10 hover:border-white/20 transition-colors p-5"
                >
                  <h4 className="font-bold text-base text-white">
                    {offering.label}
                  </h4>
                  <p className="text-xs text-white/45 mt-0.5 mb-4">
                    {offering.description}
                  </p>
                  <div className="flex items-baseline gap-1.5 mb-4">
                    <span className="text-2xl sm:text-3xl font-black">
                      {offering.displayPrice}
                    </span>
                    <span className="text-xs text-white/40">
                      {offering.displayInterval}
                    </span>
                  </div>
                  <button
                    onClick={() => handleBuy(offering.id)}
                    disabled={checkoutLoading !== null}
                    className="w-full py-2 px-4 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-semibold disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
                  >
                    {checkoutLoading === offering.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      copy.secondary.cta
                    )}
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* (The discount-coupon hint moved to a caption under the Buy
            button, and the school-code modal trigger was replaced by
            the inline FullAccessPanel below the primary card.) */}

        {/* B2B */}
        <section className="max-w-3xl mx-auto">
          <div className="relative rounded-3xl bg-gradient-to-br from-emerald-500/15 via-white/[0.04] to-amber-400/10 border border-white/10 p-6 sm:p-8 overflow-hidden">
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-emerald-300" />
                <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200/80">
                  {copy.b2b.eyebrow}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold mb-3">
                {copy.b2b.title}
              </h2>
              <p className="text-sm text-white/65 mb-5 leading-relaxed">
                {copy.b2b.body}
              </p>

              <ul className="grid sm:grid-cols-2 gap-x-4 gap-y-2 mb-6">
                {copy.b2b.bullets.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span className="text-white/80">{b}</span>
                  </li>
                ))}
              </ul>

              <a
                href={`mailto:${copy.b2b.email}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white text-[#062013] font-bold text-sm hover:bg-white/90 transition-colors"
              >
                <Mail className="w-4 h-4" />
                {copy.b2b.cta}
              </a>
            </div>
            {/* Decorative icon — hidden on small screens to save space */}
            <div className="hidden sm:flex absolute right-6 bottom-6 w-16 h-16 rounded-full bg-white/5 items-center justify-center pointer-events-none">
              <Users className="w-7 h-7 text-white/30" />
            </div>
          </div>
        </section>

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
                  <ChevronDown className="w-4 h-4 text-emerald-300 mt-0.5 shrink-0 transition-transform group-open:rotate-180" />
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
 * buy card on the pricing page so partner-school students see the
 * redeem path without having to spot a small "Have a code?" link
 * at the bottom of the page. Same logic as the old SchoolCodeModal
 * but rendered inline (one fewer tap, no overlay).
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

        <p className="text-xs sm:text-sm text-white/65 leading-relaxed mb-4">
          {copy.body}
        </p>

        {success ? (
          <div className="py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-emerald-300" />
            </div>
            <p className="text-base font-bold text-white mb-1">
              {copy.successTitle}
            </p>
            <p className="text-sm text-white/60">{copy.successBody}</p>
          </div>
        ) : !isSignedIn ? (
          // Signed-out variant — the redeem endpoint requires an
          // authenticated player_id, so we route to /join before
          // showing the form rather than letting the user type a
          // code that we can't actually attach.
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

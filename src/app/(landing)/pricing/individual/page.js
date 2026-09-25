// src/app/(landing)/pricing/individual/page.js
//
// Dedicated page for the individual-player subscription. Purpose-built
// for direct sharing: Paul or David pastes the URL into a WhatsApp
// chat with a parent or teen, and the page opens on the price card
// with no B2B noise around it.
//
// Audience (per Paul's segmentation):
//   1. Middle-class teens at private escolinhas aiming at scholarships
//      abroad (parent is the decision-maker; conversion happens in a
//      family WhatsApp thread).
//   2. Youth / academy players from humbler backgrounds whose agent
//      or coach won't sign them up — they buy on their own.
//
// Copy strategy:
//   - PT-primary. EN mirrors for international parents / recruiters.
//   - Framing: "start now, before your agent decides" — the value
//     is career leverage, not just English lessons.
//   - Kept LIGHT. One hero, one card, one code-redeem, one talk-to-us
//     footer. Anything else is a distraction on a phone screen.

"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ChevronLeft, Users2, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";
import Eyebrow from "@/components/ui/eyebrow";
import IndividualPlayerCard from "@/components/pricing/IndividualPlayerCard";
import FullAccessPanel from "@/components/pricing/FullAccessPanel";
import {
  useIndividualPricing,
  useIndividualCheckout,
} from "@/lib/pricing/helpers";
import { buildSalesWhatsappLink } from "@/lib/sales/contact";

const EDITION_ID = "propath_26_27";

const translations = {
  en: {
    backLink: "Managing a team? See team plans →",
    hero: {
      eyebrow: "Global Player · for players",
      title: "Get ready for the world. Before your agent decides.",
      sub: "For youth players eyeing college scholarships, European clubs, or their next move. English, mental training, and the vocabulary coaches actually use — five minutes a day, on the phone.",
    },
    individual: {
      eyebrow: "Individual plan",
      title: "One player. One subscription.",
      sub: "The whole product, for one athlete.",
      monthlyPricePer: "per month",
      yearlyPricePer: "per year",
      yearlyEquivalent: "≈ {monthly}/month",
      yearlySavings: "You save {amount} vs paying monthly",
      features: [
        "Access to every Pro Path lesson",
        "Skill Radar to track your progress",
        "Certificate as you complete each Level",
        "Virtual Coach on WhatsApp",
      ],
      cta: "Start now",
      loading: "Loading…",
      billingMonthly: "Monthly",
      billingAnnual: "Annual",
      couponHint: "Discount codes → add at Stripe Checkout.",
    },
    fullAccess: {
      eyebrow: "Got a code from your school?",
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
    footer: {
      title: "Questions? Talk to Paul.",
      body: "Not sure if it's the right fit for your son / daughter? Ask Paul directly on WhatsApp — he'll take you through it in a couple of minutes.",
      cta: "Talk to Paul on WhatsApp",
    },
    talkToUsPrefill:
      "Hi Paul! I'm looking at the Global Player individual plan — can you tell me more?",
  },
  pt: {
    backLink: "Cuidando de um time? Veja os planos para times →",
    hero: {
      eyebrow: "Global Player · para jogadores",
      title: "Se prepare pro mundo. Antes do agente decidir.",
      sub: "Pra jogador de base pensando em bolsa nos EUA, clube na Europa, ou o próximo passo. Inglês, treinamento mental e o vocabulário que os técnicos usam de verdade — cinco minutos por dia, no celular.",
    },
    individual: {
      eyebrow: "Plano individual",
      title: "Um jogador. Uma assinatura.",
      sub: "O produto inteiro, para um atleta.",
      monthlyPricePer: "por mês",
      yearlyPricePer: "por ano",
      yearlyEquivalent: "≈ {monthly}/mês",
      yearlySavings: "Você economiza {amount} vs pagar mensalmente",
      features: [
        "Acesso a todas as aulas do Pro Path",
        "Radar de Habilidades pra acompanhar seu progresso",
        "Certificado a cada Nível concluído",
        "Técnico Virtual no WhatsApp",
      ],
      cta: "Começar agora",
      loading: "Carregando…",
      billingMonthly: "Mensal",
      billingAnnual: "Anual",
      couponHint: "Cupom de desconto → adicione no Stripe Checkout.",
    },
    fullAccess: {
      eyebrow: "Tem código da sua escola?",
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
    footer: {
      title: "Ficou com dúvida? Fale com o Paul.",
      body: "Não sabe se encaixa pro seu filho ou filha? Fala direto com o Paul no WhatsApp — em dois minutos ele te explica tudo.",
      cta: "Falar com o Paul no WhatsApp",
    },
    talkToUsPrefill:
      "Oi Paul! Estou vendo o plano individual da Global Player — pode me contar mais?",
  },
};

function IndividualPricingFallback() {
  return (
    <div className="min-h-screen bg-primary-900 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-accent-400" />
    </div>
  );
}

export default function IndividualPricingPage() {
  return (
    <Suspense fallback={<IndividualPricingFallback />}>
      <IndividualPricingContent />
    </Suspense>
  );
}

function IndividualPricingContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang, setLang } = useLanguage();
  const copy = translations[lang] || translations.pt;

  const {
    billing,
    setBilling,
    activeOffering,
    yearlyEquivalentMonthly,
    yearlySavingsAmount,
  } = useIndividualPricing(EDITION_ID);

  const { buy: handleBuy, loading: checkoutLoading } = useIndividualCheckout({
    editionId: EDITION_ID,
  });

  const talkToUsHref = buildSalesWhatsappLink({
    prefilledMessage: copy.talkToUsPrefill,
  });

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden">
      {/* Same ambient wash as /pricing so a visitor cross-linking
          between them doesn't feel a visual break. */}
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

      {/* Top-right lang toggle */}
      <div className="absolute top-4 right-4 z-20 flex gap-1 text-[10px] sm:text-xs">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            lang === "en"
              ? "bg-accent-400 text-primary-900"
              : "bg-primary-800 text-primary-400 hover:text-primary-100"
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
              : "bg-primary-800 text-primary-400 hover:text-primary-100"
          }`}
        >
          PT
        </button>
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-10 sm:space-y-12">
        {/* Back-link to the B2B page for anyone who lands here by
            mistake (agent, coach, club staff who thought this was the
            main pricing page). */}
        <div>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-100 transition-colors"
          >
            <Users2 className="w-3.5 h-3.5" />
            {copy.backLink}
          </Link>
        </div>

        {/* Hero */}
        <section className="text-center flex flex-col items-center">
          <GlobalPlayerLogo
            variant="crest"
            tone="tonalDark"
            size={64}
            sting="rise"
          />
          <div className="mt-5">
            <Eyebrow className="mb-2 whitespace-normal max-w-md">
              {copy.hero.eyebrow}
            </Eyebrow>
          </div>
          <h1
            className="font-display font-black tracking-tight leading-[1.05] text-primary-50 max-w-3xl"
            style={{ fontSize: "clamp(1.75rem, 5.5vw, 3rem)" }}
          >
            {copy.hero.title}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-primary-300 max-w-xl leading-relaxed">
            {copy.hero.sub}
          </p>
        </section>

        {/* The main event — individual pricing card */}
        <IndividualPlayerCard
          copy={copy.individual}
          billing={billing}
          onBillingChange={setBilling}
          activeOffering={activeOffering}
          checkoutLoading={checkoutLoading}
          handleBuy={handleBuy}
          yearlyEquivalentMonthly={yearlyEquivalentMonthly}
          yearlySavingsAmount={yearlySavingsAmount}
        />

        {/* Code redemption — same panel /pricing uses, so a teen with
            a partner-school code can redeem no matter which page their
            parent shared. */}
        <FullAccessPanel
          copy={copy.fullAccess}
          isSignedIn={!!user}
          edition={EDITION_ID}
          onSuccess={() => router.push("/lesson")}
        />

        {/* Footer talk-to-us — lower-key than the B2B footer because
            the primary decision here happens on the price card above.
            This is just the "still not sure?" safety net. */}
        <section className="text-center max-w-2xl mx-auto rounded-panel bg-primary-panel border border-primary-700 p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-display font-bold tracking-tight text-primary-50 leading-tight">
            {copy.footer.title}
          </h2>
          <p className="text-sm text-primary-300 mt-3 mb-5 leading-relaxed">
            {copy.footer.body}
          </p>
          <Link
            href={talkToUsHref}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary-800 hover:bg-primary-700 border border-primary-600 hover:border-accent-400/50 text-primary-100 text-sm font-semibold transition-colors"
          >
            <MessageCircle className="w-4 h-4 text-accent-400" />
            {copy.footer.cta}
          </Link>
        </section>

        {/* Quiet back-link mirror at the bottom for the same reason
            the top one exists — the person may have scrolled past the
            top link and want to escape. */}
        <div className="text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-300 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            {copy.backLink}
          </Link>
        </div>
      </main>
    </div>
  );
}

// src/app/(landing)/pricing/page.js
//
// Global Player pricing — B2B-first as of 2026-09.
//
// The page's job is to sell the argument, not the product features:
// "One lost signing costs an agent more than a year of Global Player."
// Everything else on the page — tier cards, calculator, FAQ — serves
// that framing.
//
// Layout (top → bottom):
//   1. Hero — the sales pitch, one primary CTA (Talk to us / Book a demo)
//   2. Interactive calculator — visitor moves sliders, math sells itself
//   3. B2B tier cards — Squad / Roster / Agency (Roster highlighted)
//   4. Feature comparison table — side-by-side matrix
//   5. Inquiry form — leads land in /admin/leads with source_detail tagged
//   6. Individual player quiet card — Stripe checkout (unchanged)
//   7. Full Access code panel — cohort-code redeem (unchanged)
//   8. FAQ
//
// Preserved from the pre-2026-09 version:
//   - Stripe checkout hook (handleBuy) — individual player subscription
//   - FullAccessPanel — cohort-code redeem for partner schools
//   - Language toggle synced to the app-wide LanguageContext
//
// Related infra:
//   - Calendly widget (client-side lazy-loaded) — NEXT_PUBLIC_CALENDLY_URL
//     env var points at the booking page. See CalendlyButton.js.
//   - /api/leads/inquiry — public endpoint the inquiry form posts to.

"use client";

import { Suspense, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronDown,
  Loader2,
  Check,
  Sparkles,
  MessageCircle,
  User,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { getEdition } from "@/lib/editions/editions";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";
import Button from "@/components/ui/button";
import Eyebrow from "@/components/ui/eyebrow";
import { buildSalesWhatsappLink } from "@/lib/sales/contact";
// import PricingCalculator from "@/components/pricing/PricingCalculator";
import InquiryForm from "@/components/pricing/InquiryForm";
import IndividualPlayerCard from "@/components/pricing/IndividualPlayerCard";
import FullAccessPanel from "@/components/pricing/FullAccessPanel";
import {
  useIndividualPricing,
  useIndividualCheckout,
} from "@/lib/pricing/helpers";

// The only edition Pro Path pricing surfaces at. If a second
// concurrent edition ever ships, spawn a dedicated page rather than
// resurrecting the edition-aware routing that used to live here.
const EDITION_ID = "propath_26_27";

// Tier catalogue — copy + prices in one place. If David revises
// prices, they change here (and in the calculator TIERS constant).
//
// `offeringIds` maps each billing interval to the Stripe offering id
// defined in src/lib/editions/editions.js. Base and Elenco use these
// to fire /api/checkout when the card CTA is clicked. Agency ships
// them for parity/future use, but its card always routes to a sales
// WhatsApp conversation because those deals are always custom.
const TIERS = [
  {
    id: "squad",
    monthlyBrl: 397,
    annualBrl: 3970, // 10 months priced (2 months free)
    athletes: 20,
    highlight: false,
    icon: "shield",
    offeringIds: {
      monthly: "gp_base_monthly_brl",
      annual: "gp_base_yearly_brl",
    },
  },
  {
    id: "roster",
    monthlyBrl: 897,
    annualBrl: 8970,
    athletes: 50,
    highlight: true, // "Mais popular"
    icon: "trophy",
    offeringIds: {
      monthly: "gp_elenco_monthly_brl",
      annual: "gp_elenco_yearly_brl",
    },
  },
  {
    id: "agency",
    monthlyBrl: 2997,
    // Annual = 10 months priced (matches Squad/Roster ratio). Shows
    // as "From R$ 29,970 / year" so the toggle feels consistent with
    // the cheaper tiers — an agency evaluating this already knows
    // R$ 3k/mo = R$ 30-36k/yr, so the sticker number isn't the
    // scary part; the visual inconsistency of one card not
    // responding to the toggle was.
    annualBrl: 29970,
    athletes: "200+",
    highlight: false,
    icon: "sparkles",
    offeringIds: {
      monthly: "gp_agencia_monthly_brl",
      annual: "gp_agencia_yearly_brl",
    },
  },
];

const translations = {
  en: {
    hero: {
      eyebrow: "Global Player · for agencies, academies, clubs",
      title: "Not just English. A safety net for your athletes.",
      sub: "Track 20+ players from one dashboard. Spot problems before they become losses.",
      primaryCta: "Book a demo",
      secondaryCta: "See plans ↓",
      individualLink: "Playing yourself? See individual plans →",
    },
    valueCallout: {
      title: "One lost signing costs much more than a year of Global Player.",
      body: "A promising contract slipping through your fingers is years of your commission. This costs less than the gas you spend visiting dorms.",
    },
    tiers: {
      squad: {
        name: "Squad",
        tagline: "Get every athlete on your radar.",
        blurb: "For small agencies and academies with up to 20 athletes.",
        perAthlete: "Under R$ 20 per athlete / month",
        features: [
          "Admin dashboard for the whole roster",
          "Weekly engagement report",
          "Crisis alerts (depression, anxiety, frustration)",
          "Bilingual support (PT + EN)",
        ],
        cta: "Start with Squad",
      },
      roster: {
        name: "Roster",
        tagline: "Everything in Squad, at scale.",
        blurb: "For mid-size agencies managing up to 50 athletes.",
        perAthlete: "Under R$ 18 per athlete / month",
        badge: "Most popular",
        features: [
          "Everything in Squad",
          "Up to 50 athletes",
          "Priority support",
          "CSV export of engagement data",
        ],
        cta: "Get Roster",
      },
      agency: {
        name: "Agency",
        tagline: "White-labelled. Data-owned. Tactically tuned.",
        blurb: "For big agencies and pro clubs — Roc Nation-scale operations.",
        perAthlete: "Custom seat counts",
        features: [
          "Everything in Roster",
          "White-label branding (your logo, your voice)",
          "Full data ownership + LGPD-compliant export",
          "Tactical customization (Premier League / La Liga / Portugal focus)",
          "Dedicated onboarding",
          "Setup fee from R$ 2,000 (one-time)",
        ],
        cta: "Talk to us",
        fromPrefix: "From",
      },
      priceMonth: "/ month",
      priceYear: "/ year",
      priceCustom: "Custom",
      athletesLabelSingular: "athlete",
      athletesLabelPlural: "athletes",
      upTo: "Up to",
      annualNote: "Annual · 2 months free",
      monthlyNote: "Monthly · no lock-in",
      billingMonthly: "Monthly",
      billingAnnual: "Annual",
      billingSave: "Save 2 months",
      talkToUsAboveCards: "Not sure which plan? Talk to us →",
      talkToUsPrefill:
        "Hi Paul! Looking at the pricing page — can you help me figure out which plan fits?",
      talkToUsSimple: "Talk to us on WhatsApp",
    },
    comparison: {
      heading: "What's in each plan",
      cols: ["Squad", "Roster", "Agency"],
      rows: [
        { label: "Admin dashboard", vals: [true, true, true] },
        { label: "Weekly engagement report", vals: [true, true, true] },
        { label: "Crisis alerts", vals: [true, true, true] },
        { label: "Max athletes", vals: ["20", "50", "200+"] },
        { label: "Priority support", vals: [false, true, true] },
        { label: "CSV / API export", vals: [false, true, true] },
        { label: "White-label branding", vals: [false, false, true] },
        { label: "Data ownership + LGPD export", vals: [false, false, true] },
        {
          label: "Tactical customization (destination league)",
          vals: [false, false, true],
        },
        { label: "Dedicated onboarding", vals: [false, false, true] },
        { label: "Setup fee", vals: ["—", "—", "R$ 2,000+"] },
      ],
    },
    individual: {
      eyebrow: "Just for me",
      title: "Individual player plan",
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
    faq: {
      title: "Frequently asked questions",
      items: [
        {
          q: "What counts as an athlete?",
          a: "An active dashboard seat — one athlete linked to your agency account. Athletes who leave your roster free the seat up.",
        },
        {
          q: "Can I upgrade mid-cycle?",
          a: "Yes. Upgrade any time; we prorate the difference. Downgrade at renewal.",
        },
        {
          q: "How do crisis alerts work?",
          a: "The bot flags language patterns (depression, acute anxiety, frustration) in athletes' text responses. Agents get an email + WhatsApp alert with the context. Human review before any contact — we never automate reaching out during a crisis moment.",
        },
        {
          q: "What data does the agency own on Agency tier?",
          a: "Aggregate + per-player engagement logs, exportable via CSV or API. LGPD-compliant. The data belongs to your agency — you can migrate off anytime.",
        },
        {
          q: "International pricing (USD / EUR)?",
          a: "Talk to us — we quote in USD or EUR for agencies operating outside Brazil. Setup + monthly rates are equivalent.",
        },
        {
          q: "How does the coupon field work?",
          a: 'The individual player plan has a "Add promotion code" field at Stripe Checkout. Enter your code there — the discount applies automatically.',
        },
      ],
    },
    footerCta: {
      title: "Ready to talk?",
      sub: "Book a 15-minute demo or drop us a message — Paul or David will follow up personally.",
    },
  },
  pt: {
    hero: {
      eyebrow: "Global Player · para agências, escolinhas, clubes",
      title: "Não é só inglês. É proteção para o seu ativo.",
      sub: "Acompanhe 20+ atletas em um painel. Detecte problemas antes que virem prejuízo.",
      primaryCta: "Agendar demo",
      secondaryCta: "Ver planos ↓",
      individualLink: "Jogador individual? Veja seu plano →",
    },
    valueCallout: {
      title:
        "Um contrato perdido custa muito mais do que um ano de Global Player.",
      body: "Um contrato promissor escapando das suas mãos são anos da sua comissão. Isto custa menos que a gasolina que você gasta indo aos alojamentos.",
    },
    tiers: {
      squad: {
        name: "Base",
        tagline: "Coloque cada atleta no seu radar.",
        blurb: "Para agências pequenas e escolinhas com até 20 atletas.",
        perAthlete: "Menos de R$ 20 por atleta / mês",
        features: [
          "Painel administrativo do elenco inteiro",
          "Relatório semanal de engajamento",
          // "Alertas de crise (depressão, ansiedade, frustração)",
          "Suporte bilíngue (PT + EN)",
        ],
        cta: "Começar com o Base",
      },
      roster: {
        name: "Elenco",
        tagline: "Tudo do Base, em escala.",
        blurb: "Para agências de médio porte gerenciando até 50 atletas.",
        perAthlete: "Menos de R$ 18 por atleta / mês",
        badge: "Mais popular",
        features: [
          "Tudo do Base",
          "Até 50 atletas",
          "Suporte prioritário",
          "Exportação CSV dos dados de engajamento",
        ],
        cta: "Escolher Elenco",
      },
      agency: {
        name: "Agência",
        tagline: "Marca própria. Dados seus. Ajuste tático.",
        blurb:
          "Para grandes agências e clubes profissionais — escala Roc Nation.",
        perAthlete: "Vagas customizadas",
        features: [
          "Tudo do Elenco",
          "Marca branca (seu logo, sua voz)",
          "Propriedade total dos dados + exportação LGPD",
          "Customização tática (foco Premier League / La Liga / Portugal)",
          "Onboarding dedicado",
          "Taxa de setup a partir de R$ 2.000 (pagamento único)",
        ],
        cta: "Fale com a gente",
        fromPrefix: "A partir de",
      },
      priceMonth: "/ mês",
      priceYear: "/ ano",
      priceCustom: "Customizado",
      athletesLabelSingular: "atleta",
      athletesLabelPlural: "atletas",
      upTo: "Até",
      annualNote: "Anual · 2 meses grátis",
      monthlyNote: "Mensal · sem fidelidade",
      billingMonthly: "Mensal",
      billingAnnual: "Anual",
      billingSave: "Economize 2 meses",
      talkToUsAboveCards: "Não sabe qual plano? Fale com agente →",
      talkToUsPrefill:
        "Oi Paul! Estou vendo os planos na página de preços — pode me ajudar a escolher qual encaixa melhor?",
      talkToUsSimple: "Fale com agente no WhatsApp",
    },
    comparison: {
      heading: "O que vem em cada plano",
      cols: ["Base", "Elenco", "Agência"],
      rows: [
        { label: "Painel administrativo", vals: [true, true, true] },
        { label: "Relatório semanal de engajamento", vals: [true, true, true] },
        // { label: "Alertas de crise", vals: [true, true, true] },
        { label: "Máximo de atletas", vals: ["20", "50", "200+"] },
        { label: "Suporte prioritário", vals: [false, true, true] },
        { label: "Exportação CSV / API", vals: [false, true, true] },
        { label: "Marca branca", vals: [false, false, true] },
        { label: "Propriedade dos dados + LGPD", vals: [false, false, true] },
        {
          label: "Customização tática (liga de destino)",
          vals: [false, false, true],
        },
        { label: "Onboarding dedicado", vals: [false, false, true] },
        { label: "Taxa de setup", vals: ["—", "—", "R$ 2.000+"] },
      ],
    },
    individual: {
      eyebrow: "Só para mim",
      title: "Plano individual",
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
    faq: {
      title: "Perguntas frequentes",
      items: [
        {
          q: "O que conta como atleta?",
          a: "Uma vaga ativa no painel — um atleta vinculado à conta da sua agência. Atletas que saem da sua carteira liberam a vaga.",
        },
        {
          q: "Posso subir de plano no meio do ciclo?",
          a: "Sim. Faça upgrade a qualquer momento; a gente pró-rateia a diferença. Downgrade fica para a renovação.",
        },
        {
          q: "Como funcionam os alertas de crise?",
          a: "O bot detecta padrões de linguagem (depressão, ansiedade aguda, frustração) nas respostas escritas dos atletas. O empresário recebe email + WhatsApp com o contexto. Revisão humana sempre antes de qualquer contato — nunca automatizamos o momento de crise.",
        },
        {
          q: "O que a agência possui no plano Agência?",
          a: "Logs de engajamento agregados e por-atleta, exportáveis por CSV ou API. LGPD-compliant. Os dados pertencem à sua agência — você pode migrar quando quiser.",
        },
        {
          q: "Preços internacionais (USD / EUR)?",
          a: "Fale com a gente — cotamos em USD ou EUR para agências fora do Brasil. Setup + mensalidade em valores equivalentes.",
        },
        {
          q: "Como funciona o campo de cupom?",
          a: 'O plano individual tem um campo "Adicionar código promocional" no Stripe Checkout. Cole o código lá — o desconto aplica automaticamente.',
        },
      ],
    },
    footerCta: {
      title: "Vamos conversar?",
      sub: "Agende uma demo de 15 minutos ou nos mande uma mensagem — Paul ou David vão te retornar pessoalmente.",
    },
  },
};

function PricingPageFallback() {
  return (
    <div className="min-h-screen bg-primary-900 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-accent-400" />
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

  // Individual-player pricing state (offerings, monthly/yearly toggle,
  // savings maths) lives in one hook so the /pricing/individual page
  // reuses the same logic without duplication.
  const {
    billing: individualBilling,
    setBilling: setIndividualBilling,
    activeOffering,
    yearlyEquivalentMonthly,
    yearlySavingsAmount,
  } = useIndividualPricing(EDITION_ID);

  // Checkout dispatcher — shared between the individual card and the
  // B2B tier cards. Redirects to /join when signed out.
  const { buy: handleBuy, loading: checkoutLoading } = useIndividualCheckout({
    editionId: EDITION_ID,
  });

  // B2B tier billing toggle — separate from individual so agencies
  // can eyeball the annual saving without disturbing the individual
  // card below.
  const [tierBilling, setTierBilling] = useState("annual");

  if (!edition) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary-900 text-primary-300 p-6">
        Unknown edition. Contact support.
      </div>
    );
  }

  const scrollToPlans = () => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("plans");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden">
      {/* Ambient wash — matches /, /join, /signin so the whole
          funnel reads as one continuous surface. */}
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

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-12 sm:space-y-16">
        {/* ─── Hero ────────────────────────────────────────────── */}
        <section className="text-center flex flex-col items-center">
          <GlobalPlayerLogo
            variant="crest"
            tone="tonalDark"
            size={64}
            sting="rise"
          />
          <div className="mt-5">
            {/* whitespace-normal here overrides the primitive's
                default nowrap — this eyebrow is a long "Global Player
                · for agencies, academies, clubs" string that
                overflows on mobile if forced to a single line. */}
            <Eyebrow className="mb-2 whitespace-normal max-w-md">
              {copy.hero.eyebrow}
            </Eyebrow>
          </div>
          <h1
            className="font-display font-black tracking-tight leading-[1.05] text-primary-50 max-w-3xl"
            style={{ fontSize: "clamp(1.75rem, 5.5vw, 3.25rem)" }}
          >
            {copy.hero.title}
          </h1>
          <p className="mt-4 text-base sm:text-lg text-primary-300 max-w-2xl leading-relaxed">
            {copy.hero.sub}
          </p>
          <div className="mt-6 flex items-center gap-3 flex-wrap justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={scrollToPlans}
              type="button"
            >
              {copy.hero.secondaryCta}
            </Button>
          </div>

          {/* Cross-link to the dedicated individual-player page. Quiet
              styling — this page is B2B-first, and the individual
              flow is a secondary audience served by a separate page
              Paul shares directly with parents / teens. */}
          <Link
            href="/pricing/individual"
            className="mt-4 inline-flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-100 transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            {copy.hero.individualLink}
          </Link>
        </section>

        {/* ─── Value callout ───────────────────────────────────── */}
        <section className="text-center max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-primary-50 leading-tight">
            {copy.valueCallout.title}
          </h2>
          <p className="mt-3 text-sm sm:text-base text-primary-300 leading-relaxed">
            {copy.valueCallout.body}
          </p>
        </section>

        {/* ─── Interactive calculator ──────────────────────────── */}
        {/* <PricingCalculator lang={lang === "en" ? "en" : "pt"} /> */}

        {/* ─── B2B tier cards ──────────────────────────────────── */}
        <section id="plans" className="space-y-5">
          {/* Billing interval toggle */}
          <div className="flex items-center justify-center">
            <BillingToggle
              value={tierBilling}
              onChange={setTierBilling}
              labels={{
                monthly: copy.tiers.billingMonthly,
                annual: copy.tiers.billingAnnual,
                save: copy.tiers.billingSave,
              }}
            />
          </div>

          {/* Talk-to-us above the cards — deliberately placed on the
              path to the cards, not below, so a phone-screen visitor
              who's undecided has the human option in view before they
              start comparing tiers. Neutral pill (not lime) so the
              tier cards below still own the primary CTA weight. */}
          <div className="flex items-center justify-center">
            <Link
              href={buildSalesWhatsappLink({
                prefilledMessage: copy.tiers.talkToUsPrefill,
              })}
              target="_blank"
              rel="noopener"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-panel border border-primary-700 hover:border-accent-400/50 hover:bg-primary-800 text-primary-200 text-xs font-semibold transition-colors"
            >
              <MessageCircle className="w-3.5 h-3.5 text-accent-400" />
              {copy.tiers.talkToUsAboveCards}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {TIERS.map((tier) => (
              <TierCard
                key={tier.id}
                tier={tier}
                copy={copy.tiers}
                billing={tierBilling}
                handleBuy={handleBuy}
                checkoutLoading={checkoutLoading}
                salesPrefill={copy.tiers.talkToUsPrefill}
              />
            ))}
          </div>
        </section>

        {/* ─── Feature comparison table ────────────────────────── */}
        <section>
          <h2 className="text-lg sm:text-xl font-display font-black tracking-tight text-center mb-5 text-primary-50">
            {copy.comparison.heading}
          </h2>
          <ComparisonTable copy={copy.comparison} />
        </section>

        {/* ─── Inquiry form ────────────────────────────────────── */}
        <InquiryForm lang={lang === "en" ? "en" : "pt"} />

        {/* ─── Individual player quiet card ────────────────────── */}
        <IndividualPlayerCard
          copy={copy.individual}
          billing={individualBilling}
          onBillingChange={setIndividualBilling}
          activeOffering={activeOffering}
          checkoutLoading={checkoutLoading}
          handleBuy={handleBuy}
          yearlyEquivalentMonthly={yearlyEquivalentMonthly}
          yearlySavingsAmount={yearlySavingsAmount}
        />

        {/* ─── Full Access code redeem ─────────────────────────── */}
        <FullAccessPanel
          copy={copy.fullAccess}
          isSignedIn={!!user}
          edition={EDITION_ID}
          onSuccess={() => router.push("/lesson")}
        />

        {/* ─── FAQ ─────────────────────────────────────────────── */}
        <section className="max-w-2xl mx-auto">
          <h2 className="text-lg sm:text-xl font-display font-black tracking-tight text-center mb-4 text-primary-50">
            {copy.faq.title}
          </h2>
          <div className="space-y-2">
            {copy.faq.items.map((item, i) => (
              <details
                key={i}
                className="group rounded-card bg-primary-panel border border-primary-700 hover:border-primary-600 transition-colors"
              >
                <summary className="cursor-pointer list-none p-4 flex items-start justify-between gap-3 font-semibold text-primary-50 text-sm">
                  <span>{item.q}</span>
                  <ChevronDown className="w-4 h-4 text-accent-400 mt-0.5 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-primary-300 text-sm leading-relaxed">
                  {item.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* ─── Footer CTA ──────────────────────────────────────── */}
        <section className="text-center max-w-2xl mx-auto rounded-panel bg-primary-panel border border-accent-400/30 p-6 sm:p-8">
          <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-primary-50 leading-tight">
            {copy.footerCta.title}
          </h2>
          <p className="text-sm text-primary-300 mt-3 mb-5 leading-relaxed">
            {copy.footerCta.sub}
          </p>
          <Link
            href={buildSalesWhatsappLink({
              prefilledMessage: copy.tiers.talkToUsPrefill,
            })}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-sm font-bold tracking-wide transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
            {copy.tiers.talkToUsSimple}
          </Link>
        </section>
      </main>
    </div>
  );
}

/* ─── BillingToggle ────────────────────────────────────────── */

function BillingToggle({ value, onChange, labels }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-primary-panel border border-primary-700 p-1">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
          value === "monthly"
            ? "bg-primary-800 text-primary-50"
            : "text-primary-400 hover:text-primary-100"
        }`}
      >
        {labels.monthly}
      </button>
      <button
        type="button"
        onClick={() => onChange("annual")}
        className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-full transition-colors ${
          value === "annual"
            ? "bg-accent-400 text-primary-900"
            : "text-primary-400 hover:text-primary-100"
        }`}
      >
        {labels.annual}
        <span
          className={`text-[10px] font-bold ${value === "annual" ? "text-primary-900/70" : "text-accent-400"}`}
        >
          {labels.save}
        </span>
      </button>
    </div>
  );
}

/* ─── TierCard ─────────────────────────────────────────────── */

function TierCard({
  tier,
  copy,
  billing,
  handleBuy,
  checkoutLoading,
  salesPrefill,
}) {
  const t = copy[tier.id];
  const isAgency = tier.id === "agency";
  const isHighlighted = !!tier.highlight;
  const activeOfferingId = tier.offeringIds
    ? tier.offeringIds[billing === "annual" ? "annual" : "monthly"]
    : null;
  const isBuying = checkoutLoading === activeOfferingId;

  // Price display honours the billing toggle for every tier —
  // including Agency, which now has an annualBrl and just carries
  // the "From" prefix so it reads as a starting point rather than a
  // fixed number. Keeping the toggle behaviour consistent across all
  // three cards avoids the "one card feels dead" moment the earlier
  // version had.
  const priceDisplay = (() => {
    const isAnnual = billing === "annual" && tier.annualBrl != null;
    return {
      prefix: isAgency ? t.fromPrefix : null,
      amount: `R$ ${formatBrl(isAnnual ? tier.annualBrl : tier.monthlyBrl)}`,
      suffix: isAnnual ? copy.priceYear : copy.priceMonth,
    };
  })();

  const athletesLine = (() => {
    if (typeof tier.athletes === "string") {
      // Agency: "200+"
      return `${tier.athletes} ${copy.athletesLabelPlural}`;
    }
    return `${copy.upTo} ${tier.athletes} ${copy.athletesLabelPlural}`;
  })();

  return (
    <div
      className={`relative flex flex-col rounded-panel bg-primary-panel border p-5 sm:p-6 transition-colors ${
        isHighlighted
          ? "border-accent-400 shadow-[0_0_40px_rgba(163,230,53,0.10)]"
          : "border-primary-700 hover:border-primary-600"
      }`}
    >
      {isHighlighted && t.badge && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent-400 text-primary-900 text-[10px] font-bold uppercase tracking-label">
          <Sparkles className="w-3 h-3" strokeWidth={2.5} />
          {t.badge}
        </span>
      )}

      <div className="mb-4">
        <h3 className="text-xl sm:text-2xl font-display font-black tracking-tight text-primary-50">
          {t.name}
        </h3>
        <p className="text-sm text-primary-300 leading-relaxed mt-1">
          {t.tagline}
        </p>
        <p className="text-xs text-primary-500 mt-2">{t.blurb}</p>
      </div>

      <div className="mb-4">
        {priceDisplay.prefix && (
          <p className="text-[11px] uppercase tracking-label text-primary-400 font-semibold">
            {priceDisplay.prefix}
          </p>
        )}
        <p className="flex items-baseline gap-1.5">
          <span className="text-3xl sm:text-4xl font-display font-black text-primary-50 tabular-nums">
            {priceDisplay.amount}
          </span>
          <span className="text-sm text-primary-400">
            {priceDisplay.suffix}
          </span>
        </p>
        <p className="text-[11px] text-primary-500 mt-1">
          {billing === "annual" ? copy.annualNote : copy.monthlyNote} ·{" "}
          {athletesLine} · {t.perAthlete}
        </p>
      </div>

      <ul className="space-y-2 mb-5 flex-1">
        {t.features.map((f, i) => (
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

      {/* Card CTA — Squad + Roster fire Stripe checkout for the
          currently-selected billing interval. Agency is always a
          talk-to-us WhatsApp handoff because those deals are custom.
          Only the highlighted (Roster) card gets the lime primary
          variant per DS "one accent per view" discipline; the
          neighbouring CTAs use secondary. */}
      {isAgency ? (
        <Link
          href={buildSalesWhatsappLink({ prefilledMessage: salesPrefill })}
          target="_blank"
          rel="noopener"
          className={`w-full inline-flex items-center justify-center gap-2 py-3 rounded-full font-bold text-sm tracking-wide transition-colors ${
            isHighlighted
              ? "bg-accent-400 hover:bg-accent-300 text-primary-900"
              : "bg-primary-800 hover:bg-primary-700 border border-primary-600 hover:border-primary-500 text-primary-100"
          }`}
        >
          <MessageCircle className="w-4 h-4" />
          {t.cta}
        </Link>
      ) : (
        <Button
          variant={isHighlighted ? "primary" : "secondary"}
          size="md"
          fullWidth
          onClick={() => activeOfferingId && handleBuy(activeOfferingId)}
          disabled={!activeOfferingId || checkoutLoading !== null}
          loading={isBuying}
          type="button"
        >
          {t.cta}
        </Button>
      )}
    </div>
  );
}

/* ─── ComparisonTable ──────────────────────────────────────── */

function ComparisonTable({ copy }) {
  return (
    <div className="rounded-card border border-primary-700 bg-primary-panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-primary-700 bg-primary-800">
          <tr>
            <th className="text-left px-4 py-3 text-[10px] uppercase tracking-label text-primary-400 font-semibold" />
            {copy.cols.map((c, i) => (
              <th
                key={i}
                className={`text-center px-3 py-3 text-[11px] uppercase tracking-label font-bold ${
                  i === 1 ? "text-accent-400" : "text-primary-200"
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-primary-700">
          {copy.rows.map((row, i) => (
            <tr key={i} className="hover:bg-primary-800/50 transition-colors">
              <td className="px-4 py-3 text-primary-300 text-sm">
                {row.label}
              </td>
              {row.vals.map((v, j) => (
                <td key={j} className="px-3 py-3 text-center">
                  {v === true ? (
                    <Check
                      className={`w-4 h-4 mx-auto ${
                        j === 1 ? "text-accent-400" : "text-primary-300"
                      }`}
                      strokeWidth={2.5}
                    />
                  ) : v === false ? (
                    <span className="text-primary-600">—</span>
                  ) : (
                    <span
                      className={`text-sm tabular-nums font-semibold ${
                        j === 1 ? "text-accent-400" : "text-primary-100"
                      }`}
                    >
                      {v}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

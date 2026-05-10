"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  X,
  Zap,
  Trophy,
  Building2,
  Users,
  Mail,
  ArrowRight,
  Flame,
  Star,
  Shield,
} from "lucide-react";

const translations = {
  en: {
    hero: {
      title: "Choose Your",
      titleHighlight: "Training Plan",
      subtitle: "Start free and upgrade when you're ready to go pro",
    },
    toggle: {
      monthly: "Monthly",
      yearly: "Yearly",
      save: "Save 17%",
    },
    plans: {
      explorer: {
        name: "Explorer",
        price: "Free",
        period: "forever",
        description: "Perfect for getting started with football English",
        features: [
          { text: "3 sessions per pillar", included: true },
          { text: "Basic vocabulary challenges", included: true },
          { text: "Progress tracking", included: true },
          { text: "Community access", included: true },
          { text: "Unlimited sessions", included: false },
          { text: "AI pronunciation feedback", included: false },
          { text: "Streak rewards & badges", included: false },
          { text: "Offline access", included: false },
        ],
        cta: "Start Free",
        popular: false,
      },
      pro: {
        name: "Pro",
        priceMonthly: "R$29",
        priceYearly: "R$290",
        periodMonthly: "/month",
        periodYearly: "/year",
        description: "Full access to accelerate your English training",
        features: [
          { text: "Unlimited sessions & challenges", included: true },
          { text: "All vocabulary & conversation modules", included: true },
          { text: "Advanced progress analytics", included: true },
          { text: "AI pronunciation feedback", included: true },
          { text: "Streak rewards & badges", included: true },
          { text: "Offline access", included: true },
          { text: "Priority support", included: true },
          { text: "Early access to new content", included: true },
        ],
        cta: "Go Pro",
        popular: true,
      },
    },
    b2b: {
      title: "For Clubs & Academies",
      subtitle: "Custom solutions for your organization",
      description:
        "Get tailored English training for your players with dedicated support, custom content, and team management features.",
      features: [
        "Custom content for your club",
        "Player progress dashboards",
        "Dedicated account manager",
        "Flexible billing options",
      ],
      cta: "Contact Sales",
      email: "partnerships@fieldtalk.app",
    },
    faq: {
      title: "Questions?",
      items: [
        {
          q: "Can I switch plans anytime?",
          a: "Yes! Upgrade to Pro anytime. Downgrade takes effect at the end of your billing period.",
        },
        {
          q: "What payment methods do you accept?",
          a: "We accept all major credit cards and PIX (for Brazilian users).",
        },
        {
          q: "Is there a refund policy?",
          a: "Yes, we offer a 7-day money-back guarantee if you're not satisfied.",
        },
      ],
    },
  },
  pt: {
    hero: {
      title: "Escolha Seu",
      titleHighlight: "Plano de Treino",
      subtitle: "Comece grátis e faça upgrade quando estiver pronto para o Pro",
    },
    toggle: {
      monthly: "Mensal",
      yearly: "Anual",
      save: "Economize 17%",
    },
    plans: {
      explorer: {
        name: "Explorer",
        price: "Grátis",
        period: "para sempre",
        description: "Perfeito para começar com inglês do futebol",
        features: [
          { text: "3 sessões por pilar", included: true },
          { text: "Desafios básicos de vocabulário", included: true },
          { text: "Acompanhamento de progresso", included: true },
          { text: "Acesso à comunidade", included: true },
          { text: "Sessões ilimitadas", included: false },
          { text: "Feedback de pronúncia com IA", included: false },
          { text: "Recompensas e badges de sequência", included: false },
          { text: "Acesso offline", included: false },
        ],
        cta: "Começar Grátis",
        popular: false,
      },
      pro: {
        name: "Pro",
        priceMonthly: "R$29",
        priceYearly: "R$290",
        periodMonthly: "/mês",
        periodYearly: "/ano",
        description: "Acesso completo para acelerar seu treino de inglês",
        features: [
          { text: "Sessões e desafios ilimitados", included: true },
          { text: "Todos os módulos de vocabulário e conversação", included: true },
          { text: "Análises avançadas de progresso", included: true },
          { text: "Feedback de pronúncia com IA", included: true },
          { text: "Recompensas e badges de sequência", included: true },
          { text: "Acesso offline", included: true },
          { text: "Suporte prioritário", included: true },
          { text: "Acesso antecipado a novos conteúdos", included: true },
        ],
        cta: "Ir Pro",
        popular: true,
      },
    },
    b2b: {
      title: "Para Clubes e Academias",
      subtitle: "Soluções personalizadas para sua organização",
      description:
        "Obtenha treinamento de inglês personalizado para seus jogadores com suporte dedicado, conteúdo customizado e recursos de gestão de equipe.",
      features: [
        "Conteúdo personalizado para seu clube",
        "Dashboards de progresso dos jogadores",
        "Gerente de conta dedicado",
        "Opções flexíveis de faturamento",
      ],
      cta: "Falar com Vendas",
      email: "parcerias@fieldtalk.app",
    },
    faq: {
      title: "Perguntas?",
      items: [
        {
          q: "Posso trocar de plano a qualquer momento?",
          a: "Sim! Faça upgrade para Pro a qualquer momento. O downgrade entra em vigor no final do seu período de cobrança.",
        },
        {
          q: "Quais formas de pagamento vocês aceitam?",
          a: "Aceitamos todos os principais cartões de crédito e PIX.",
        },
        {
          q: "Existe política de reembolso?",
          a: "Sim, oferecemos garantia de devolução do dinheiro em 7 dias se você não estiver satisfeito.",
        },
      ],
    },
  },
};

export default function PricingPage() {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);
  const [lang, setLang] = useState("pt"); // Default to Portuguese for Brazil

  const copy = translations[lang] || translations.pt;

  const handleSubscribe = async (plan) => {
    if (plan === "explorer") {
      router.push("/signup");
      return;
    }

    // For Pro plan, redirect to signup first, then they can upgrade
    // In a real flow, you'd check if user is logged in first
    router.push("/signup?plan=pro");
  };

  return (
    <div className="min-h-screen">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setLang("en")}
          className={`px-3 py-1 rounded-full text-sm ${
            lang === "en"
              ? "bg-accent-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLang("pt")}
          className={`px-3 py-1 rounded-full text-sm ${
            lang === "pt"
              ? "bg-accent-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
          }`}
        >
          PT
        </button>
      </div>

      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-br from-primary-50 to-accent-50 dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            {copy.hero.title}{" "}
            <span className="bg-gradient-to-r from-accent-600 to-accent-500 bg-clip-text text-transparent">
              {copy.hero.titleHighlight}
            </span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            {copy.hero.subtitle}
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-12">
            <span
              className={`text-sm font-medium ${
                !isYearly ? "text-gray-900 dark:text-white" : "text-gray-500"
              }`}
            >
              {copy.toggle.monthly}
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-14 h-7 rounded-full transition-colors ${
                isYearly ? "bg-accent-600" : "bg-gray-300 dark:bg-gray-600"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                  isYearly ? "translate-x-8" : "translate-x-1"
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium ${
                isYearly ? "text-gray-900 dark:text-white" : "text-gray-500"
              }`}
            >
              {copy.toggle.yearly}
            </span>
            {isYearly && (
              <span className="bg-green-100 text-green-700 text-xs font-medium px-2 py-1 rounded-full">
                {copy.toggle.save}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-16 bg-white dark:bg-gray-900 -mt-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Explorer Plan */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-gray-600 dark:text-gray-300" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {copy.plans.explorer.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {copy.plans.explorer.description}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {copy.plans.explorer.price}
                </span>
                <span className="text-gray-500 ml-2">
                  {copy.plans.explorer.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {copy.plans.explorer.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
                    )}
                    <span
                      className={
                        feature.included
                          ? "text-gray-700 dark:text-gray-300"
                          : "text-gray-400 dark:text-gray-500"
                      }
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe("explorer")}
                className="w-full py-3 px-6 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {copy.plans.explorer.cta}
              </button>
            </div>

            {/* Pro Plan */}
            <div className="relative bg-gradient-to-b from-accent-50 to-white dark:from-accent-900/20 dark:to-gray-800 rounded-2xl shadow-xl border-2 border-accent-500 p-8">
              {/* Popular Badge */}
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-accent-500 text-white text-sm font-medium px-4 py-1 rounded-full flex items-center gap-1">
                  <Star className="w-4 h-4" /> Popular
                </span>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-accent-100 dark:bg-accent-900/50 flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-accent-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {copy.plans.pro.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {copy.plans.pro.description}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">
                  {isYearly
                    ? copy.plans.pro.priceYearly
                    : copy.plans.pro.priceMonthly}
                </span>
                <span className="text-gray-500 ml-2">
                  {isYearly
                    ? copy.plans.pro.periodYearly
                    : copy.plans.pro.periodMonthly}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {copy.plans.pro.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3">
                    <Check className="w-5 h-5 text-accent-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe("pro")}
                className="w-full py-3 px-6 bg-accent-500 hover:bg-accent-600 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {copy.plans.pro.cta}
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* B2B Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-primary-600 to-accent-600 rounded-3xl p-8 md:p-12 text-white relative overflow-hidden">
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
            </div>

            <div className="relative grid md:grid-cols-2 gap-8 items-center">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="w-8 h-8" />
                  <span className="text-sm font-medium uppercase tracking-wide opacity-90">
                    {copy.b2b.subtitle}
                  </span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  {copy.b2b.title}
                </h2>
                <p className="text-white/90 mb-6">{copy.b2b.description}</p>

                <ul className="space-y-3 mb-8">
                  {copy.b2b.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-3">
                      <Check className="w-5 h-5 text-accent-300" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href={`mailto:${copy.b2b.email}`}
                    className="inline-flex items-center justify-center gap-2 bg-white text-primary-600 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    <Mail className="w-5 h-5" />
                    {copy.b2b.cta}
                  </a>
                  <Link
                    href="/clubs"
                    className="inline-flex items-center justify-center gap-2 border-2 border-white/50 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <Users className="w-5 h-5" />
                    Learn More
                  </Link>
                </div>
              </div>

              <div className="hidden md:flex justify-center">
                <div className="w-64 h-64 bg-white/10 rounded-full flex items-center justify-center">
                  <Shield className="w-32 h-32 text-white/50" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
            {copy.faq.title}
          </h2>
          <div className="space-y-4">
            {copy.faq.items.map((item, idx) => (
              <div
                key={idx}
                className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  {item.q}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

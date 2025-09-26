/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Star, Globe, Users, BookOpen } from "lucide-react";
import {
  detectUserCurrency,
  getCurrencySymbol,
  formatPrice,
} from "@/lib/currency-utils";

export default function PricingTiers() {
  const [currency, setCurrency] = useState("BRL");
  const [currencySymbol, setCurrencySymbol] = useState("BRL");
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState("monthly"); // yearly shows better value
  const { data: session, status } = useAuth();
  const router = useRouter();
  const { lang } = useLanguage();
  const t = {
    en: {
      monthly: "Monthly",
      yearly: "Yearly",
      discount: "50% OFF",
      mostPopular: "Most Popular",
      explorerSub: "Try out our main features",
      premiumSub: "Enjoy all our content and features",
      enterpriseSub: "For teams and organisations",
      cardContentExplorer: [
        "Access to basic learning units",
        "Access to eco-news",
        // "Basic Interactive eco-map tracking",
        // "Community access",
      ],
      cardContentPremium: [
        "All Explorer features",
        "Unlimited learning units",
        "Advanced progress analytics",
        "Priority support",
        // "Offline content access",
        "Certificate generation",
      ],
      cardContentEnterprise: [
        "All Premium features",
        "Up to 25 accounts (pay for only 10)",
        "Group management tools",
        // "Custom curriculum creation",
        // "Detailed analytics dashboard",
        // "API access",
        // "Dedicated support manager",
      ],
      getStartedFree: "Get Started Free",
      choosePremium: "Choose Premium",
      chooseEnterprise: "Choose Enterprise",
      FAQHeader: "Frequently Asked Questions",
      FAQ: [
        {
          q: "Can I switch between plans?",
          a: "Yes! You can upgrade or downgrade your plan at any time. Changes will be prorated.",
        },
        {
          q: "Is there a free trial?",
          a: "Our Explorer plan is completely free and gives you a sample of our content and features. You can upgrade to Premium anytime to unlock everything.",
        },
        {
          q: "How does the environmental impact work?",
          a: "10% of all subscription revenue goes directly to verified ocean conservation and environmental protection NGOs.",
        },
        {
          q: "What about enterprise discounts?",
          a: "We offer volume discounts for larger organisations. Contact us for custom pricing for 25+ users.",
        },
      ],
    },
    pt: {
      monthly: "Mensal",
      yearly: "Anual",
      discount: "50% OFF",
      mostPopular: "Mais Popular",
      explorerSub: "Experimente a Neptune's Tribe",
      premiumSub: "Aproveite todo o nosso conteúdo",
      enterpriseSub: "Para equipes e organizações",
      cardContentExplorer: [
        "Accesso ao conteúdo basico",
        "Accesso ao eco-news",
        "Acompanhamento interativo basico pelo ecomapa",
        "Acesso à comunidade",
      ],
      cardContentPremium: [
        "Todos os recursos do Explorer",
        "Unidades de aprendizagem ilimitadas",
        "Acesso ao seu mapa ecológico",
        "Acompanhamento e análise de progresso",
        "Suporte prioritário",
        // "Acesso a conteúdo offline",
        "Geração de certificados",
      ],
      cardContentEnterprise: [
        "Todos os recursos Premium",
        "Até 25 contas (pague por apenas 10)",
        "Ferramentas de gerenciamento de usuários",
        // "Criação de currículo personalizado",
        "Painel de análise detalhado",
        "Acesso à API",
        "Gerente de suporte dedicado",
      ],
      getStartedFree: "Inicie de Graça",
      choosePremium: "Escolha Premium",
      chooseEnterprise: "Escolha Enterprise",
      FAQHeader: "Perguntas frequentes",
      FAQ: [
        {
          q: "Posso alternar entre os planos?",
          a: "Sim! Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As alterações serão calculadas proporcionalmente.",
        },
        {
          q: "Existe um teste gratuito?",
          a: "Nosso plano Explorer é totalmente gratuito e oferece uma amostra do nosso conteúdo e recursos. Você pode fazer upgrade para o Premium a qualquer momento para desbloquear tudo.",
        },
        {
          q: "Como funciona o impacto ambiental?",
          a: "10% de toda a receita da assinatura vai diretamente para ONGs verificadas de conservação dos oceanos e proteção ambiental.",
        },
        {
          q: "E os descontos para empresas?",
          a: "Oferecemos descontos por volume para organizações maiores. Entre em contato conosco para obter preços personalizados para mais de 25 usuários.",
        },
      ],
    },
  };

  const copy = t[lang];

  useEffect(() => {
    const detectedCurrency = detectUserCurrency();
    setCurrency(detectedCurrency);
  }, []);

  useEffect(() => {
    const detectedCurrencySymbol = getCurrencySymbol();
    setCurrencySymbol(detectedCurrencySymbol);
  }, []);

  const pricingData = {
    USD: {
      yearly: {
        premium: {
          price: 70,
          display: "$70",
          period: "/year",
          savings: "Save 40%",
        },
        enterprise: {
          price: 700,
          display: "$700",
          period: "/year",
          savings: "Save 40%",
        },
      },
      monthly: {
        premium: {
          price: 9.9,
          display: "$9.90",
          period: "/month",
          savings: "",
        },
        enterprise: {
          price: 99,
          display: "$99",
          period: "/month",
          savings: "",
        },
      },
      support: [
        { amount: 10, display: "$10" },
        { amount: 25, display: "$25" },
        { amount: 50, display: "$50" },
      ],
    },
    BRL: {
      yearly: {
        premium: {
          price: 350,
          display: "R$350",
          period: "/ano",
          savings: "Economize 40%",
        },
        enterprise: {
          price: 3500,
          display: "R$3.500",
          period: "/ano",
          savings: "Economize 40%",
        },
      },
      monthly: {
        premium: {
          price: 49,
          display: "R$49",
          period: "/mês",
          savings: "",
        },
        enterprise: {
          price: 490,
          display: "R$490",
          period: "/mês",
          savings: "",
        },
      },
      support: [
        { amount: 50, display: "R$50" },
        { amount: 125, display: "R$125" },
        { amount: 250, display: "R$250" },
      ],
    },
  };

  const currentPricing = pricingData[currency];

  const handleSubscribe = async (tier) => {
    if (status === "loading") return;
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceType: "subscription",
          subscriptionInterval: billingCycle,
          tierLevel: tier,
          currency: currency, // Pass detected currency
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Request failed: ${res.status} - ${errorText}`);
      }

      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("Stripe checkout error:", err);
      alert(`Something went wrong: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Update support function
  const handleOneTimeSupport = async (amount) => {
    if (!session) {
      router.push("/auth/signin");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceType: "one_time",
          oneTimeAmount: amount,
          currency: currency,
        }),
      });

      if (!res.ok) throw new Error("Payment failed");
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      console.error("Payment error:", err);
      alert("Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const CurrencySelector = () => (
    <div className="flex justify-center">
      <select
        value={currency}
        onChange={(e) => setCurrency(e.target.value)}
        className=" px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg"
      >
        <option value="USD">USD ($)</option>
        <option value="BRL">BRL (R$)</option>
      </select>
    </div>
  );

  const isDisabled = loading || status === "loading";

  return (
    <div className="max-w-6xl mx-auto px-4 pb-16">
      {/* Billing Toggle */}
      <div className="flex justify-center mb-4">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
          <button
            onClick={() => setBillingCycle("monthly")}
            className={`px-4 pb-2 rounded-md transition-all ${
              billingCycle === "monthly"
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {copy.monthly}
          </button>
          <button
            onClick={() => setBillingCycle("yearly")}
            className={`px-4 py-2 rounded-md transition-all relative ${
              billingCycle === "yearly"
                ? "bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white"
                : "text-gray-600 dark:text-gray-400"
            }`}
          >
            {copy.yearly}
            <Badge className="absolute -top-3 -right-2 text-center w-auto bg-green-500 text-white dark:bg-green-500 dark:text-white text-xs">
              {copy.discount}
            </Badge>
          </button>
          <CurrencySelector />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 pt-8 md:px-8">
        {/* Free Tier */}
        <Card className="relative border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-xl">Explorer</CardTitle>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {copy.explorerSub}
            </p>
            <div className="mt-4">
              <span className="text-3xl font-bold">Free</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {copy.cardContentExplorer.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full mt-6"
              variant="outline"
              onClick={() => router.push("/units")}
            >
              {copy.getStartedFree}
            </Button>
          </CardContent>
        </Card>

        {/* Premium Tier */}
        <Card className="relative border-2 border-green-500 hover:shadow-lg transition-shadow">
          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
            <Badge className="bg-green-500 text-white dark:bg-green-500 dark:text-white px-3 py-1">
              <Star className="w-3 h-3 mr-1" />
              {copy.mostPopular}
            </Badge>
          </div>
          <CardHeader className="text-center pb-4 pt-6">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <Globe className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-xl">Premium</CardTitle>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {copy.premiumSub}
            </p>
            <div className="mt-4">
              <span className="text-3xl font-bold">
                {currentPricing[billingCycle].premium.display}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                {currentPricing[billingCycle].premium.period}
              </span>
              {currentPricing[billingCycle].premium.savings && (
                <div className="text-green-600 text-sm font-medium">
                  {currentPricing[billingCycle].premium.savings}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {copy.cardContentPremium.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full mt-6 bg-green-600 hover:bg-green-700"
              onClick={() => handleSubscribe("premium")}
              disabled={isDisabled}
            >
              {loading ? "Processing..." : copy.choosePremium}
            </Button>
          </CardContent>
        </Card>

        {/* Enterprise Tier */}
        <Card className="relative border-2 hover:shadow-lg transition-shadow">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <CardTitle className="text-xl">Enterprise</CardTitle>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {copy.enterpriseSub}
            </p>
            <div className="mt-4">
              <span className="text-3xl font-bold">
                {currentPricing[billingCycle].enterprise.display}
              </span>
              {/* <span className="text-gray-600 dark:text-gray-400">
                {currentPricing[billingCycle].enterprise.period}
              </span> */}
              {currentPricing[billingCycle].enterprise.savings && (
                <div className="text-green-600 text-sm font-medium">
                  {currentPricing[billingCycle].enterprise.savings}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-3">
              {copy.cardContentEnterprise.map((feature, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full mt-6 bg-purple-600 hover:bg-purple-700"
              onClick={() => handleSubscribe("enterprise")}
              disabled={isDisabled}
            >
              {loading ? "Processing..." : copy.chooseEnterprise}
            </Button>
          </CardContent>
        </Card>

        {/* Support Us */}
        {/* <Card className="relative border-2 border-orange-300 hover:shadow-lg transition-shadow">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-3">
              <Crown className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <CardTitle className="text-xl">Support Us</CardTitle>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Help us grow & protect the planet
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                25% of donations go directly to environmental charities
              </p>
            </div>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOneTimeSupport(25)}
                disabled={isDisabled}
              >
                {currentPricing.support[0].display}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOneTimeSupport(50)}
                disabled={isDisabled}
              >
                {currentPricing.support[1].display}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => handleOneTimeSupport(100)}
                disabled={isDisabled}
              >
                {currentPricing.support[2].display}
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t">
              <p className="text-xs text-center text-gray-500">
                🌱 Every contribution helps create better content and supports
                ocean conservation
              </p>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* FAQ Section */}
      {/* <div className="mt-16 max-w-3xl mx-auto">
        <h3 className="text-2xl font-bold text-center mb-8">
          {copy.FAQHeader}
        </h3>
        <div className="grid gap-6">
          {copy.FAQ.map((faq, i) => (
            <div key={i} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <h4 className="font-semibold mb-2">{faq.q}</h4>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
}

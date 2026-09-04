// src/app/(site)/settings/subscription/page.js
//
// Manage Subscription page. Shows the caller's current subscription
// status (Pro Path monthly / yearly, renewal date, cancellation
// state) and hands off the actual billing operations to Stripe's
// Customer Portal — where they can change card, switch monthly ↔
// yearly, cancel, or download invoices.
//
// Why hand off to Stripe Portal instead of building a bespoke UI?
//   - Stripe Portal is PCI-compliant out of the box; we never
//     touch card details.
//   - Handles taxes, proration, invoices, and locale-aware currency
//     for free.
//   - Cancellation flow (with the standard "you'll keep access
//     until <date>" language) is built-in.
//   - Reduces our surface area for compliance regressions.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  ShieldCheck,
  Calendar,
  Sparkles,
  ExternalLink,
  AlertTriangle,
  CircleSlash,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useLanguage } from "@/lib/contexts/LanguageContext";

const COPY = {
  en: {
    back: "Dashboard",
    eyebrow: "Billing",
    title: "Your subscription",
    loading: "Loading your subscription…",
    activeTitle: "Pro Path — Full Access",
    activeBody: "You have full access to every Pro Path lesson.",
    tierMonthly: "Monthly plan",
    tierYearly: "Yearly plan",
    tierOneTime: "One-time purchase",
    nextRenewalLabel: "Renews automatically on",
    accessUntilLabel: "Access until",
    trialing: "Trial",
    pastDue: "Payment issue",
    canceled: "Cancelled",
    manageCta: "Manage subscription on Stripe",
    manageBody:
      "Change your card, switch monthly ↔ yearly, view invoices, or cancel — all in Stripe's secure Customer Portal.",
    portalLoading: "Opening secure portal…",
    portalError: "Could not open Stripe Portal — please refresh and try again.",
    noSubscriptionTitle: "You're on the free tier",
    noSubscriptionBody:
      "Upgrade to Pro Path to unlock every lesson, the full Skill Radar journey, and the Virtual Coach on WhatsApp.",
    seePlans: "See plans",
    seatRedemptionTitle: "Access via code",
    seatRedemptionBody:
      "You're using an access code granted by your coordinator. If you need billing help, contact them directly.",
    adminGrantTitle: "Manually granted access",
    adminGrantBody:
      "Your access was manually granted by the FieldTalk team. Contact support@fieldtalkenglish.com for changes.",
  },
  pt: {
    back: "Painel",
    eyebrow: "Cobrança",
    title: "Sua assinatura",
    loading: "Carregando sua assinatura…",
    activeTitle: "Pro Path — Acesso Completo",
    activeBody: "Você tem acesso total a todas as aulas do Pro Path.",
    tierMonthly: "Plano mensal",
    tierYearly: "Plano anual",
    tierOneTime: "Compra avulsa",
    nextRenewalLabel: "Renova automaticamente em",
    accessUntilLabel: "Acesso até",
    trialing: "Período de teste",
    pastDue: "Problema no pagamento",
    canceled: "Cancelada",
    manageCta: "Gerenciar assinatura no Stripe",
    manageBody:
      "Altere seu cartão, mude entre mensal ↔ anual, veja faturas ou cancele — tudo no Portal do Cliente seguro do Stripe.",
    portalLoading: "Abrindo portal seguro…",
    portalError:
      "Não foi possível abrir o Portal do Stripe — atualize a página e tente de novo.",
    noSubscriptionTitle: "Você está na versão gratuita",
    noSubscriptionBody:
      "Faça o upgrade para o Pro Path e desbloqueie todas as aulas, a jornada completa do Radar de Habilidades e o Técnico Virtual no WhatsApp.",
    seePlans: "Ver planos",
    seatRedemptionTitle: "Acesso por código",
    seatRedemptionBody:
      "Você está usando um código de acesso liberado pelo seu coordenador. Para questões de cobrança, fale diretamente com ele.",
    adminGrantTitle: "Acesso liberado manualmente",
    adminGrantBody:
      "Seu acesso foi liberado manualmente pela equipe FieldTalk. Fale com support@fieldtalkenglish.com para alterações.",
  },
};

function formatDate(iso, lang) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(lang === "pt" ? "pt-BR" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

function SubscriptionContent() {
  const router = useRouter();
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.pt;

  const [sub, setSub] = useState(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [portalError, setPortalError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/subscription/me");
        const json = await res.json();
        if (cancelled) return;
        if (res.ok) setSub(json);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handlePortal = async () => {
    setPortalError(null);
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: "/settings/subscription" }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setPortalError(json.error || copy.portalError);
        setPortalLoading(false);
        return;
      }
      window.location.href = json.url;
    } catch {
      setPortalError(copy.portalError);
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {copy.back}
        </button>

        <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300/80 font-bold">
          {copy.eyebrow}
        </p>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1 mb-6">
          {copy.title}
        </h1>

        {loading ? (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="w-4 h-4 animate-spin" />
            {copy.loading}
          </div>
        ) : (
          <SubscriptionBody
            sub={sub}
            copy={copy}
            lang={lang}
            portalLoading={portalLoading}
            portalError={portalError}
            onManage={handlePortal}
          />
        )}
      </main>
    </div>
  );
}

function SubscriptionBody({
  sub,
  copy,
  lang,
  portalLoading,
  portalError,
  onManage,
}) {
  // No active access at all → free tier.
  if (!sub || !sub.hasActiveSubscription) {
    // Free-tier + never paid: encourage upgrade.
    if (!sub || !sub.hasStripeCustomer) {
      return (
        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.06] flex items-center justify-center shrink-0">
              <CircleSlash className="w-5 h-5 text-white/60" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white">
                {copy.noSubscriptionTitle}
              </h2>
              <p className="text-sm text-white/65 mt-1 leading-relaxed">
                {copy.noSubscriptionBody}
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-sm font-bold transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {copy.seePlans}
              </Link>
            </div>
          </div>
        </section>
      );
    }

    // Free-tier now BUT had a prior subscription (canceled / past_due /
    // expired). Give them the Stripe Portal to see their history / reactivate.
    return (
      <>
        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 sm:p-6 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/[0.06] flex items-center justify-center shrink-0">
              <CircleSlash className="w-5 h-5 text-white/60" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-white">
                {copy.noSubscriptionTitle}
              </h2>
              <p className="text-sm text-white/65 mt-1 leading-relaxed">
                {sub.status === "canceled"
                  ? copy.canceled
                  : copy.noSubscriptionBody}
              </p>
              <Link
                href="/pricing"
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-sm font-bold transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                {copy.seePlans}
              </Link>
            </div>
          </div>
        </section>
        <StripePortalCard
          copy={copy}
          onManage={onManage}
          portalLoading={portalLoading}
          portalError={portalError}
        />
      </>
    );
  }

  // Non-subscription access sources (seat code / admin grant) — the
  // user has access but Stripe Portal isn't the right destination.
  if (sub.source === "seat_redemption") {
    return (
      <section className="rounded-2xl bg-accent-400/[0.06] border border-accent-400/40 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-accent-400/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-accent-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">
              {copy.seatRedemptionTitle}
            </h2>
            <p className="text-sm text-white/65 mt-1 leading-relaxed">
              {copy.seatRedemptionBody}
            </p>
          </div>
        </div>
      </section>
    );
  }
  if (sub.source === "admin_grant") {
    return (
      <section className="rounded-2xl bg-accent-400/[0.06] border border-accent-400/40 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-accent-400/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-accent-300" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">
              {copy.adminGrantTitle}
            </h2>
            <p className="text-sm text-white/65 mt-1 leading-relaxed">
              {copy.adminGrantBody}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // Active paid subscription — show status + Stripe Portal handoff.
  const renewalLabel = formatDate(sub.currentPeriodEnd, lang);
  const tierLabel =
    sub.tier === "yearly"
      ? copy.tierYearly
      : sub.tier === "monthly"
        ? copy.tierMonthly
        : sub.tier === "one_time"
          ? copy.tierOneTime
          : null;

  return (
    <>
      <section className="rounded-2xl bg-accent-400/[0.08] border border-accent-400/50 p-5 sm:p-6 mb-4 shadow-[0_0_28px_rgba(163,230,53,0.10)]">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-2xl bg-accent-400/25 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-accent-300" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">{copy.activeTitle}</h2>
            <p className="text-sm text-white/70 mt-1 leading-relaxed">
              {copy.activeBody}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-xs">
              {tierLabel && (
                <span className="inline-flex items-center gap-1 text-accent-200 font-bold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" />
                  {tierLabel}
                </span>
              )}
              {sub.status === "trialing" && (
                <span className="inline-flex items-center gap-1 text-blue-300 font-bold uppercase tracking-wider">
                  {copy.trialing}
                </span>
              )}
              {sub.status === "past_due" && (
                <span className="inline-flex items-center gap-1 text-amber-300 font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-3 h-3" />
                  {copy.pastDue}
                </span>
              )}
              {renewalLabel && (
                <span className="inline-flex items-center gap-1 text-white/65">
                  <Calendar className="w-3 h-3" />
                  {sub.tier === "one_time"
                    ? `${copy.accessUntilLabel} ${renewalLabel}`
                    : `${copy.nextRenewalLabel} ${renewalLabel}`}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>
      <StripePortalCard
        copy={copy}
        onManage={onManage}
        portalLoading={portalLoading}
        portalError={portalError}
      />
    </>
  );
}

function StripePortalCard({ copy, onManage, portalLoading, portalError }) {
  return (
    <section className="rounded-2xl bg-white/[0.03] border border-white/10 p-5 sm:p-6">
      <p className="text-sm text-white/70 leading-relaxed mb-4">
        {copy.manageBody}
      </p>
      <button
        type="button"
        onClick={onManage}
        disabled={portalLoading}
        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white/10 hover:bg-white/15 border border-white/15 text-white text-sm font-bold disabled:opacity-50 transition-colors"
      >
        {portalLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {copy.portalLoading}
          </>
        ) : (
          <>
            <ExternalLink className="w-4 h-4" />
            {copy.manageCta}
          </>
        )}
      </button>
      {portalError && (
        <p className="mt-3 text-xs text-red-300">{portalError}</p>
      )}
    </section>
  );
}

export default function SubscriptionPage() {
  return (
    <ProtectedRoute>
      <SubscriptionContent />
    </ProtectedRoute>
  );
}

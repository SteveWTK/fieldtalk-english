// src/app/(landing)/redeem/page.js
//
// Dedicated Full Access redemption page. Partners distribute single-
// use seat-licence codes to students; the student opens this URL,
// pastes the code, hits Redeem, and is bounced straight to the
// dashboard with access provisioned.
//
// Lives at /redeem (no edition slug needed — the code itself is tied
// to an edition row, so the redeem function resolves which edition
// to grant).
//
// Auth: required to redeem (the API needs a player_id). If the user
// is signed out, we show a sign-in CTA that routes to /join — they
// can come back here after signup. We don't auto-redirect because
// some users may want to read the page first to understand what's
// happening.

"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  KeyRound,
  Loader2,
  Sparkles,
  Shield,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";

const COPY = {
  en: {
    eyebrow: "Redeem access",
    headline: "Got a Full Access code?",
    subtitle:
      "Paste the code your school or partner gave you and we'll unlock the edition on your account.",
    placeholder: "e.g. CC-CEARA-2026A-X9K3F2",
    submit: "Redeem code",
    submitting: "Redeeming…",
    signedOutTitle: "Sign up first",
    signedOutBody:
      "We need to know which account to attach the code to. Take 30 seconds to sign up — your code will still be waiting when you come back.",
    signedOutCta: "Create your account",
    successTitle: "You're in!",
    successBody: "Access granted — heading to your dashboard.",
    errors: {
      unknown_code:
        "We don't recognise that code. Check with your teacher / coordinator.",
      expired: "That code has expired. Ask your school for a new one.",
      no_seats: "All seats on that code have already been claimed.",
      already_redeemed:
        "You've already redeemed this code — you're good to go.",
      not_signed_in:
        "Sign in first so we can attach the code to your account.",
      generic: "Something went wrong. Please try again.",
    },
  },
  pt: {
    eyebrow: "Resgatar acesso",
    headline: "Tem um código de Acesso Completo?",
    subtitle:
      "Cole o código que sua escola ou parceiro te deu e liberamos a edição na sua conta.",
    placeholder: "ex: CC-CEARA-2026A-X9K3F2",
    submit: "Resgatar código",
    submitting: "Resgatando…",
    signedOutTitle: "Crie sua conta primeiro",
    signedOutBody:
      "Precisamos saber em qual conta vincular o código. 30 segundos para criar — seu código continua esperando quando voltar.",
    signedOutCta: "Criar conta",
    successTitle: "Pronto!",
    successBody: "Acesso liberado — indo para o seu painel.",
    errors: {
      unknown_code:
        "Não reconhecemos esse código. Confirme com seu professor / coordenador.",
      expired: "Esse código expirou. Peça um novo à sua escola.",
      no_seats: "Todas as vagas desse código já foram usadas.",
      already_redeemed: "Você já resgatou esse código — está tudo certo.",
      not_signed_in:
        "Entre primeiro para que possamos vincular o código à sua conta.",
      generic: "Algo deu errado. Tente novamente.",
    },
  },
};

function RedeemPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { setLang } = useLanguage();
  const { userLanguage } = useTranslation();
  const copy = COPY[userLanguage === "pt" ? "pt" : "en"];

  // Allow ?code=... in the URL so partners can hand out a one-click
  // link instead of a "go to /redeem then paste this string" recipe.
  const [code, setCode] = useState(searchParams?.get("code") || "");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    if (!user) {
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
        // Treat "already_redeemed" as success-ish — the user has the
        // entitlement either way.
        if (data.reason === "already_redeemed") {
          setSuccess(true);
          setTimeout(() => router.push("/dashboard"), 1200);
          return;
        }
        setError(copy.errors[data.reason] || copy.errors.generic);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 1200);
    } catch {
      setError(copy.errors.generic);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden">
      {/* Same ambient glow vocabulary as the rest of the WC2026 funnel */}
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

      {/* Lang toggle — top-right */}
      <div className="absolute top-4 right-4 z-20 flex gap-1 text-[10px] sm:text-xs">
        <button
          onClick={() => setLang("en")}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            userLanguage === "en"
              ? "bg-emerald-500 text-[#062013]"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          EN
        </button>
        <button
          onClick={() => setLang("pt")}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            userLanguage === "pt"
              ? "bg-emerald-500 text-[#062013]"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          PT
        </button>
      </div>

      <main className="relative z-10 max-w-md mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-emerald-500/15 flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-emerald-300" />
          </div>
          <p className="text-[10px] sm:text-xs tracking-[0.35em] uppercase text-emerald-300/80 font-semibold mb-2">
            {copy.eyebrow}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
            {copy.headline}
          </h1>
          <p className="text-sm text-white/65 leading-relaxed">
            {copy.subtitle}
          </p>
        </div>

        {success ? (
          <div className="rounded-3xl bg-emerald-500/15 border border-emerald-400/40 p-6 sm:p-8 text-center">
            <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-emerald-500/25 flex items-center justify-center">
              <Shield className="w-7 h-7 text-emerald-300" />
            </div>
            <p className="text-lg font-bold mb-1">{copy.successTitle}</p>
            <p className="text-sm text-white/65">{copy.successBody}</p>
          </div>
        ) : !user ? (
          // Signed-out state — explain why and route to signup. We
          // don't auto-redirect so the user can read the explanation.
          <div className="rounded-3xl bg-white/[0.04] border border-white/10 p-6 sm:p-8 text-center">
            <p className="text-base font-bold mb-2">
              {copy.signedOutTitle}
            </p>
            <p className="text-sm text-white/65 leading-relaxed mb-5">
              {copy.signedOutBody}
            </p>
            <Link
              href="/join?edition=wc2026"
              className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#062013] text-sm font-bold tracking-wide transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {copy.signedOutCta}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl bg-white/[0.04] border border-white/10 p-5 sm:p-6 space-y-4"
          >
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={copy.placeholder}
              autoFocus
              disabled={submitting}
              className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 font-mono uppercase tracking-wide text-sm sm:text-base text-center"
            />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[#062013] font-bold text-sm tracking-wide transition-colors"
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
      </main>
    </div>
  );
}

function RedeemFallback() {
  return (
    <div className="min-h-screen bg-[#070707] flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
    </div>
  );
}

// useSearchParams forces Next 15's CSR bailout — must be wrapped in
// Suspense at the default export. Same pattern as /pricing.
export default function RedeemPage() {
  return (
    <Suspense fallback={<RedeemFallback />}>
      <RedeemPageContent />
    </Suspense>
  );
}

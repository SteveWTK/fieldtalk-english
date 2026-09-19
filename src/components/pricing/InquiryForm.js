// src/components/pricing/InquiryForm.js
//
// The "Fale com a gente / Talk to us" form on the pricing page.
// Bilingual, dark-DS, posts to /api/leads/inquiry which drops a
// new-lead row into the CRM Paul already works from /admin/leads.
//
// Two paths on submit:
//   1. Success → replace form with a small "Recebido" ack card.
//      No page-nav — visitor stays in flow and can still click
//      Book a demo below.
//   2. Failure → inline signal-alert banner + form stays for retry.
//
// Fields are kept minimal — name + email + tier are the only ones
// that matter for the CRM to be actionable. Phone + organization
// + message are optional. A phone number is the biggest signal for
// intent so it's second in the form order.

"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";

const COPY = {
  en: {
    eyebrow: "Talk to us",
    heading: "Tell us about your athletes.",
    sub: "We'll get back within a working day.",
    name: "Your name",
    email: "Email",
    phone: "Phone or WhatsApp (optional)",
    org: "Agency / Academy / Club",
    tier: "Which plan interests you?",
    message: "Anything else we should know? (optional)",
    tierOptions: {
      squad: "Squad — up to 20 athletes",
      roster: "Roster — up to 50 athletes",
      agency: "Agency — 200+ athletes",
      player: "Just for me",
      unsure: "Not sure yet",
    },
    submit: "Send",
    submitting: "Sending…",
    successHeading: "Got it. We'll be in touch.",
    successSub: "Paul or David will follow up personally — usually within a working day.",
    errFallback: "Something went wrong. Please try again.",
  },
  pt: {
    eyebrow: "Fale com a gente",
    heading: "Conta pra gente sobre os seus atletas.",
    sub: "Retornamos em até um dia útil.",
    name: "Seu nome",
    email: "Email",
    phone: "Telefone ou WhatsApp (opcional)",
    org: "Agência / Escolinha / Clube",
    tier: "Qual plano te interessa?",
    message: "Alguma coisa que a gente deve saber? (opcional)",
    tierOptions: {
      squad: "Base — até 20 atletas",
      roster: "Elenco — até 50 atletas",
      agency: "Agência — 200+ atletas",
      player: "Só para mim",
      unsure: "Ainda não sei",
    },
    submit: "Enviar",
    submitting: "Enviando…",
    successHeading: "Recebido. A gente te retorna.",
    successSub: "Paul ou David vão te chamar pessoalmente — normalmente em até um dia útil.",
    errFallback: "Algo deu errado. Tente de novo.",
  },
};

/**
 * @param {{
 *   lang?: 'pt' | 'en',
 *   defaultTier?: 'squad' | 'roster' | 'agency' | 'player' | 'unsure',
 * }} props
 */
export default function InquiryForm({ lang = "pt", defaultTier = "unsure" }) {
  const t = COPY[lang === "en" ? "en" : "pt"];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [org, setOrg] = useState("");
  const [tier, setTier] = useState(defaultTier);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/leads/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name,
          email,
          phone,
          organization: org,
          tier,
          message,
          language: lang,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(json.error || t.errFallback);
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError(t.errFallback);
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    // Success card — replaces the form. Deliberately quiet: this is
    // the moment the visitor should feel taken care of, not sold to.
    return (
      <section className="rounded-panel bg-primary-panel border border-accent-400/40 p-6 sm:p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-accent-400 text-primary-900 flex items-center justify-center mb-4">
          <CheckCircle2 className="w-7 h-7" strokeWidth={2.25} />
        </div>
        <h3 className="text-xl sm:text-2xl font-display font-black text-primary-50 leading-tight mb-2">
          {t.successHeading}
        </h3>
        <p className="text-sm text-primary-300 max-w-md mx-auto leading-relaxed">
          {t.successSub}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-panel bg-primary-panel border border-primary-700 p-5 sm:p-8">
      <div className="mb-5">
        <p className="text-[10px] uppercase tracking-label text-accent-400 font-semibold mb-2">
          {t.eyebrow}
        </p>
        <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-primary-50 leading-tight">
          {t.heading}
        </h2>
        <p className="text-sm text-primary-400 mt-2">{t.sub}</p>
      </div>

      <form onSubmit={submit} className="space-y-3">
        {error && (
          <div className="rounded-control border border-signal-alert/40 bg-signal-alert/10 p-3 text-sm text-signal-alert inline-flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t.name}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            maxLength={120}
          />
          <Input
            type="email"
            label={t.email}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            maxLength={200}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            type="tel"
            label={t.phone}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
            maxLength={40}
            placeholder="+55 11 91234-5678"
          />
          <Input
            label={t.org}
            value={org}
            onChange={(e) => setOrg(e.target.value)}
            autoComplete="organization"
            maxLength={160}
          />
        </div>

        {/* Tier chooser — five radio-styled buttons on one row.
            Kept as radio-style buttons (not a Select) so all options
            are visible at once; helps the visitor self-identify
            without opening a menu. */}
        <fieldset>
          <legend className="block text-[12px] font-sans font-medium text-primary-400 mb-1.5">
            {t.tier}
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
            {Object.entries(t.tierOptions).map(([code, label]) => {
              const active = tier === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setTier(code)}
                  aria-pressed={active}
                  className={`text-left text-xs font-semibold rounded-control border px-2.5 py-2 transition-colors ${
                    active
                      ? "border-accent-400 bg-accent-400/10 text-accent-300"
                      : "border-primary-700 bg-primary-900 text-primary-300 hover:border-primary-500 hover:text-primary-100"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <Input
          multiline
          rows={3}
          label={t.message}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
        />

        <Button
          type="submit"
          variant="primary"
          size="md"
          Icon={Send}
          loading={loading}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          {loading ? t.submitting : t.submit}
        </Button>
      </form>
    </section>
  );
}

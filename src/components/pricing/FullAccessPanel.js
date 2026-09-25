// src/components/pricing/FullAccessPanel.js
//
// "Got a Full Access code?" panel — students of partner schools
// (Cultura Inglesa, cohort programmes) redeem their pre-paid code
// here instead of going through Stripe.
//
// Rendered on both /pricing (B2B page) and /pricing/individual so a
// teen with a code from their school can redeem no matter which page
// their parent lands on.

"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, KeyRound, Loader2, Shield } from "lucide-react";

/**
 * @param {{
 *   copy: object,           // translations.fullAccess bundle
 *   isSignedIn: boolean,
 *   edition: string,        // for the /join?edition= link when signed out
 *   onSuccess: () => void,
 * }} props
 */
export default function FullAccessPanel({
  copy,
  isSignedIn,
  edition,
  onSuccess,
}) {
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
      <div className="relative rounded-panel bg-signal-performance/[0.06] border border-signal-performance/40 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-control bg-signal-performance/15 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-signal-performance" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs tracking-label uppercase text-signal-performance font-bold">
              {copy.eyebrow}
            </p>
            <h3 className="text-base sm:text-lg font-bold text-primary-50 leading-tight">
              {copy.heading}
            </h3>
          </div>
        </div>

        {success ? (
          <div className="py-4 text-center">
            <div className="w-12 h-12 rounded-full bg-accent-400/20 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-accent-400" />
            </div>
            <p className="text-base font-bold text-primary-50 mb-1">
              {copy.successTitle}
            </p>
            <p className="text-sm text-primary-400">{copy.successBody}</p>
          </div>
        ) : !isSignedIn ? (
          <div className="space-y-3">
            <p className="text-xs sm:text-sm text-primary-400">
              {copy.signedOutNote}
            </p>
            <Link
              href={`/join?edition=${encodeURIComponent(edition)}`}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-signal-performance hover:brightness-110 text-primary-900 font-bold text-sm tracking-wide transition-all"
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
              className="w-full px-3 py-3 rounded-control border border-primary-600 bg-primary-900 text-primary-100 placeholder-primary-500 focus:outline-none focus:border-signal-performance font-mono uppercase tracking-wide text-sm sm:text-base text-center"
            />

            {error && (
              <div className="p-2.5 rounded-control bg-signal-alert/15 border border-signal-alert/40 text-signal-alert text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !code.trim()}
              className="w-full inline-flex items-center justify-center gap-1.5 py-3 rounded-full bg-signal-performance hover:brightness-110 disabled:opacity-60 text-primary-900 font-bold text-sm tracking-wide transition-all"
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

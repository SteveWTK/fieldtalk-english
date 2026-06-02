// src/app/(site)/admin/promo-codes/page.js
//
// Admin tool — bulk-generate single-use Stripe promotion codes
// against an existing Stripe coupon, then download as CSV for the
// partner to distribute. Used for Cultura "Bring a Friend" Tier 2
// (50% off discount codes) and any future per-student discount
// rollout.
//
// Auth: platform_admin only. The /api route enforces this server-
// side too; we mirror the check client-side so non-admins get a
// friendly bounce instead of a 403 toast.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Download,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";
import { downloadCSV } from "@/lib/admin/codes";

function PromoCodesAdminContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = usePlayerProfile(user?.id);

  // Client-side admin guard. Server enforces the same; this is just
  // so we don't render the form for non-admins.
  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.user_type !== "platform_admin") {
      router.replace("/lesson");
    }
  }, [profile, profileLoading, router]);

  const [couponId, setCouponId] = useState("");
  const [count, setCount] = useState(30);
  const [prefix, setPrefix] = useState("CC-CEARA-2026A");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!couponId.trim()) {
      setError("Coupon ID is required");
      return;
    }
    if (count < 1 || count > 500) {
      setError("Count must be between 1 and 500");
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/promo-codes/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponId: couponId.trim(),
          count,
          prefix: prefix.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Request failed");
        return;
      }
      setResult(data);
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (!result?.codes?.length) return;
    const rows = result.codes.map((c) => ({
      code: c.code,
      stripe_promotion_code_id: c.id,
    }));
    const filename = `promo-codes-${prefix || "batch"}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    downloadCSV(rows, filename);
  };

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707] text-white">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <Link
          href="/lesson"
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>

        <header>
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70 font-semibold mb-1">
            Admin
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Bulk-generate Stripe discount codes
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-lg leading-relaxed">
            Issues single-use promotion codes against an existing Stripe coupon.
            Each code redeems once and can be downloaded as a CSV for the
            partner to distribute.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 sm:p-6 space-y-4"
        >
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
              Stripe coupon ID
            </label>
            <input
              type="text"
              value={couponId}
              onChange={(e) => setCouponId(e.target.value)}
              placeholder="e.g. 9rT5xZ8k (from Stripe → Coupons)"
              disabled={submitting}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 font-mono text-sm"
            />
            <p className="mt-1 text-[11px] text-white/40">
              Find this in Stripe → Coupons → click the coupon → ID below the
              name. Coupon defines the discount amount; this tool just issues
              codes for it.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
                Number of codes
              </label>
              <input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
                Code prefix
              </label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="CC-CEARA-2026A"
                disabled={submitting}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 font-mono text-sm uppercase"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#062013] font-bold text-sm tracking-wide transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating…
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate {count} codes
              </>
            )}
          </button>
        </form>

        {result && (
          <div className="rounded-2xl bg-emerald-500/10 border border-emerald-400/40 p-5 sm:p-6">
            <p className="text-xs uppercase tracking-wider text-emerald-300 font-semibold mb-1">
              Done
            </p>
            <p className="text-lg font-bold mb-1">
              {result.created} codes created
              {result.failed > 0 && (
                <span className="text-amber-300 ml-2 text-sm font-semibold">
                  ({result.failed} failed)
                </span>
              )}
            </p>
            <p className="text-sm text-white/65 mb-4">
              Each code redeems exactly once at Stripe Checkout via the
              &quot;Add promotion code&quot; field.
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#062013] font-bold text-sm hover:bg-white/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>

            {result.errors?.length > 0 && (
              <details className="mt-4 text-xs text-amber-200">
                <summary className="cursor-pointer font-semibold">
                  {result.errors.length} failures (click to expand)
                </summary>
                <ul className="mt-2 space-y-1 font-mono">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      {e.code}: {e.error}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default function PromoCodesAdminPage() {
  return (
    <ProtectedRoute>
      <PromoCodesAdminContent />
    </ProtectedRoute>
  );
}

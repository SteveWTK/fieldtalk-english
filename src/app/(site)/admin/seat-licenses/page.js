// src/app/(site)/admin/seat-licenses/page.js
//
// Admin tool — bulk-generate seat licences and download as CSV.
// Two modes via the "Licence shape" toggle:
//
//   - Unique single-use (default): one row per code, seats_total = 1.
//     For "Bring a Friend" Tier 3 + PIX-prepaid Full Access vouchers.
//   - Capped branch code: one row, one code, seats_total = N. For
//     small cohorts where the coordinator trusts the cohort.
//
// Auth: platform_admin only (server-enforced too).
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Download,
  Sparkles,
  AlertTriangle,
  ArrowLeft,
  Lock,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";
import { downloadCSV } from "@/lib/admin/codes";

function SeatLicensesAdminContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = usePlayerProfile(user?.id);

  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.user_type !== "platform_admin") {
      router.replace("/lesson");
    }
  }, [profile, profileLoading, router]);

  // "single" → many codes, 1 seat each. "shared" → one code, N seats.
  const [shape, setShape] = useState("single");
  const [partnerName, setPartnerName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [edition, setEdition] = useState("wc2026");
  const [count, setCount] = useState(30);
  const [sharedSeats, setSharedSeats] = useState(30);
  const [codePrefix, setCodePrefix] = useState("CC-CEARA-2026A");
  const [validUntil, setValidUntil] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!partnerName.trim()) {
      setError("Partner name is required");
      return;
    }
    setSubmitting(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/admin/seat-licenses/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          partnerName: partnerName.trim(),
          contactEmail: contactEmail.trim() || null,
          edition: edition.trim() || "wc2026",
          // shape decides which value goes where: "single" → many
          // licences × 1 seat; "shared" → one licence × N seats.
          count: shape === "single" ? count : 1,
          seatsPerLicense: shape === "single" ? 1 : sharedSeats,
          codePrefix: codePrefix.trim() || undefined,
          validUntil: validUntil ? new Date(validUntil).toISOString() : null,
          notes: notes.trim() || null,
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
    if (!result?.licenses?.length) return;
    const rows = result.licenses.map((l) => ({
      code: l.code,
      seats: l.seats_total,
      valid_until: l.valid_until || "",
      license_id: l.id,
    }));
    const filename = `seat-licenses-${codePrefix || partnerName.replace(/\s+/g, "-") || "batch"}-${new Date()
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
            Bulk-generate Full Access codes
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-lg leading-relaxed">
            Issues seat licences that students redeem at{" "}
            <Link href="/redeem" className="text-emerald-300 underline">
              /redeem
            </Link>{" "}
            to unlock the edition without paying. Use single-use codes for
            conditional rollouts (&quot;Bring a Friend&quot;, PIX-prepaid). Use
            a shared branch code only when the coordinator owns the
            distribution.
          </p>
        </header>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 sm:p-6 space-y-4"
        >
          {/* Shape toggle */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/60 mb-2">
              Licence shape
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setShape("single")}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  shape === "single"
                    ? "bg-emerald-500 text-[#062013]"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <Lock className="w-4 h-4" />
                Unique single-use
              </button>
              <button
                type="button"
                onClick={() => setShape("shared")}
                className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  shape === "shared"
                    ? "bg-emerald-500 text-[#062013]"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <Users className="w-4 h-4" />
                Capped shared code
              </button>
            </div>
          </div>

          {/* Partner */}
          <div>
            <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
              Partner name
            </label>
            <input
              type="text"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
              placeholder="Cultura Inglesa Ceará — Aldeota"
              disabled={submitting}
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
                Contact email
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="coord@cultura-ceara.com.br"
                disabled={submitting}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
                Edition
              </label>
              <input
                type="text"
                value={edition}
                onChange={(e) => setEdition(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>

          {/* Count depends on shape */}
          <div className="grid grid-cols-2 gap-4">
            {shape === "single" ? (
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
                  Codes to generate
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
            ) : (
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
                  Total seats on the code
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={sharedSeats}
                  onChange={(e) => setSharedSeats(Number(e.target.value))}
                  disabled={submitting}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            )}
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
                Code prefix
              </label>
              <input
                type="text"
                value={codePrefix}
                onChange={(e) => setCodePrefix(e.target.value)}
                placeholder="CC-CEARA-2026A"
                disabled={submitting}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400 font-mono text-sm uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
                Valid until (optional)
              </label>
              <input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                disabled={submitting}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/60 mb-1.5">
                Internal notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="PIX received 2 Jun, R$1,140"
                disabled={submitting}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white placeholder-white/30 focus:outline-none focus:border-emerald-400"
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
                {shape === "single"
                  ? `Generate ${count} codes`
                  : `Create code for ${sharedSeats} seats`}
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
              {result.created} licence{result.created === 1 ? "" : "s"} created
            </p>
            <p className="text-sm text-white/65 mb-4">
              Students redeem at{" "}
              <Link href="/redeem" className="text-emerald-300 underline">
                /redeem
              </Link>{" "}
              — Full Access provisions instantly, no Stripe step.
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-[#062013] font-bold text-sm hover:bg-white/90 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download CSV
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function SeatLicensesAdminPage() {
  return (
    <ProtectedRoute>
      <SeatLicensesAdminContent />
    </ProtectedRoute>
  );
}

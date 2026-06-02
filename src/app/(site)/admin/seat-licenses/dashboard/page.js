// src/app/(site)/admin/seat-licenses/dashboard/page.js
//
// Admin tool — per-partner roll-up of seat-licence usage. Used at
// month-end to invoice partners (e.g. Cultura Inglesa Ceará) for
// the Full Access codes their students actually redeemed in the
// billing period.
//
// Top-line columns:
//   - Partner name
//   - Licences issued · seats issued · seats used · seats remaining
//   - Redemptions in the selected date range (the billing number)
//   - Latest redemption timestamp (sanity check)
//
// CSV download dumps the same data for whichever date range is
// currently shown — paste straight into the partner invoice spreadsheet.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Download,
  RefreshCw,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Users,
  Plus,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";
import { downloadCSV } from "@/lib/admin/codes";

// Default the date range to "this calendar month so far" — that's
// the most common slice for partner invoicing.
function defaultRange() {
  const now = new Date();
  const since = new Date(now.getFullYear(), now.getMonth(), 1);
  const until = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { since: toInputDate(since), until: toInputDate(until) };
}

function toInputDate(d) {
  // <input type="date"> needs YYYY-MM-DD, local time. Slice off the
  // ISO string to avoid timezone wobble showing the wrong day.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function SeatLicensesDashboardContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = usePlayerProfile(user?.id);

  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.user_type !== "platform_admin") {
      router.replace("/lesson");
    }
  }, [profile, profileLoading, router]);

  const [range, setRange] = useState(defaultRange());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(new Set());

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sinceISO = new Date(range.since + "T00:00:00").toISOString();
      const untilISO = new Date(range.until + "T23:59:59").toISOString();
      const params = new URLSearchParams({
        since: sinceISO,
        until: untilISO,
      });
      const res = await fetch(
        `/api/admin/seat-licenses/stats?${params.toString()}`
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Could not load stats");
        return;
      }
      setData(json);
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, [range.since, range.until]);

  useEffect(() => {
    if (profileLoading || profile?.user_type !== "platform_admin") return;
    fetchStats();
  }, [profile, profileLoading, fetchStats]);

  const handleExportCSV = () => {
    if (!data?.partners?.length) return;
    const rows = data.partners.map((p) => ({
      partner: p.partner_name,
      contact_email: p.contact_email || "",
      editions: p.editions.join(" / "),
      licences_issued: p.license_count,
      seats_issued: p.seats_total,
      seats_used: p.seats_used,
      seats_remaining: p.seats_remaining,
      redemptions_in_range: p.redemptions_in_range,
      latest_redemption: p.most_recent_redemption_at || "",
    }));
    const filename = `seat-licence-billing-${range.since}-to-${range.until}.csv`;
    downloadCSV(rows, filename);
  };

  const toggleExpanded = (partnerName) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(partnerName)) next.delete(partnerName);
      else next.add(partnerName);
      return next;
    });
  };

  const totalsRow = data?.totals;

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707] text-white">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            href="/lesson"
            className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <Link
            href="/admin/seat-licenses"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-sm font-semibold text-white/80 hover:text-white transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate new licences
          </Link>
        </div>

        <header>
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70 font-semibold mb-1">
            Admin
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Seat licence dashboard
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
            Per-partner usage roll-up for billing. The{" "}
            <span className="text-emerald-300 font-semibold">
              Redemptions in range
            </span>{" "}
            column is what to invoice — that&apos;s how many of the codes you
            issued were actually redeemed within the selected period.
          </p>
        </header>

        {/* Date range + actions */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">
              From
            </label>
            <input
              type="date"
              value={range.since}
              onChange={(e) =>
                setRange((r) => ({ ...r, since: e.target.value }))
              }
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-emerald-400 text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">
              To
            </label>
            <input
              type="date"
              value={range.until}
              onChange={(e) =>
                setRange((r) => ({ ...r, until: e.target.value }))
              }
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-emerald-400 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-[#062013] text-sm font-bold tracking-wide transition-colors"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={loading || !data?.partners?.length}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 disabled:opacity-50 border border-white/15 text-white text-sm font-semibold transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Totals strip */}
        {totalsRow && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat
              label="Partners"
              value={data.partners.length}
              tone="neutral"
            />
            <Stat
              label="Licences issued"
              value={totalsRow.license_count}
              tone="neutral"
            />
            <Stat
              label="Seats used / issued"
              value={`${totalsRow.seats_used} / ${totalsRow.seats_total}`}
              tone="neutral"
            />
            <Stat
              label="Redemptions in range"
              value={totalsRow.redemptions_in_range}
              tone="emerald"
            />
          </div>
        )}

        {/* Partner table */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
          {loading && !data ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
          ) : data && data.partners.length === 0 ? (
            <div className="py-12 text-center text-white/50 text-sm">
              <Users className="w-8 h-8 mx-auto mb-3 text-white/30" />
              No seat licences issued yet.{" "}
              <Link
                href="/admin/seat-licenses"
                className="text-emerald-300 underline"
              >
                Generate the first batch.
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Partner</th>
                  <th className="text-right px-3 py-3 font-semibold hidden sm:table-cell">
                    Licences
                  </th>
                  <th className="text-right px-3 py-3 font-semibold">Seats</th>
                  <th className="text-right px-3 py-3 font-semibold">
                    In range
                  </th>
                  <th className="text-right px-3 py-3 font-semibold hidden md:table-cell">
                    Latest
                  </th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {data?.partners.map((p) => {
                  const isOpen = expanded.has(p.partner_name);
                  return (
                    <PartnerRow
                      key={p.partner_name}
                      partner={p}
                      isOpen={isOpen}
                      onToggle={() => toggleExpanded(p.partner_name)}
                    />
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }) {
  const colour = tone === "emerald" ? "text-emerald-300" : "text-white";
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
      <p className="text-[10px] uppercase tracking-wider text-white/50 mb-1">
        {label}
      </p>
      <p className={`text-2xl font-black ${colour}`}>{value}</p>
    </div>
  );
}

function PartnerRow({ partner, isOpen, onToggle }) {
  const latest = partner.most_recent_redemption_at
    ? new Date(partner.most_recent_redemption_at).toLocaleDateString()
    : "—";
  return (
    <>
      <tr
        className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="font-semibold text-white">{partner.partner_name}</div>
          <div className="text-[11px] text-white/45 mt-0.5">
            {partner.editions.join(" / ")}
            {partner.contact_email ? ` · ${partner.contact_email}` : ""}
          </div>
        </td>
        <td className="text-right px-3 py-3 text-white/80 hidden sm:table-cell tabular-nums">
          {partner.license_count}
        </td>
        <td className="text-right px-3 py-3 text-white/80 tabular-nums">
          {partner.seats_used}/{partner.seats_total}
        </td>
        <td className="text-right px-3 py-3 font-bold text-emerald-300 tabular-nums">
          {partner.redemptions_in_range}
        </td>
        <td className="text-right px-3 py-3 text-white/55 hidden md:table-cell text-xs">
          {latest}
        </td>
        <td className="px-2 text-white/40">
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-black/30 border-t border-white/5">
          <td colSpan={6} className="px-4 py-3 text-xs text-white/65">
            <DrilldownDetails partner={partner} />
          </td>
        </tr>
      )}
    </>
  );
}

function DrilldownDetails({ partner }) {
  const remaining = partner.seats_remaining;
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
          Capacity
        </p>
        <p>
          <span className="font-semibold text-white">{partner.seats_used}</span>{" "}
          of {partner.seats_total} seats used ·{" "}
          <span className="text-emerald-300">{remaining} remaining</span>
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">
          Latest activity
        </p>
        <p>
          {partner.most_recent_redemption_at
            ? new Date(partner.most_recent_redemption_at).toLocaleString()
            : "No redemptions in the selected range"}
        </p>
      </div>
    </div>
  );
}

export default function SeatLicensesDashboardPage() {
  return (
    <ProtectedRoute>
      <SeatLicensesDashboardContent />
    </ProtectedRoute>
  );
}

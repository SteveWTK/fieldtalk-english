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
import Button from "@/components/ui/button";
import StatTile from "@/components/ui/stat-tile";

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
      <div className="min-h-screen flex items-center justify-center bg-primary-900 text-primary-50">
        <Loader2 className="w-6 h-6 animate-spin text-accent-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Link
            href="/lesson"
            className="inline-flex items-center gap-1 text-sm text-primary-300 hover:text-primary-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <Link
            href="/admin/seat-licenses"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-800 hover:bg-primary-700 border border-primary-600 text-sm font-semibold text-primary-100 hover:text-primary-50 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Generate new licences
          </Link>
        </div>

        <header>
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-400/70 font-semibold mb-1">
            Admin
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Seat licence dashboard
          </h1>
          <p className="text-sm text-primary-300 mt-2 max-w-2xl leading-relaxed">
            Per-partner usage roll-up for billing. The{" "}
            <span className="text-accent-400 font-semibold">
              Redemptions in range
            </span>{" "}
            column is what to invoice — that&apos;s how many of the codes you
            issued were actually redeemed within the selected period.
          </p>
        </header>

        {/* Date range + actions */}
        <div className="rounded-card bg-primary-panel border border-primary-700 p-4 sm:p-5 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-primary-400 mb-1">
              From
            </label>
            <input
              type="date"
              value={range.since}
              onChange={(e) =>
                setRange((r) => ({ ...r, since: e.target.value }))
              }
              className="px-3 py-2 rounded-control bg-primary-900 border border-primary-600 text-primary-100 focus:outline-none focus:border-accent-400 text-sm"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-primary-400 mb-1">
              To
            </label>
            <input
              type="date"
              value={range.until}
              onChange={(e) =>
                setRange((r) => ({ ...r, until: e.target.value }))
              }
              className="px-3 py-2 rounded-control bg-primary-900 border border-primary-600 text-primary-100 focus:outline-none focus:border-accent-400 text-sm"
            />
          </div>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
            loading={loading}
            Icon={loading ? undefined : RefreshCw}
          >
            Refresh
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || !data?.partners?.length}
            Icon={Download}
          >
            Export CSV
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 p-3 rounded-control bg-signal-alert/10 border border-signal-alert/40 text-signal-alert text-sm">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Totals strip */}
        {totalsRow && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Partners" value={data.partners.length} />
            <StatTile
              label="Licences issued"
              value={totalsRow.license_count}
            />
            <StatTile
              label="Seats used / issued"
              value={`${totalsRow.seats_used} / ${totalsRow.seats_total}`}
            />
            <StatTile
              label="Redemptions in range"
              value={totalsRow.redemptions_in_range}
              tone="accent"
            />
          </div>
        )}

        {/* Partner table */}
        <div className="rounded-card bg-primary-panel border border-primary-700 overflow-hidden">
          {loading && !data ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-accent-400" />
            </div>
          ) : data && data.partners.length === 0 ? (
            <div className="py-12 text-center text-primary-400 text-sm">
              <Users className="w-8 h-8 mx-auto mb-3 text-primary-500" />
              No seat licences issued yet.{" "}
              <Link
                href="/admin/seat-licenses"
                className="text-accent-400 underline"
              >
                Generate the first batch.
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-primary-800 text-[10px] uppercase tracking-wider text-primary-400">
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

function PartnerRow({ partner, isOpen, onToggle }) {
  const latest = partner.most_recent_redemption_at
    ? new Date(partner.most_recent_redemption_at).toLocaleDateString()
    : "—";
  return (
    <>
      <tr
        className="border-t border-primary-700 hover:bg-primary-800 cursor-pointer transition-colors"
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <div className="font-semibold text-primary-50">{partner.partner_name}</div>
          <div className="text-[11px] text-primary-400 mt-0.5">
            {partner.editions.join(" / ")}
            {partner.contact_email ? ` · ${partner.contact_email}` : ""}
          </div>
        </td>
        <td className="text-right px-3 py-3 text-primary-100 hidden sm:table-cell tabular-nums">
          {partner.license_count}
        </td>
        <td className="text-right px-3 py-3 text-primary-100 tabular-nums">
          {partner.seats_used}/{partner.seats_total}
        </td>
        <td className="text-right px-3 py-3 font-bold text-accent-400 tabular-nums">
          {partner.redemptions_in_range}
        </td>
        <td className="text-right px-3 py-3 text-primary-300 hidden md:table-cell text-xs">
          {latest}
        </td>
        <td className="px-2 text-primary-500">
          {isOpen ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </td>
      </tr>
      {isOpen && (
        <tr className="bg-primary-900 border-t border-primary-700">
          <td colSpan={6} className="px-4 py-3 text-xs text-primary-300">
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
        <p className="text-[10px] uppercase tracking-wider text-primary-500 mb-1">
          Capacity
        </p>
        <p>
          <span className="font-semibold text-primary-50">{partner.seats_used}</span>{" "}
          of {partner.seats_total} seats used ·{" "}
          <span className="text-accent-400">{remaining} remaining</span>
        </p>
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-primary-500 mb-1">
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

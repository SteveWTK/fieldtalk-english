// src/app/(site)/admin/partner-tracking/page.js
//
// Partner attribution dashboard — one place to see how many paying
// users each partner branch (Cultura Fortaleza, Recife, …) has
// brought in, broken down by the three Full Access paths:
//
//   1. Seat redemptions          — bulk seat licences
//   2. Promo-code purchases      — Stripe Checkout with a partner code
//   3. Direct branch-link signups — /wc2026?branch=<slug> referrals
//
// Three tables, one per path. Partner identifiers differ across paths
// (descriptive name on seat licences, prefix → name lookup for promo
// codes, slug for branch links), so the admin reconciles by name —
// the rollup of revenue per partner is a single mental add.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  KeyRound,
  Tag,
  Link as LinkIcon,
  AlertTriangle,
  Filter,
  Search,
  Activity,
  Check,
  X,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";

function PartnerTrackingContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = usePlayerProfile(user?.id);

  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.user_type !== "platform_admin") {
      router.replace("/lesson");
    }
  }, [profile, profileLoading, router]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // Events drill-down — separate fetch so the page can still render
  // the aggregates immediately even if the events query is slow on
  // a fat dataset.
  const [eventsData, setEventsData] = useState(null);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsError, setEventsError] = useState(null);

  // Filter state lives on the page (URL-less for now). Three knobs:
  //   - partner: "all" or one of the partner-name strings from the
  //              events payload
  //   - type:    "all" | "seat_redemption" | "promo_purchase"
  //              | "branch_signup"
  //   - query:   free-text search across player name + email +
  //              detail (case-insensitive substring)
  const [partnerFilter, setPartnerFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/partner-tracking");
      const json = await res.json();
      if (!res.ok) setError(json?.error || "Failed");
      else {
        setError(null);
        setData(json);
      }
    } catch (err) {
      setError(err?.message || "Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshEvents = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/partner-tracking/events");
      const json = await res.json();
      if (!res.ok) setEventsError(json?.error || "Failed");
      else {
        setEventsError(null);
        setEventsData(json);
      }
    } catch (err) {
      setEventsError(err?.message || "Network error");
    } finally {
      setEventsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    refreshEvents();
  }, [refresh, refreshEvents]);

  // Apply filters client-side. With the 500-row cap on the API the
  // total set is small; client filtering is faster than re-fetching
  // and lets the dropdowns feel instant.
  const filteredEvents = useMemo(() => {
    const all = eventsData?.events || [];
    const q = query.trim().toLowerCase();
    return all.filter((e) => {
      if (partnerFilter !== "all" && e.partner_name !== partnerFilter)
        return false;
      if (typeFilter !== "all" && e.type !== typeFilter) return false;
      if (q) {
        const hay = `${e.player_name || ""} ${e.player_email || ""} ${
          e.detail || ""
        }`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [eventsData, partnerFilter, typeFilter, query]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707] text-white">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 sm:space-y-8">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white mb-3"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to admin
          </Link>
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70 font-semibold mb-1">
            FieldTalk · admin
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Partner tracking
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
            How many Full Access users each partner has brought in, split
            across the three attribution paths. Reconcile by name —
            partner identifiers differ between paths.
          </p>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-5 text-sm text-red-200">
            {error}
          </div>
        ) : (
          <>
            <TotalsRow totals={data?.totals} />

            <Section
              title="1 · Seat redemptions"
              subtitle="Bulk seat-licence codes redeemed by students."
              icon={<KeyRound className="w-4 h-4 text-emerald-300" />}
              empty="No redemptions yet."
              items={data?.seat_redemptions || []}
              columns={[
                { header: "Partner", get: (r) => r.partner_name },
                { header: "Edition", get: (r) => r.edition, align: "left" },
                {
                  header: "Redemptions",
                  get: (r) => r.redemptions,
                  align: "right",
                  bold: true,
                },
                {
                  header: "Last activity",
                  get: (r) => fmtDate(r.last_at),
                  align: "right",
                },
              ]}
            />

            <Section
              title="2 · Promo-code purchases"
              subtitle="Full Access bought through Stripe with a partner-branded code."
              icon={<Tag className="w-4 h-4 text-emerald-300" />}
              empty="No promo-code purchases yet."
              items={data?.promo_code_purchases || []}
              columns={[
                {
                  header: "Partner",
                  get: (r) =>
                    r.partner_name === "(unmapped)" ? (
                      <span className="text-amber-200/80 inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        unmapped
                      </span>
                    ) : (
                      r.partner_name
                    ),
                },
                {
                  header: "Code prefix",
                  get: (r) => (
                    <code className="text-[11px] text-white/65">
                      {r.prefix}
                    </code>
                  ),
                },
                {
                  header: "Purchases",
                  get: (r) => r.purchases,
                  align: "right",
                  bold: true,
                },
                {
                  header: "Last purchase",
                  get: (r) => fmtDate(r.last_at),
                  align: "right",
                },
              ]}
              footerNote={
                data?.unmapped_prefixes?.length > 0 ? (
                  <UnmappedHint prefixes={data.unmapped_prefixes} />
                ) : null
              }
            />

            <Section
              title="3 · Direct branch-link signups"
              subtitle="Players who arrived via /wc2026?branch=<slug>."
              icon={<LinkIcon className="w-4 h-4 text-emerald-300" />}
              empty="No branch-link signups yet."
              items={data?.direct_referrals || []}
              columns={[
                {
                  header: "Branch",
                  get: (r) => (
                    <code className="text-[11px] text-white/85 font-semibold">
                      {r.slug}
                    </code>
                  ),
                },
                {
                  header: "Signups",
                  get: (r) => r.signups,
                  align: "right",
                  bold: true,
                },
                {
                  header: "Paid",
                  get: (r) => (
                    <span
                      className={
                        r.paid > 0
                          ? "text-emerald-300 font-bold"
                          : "text-white/40"
                      }
                    >
                      {r.paid}
                    </span>
                  ),
                  align: "right",
                },
                {
                  header: "Conversion",
                  get: (r) =>
                    r.signups > 0
                      ? `${Math.round((r.paid / r.signups) * 100)}%`
                      : "—",
                  align: "right",
                },
                {
                  header: "First / last",
                  get: (r) => `${fmtDate(r.first_at)} → ${fmtDate(r.last_at)}`,
                  align: "right",
                },
              ]}
            />

            {/* ── Events drill-down ─────────────────────────────────────
                Per-user, per-action table. The three tables above
                count what each partner has produced; this one
                answers "show me the actual users". Filterable by
                partner + event type + free-text search. */}
            <EventsSection
              loading={eventsLoading}
              error={eventsError}
              events={eventsData?.events || []}
              partners={eventsData?.partners || []}
              filteredEvents={filteredEvents}
              partnerFilter={partnerFilter}
              setPartnerFilter={setPartnerFilter}
              typeFilter={typeFilter}
              setTypeFilter={setTypeFilter}
              query={query}
              setQuery={setQuery}
              truncated={eventsData?.truncated}
              limit={eventsData?.limit}
            />
          </>
        )}
      </main>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────
   Events drill-down
   ──────────────────────────────────────────────────────────── */

const EVENT_LABELS = {
  seat_redemption: { label: "Seat redemption", tone: "emerald" },
  promo_purchase: { label: "Promo purchase", tone: "emerald" },
  branch_signup: { label: "Branch signup", tone: "amber" },
};

function EventsSection({
  loading,
  error,
  events,
  partners,
  filteredEvents,
  partnerFilter,
  setPartnerFilter,
  typeFilter,
  setTypeFilter,
  query,
  setQuery,
  truncated,
  limit,
}) {
  const activeFilters =
    (partnerFilter !== "all" ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0) +
    (query.trim() ? 1 : 0);

  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        <Activity className="w-4 h-4 text-emerald-300" />
        <h2 className="text-base font-bold text-white">
          4 · Per-user events
        </h2>
        {activeFilters > 0 && (
          <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-200">
            {activeFilters} filter{activeFilters === 1 ? "" : "s"}
          </span>
        )}
      </div>
      <p className="text-[11px] text-white/50 mb-3 ml-6">
        Every partner-attributed action by an individual user. Filter and
        search to answer specific partner questions.
      </p>

      <EventFilters
        partners={partners}
        partnerFilter={partnerFilter}
        setPartnerFilter={setPartnerFilter}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        query={query}
        setQuery={setQuery}
      />

      <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden">
        {loading ? (
          <div className="py-10 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          </div>
        ) : error ? (
          <div className="p-5 text-sm text-red-200">{error}</div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-5 text-sm text-white/50 text-center">
            {events.length === 0
              ? "No partner-attributed events yet."
              : "No events match these filters."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.16em] text-white/45 font-semibold">
                <tr>
                  <th className="px-3 py-2 text-left">Player</th>
                  <th className="px-3 py-2 text-left">Partner</th>
                  <th className="px-3 py-2 text-left">Event</th>
                  <th className="px-3 py-2 text-left">Detail</th>
                  <th className="px-3 py-2 text-center">Access</th>
                  <th className="px-3 py-2 text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-2 text-[11px] text-white/45">
        <span>
          Showing {filteredEvents.length} of {events.length} event
          {events.length === 1 ? "" : "s"}.
        </span>
        {truncated && (
          <span className="text-amber-200/70">
            More than {limit} total — older events not shown. Filter by
            partner to drill in.
          </span>
        )}
      </div>
    </section>
  );
}

function EventFilters({
  partners,
  partnerFilter,
  setPartnerFilter,
  typeFilter,
  setTypeFilter,
  query,
  setQuery,
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3 mb-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_1.5fr] gap-2">
      <FilterSelect
        icon={<Filter className="w-3.5 h-3.5 text-white/45" />}
        value={partnerFilter}
        onChange={setPartnerFilter}
        options={[
          { value: "all", label: "All partners" },
          ...partners.map((p) => ({ value: p, label: p })),
        ]}
      />
      <FilterSelect
        icon={<Filter className="w-3.5 h-3.5 text-white/45" />}
        value={typeFilter}
        onChange={setTypeFilter}
        options={[
          { value: "all", label: "All event types" },
          { value: "seat_redemption", label: "Seat redemption" },
          { value: "promo_purchase", label: "Promo purchase" },
          { value: "branch_signup", label: "Branch signup" },
        ]}
      />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/35" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email or code…"
          className="w-full pl-8 pr-8 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 focus:outline-none focus:border-emerald-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function FilterSelect({ icon, value, onChange, options }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
        {icon}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-emerald-400 appearance-none cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0f0f0f]">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function EventRow({ event: e }) {
  const eventMeta = EVENT_LABELS[e.type] || {
    label: e.type,
    tone: "neutral",
  };
  const eventToneClass =
    eventMeta.tone === "emerald"
      ? "bg-emerald-500/15 text-emerald-200"
      : eventMeta.tone === "amber"
        ? "bg-amber-300/15 text-amber-200"
        : "bg-white/10 text-white/70";
  return (
    <tr className="border-t border-white/5 hover:bg-white/[0.025] transition-colors">
      <td className="px-3 py-2.5">
        <div className="font-semibold text-white truncate max-w-[180px]">
          {e.player_name}
        </div>
        {e.player_email && (
          <div className="text-[11px] text-white/40 truncate max-w-[180px]">
            {e.player_email}
          </div>
        )}
      </td>
      <td className="px-3 py-2.5 text-white/75 text-xs">
        {e.partner_name}
        {e.edition && (
          <span className="text-white/40"> · {e.edition}</span>
        )}
      </td>
      <td className="px-3 py-2.5">
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${eventToneClass}`}
        >
          {eventMeta.label}
        </span>
      </td>
      <td className="px-3 py-2.5 text-[11px] text-white/55 max-w-[200px] truncate">
        {e.detail || "—"}
      </td>
      <td className="px-3 py-2.5 text-center">
        {e.has_full_access ? (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-200"
            title={e.access_source || "active"}
          >
            <Check className="w-3 h-3" />
            Full
          </span>
        ) : (
          <span className="text-white/30 text-[11px]">—</span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right text-[11px] text-white/55 tabular-nums whitespace-nowrap">
        {fmtDateTime(e.occurred_at)}
      </td>
    </tr>
  );
}

function fmtDateTime(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function TotalsRow({ totals }) {
  if (!totals) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <TotalTile label="Seat redemptions" value={totals.seat_redemptions} />
      <TotalTile label="Promo-code purchases" value={totals.promo_code_purchases} />
      <TotalTile label="Direct signups" value={totals.direct_signups} />
      <TotalTile
        label="Direct → paid"
        value={totals.direct_paid}
        accent="emerald"
      />
    </div>
  );
}

function TotalTile({ label, value, accent }) {
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/30 bg-emerald-500/[0.06]"
      : "border-white/10 bg-white/[0.04]";
  return (
    <div className={`rounded-2xl border ${accentClass} p-4`}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/50 font-semibold mb-1">
        {label}
      </p>
      <p className="text-2xl font-black tabular-nums">{value ?? 0}</p>
    </div>
  );
}

function Section({ title, subtitle, icon, items, empty, columns, footerNote }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <h2 className="text-base font-bold text-white">{title}</h2>
      </div>
      <p className="text-[11px] text-white/50 mb-3 ml-6">{subtitle}</p>
      {items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm text-white/50">
          {empty}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/[0.03] text-[10px] uppercase tracking-[0.16em] text-white/45 font-semibold">
              <tr>
                {columns.map((c, i) => (
                  <th
                    key={i}
                    className={`px-3 py-2 ${
                      c.align === "right" ? "text-right" : "text-left"
                    }`}
                  >
                    {c.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((row, ri) => (
                <tr
                  key={ri}
                  className="border-t border-white/5 hover:bg-white/[0.025] transition-colors"
                >
                  {columns.map((c, ci) => (
                    <td
                      key={ci}
                      className={`px-3 py-2 ${
                        c.align === "right"
                          ? "text-right tabular-nums"
                          : "text-left"
                      } ${c.bold ? "font-bold text-white" : "text-white/75"}`}
                    >
                      {c.get(row) ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footerNote}
    </section>
  );
}

function UnmappedHint({ prefixes }) {
  return (
    <div className="mt-3 rounded-xl border border-amber-300/40 bg-amber-300/[0.06] p-3 text-[12px] text-amber-100/85">
      <p className="font-semibold mb-1">
        {prefixes.length} unmapped prefix
        {prefixes.length === 1 ? "" : "es"} —{" "}
        <span className="font-normal text-amber-100/65">
          attach a partner name to these so they show up grouped above.
        </span>
      </p>
      <div className="flex flex-wrap gap-1.5 mt-2">
        {prefixes.map((p) => (
          <code
            key={p}
            className="text-[10px] bg-amber-300/15 px-1.5 py-0.5 rounded text-amber-200"
          >
            {p}
          </code>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-amber-100/55">
        Map them via SQL:{" "}
        <code className="bg-black/40 px-1 py-0.5 rounded">
          INSERT INTO partner_promo_prefixes (prefix, partner_name) VALUES
          (&apos;PREFIX&apos;, &apos;Partner Name&apos;)
        </code>{" "}
        or by re-running the bulk-generate flow with the same prefix and the
        partner name filled in.
      </p>
    </div>
  );
}

function fmtDate(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

export default function PartnerTrackingPage() {
  return (
    <ProtectedRoute>
      <PartnerTrackingContent />
    </ProtectedRoute>
  );
}

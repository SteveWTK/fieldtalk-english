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

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  KeyRound,
  Tag,
  Link as LinkIcon,
  AlertTriangle,
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

  useEffect(() => {
    refresh();
  }, [refresh]);

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
          </>
        )}
      </main>
    </div>
  );
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

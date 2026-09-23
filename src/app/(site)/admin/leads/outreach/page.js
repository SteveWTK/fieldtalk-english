// src/app/(site)/admin/leads/outreach/page.js
//
// David's / Paul's quick-launch page for the WhatsApp lead-funnel.
//
// Left column: form. Enter a name + role (+ optional phone/notes),
// click Generate. Backend creates a leads row (source='whatsapp_funnel',
// funnel_stage='pending_oi'), mints an outreach token, returns the
// wa.me link. UI shows the link, a Copy button, and a QR code the
// salesperson can screenshot for in-person moments.
//
// Right column: recent outreaches. Every lead where funnel_stage IS
// NOT NULL, most-recent first. Stage badge, role tag, click-through
// to /admin/leads/[id] for the full timeline / drawer.
//
// The page reuses:
//   - /api/admin/leads/outreach-quick    (create + mint)
//   - /api/admin/leads?funnel=1          (list with funnel filter — see route)
// The list endpoint is the existing /api/admin/leads with a bespoke
// funnel filter added client-side (leads route returns everything and
// we filter here — cheap since we're capped at 500 rows anyway).

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import QRCode from "qrcode";
import {
  Loader2,
  ChevronLeft,
  Send,
  Copy,
  Check,
  MessageCircle,
  QrCode,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Users,
} from "lucide-react";
import Button from "@/components/ui/button";

const ROLES = [
  { value: "agent", label: "Agent" },
  { value: "coach", label: "Coach" },
  { value: "club_staff", label: "Club staff" },
  { value: "academy_director", label: "Academy director" },
  { value: "other", label: "Other" },
];

const LEAD_TYPES = [
  { value: "individual_player", label: "Individual" },
  { value: "academy", label: "Academy" },
  { value: "school", label: "School" },
  { value: "club", label: "Club" },
  { value: "partner_other", label: "Other org" },
];

const FUNNEL_STAGE_META = {
  pending_oi: { label: "Waiting for Oi", tone: "amber" },
  q1_sent: { label: "Q1 sent", tone: "sky" },
  q2_sent: { label: "Q2 sent", tone: "sky" },
  cta_sent: { label: "CTA sent", tone: "violet" },
  converted: { label: "Converted", tone: "lime" },
  escalated: { label: "Escalated", tone: "amber" },
  cold: { label: "Cold", tone: "neutral" },
};

export default function LeadFunnelOutreachPage() {
  const [form, setForm] = useState({
    full_name: "",
    funnel_role: "agent",
    lead_type: "individual_player",
    phone_e164: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const [recent, setRecent] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);

  useEffect(() => {
    fetchRecent().finally(() => setRecentLoading(false));
  }, []);

  async function fetchRecent() {
    try {
      const res = await fetch("/api/admin/leads?source=whatsapp_funnel");
      const json = await res.json();
      if (res.ok && Array.isArray(json.leads)) {
        setRecent(json.leads);
      }
    } catch {
      /* silent */
    }
  }

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (!form.full_name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/leads/outreach-quick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.full_name.trim(),
          funnel_role: form.funnel_role,
          lead_type: form.lead_type,
          phone_e164: form.phone_e164.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Falha ao criar outreach");
      } else {
        setResult(json);
        // Reset form for the next outreach.
        setForm({
          full_name: "",
          funnel_role: form.funnel_role,
          lead_type: form.lead_type,
          phone_e164: "",
          notes: "",
        });
        fetchRecent();
      }
    } catch {
      setError("Erro de rede");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-4">
          <Link
            href="/admin/leads"
            className="inline-flex items-center gap-1 text-sm text-primary-300 hover:text-primary-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to leads
          </Link>
        </div>

        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-400/80 font-semibold mb-1">
            Leads · WhatsApp funnel
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Launch outreach
          </h1>
          <p className="text-sm text-primary-300 mt-2 max-w-2xl leading-relaxed">
            Generate a WhatsApp outreach link. Paste it into your personal DM
            with a short intro line. When the lead sends the auto-filled
            &quot;Oi&quot;, our funnel takes over — Q1, Q2, then a personalised
            2-minute demo.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Form */}
          <section className="lg:col-span-2">
            <div className="rounded-card border border-primary-700 bg-primary-panel p-5 sm:p-6">
              <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-primary-300 font-semibold mb-4">
                <Sparkles className="w-4 h-4 text-accent-400" />
                Quick launch
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <FormField label="Full name" required>
                  <input
                    type="text"
                    value={form.full_name}
                    onChange={(e) => updateField("full_name", e.target.value)}
                    className="w-full bg-primary-800 border border-primary-700 rounded-control px-3 py-2 text-sm text-primary-50 focus:border-accent-400 focus:outline-none"
                    placeholder="Ricardo Almeida"
                    autoFocus
                  />
                </FormField>

                <FormField label="Role" required hint="Shapes the demo CTA copy.">
                  <select
                    value={form.funnel_role}
                    onChange={(e) => updateField("funnel_role", e.target.value)}
                    className="w-full bg-primary-800 border border-primary-700 rounded-control px-3 py-2 text-sm text-primary-50 focus:border-accent-400 focus:outline-none"
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField label="Lead type" hint="For CRM segmentation.">
                  <select
                    value={form.lead_type}
                    onChange={(e) => updateField("lead_type", e.target.value)}
                    className="w-full bg-primary-800 border border-primary-700 rounded-control px-3 py-2 text-sm text-primary-50 focus:border-accent-400 focus:outline-none"
                  >
                    {LEAD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </FormField>

                <FormField
                  label="Phone (optional)"
                  hint="Fill if you have it. Otherwise captured from the lead's Oi."
                >
                  <input
                    type="tel"
                    value={form.phone_e164}
                    onChange={(e) => updateField("phone_e164", e.target.value)}
                    className="w-full bg-primary-800 border border-primary-700 rounded-control px-3 py-2 text-sm text-primary-50 focus:border-accent-400 focus:outline-none"
                    placeholder="+5511999999999"
                  />
                </FormField>

                <FormField label="Notes (optional)">
                  <textarea
                    value={form.notes}
                    onChange={(e) => updateField("notes", e.target.value)}
                    rows={2}
                    className="w-full bg-primary-800 border border-primary-700 rounded-control px-3 py-2 text-sm text-primary-50 focus:border-accent-400 focus:outline-none resize-y"
                    placeholder="Met at Aldeia meetup. Represents 3 U-17 players."
                  />
                </FormField>

                {error && (
                  <div className="inline-flex items-center gap-2 text-xs text-signal-alert">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={submitting}
                  loading={submitting}
                  Icon={submitting ? undefined : Send}
                >
                  Generate outreach link
                </Button>
              </form>
            </div>

            {result && <OutreachResult result={result} />}
          </section>

          {/* Recent outreaches */}
          <section className="lg:col-span-3">
            <div className="rounded-card border border-primary-700 bg-primary-panel p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-primary-300 font-semibold">
                  <Users className="w-4 h-4" />
                  Recent outreaches
                </div>
                <Link
                  href="/admin/leads?source=whatsapp_funnel"
                  className="text-[11px] text-accent-400 hover:text-accent-300"
                >
                  View all in leads →
                </Link>
              </div>

              {recentLoading ? (
                <div className="flex items-center gap-2 text-primary-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading…
                </div>
              ) : recent.length === 0 ? (
                <p className="text-sm text-primary-500">
                  No outreaches yet. Launch your first from the form.
                </p>
              ) : (
                <ul className="space-y-2">
                  {recent.slice(0, 40).map((lead) => (
                    <RecentRow key={lead.id} lead={lead} />
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

/* ─── Form field wrapper ──────────────────────────────────────── */

function FormField({ label, hint, required, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider text-primary-300 font-bold">
          {label}
          {required && <span className="text-signal-alert ml-1">*</span>}
        </span>
      </div>
      {hint && <p className="text-[10px] text-primary-500 mb-1">{hint}</p>}
      {children}
    </div>
  );
}

/* ─── Result card — shown after successful generate ────────────── */

function OutreachResult({ result }) {
  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState(null);

  useEffect(() => {
    if (!result?.outreach_url) return;
    let cancelled = false;
    QRCode.toDataURL(result.outreach_url, {
      width: 240,
      margin: 1,
      color: { dark: "#f8fafc", light: "#00000000" },
    })
      .then((d) => {
        if (!cancelled) setQrDataUrl(d);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [result?.outreach_url]);

  if (!result) return null;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(result.outreach_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silent */
    }
  }

  return (
    <div className="mt-4 rounded-card border border-accent-400/30 bg-accent-400/[0.04] p-5">
      <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-accent-300 font-semibold mb-3">
        <Check className="w-4 h-4" />
        Ready to send · {result.full_name}
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-primary-400 font-bold mb-1">
            Short outreach link
          </p>
          <div className="flex items-stretch gap-2">
            <div className="flex-1 min-w-0 bg-primary-900 border border-primary-700 rounded-control px-3 py-2 text-xs text-primary-100 font-mono break-all">
              {result.outreach_url}
            </div>
            <button
              type="button"
              onClick={copyLink}
              className="inline-flex items-center gap-1.5 text-xs font-semibold bg-accent-400 hover:bg-accent-300 text-primary-900 px-3 py-2 rounded-control transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy
                </>
              )}
            </button>
          </div>
          <p className="text-[10px] text-primary-500 mt-1">
            Token: <span className="font-mono text-primary-300">{result.token}</span>
          </p>
        </div>

        {qrDataUrl && (
          <div className="pt-3 border-t border-primary-700/60">
            <p className="text-[10px] uppercase tracking-wider text-primary-400 font-bold mb-2 inline-flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5" />
              For in-person moments
            </p>
            <Image
              src={qrDataUrl}
              alt="QR code for outreach link"
              width={180}
              height={180}
              className="rounded-control bg-primary-900 border border-primary-700 p-1"
              unoptimized
            />
          </div>
        )}

        <div className="pt-3 border-t border-primary-700/60 flex flex-wrap gap-2">
          <Link
            href={`/admin/leads/${result.lead_id}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-400 hover:text-accent-300"
          >
            Open lead detail
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Recent outreach row ──────────────────────────────────────── */

function RecentRow({ lead }) {
  const stageMeta = FUNNEL_STAGE_META[lead.funnel_stage] || {
    label: lead.funnel_stage || "—",
    tone: "neutral",
  };
  return (
    <li>
      <Link
        href={`/admin/leads/${lead.id}`}
        className="flex items-center gap-3 p-3 rounded-card border border-primary-700 bg-primary-800/40 hover:bg-primary-800 hover:border-primary-600 transition-colors"
      >
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary-800 flex items-center justify-center">
          <MessageCircle className="w-4 h-4 text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-primary-50 truncate">
              {lead.full_name}
            </span>
            {lead.funnel_role && (
              <span className="text-[10px] uppercase tracking-wider text-primary-400 bg-primary-800 border border-primary-700 rounded-full px-1.5 py-0.5">
                {lead.funnel_role.replace("_", " ")}
              </span>
            )}
          </div>
          <p className="text-[11px] text-primary-500 mt-0.5 truncate">
            {formatRelative(lead.updated_at)}
            {lead.organization_name ? ` · ${lead.organization_name}` : ""}
          </p>
        </div>
        <StageBadge meta={stageMeta} />
      </Link>
    </li>
  );
}

function StageBadge({ meta }) {
  const toneClass =
    meta.tone === "lime"
      ? "bg-accent-400/15 text-accent-300 border-accent-400/40"
      : meta.tone === "sky"
        ? "bg-signal-focus/15 text-signal-focus border-signal-focus/40"
        : meta.tone === "violet"
          ? "bg-signal-elite/15 text-signal-elite border-signal-elite/40"
          : meta.tone === "amber"
            ? "bg-signal-performance/15 text-signal-performance border-signal-performance/40"
            : "bg-primary-800 text-primary-300 border-primary-700";
  return (
    <span
      className={`shrink-0 text-[10px] uppercase tracking-wider font-bold rounded-full px-2 py-0.5 border ${toneClass}`}
    >
      {meta.label}
    </span>
  );
}

/* ─── time formatting ─────────────────────────────────────────── */

function formatRelative(iso) {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!then || Number.isNaN(then)) return "";
  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}

// src/components/admin/leads/FunnelMetricsPanel.js
//
// The WhatsApp lead-funnel dashboard strip that lives on top of
// /admin/leads/outreach. Six funnel tiles ordered top-of-funnel to
// bottom-of-funnel (outreaches → Oi → Q1 → Q2 → CTA → converted),
// with adjacent-step conversion percentages so the drop-off between
// any two steps is a single glance. A per-role rollup sits below so
// David can see which role is converting best.
//
// Fetches /api/admin/leads/funnel-metrics with a 7d/30d/90d range
// picker. No polling (data lags at most one cron tick, and the page
// is already refreshed each time an outreach is launched).

"use client";

import { useEffect, useState } from "react";
import {
  Loader2,
  Sparkles,
  MessageCircle,
  MessageSquareQuote,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Snowflake,
} from "lucide-react";

const RANGES = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
];

// Ordered funnel steps rendered as tiles.
const STEPS = [
  {
    key: "outreaches",
    label: "Outreaches",
    hint: "Links geradas",
    Icon: Sparkles,
    tone: "neutral",
  },
  {
    key: "oi_received",
    label: "Oi recebido",
    hint: "Lead abriu a conversa",
    Icon: MessageCircle,
    tone: "sky",
  },
  {
    key: "q1_answered",
    label: "Q1 respondida",
    hint: "Tocou no botão da primeira pergunta",
    Icon: MessageSquareQuote,
    tone: "sky",
  },
  {
    key: "q2_answered",
    label: "Q2 respondida",
    hint: "Tocou no botão da segunda pergunta",
    Icon: MessageSquare,
    tone: "violet",
  },
  {
    key: "cta_sent",
    label: "CTA enviado",
    hint: "Recebeu o link da demo",
    Icon: ArrowRight,
    tone: "violet",
  },
  {
    key: "converted",
    label: "Convertidos",
    hint: "Signup fechado",
    Icon: CheckCircle2,
    tone: "lime",
  },
];

const ROLE_LABELS = {
  agent: "Agente",
  coach: "Técnico",
  club_staff: "Time de clube",
  academy_director: "Diretor de escolinha",
  other: "Outro",
};

export default function FunnelMetricsPanel() {
  const [range, setRange] = useState("30d");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/leads/funnel-metrics?range=${encodeURIComponent(range)}`,
        );
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "load_failed");
        } else {
          setData(json);
        }
      } catch {
        if (!cancelled) setError("network");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <section className="rounded-card border border-primary-700 bg-primary-panel p-5 sm:p-6 mb-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-400/80 font-semibold mb-1">
            Funil · WhatsApp
          </p>
          <h2 className="text-lg font-black tracking-tight">
            Como o funil tá indo
          </h2>
        </div>
        <div className="inline-flex rounded-full bg-primary-800 border border-primary-700 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              className={`px-3 py-1 text-[11px] font-bold uppercase rounded-full transition-colors ${
                range === r.key
                  ? "bg-accent-400 text-primary-900"
                  : "text-primary-400 hover:text-primary-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-primary-400 text-sm py-6">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando…
        </div>
      ) : error ? (
        <div className="rounded-control border border-signal-alert/40 bg-signal-alert/10 p-3 text-sm text-signal-alert">
          Falha ao carregar métricas.
        </div>
      ) : data ? (
        <>
          {/* Funnel tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
            {STEPS.map((step, idx) => {
              const value = data.totals[step.key] ?? 0;
              const previous = idx > 0
                ? data.totals[STEPS[idx - 1].key] ?? 0
                : null;
              const pct =
                previous && previous > 0
                  ? Math.round((value / previous) * 100)
                  : null;
              return (
                <FunnelTile
                  key={step.key}
                  step={step}
                  value={value}
                  pct={pct}
                />
              );
            })}
          </div>

          {/* Escalated + cold */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <SecondaryChip
              Icon={AlertCircle}
              tone="amber"
              label="Escalados"
              value={data.totals.escalated ?? 0}
            />
            <SecondaryChip
              Icon={Snowflake}
              tone="neutral"
              label="Frios"
              value={data.totals.cold ?? 0}
            />
            <span className="text-[11px] text-primary-500 ml-auto">
              {formatDateRange(data.from, data.to)}
            </span>
          </div>

          {/* Per-role breakdown */}
          <RoleBreakdown byRole={data.by_role} />
        </>
      ) : null}
    </section>
  );
}

/* ─── Tile ─────────────────────────────────────────────────────── */

function FunnelTile({ step, value, pct }) {
  const toneClass = TONE_CLASSES[step.tone] || TONE_CLASSES.neutral;
  return (
    <div
      className={`rounded-control border p-3 flex flex-col gap-1 ${toneClass.card}`}
    >
      <div className="flex items-center gap-1.5">
        <step.Icon className={`w-3.5 h-3.5 ${toneClass.icon}`} />
        <p className="text-[10px] uppercase tracking-wider text-primary-400 font-bold truncate">
          {step.label}
        </p>
      </div>
      <p className="text-2xl font-black tracking-tight text-primary-50 tabular-nums leading-none">
        {value}
      </p>
      {pct !== null && (
        <p className={`text-[10px] font-semibold tabular-nums ${toneClass.pct}`}>
          {pct}% do passo anterior
        </p>
      )}
    </div>
  );
}

const TONE_CLASSES = {
  neutral: {
    card: "border-primary-700 bg-primary-800/40",
    icon: "text-primary-400",
    pct: "text-primary-500",
  },
  sky: {
    card: "border-signal-focus/30 bg-signal-focus/[0.06]",
    icon: "text-signal-focus",
    pct: "text-signal-focus/80",
  },
  violet: {
    card: "border-signal-elite/30 bg-signal-elite/[0.06]",
    icon: "text-signal-elite",
    pct: "text-signal-elite/80",
  },
  lime: {
    card: "border-accent-400/40 bg-accent-400/[0.07]",
    icon: "text-accent-300",
    pct: "text-accent-300",
  },
};

/* ─── Secondary chip (escalated / cold) ───────────────────────── */

function SecondaryChip({ Icon, tone, label, value }) {
  const toneClass =
    tone === "amber"
      ? "bg-signal-performance/15 text-signal-performance border-signal-performance/40"
      : "bg-primary-800 text-primary-300 border-primary-700";
  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${toneClass}`}
    >
      <Icon className="w-3 h-3" />
      {label}
      <span className="tabular-nums font-bold">{value}</span>
    </div>
  );
}

/* ─── Per-role breakdown ──────────────────────────────────────── */

function RoleBreakdown({ byRole }) {
  const entries = Object.entries(byRole || {}).sort(
    (a, b) => (b[1]?.launched || 0) - (a[1]?.launched || 0),
  );
  if (entries.length === 0) return null;
  return (
    <div className="mt-5">
      <p className="text-[10px] uppercase tracking-wider text-primary-400 font-bold mb-2">
        Por papel
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
        {entries.map(([role, counts]) => {
          const launched = counts?.launched || 0;
          const converted = counts?.converted || 0;
          const pct =
            launched > 0 ? Math.round((converted / launched) * 100) : 0;
          return (
            <div
              key={role}
              className="rounded-control border border-primary-700 bg-primary-800/40 p-3"
            >
              <p className="text-[11px] text-primary-300 font-semibold truncate">
                {ROLE_LABELS[role] || role}
              </p>
              <p className="text-sm text-primary-100 mt-1 tabular-nums">
                <span className="font-bold">{converted}</span>
                <span className="text-primary-500"> / {launched}</span>
                <span className="text-accent-300 font-semibold ml-1.5">
                  {pct}%
                </span>
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────── */

function formatDateRange(fromIso, toIso) {
  try {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    const fmt = (d) =>
      d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
      });
    return `${fmt(from)} → ${fmt(to)}`;
  } catch {
    return "";
  }
}

// src/app/(site)/admin/leads/dashboard/page.js
//
// Leads metrics dashboard — the "how are we doing?" scoreboard for
// the core + eventual sales team. Loud on dark, colour-coded,
// updates every 60s. Every panel links back to the filtered list so
// a headline number becomes a working queue in one click.
//
// Section stack:
//   1. Scoreboard      — 4 headline numbers with week-over-week deltas
//   2. Funnel + week   — stage funnel + this-week activity strip
//   3. Leaderboard     — owner ranking (conversions this week)
//   4. Source ROI      — leads-in vs conversions per source
//   5. Attention       — aging callouts
//   6. Trend           — 30-day daily-new sparkline + 12-week won bars
//
// Data source: single GET /api/admin/leads/metrics. Auto-refreshes
// every 60s while the tab is visible; pauses when the tab is hidden
// (page visibility API) so we don't burn cycles in a background tab.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  Send,
  MessageCircle,
  ArrowUpRight,
  Trophy,
  Flame,
  Clock,
  AlertTriangle,
  Radio,
  RefreshCcw,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { t, STAGE_TONES } from "@/lib/leads/constants";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";

const REFRESH_MS = 60_000;

export default function LeadsDashboardPage() {
  const { lang } = useLanguage();
  const isPt = lang === "pt";
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const timerRef = useRef(null);

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/leads/metrics");
      const json = await res.json();
      if (!res.ok) setError(json.error || "load_failed");
      else {
        setData(json);
        setLastFetched(new Date());
      }
    } catch {
      setError("network");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(true);
    // Poll while visible; pause when the tab is hidden to save
    // resources. The rest of the app follows the same convention.
    function tick() {
      if (typeof document !== "undefined" && !document.hidden) {
        load(false);
      }
    }
    timerRef.current = setInterval(tick, REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, []);

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LeadsAdminHeader currentView="dashboard" />

        {loading ? (
          <div className="flex items-center gap-2 text-white/60 py-12">
            <Loader2 className="w-5 h-5 animate-spin" />
            {isPt ? "Carregando…" : "Loading…"}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {t("errors.loadFailed", lang)}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] text-white/40 flex items-center gap-2">
                {refreshing && <Loader2 className="w-3 h-3 animate-spin" />}
                {isPt ? "Atualizado" : "Updated"}{" "}
                {lastFetched
                  ? new Intl.DateTimeFormat(isPt ? "pt-BR" : "en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    }).format(lastFetched)
                  : "—"}
              </div>
              <button
                type="button"
                onClick={() => load(false)}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/60 hover:text-white text-xs disabled:opacity-50"
              >
                <RefreshCcw
                  className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
                />
                {isPt ? "Atualizar" : "Refresh"}
              </button>
            </div>

            <Scoreboard data={data} lang={lang} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <div className="lg:col-span-2">
                <Funnel data={data} lang={lang} />
              </div>
              <ThisWeekStrip data={data} lang={lang} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
              <Leaderboard data={data} lang={lang} />
              <SourceRoi data={data} lang={lang} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
              <AttentionCallouts data={data} lang={lang} />
              <div className="lg:col-span-2">
                <TrendCharts data={data} lang={lang} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ─── section: scoreboard ─────────────────────────────────────── */

function Scoreboard({ data, lang }) {
  const isPt = lang === "pt";
  const totals = data.totals;
  const thisWeekNew = data.this_week.new;
  const prevWeekNew = data.prev_week.new;
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <BigStat
        label={isPt ? "Total de leads" : "Total leads"}
        value={totals.total}
        accent="emerald"
        delta={{
          current: thisWeekNew,
          previous: prevWeekNew,
          label: isPt ? "novos vs semana passada" : "new vs last week",
        }}
        href="/admin/leads"
      />
      <BigStat
        label={isPt ? "Pipeline ativo" : "Active pipeline"}
        value={totals.active_pipeline}
        accent="cyan"
        href="/admin/leads?stage=new,contacted,engaged,qualified,proposal"
      />
      <BigStat
        label={isPt ? "Taxa de conversão" : "Conversion rate"}
        value={formatPct(totals.conversion_rate)}
        rawValue={Math.round(totals.conversion_rate * 100)}
        accent="amber"
        suffix="%"
        href="/admin/leads?stage=won"
      />
      <BigStat
        label={isPt ? "Valor do pipeline" : "Pipeline value"}
        value={formatBrl(totals.pipeline_value_cents)}
        accent="lime"
        href="/admin/leads?stage=new,contacted,engaged,qualified,proposal"
      />
    </div>
  );
}

/**
 * Big number card with optional count-up animation, trend delta,
 * and colour tone. Clickable when href is set — every number should
 * lead somewhere so the dashboard becomes a work-launcher.
 */
function BigStat({ label, value, rawValue, accent = "emerald", delta, href, suffix }) {
  const numericTarget =
    typeof rawValue === "number"
      ? rawValue
      : typeof value === "number"
        ? value
        : null;
  const animated = useCountUp(numericTarget);
  const display =
    numericTarget != null
      ? typeof value === "string"
        ? // Non-numeric value display (currency, percent) — count-up
          // still runs on the underlying number, but we render the
          // interpolated version by re-formatting.
          animated === numericTarget
          ? value
          : formatInterpolated(value, animated, numericTarget)
        : formatNumber(animated) + (suffix || "")
      : String(value);

  const tone = accentTones(accent);

  const inner = (
    <div className={`relative rounded-2xl border p-4 sm:p-5 h-full transition-transform group-hover:-translate-y-0.5 ${tone.card}`}>
      <p className="text-[10px] uppercase tracking-[0.25em] font-semibold text-white/50">
        {label}
      </p>
      <p className={`mt-2 font-black tracking-tight tabular-nums text-3xl sm:text-4xl ${tone.number}`}>
        {display}
      </p>
      {delta && <DeltaRow delta={delta} />}
      <div className={`absolute inset-0 rounded-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity ${tone.glow}`} />
    </div>
  );

  return href ? (
    <Link href={href} className="group block h-full">
      {inner}
    </Link>
  ) : (
    <div className="group h-full">{inner}</div>
  );
}

function DeltaRow({ delta }) {
  const { current, previous, label } = delta;
  const diff = current - previous;
  const pct = previous > 0 ? (diff / previous) * 100 : diff > 0 ? 100 : 0;
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const tone =
    diff > 0
      ? "text-emerald-300"
      : diff < 0
        ? "text-red-300"
        : "text-white/40";
  return (
    <div className={`mt-2 inline-flex items-center gap-1 text-[11px] font-semibold ${tone}`}>
      <Icon className="w-3 h-3" />
      <span className="tabular-nums">
        {diff > 0 ? "+" : ""}
        {diff} · {previous > 0 ? `${Math.abs(pct).toFixed(0)}%` : "—"}
      </span>
      <span className="text-white/40 font-normal ml-1">{label}</span>
    </div>
  );
}

/* ─── section: funnel ─────────────────────────────────────────── */

function Funnel({ data, lang }) {
  const isPt = lang === "pt";
  const rows = data.by_stage;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <SectionCard
      title={isPt ? "Funil de pipeline" : "Pipeline funnel"}
      subtitle={
        isPt
          ? "Cada etapa da jornada. Clique num estágio pra abrir a lista filtrada."
          : "Each stage in the journey. Click any stage to open its filtered list."
      }
    >
      <div className="space-y-1.5">
        {rows.map((r) => {
          const width = Math.max(6, (r.count / max) * 100);
          const tone = STAGE_TONES[r.stage] || "bg-white/10 text-white/80";
          return (
            <Link
              key={r.stage}
              href={`/admin/leads?stage=${r.stage}`}
              className="group grid grid-cols-[7.5rem_1fr_auto] items-center gap-2 hover:bg-white/[0.02] transition-colors rounded-lg px-2 py-1"
            >
              <span className={`inline-flex justify-center items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
                {t(`stages.${r.stage}`, lang)}
              </span>
              <div className="h-6 rounded-lg bg-white/[0.03] border border-white/5 overflow-hidden relative">
                <div
                  className={`absolute inset-y-0 left-0 rounded-lg opacity-70 group-hover:opacity-90 transition-all ${funnelBarClass(r.stage)}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className="text-sm font-black tabular-nums text-white/85 min-w-[3rem] text-right">
                {r.count}
              </span>
            </Link>
          );
        })}
      </div>
    </SectionCard>
  );
}

function funnelBarClass(stage) {
  // Gradient bars matching stage tone — extra "juice" for the visual.
  switch (stage) {
    case "new":
      return "bg-gradient-to-r from-white/20 to-white/10";
    case "contacted":
      return "bg-gradient-to-r from-blue-500 to-blue-400";
    case "engaged":
      return "bg-gradient-to-r from-cyan-500 to-cyan-400";
    case "qualified":
      return "bg-gradient-to-r from-emerald-500 to-emerald-400";
    case "proposal":
      return "bg-gradient-to-r from-amber-500 to-amber-400";
    case "won":
      return "bg-gradient-to-r from-emerald-300 to-lime-300";
    case "lost":
      return "bg-gradient-to-r from-red-600 to-red-500";
    case "dormant":
      return "bg-gradient-to-r from-white/10 to-white/5";
    default:
      return "bg-white/10";
  }
}

/* ─── section: this-week strip ────────────────────────────────── */

function ThisWeekStrip({ data, lang }) {
  const isPt = lang === "pt";
  const tw = data.this_week;
  const pw = data.prev_week;
  const rows = [
    {
      key: "new",
      label: isPt ? "Novos leads" : "New leads",
      cur: tw.new,
      prev: pw.new,
      Icon: Flame,
      accent: "emerald",
    },
    {
      key: "sends",
      label: isPt ? "Mensagens enviadas" : "Messages sent",
      cur: tw.sends,
      prev: pw.sends,
      Icon: Send,
      accent: "cyan",
    },
    {
      key: "replies",
      label: isPt ? "Respostas recebidas" : "Replies received",
      cur: tw.replies,
      prev: pw.replies,
      Icon: MessageCircle,
      accent: "amber",
    },
    {
      key: "advances",
      label: isPt ? "Avanços de estágio" : "Stage advances",
      cur: tw.stage_advances,
      prev: pw.stage_advances,
      Icon: ArrowUpRight,
      accent: "cyan",
    },
    {
      key: "won",
      label: isPt ? "Ganhos" : "Wins",
      cur: tw.won,
      prev: pw.won,
      Icon: Trophy,
      accent: "lime",
    },
  ];
  return (
    <SectionCard
      title={isPt ? "Esta semana" : "This week"}
      subtitle={
        isPt
          ? "Últimos 7 dias vs 7 anteriores."
          : "Last 7 days vs the 7 before."
      }
    >
      <ul className="space-y-2">
        {rows.map((r) => (
          <WeekRow key={r.key} row={r} />
        ))}
      </ul>
    </SectionCard>
  );
}

function WeekRow({ row }) {
  const diff = row.cur - row.prev;
  const tone = accentTones(row.accent);
  const DeltaIcon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const deltaTone =
    diff > 0 ? "text-emerald-300" : diff < 0 ? "text-red-300" : "text-white/40";
  return (
    <li className="flex items-center gap-3">
      <div className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${tone.chip}`}>
        <row.Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-white/50 truncate">{row.label}</p>
        <div className="flex items-baseline gap-2">
          <span className={`text-xl font-black tabular-nums ${tone.number}`}>
            {row.cur}
          </span>
          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${deltaTone}`}>
            <DeltaIcon className="w-3 h-3" />
            {diff > 0 ? "+" : ""}
            {diff}
          </span>
        </div>
      </div>
    </li>
  );
}

/* ─── section: leaderboard ────────────────────────────────────── */

function Leaderboard({ data, lang }) {
  const isPt = lang === "pt";
  const rows = data.owner_leaderboard.slice(0, 6);
  const maxSends = Math.max(1, ...rows.map((r) => r.sends_this_week));
  return (
    <SectionCard
      title={isPt ? "Ranking do time" : "Team leaderboard"}
      subtitle={
        isPt
          ? "Ordenado por conversões esta semana."
          : "Sorted by conversions this week."
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-white/40">
          {isPt
            ? "Ninguém trabalhou leads ainda."
            : "No one has worked leads yet."}
        </p>
      ) : (
        <ol className="space-y-2.5">
          {rows.map((r, i) => (
            <li key={r.id} className="flex items-center gap-3">
              <span
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black tabular-nums ${
                  i === 0
                    ? "bg-emerald-400/20 text-emerald-200 ring-1 ring-emerald-400/40"
                    : "bg-white/[0.06] text-white/60"
                }`}
              >
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold truncate">
                    {r.full_name}
                  </span>
                  <span className="text-xs font-bold text-emerald-300 tabular-nums">
                    {r.conversions_this_week}{" "}
                    <span className="text-white/40 font-normal">
                      {isPt ? "ganhos" : "wins"}
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                    style={{
                      width: `${(r.sends_this_week / maxSends) * 100}%`,
                    }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-white/40 tabular-nums">
                  {r.sends_this_week}{" "}
                  {isPt ? "envios" : "sends"} · {r.replies_this_week}{" "}
                  {isPt ? "respostas" : "replies"} · {r.leads_worked}{" "}
                  {isPt ? "leads" : "leads"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

/* ─── section: source ROI ─────────────────────────────────────── */

function SourceRoi({ data, lang }) {
  const isPt = lang === "pt";
  const rows = data.by_source.slice(0, 8);
  const maxLeads = Math.max(1, ...rows.map((r) => r.leads_in));
  return (
    <SectionCard
      title={isPt ? "Retorno por origem" : "Source ROI"}
      subtitle={
        isPt
          ? "Leads captados × conversões. Aponta quais canais funcionam."
          : "Leads captured × conversions. Shows which channels actually convert."
      }
    >
      {rows.length === 0 ? (
        <p className="text-sm text-white/40">
          {isPt ? "Sem dados ainda." : "No data yet."}
        </p>
      ) : (
        <ul className="space-y-2.5">
          {rows.map((r) => (
            <li key={r.source}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <Link
                  href={`/admin/leads?source=${r.source}`}
                  className="font-semibold text-white/85 hover:text-white truncate"
                >
                  {t(`sources.${r.source}`, lang)}
                </Link>
                <span className="tabular-nums text-white/60">
                  {r.conversions}/{r.leads_in}
                  <span
                    className={`ml-2 font-bold ${
                      r.rate >= 0.15
                        ? "text-emerald-300"
                        : r.rate >= 0.05
                          ? "text-amber-300"
                          : "text-white/50"
                    }`}
                  >
                    {formatPct(r.rate)}
                  </span>
                </span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/[0.05] overflow-hidden relative">
                <div
                  className="absolute inset-y-0 left-0 bg-white/15"
                  style={{ width: `${(r.leads_in / maxLeads) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 to-lime-300"
                  style={{
                    width: `${(r.conversions / maxLeads) * 100}%`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

/* ─── section: attention needed ───────────────────────────────── */

function AttentionCallouts({ data, lang }) {
  const isPt = lang === "pt";
  const a = data.aging;
  const items = [
    {
      key: "untouched",
      label: isPt ? "Novos sem toque" : "Untouched new",
      count: a.untouched_new,
      href: "/admin/leads?stage=new",
      Icon: Radio,
      tone:
        a.untouched_new > 0
          ? "border-amber-400/40 bg-amber-500/[0.06] text-amber-200"
          : "border-white/10 bg-white/[0.02] text-white/50",
    },
    {
      key: "stuck",
      label: isPt ? "Parados após contato" : "Stuck after contact",
      count: a.stuck_contacted,
      href: "/admin/leads?stage=contacted",
      Icon: Clock,
      tone:
        a.stuck_contacted > 0
          ? "border-red-400/40 bg-red-500/[0.06] text-red-200"
          : "border-white/10 bg-white/[0.02] text-white/50",
    },
    {
      key: "overdue",
      label: isPt ? "Ações atrasadas" : "Overdue actions",
      count: a.overdue_next_action,
      href: "/admin/leads?next_action=overdue",
      Icon: AlertTriangle,
      tone:
        a.overdue_next_action > 0
          ? "border-red-400/40 bg-red-500/[0.06] text-red-200"
          : "border-white/10 bg-white/[0.02] text-white/50",
    },
  ];
  return (
    <SectionCard
      title={isPt ? "Requer atenção" : "Needs attention"}
      subtitle={
        isPt
          ? "Clique num card pra abrir a fila correspondente."
          : "Click a card to open the matching queue."
      }
    >
      <div className="space-y-2">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-colors hover:brightness-125 ${it.tone}`}
          >
            <div className="shrink-0 w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center">
              <it.Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider font-semibold opacity-80">
                {it.label}
              </p>
              <p className="text-2xl font-black tabular-nums">{it.count}</p>
            </div>
          </Link>
        ))}
      </div>
    </SectionCard>
  );
}

/* ─── section: trend charts ───────────────────────────────────── */

function TrendCharts({ data, lang }) {
  const isPt = lang === "pt";
  const daily = data.series.daily_new_30d;
  const weekly = data.series.weekly_won_12w;
  const dailyMax = Math.max(1, ...daily.map((d) => d.count));
  const weeklyMax = Math.max(1, ...weekly.map((w) => w.count));
  const dailyTotal = daily.reduce((s, d) => s + d.count, 0);
  const weeklyTotal = weekly.reduce((s, w) => s + w.count, 0);

  return (
    <SectionCard
      title={isPt ? "Tendências" : "Trends"}
      subtitle={
        isPt
          ? "Últimos 30 dias · Ganhos por semana (12 semanas)."
          : "Last 30 days · Wins per week (12 weeks)."
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Daily new — 30 tiny bars */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">
              {isPt ? "Novos leads / dia" : "New leads / day"}
            </p>
            <p className="text-xs tabular-nums text-white/60">
              <span className="text-emerald-300 font-bold">{dailyTotal}</span>{" "}
              {isPt ? "no total" : "total"}
            </p>
          </div>
          <div className="h-24 flex items-end gap-[3px]">
            {daily.map((d) => {
              const h = (d.count / dailyMax) * 100;
              return (
                <div
                  key={d.date}
                  title={`${d.date} · ${d.count}`}
                  className="flex-1 rounded-t bg-gradient-to-t from-emerald-500/60 to-emerald-300 hover:from-emerald-400 hover:to-lime-200 transition-colors relative group"
                  style={{ height: `${Math.max(2, h)}%` }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {d.count}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-white/35 tabular-nums">
            <span>-30d</span>
            <span>{isPt ? "hoje" : "today"}</span>
          </div>
        </div>

        {/* Weekly won — 12 chunky bars */}
        <div>
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wider text-white/50 font-semibold">
              {isPt ? "Ganhos / semana" : "Wins / week"}
            </p>
            <p className="text-xs tabular-nums text-white/60">
              <span className="text-lime-300 font-bold">{weeklyTotal}</span>{" "}
              {isPt ? "no total" : "total"}
            </p>
          </div>
          <div className="h-24 flex items-end gap-1.5">
            {weekly.map((w) => {
              const h = (w.count / weeklyMax) * 100;
              return (
                <div
                  key={w.week}
                  title={`${w.week} · ${w.count}`}
                  className="flex-1 rounded-t bg-gradient-to-t from-amber-500/40 to-lime-300 hover:brightness-125 transition-all relative group"
                  style={{ height: `${Math.max(2, h)}%` }}
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {w.count}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-1 flex justify-between text-[9px] text-white/35 tabular-nums">
            <span>-12w</span>
            <span>{isPt ? "esta" : "this"}</span>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

/* ─── shared ──────────────────────────────────────────────────── */

function SectionCard({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5 h-full">
      <div className="mb-3">
        <h2 className="text-sm font-black tracking-tight text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[11px] text-white/45 mt-0.5">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Return colour tones per accent name. Kept as a helper so we don't
 * scatter Tailwind literals across the dashboard.
 */
function accentTones(accent) {
  switch (accent) {
    case "cyan":
      return {
        card: "border-cyan-400/30 bg-cyan-500/[0.04]",
        number: "text-cyan-100",
        chip: "bg-cyan-500/15 text-cyan-300",
        glow: "shadow-[inset_0_0_60px_-15px_rgba(34,211,238,0.35)]",
      };
    case "amber":
      return {
        card: "border-amber-400/30 bg-amber-500/[0.04]",
        number: "text-amber-100",
        chip: "bg-amber-500/15 text-amber-300",
        glow: "shadow-[inset_0_0_60px_-15px_rgba(251,191,36,0.35)]",
      };
    case "lime":
      return {
        card: "border-lime-300/30 bg-lime-400/[0.04]",
        number: "text-lime-100",
        chip: "bg-lime-500/15 text-lime-300",
        glow: "shadow-[inset_0_0_60px_-15px_rgba(190,242,100,0.35)]",
      };
    case "emerald":
    default:
      return {
        card: "border-emerald-400/30 bg-emerald-500/[0.04]",
        number: "text-emerald-100",
        chip: "bg-emerald-500/15 text-emerald-300",
        glow: "shadow-[inset_0_0_60px_-15px_rgba(52,211,153,0.35)]",
      };
  }
}

/**
 * Ease-out count-up hook. Runs an ~800ms animation from 0 → target
 * whenever the target changes. Returns the currently-interpolated
 * integer so callers can drop it straight into the DOM.
 */
function useCountUp(target) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof target !== "number" || !Number.isFinite(target)) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const from = 0;
    const to = target;
    const duration = 800;
    let raf;
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic for a satisfying counter deceleration.
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [target]);
  return value;
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US");
  return String(n);
}

function formatPct(x) {
  if (!Number.isFinite(x)) return "0%";
  return `${(x * 100).toFixed(1)}%`;
}

function formatBrl(cents) {
  const value = (cents || 0) / 100;
  if (value >= 100_000) {
    return `R$ ${(value / 1000).toFixed(0)}k`;
  }
  return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
}

/**
 * When the animated number hasn't yet reached the target, interpolate
 * a display string by scaling the target's numeric portion. Works for
 * "R$ 12k" or "12.5%" — anything with digits.
 */
function formatInterpolated(finalStr, animated, target) {
  if (target === 0) return finalStr;
  const ratio = animated / target;
  const scaled = String(finalStr).replace(/[\d.]+/, (match) => {
    const n = Number(match);
    if (!Number.isFinite(n)) return match;
    const v = n * ratio;
    return match.includes(".") ? v.toFixed(1) : String(Math.round(v));
  });
  return scaled;
}

// src/app/(site)/admin/coach-dashboard/page.js
//
// Coach / agent / academy-owner view of a player roster.
// Minimalistic first pass — sleek dark grid, colour-coded activity
// status, big-number aggregate strip up top. Space intentionally left
// for deeper drill-ins (per-player timeline, cohort trends, at-risk
// callouts) once the layout gets validated with real users.
//
// Access: platform_admin for now (server-gated by assertAdmin on the
// underlying API). When a proper 'coach' user_type lands, the same
// page renders — it just becomes accessible to that role too.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  Users2,
  Flame,
  TrendingUp,
  Timer,
  AlertTriangle,
  Sparkles,
  Search,
  ChevronLeft,
  Trophy,
  RefreshCcw,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function CoachDashboardPage() {
  return (
    <ProtectedRoute>
      <CoachDashboardContent />
    </ProtectedRoute>
  );
}

function CoachDashboardContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [academyId, setAcademyId] = useState("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (academyId) params.set("academy_id", academyId);
      const res = await fetch(
        `/api/admin/coach/roster?${params.toString()}`,
      );
      const json = await res.json();
      if (!res.ok) setError(json.error || "load_failed");
      else setData(json);
    } catch {
      setError("network");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academyId]);

  const filteredSorted = useMemo(() => {
    if (!data) return [];
    let rows = [...data.players];
    if (statusFilter !== "all") {
      rows = rows.filter((r) => r.status === statusFilter);
    }
    if (q.trim()) {
      const term = q.trim().toLowerCase();
      rows = rows.filter((r) =>
        (r.full_name || "").toLowerCase().includes(term),
      );
    }
    rows.sort((a, b) => {
      switch (sortBy) {
        case "streak":
          return b.mental_streak - a.mental_streak;
        case "xp":
          return b.total_xp - a.total_xp;
        case "name":
          return (a.full_name || "").localeCompare(b.full_name || "");
        case "recent":
        default: {
          // Nulls to the bottom, then newest activity first.
          if (!a.last_activity_at && !b.last_activity_at) return 0;
          if (!a.last_activity_at) return 1;
          if (!b.last_activity_at) return -1;
          return b.last_activity_at.localeCompare(a.last_activity_at);
        }
      }
    });
    return rows;
  }, [data, statusFilter, q, sortBy]);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-white/60 hover:text-white mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to admin
        </Link>

        <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-1">
              FieldTalk · Coach view
            </p>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Player roster
            </h1>
            <p className="text-sm text-white/55 mt-1 max-w-xl">
              Track lesson progression and mental training engagement across
              your academy or coaching group.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {data?.academies?.length > 0 && (
              <select
                value={academyId}
                onChange={(e) => setAcademyId(e.target.value)}
                className="bg-white/[0.05] border border-white/10 text-white text-xs rounded-full px-3 py-1.5 focus:outline-none focus:border-emerald-400/40"
              >
                <option value="" className="bg-[#0e0e0e]">
                  All academies
                </option>
                {data.academies.map((a) => (
                  <option key={a.id} value={a.id} className="bg-[#0e0e0e]">
                    {a.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => load(false)}
              disabled={refreshing}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white text-xs disabled:opacity-50"
            >
              <RefreshCcw
                className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-white/60 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            Could not load roster.
          </div>
        ) : (
          <>
            <AggregateStrip aggregate={data.aggregate} />

            {/* Filter + search + sort row */}
            <div className="mt-6 mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search player…"
                    className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/50 focus:outline-none"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-white/[0.05] border border-white/10 text-white text-xs rounded-full px-3 py-2 focus:outline-none"
                >
                  <option value="recent" className="bg-[#0e0e0e]">
                    Most recent activity
                  </option>
                  <option value="streak" className="bg-[#0e0e0e]">
                    Longest streak
                  </option>
                  <option value="xp" className="bg-[#0e0e0e]">
                    Most XP
                  </option>
                  <option value="name" className="bg-[#0e0e0e]">
                    Name (A-Z)
                  </option>
                </select>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <StatusChip
                  value="all"
                  current={statusFilter}
                  onChange={setStatusFilter}
                  label="All"
                  count={data.players.length}
                />
                <StatusChip
                  value="active"
                  current={statusFilter}
                  onChange={setStatusFilter}
                  label="Active"
                  count={countByStatus(data.players, "active")}
                  tone="emerald"
                />
                <StatusChip
                  value="dormant"
                  current={statusFilter}
                  onChange={setStatusFilter}
                  label="Dormant"
                  count={countByStatus(data.players, "dormant")}
                  tone="amber"
                />
                <StatusChip
                  value="at_risk"
                  current={statusFilter}
                  onChange={setStatusFilter}
                  label="At risk"
                  count={countByStatus(data.players, "at_risk")}
                  tone="red"
                />
                <StatusChip
                  value="never"
                  current={statusFilter}
                  onChange={setStatusFilter}
                  label="Never active"
                  count={countByStatus(data.players, "never")}
                  tone="neutral"
                />
              </div>
            </div>

            {filteredSorted.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
                <p className="text-sm text-white/50">
                  No players match those filters.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSorted.map((p) => (
                  <PlayerCard key={p.id} player={p} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ─── aggregate strip ─────────────────────────────────────────── */

function AggregateStrip({ aggregate }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <BigStat
        Icon={Users2}
        label="Players"
        value={aggregate.total_players}
        accent="emerald"
      />
      <BigStat
        Icon={Sparkles}
        label="Active this week"
        value={aggregate.active_this_week}
        accent="lime"
      />
      <BigStat
        Icon={TrendingUp}
        label="XP earned · 7d"
        value={aggregate.xp_this_week}
        accent="cyan"
      />
      <BigStat
        Icon={Timer}
        label="Mental min · 7d"
        value={aggregate.mental_minutes_this_week}
        accent="violet"
      />
      <BigStat
        Icon={AlertTriangle}
        label="At risk"
        value={aggregate.at_risk}
        accent={aggregate.at_risk > 0 ? "red" : "neutral"}
      />
    </div>
  );
}

function BigStat({ Icon, label, value, accent }) {
  const toneClass = {
    emerald: "border-emerald-400/30 bg-emerald-500/[0.05] text-emerald-200",
    lime: "border-lime-300/30 bg-lime-400/[0.05] text-lime-100",
    cyan: "border-cyan-400/30 bg-cyan-500/[0.05] text-cyan-200",
    violet: "border-violet-400/30 bg-violet-500/[0.05] text-violet-200",
    red: "border-red-400/40 bg-red-500/[0.08] text-red-200",
    neutral: "border-white/10 bg-white/[0.03] text-white/70",
  }[accent];
  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <p className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">
          {label}
        </p>
      </div>
      <p className="text-2xl sm:text-3xl font-black tabular-nums tracking-tight">
        {formatNumber(value)}
      </p>
    </div>
  );
}

/* ─── filter chips ────────────────────────────────────────────── */

function StatusChip({ value, current, onChange, label, count, tone }) {
  const active = current === value;
  const toneClass = {
    emerald: active
      ? "bg-emerald-400 text-black"
      : "bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/15",
    amber: active
      ? "bg-amber-400 text-black"
      : "bg-amber-500/10 text-amber-200 hover:bg-amber-500/15",
    red: active
      ? "bg-red-400 text-black"
      : "bg-red-500/10 text-red-200 hover:bg-red-500/15",
    neutral: active
      ? "bg-white/25 text-white"
      : "bg-white/[0.04] text-white/60 hover:bg-white/[0.08]",
  }[tone || "neutral"];
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-colors ${toneClass}`}
    >
      <span>{label}</span>
      <span className="tabular-nums opacity-75">{count}</span>
    </button>
  );
}

/* ─── player card ─────────────────────────────────────────────── */

function PlayerCard({ player }) {
  const statusTone = STATUS_STYLES[player.status] || STATUS_STYLES.never;
  const initial = (player.full_name || "?").charAt(0).toUpperCase();
  const daysSince = player.days_since_last;

  return (
    <article
      className={`relative rounded-2xl border ${statusTone.card} p-4 overflow-hidden transition-colors hover:brightness-110`}
    >
      {/* Corner status dot — pulses on 'active' so a coach's eye
          catches the players currently on a roll. */}
      <span
        className={`absolute top-3 right-3 w-2 h-2 rounded-full ${statusTone.dot} ${
          player.status === "active" ? "animate-status-pulse" : ""
        }`}
        aria-hidden="true"
      />

      <div className="flex items-center gap-3 mb-3">
        {player.avatar_url ? (
          <Image
            src={player.avatar_url}
            alt={player.full_name || ""}
            width={40}
            height={40}
            unoptimized
            className="w-10 h-10 rounded-full object-cover ring-2 ring-white/15"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center text-white font-black">
            {initial}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white text-sm truncate">
            {player.full_name || "—"}
          </h3>
          <p className="text-[10px] uppercase tracking-wider text-white/45">
            {player.edition || "—"}
          </p>
        </div>
      </div>

      {/* Three-metric row: lessons / streak / XP. Reads at a glance. */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <Metric
          Icon={Trophy}
          value={player.lessons_completed}
          sub={player.lessons_last_week > 0
            ? `+${player.lessons_last_week} · 7d`
            : "lessons"}
          tone="cyan"
        />
        <Metric
          Icon={Flame}
          value={player.mental_streak}
          sub={player.mental_streak > 0 ? "day streak" : "no streak"}
          tone="amber"
        />
        <Metric
          Icon={Sparkles}
          value={player.total_xp}
          sub="XP total"
          tone="emerald"
        />
      </div>

      {/* Bottom row — mental minutes + last-activity chip */}
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-white/50">
          <span className="tabular-nums text-white/80 font-semibold">
            {player.mental_minutes_all_time}
          </span>{" "}
          min meditated
        </span>
        <span className={`inline-flex items-center gap-1 font-semibold ${statusTone.chip}`}>
          {formatLastActivity(daysSince)}
        </span>
      </div>

      <style jsx>{`
        @keyframes status-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(52, 211, 153, 0.55); }
          70% { box-shadow: 0 0 0 8px rgba(52, 211, 153, 0); }
        }
        :global(.animate-status-pulse) {
          animation: status-pulse 2s ease-out infinite;
        }
      `}</style>
    </article>
  );
}

function Metric({ Icon, value, sub, tone }) {
  const toneClass = {
    cyan: "text-cyan-200",
    amber: "text-amber-200",
    emerald: "text-emerald-200",
  }[tone];
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-white/45 font-semibold mb-0.5">
        <Icon className={`w-3 h-3 ${toneClass}`} />
      </div>
      <p className={`text-lg font-black tabular-nums leading-none ${toneClass}`}>
        {formatNumber(value)}
      </p>
      <p className="text-[10px] text-white/45 mt-0.5">{sub}</p>
    </div>
  );
}

const STATUS_STYLES = {
  active: {
    card: "border-emerald-400/30 bg-emerald-500/[0.03]",
    dot: "bg-emerald-400",
    chip: "text-emerald-300",
  },
  dormant: {
    card: "border-amber-400/25 bg-amber-500/[0.03]",
    dot: "bg-amber-400",
    chip: "text-amber-300",
  },
  at_risk: {
    card: "border-red-400/30 bg-red-500/[0.04]",
    dot: "bg-red-400",
    chip: "text-red-300",
  },
  never: {
    card: "border-white/10 bg-white/[0.02]",
    dot: "bg-white/25",
    chip: "text-white/40",
  },
};

/* ─── helpers ─────────────────────────────────────────────────── */

function countByStatus(rows, status) {
  return rows.filter((r) => r.status === status).length;
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US");
  return String(n);
}

function formatLastActivity(days) {
  if (days == null) return "Never active";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

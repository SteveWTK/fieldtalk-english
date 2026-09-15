// src/app/(site)/coach/page.js
//
// The coach-facing roster page. Same visual language as the admin
// mirror at /admin/coach-dashboard, but hits /api/coach/roster
// (scoped by user_type) and drops the admin-shaped chrome:
//
//   - Header eyebrow reads "Coach dashboard" instead of "Squad
//     platform · admin"
//   - Player cards link out to /coach/player/[id] (v3 shell), not
//     the admin view
//   - No "Back to admin" link — coaches don't have an admin surface
//     to go back to
//
// Access: `coach` OR `platform_admin` (server-gated by assertCoach
// on the API route + ProtectedRoute on the client).
//
// v2.5 follow-ups queued (see coach roadmap in memory):
//   - Multi-academy support via player_coach_links table
//   - Academy switcher for coaches representing multiple clubs
//   - Coach signup / invite flow

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Users2,
  Flame,
  TrendingUp,
  Timer,
  AlertTriangle,
  Sparkles,
  Search,
  Trophy,
  RefreshCcw,
  ArrowRight,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Avatar from "@/components/ui/avatar";
import Eyebrow from "@/components/ui/eyebrow";
import StatTile from "@/components/ui/stat-tile";
import MetricBar from "@/components/ui/metric-bar";
import Chip from "@/components/ui/chip";

export default function CoachPage() {
  return (
    <ProtectedRoute allowedRoles={["coach", "platform_admin"]}>
      <CoachContent />
    </ProtectedRoute>
  );
}

function CoachContent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [statusFilter, setStatusFilter] = useState("all");

  async function load(showSpinner = false) {
    if (showSpinner) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const res = await fetch("/api/coach/roster");
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
  }, []);

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
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <header className="mb-6 flex items-end justify-between flex-wrap gap-3">
          <div>
            <Eyebrow className="mb-1">Global Player · Coach dashboard</Eyebrow>
            <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-primary-50">
              Your roster
            </h1>
            <p className="text-sm text-primary-400 mt-2 max-w-xl leading-relaxed">
              Every player you coach, in one view. Track lesson progression
              and mental training engagement — see who&apos;s on a roll and who
              needs a nudge.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary-panel hover:bg-primary-800 text-primary-200 hover:text-primary-50 border border-primary-700 text-xs disabled:opacity-50 transition-colors"
          >
            <RefreshCcw
              className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-primary-400 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-card border border-signal-alert/40 bg-signal-alert/10 p-4 text-sm text-signal-alert">
            Could not load your roster.
          </div>
        ) : data.coach?.needs_academy_link ? (
          // Onboarding gap — coach exists but isn't linked to an
          // academy. This will get a proper invite/link UI in v2.5;
          // for now a plain message with a contact prompt.
          <div className="rounded-card border border-primary-700 bg-primary-panel p-8 text-center">
            <Users2 className="w-10 h-10 text-primary-500 mx-auto mb-3" />
            <p className="text-primary-100 font-semibold">
              Your account isn&apos;t linked to an academy yet.
            </p>
            <p className="text-sm text-primary-400 mt-1 max-w-md mx-auto">
              Once Global Player links your coach account to an academy,
              your players will appear here.
            </p>
          </div>
        ) : (
          <>
            <AggregateStrip aggregate={data.aggregate} />

            {data.aggregate.total_players > 0 && (
              <div className="mt-4">
                <MetricBar
                  label="Weekly roster engagement"
                  value={
                    (data.aggregate.active_this_week /
                      data.aggregate.total_players) *
                    100
                  }
                  signal="accent"
                />
              </div>
            )}

            <div className="mt-6 mb-4 rounded-card border border-primary-700 bg-primary-panel p-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 pointer-events-none" />
                  <input
                    type="text"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search player…"
                    className="w-full pl-9 pr-3 py-2 rounded-control bg-primary-900 border border-primary-600 text-sm text-primary-50 placeholder:text-primary-500 focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/30 transition-colors"
                  />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="bg-primary-900 border border-primary-600 text-primary-100 text-xs rounded-full px-3 py-2 focus:border-accent-400 focus:outline-none transition-colors"
                >
                  <option value="recent" className="bg-primary-800 text-primary-50">
                    Most recent activity
                  </option>
                  <option value="streak" className="bg-primary-800 text-primary-50">
                    Longest streak
                  </option>
                  <option value="xp" className="bg-primary-800 text-primary-50">
                    Most XP
                  </option>
                  <option value="name" className="bg-primary-800 text-primary-50">
                    Name (A-Z)
                  </option>
                </select>
              </div>
              <StatusChipRow
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                players={data.players}
              />
            </div>

            {filteredSorted.length === 0 ? (
              <div className="rounded-card border border-primary-700 bg-primary-panel p-8 text-center">
                <p className="text-sm text-primary-400">
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
      <StatTile
        label={<StatIcon Icon={Users2}>Players</StatIcon>}
        value={formatNumber(aggregate.total_players)}
      />
      <StatTile
        label={<StatIcon Icon={Sparkles}>Active this week</StatIcon>}
        value={formatNumber(aggregate.active_this_week)}
        tone="accent"
      />
      <StatTile
        label={<StatIcon Icon={TrendingUp}>XP earned · 7d</StatIcon>}
        value={formatNumber(aggregate.xp_this_week)}
      />
      <StatTile
        label={<StatIcon Icon={Timer}>Mental min · 7d</StatIcon>}
        value={formatNumber(aggregate.mental_minutes_this_week)}
      />
      <StatTile
        label={<StatIcon Icon={AlertTriangle}>At risk</StatIcon>}
        value={formatNumber(aggregate.at_risk)}
      />
    </div>
  );
}

function StatIcon({ Icon, children }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="w-3.5 h-3.5" />
      <span>{children}</span>
    </span>
  );
}

/* ─── filter chips ────────────────────────────────────────────── */

function StatusChipRow({ statusFilter, setStatusFilter, players }) {
  const items = [
    { value: "all", label: "All", count: players.length, signal: undefined },
    {
      value: "active",
      label: "Active",
      count: countByStatus(players, "active"),
      signal: undefined,
    },
    {
      value: "dormant",
      label: "Dormant",
      count: countByStatus(players, "dormant"),
      signal: "performance",
    },
    {
      value: "at_risk",
      label: "At risk",
      count: countByStatus(players, "at_risk"),
      signal: "alert",
    },
    {
      value: "never",
      label: "Never active",
      count: countByStatus(players, "never"),
      signal: undefined,
    },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <Chip
          key={it.value}
          as="button"
          size="sm"
          selected={statusFilter === it.value}
          signal={it.signal}
          onClick={() => setStatusFilter(it.value)}
        >
          <span>{it.label}</span>
          <span className="tabular-nums opacity-75">{it.count}</span>
        </Chip>
      ))}
    </div>
  );
}

/* ─── player card ─────────────────────────────────────────────── */

function PlayerCard({ player }) {
  const statusTone = STATUS_STYLES[player.status] || STATUS_STYLES.never;
  const daysSince = player.days_since_last;

  // Coach player cards link to the drill-in shell. Wrapping the
  // whole card in a Link makes the entire tile clickable, which reads
  // "explore this player" more clearly than a small chevron button.
  return (
    <Link
      href={`/coach/player/${player.id}`}
      className={`group relative rounded-card border ${statusTone.card} p-4 overflow-hidden transition-colors hover:brightness-110 block`}
    >
      <span
        className={`absolute top-3 right-3 w-2 h-2 rounded-full ${statusTone.dot} ${
          player.status === "active" ? "animate-status-pulse" : ""
        }`}
        aria-hidden="true"
      />

      <div className="flex items-center gap-3 mb-3">
        <Avatar
          src={player.avatar_url || undefined}
          name={player.full_name || ""}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-primary-50 text-sm truncate group-hover:text-accent-400 transition-colors">
            {player.full_name || "—"}
          </h3>
          <p className="text-[10px] uppercase tracking-label text-primary-400">
            {player.edition || "—"}
          </p>
        </div>
        <ArrowRight className="w-4 h-4 text-primary-500 group-hover:text-accent-400 transition-colors" />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <Metric
          Icon={Trophy}
          value={player.lessons_completed}
          sub={player.lessons_last_week > 0
            ? `+${player.lessons_last_week} · 7d`
            : "lessons"}
          signal="english"
        />
        <Metric
          Icon={Flame}
          value={player.mental_streak}
          sub={player.mental_streak > 0 ? "day streak" : "no streak"}
          signal="performance"
        />
        <Metric
          Icon={Sparkles}
          value={player.total_xp}
          sub="XP total"
          signal="accent"
        />
      </div>

      <div className="flex items-center justify-between text-[11px]">
        <span className="text-primary-400">
          <span className="tabular-nums text-primary-100 font-semibold">
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
          0%, 100% { box-shadow: 0 0 0 0 rgba(163, 230, 53, 0.55); }
          70% { box-shadow: 0 0 0 8px rgba(163, 230, 53, 0); }
        }
        :global(.animate-status-pulse) {
          animation: status-pulse 2s ease-out infinite;
        }
      `}</style>
    </Link>
  );
}

function Metric({ Icon, value, sub, signal }) {
  const toneClass = {
    english: "text-signal-english",
    performance: "text-signal-performance",
    mental: "text-signal-mental",
    alert: "text-signal-alert",
    accent: "text-accent-400",
  }[signal] || "text-primary-100";
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-label text-primary-400 font-semibold mb-0.5">
        <Icon className={`w-3 h-3 ${toneClass}`} />
      </div>
      <p className={`text-lg font-display font-black tabular-nums leading-none ${toneClass}`}>
        {formatNumber(value)}
      </p>
      <p className="text-[10px] text-primary-400 mt-0.5">{sub}</p>
    </div>
  );
}

const STATUS_STYLES = {
  active: {
    card: "border-accent-400/30 bg-accent-400/[0.04]",
    dot: "bg-accent-400",
    chip: "text-accent-400",
  },
  dormant: {
    card: "border-signal-performance/25 bg-signal-performance/[0.04]",
    dot: "bg-signal-performance",
    chip: "text-signal-performance",
  },
  at_risk: {
    card: "border-signal-alert/30 bg-signal-alert/[0.05]",
    dot: "bg-signal-alert",
    chip: "text-signal-alert",
  },
  never: {
    card: "border-primary-700 bg-primary-panel",
    dot: "bg-primary-500",
    chip: "text-primary-500",
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

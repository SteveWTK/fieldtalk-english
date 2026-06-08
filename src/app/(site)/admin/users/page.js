// src/app/(site)/admin/users/page.js
//
// Admin tool — "User Tracking" page. Live aggregations over the
// players + lesson_completions + player_xp_events + pack_openings
// tables, with three side-by-side stories on one screen:
//
//   1. KPI strip — at-a-glance pulse: active users, lessons done,
//      XP, packs, predictions.
//   2. Power Users table — who's most active, sorted by lessons
//      completed (so "content depletion" candidates float to top).
//      Click any row → slide-over with that user's detail.
//   3. Lesson Engagement table — per-lesson started / completed /
//      completion rate / avg time, sorted by completion rate
//      ascending so drop-off candidates lead.
//   4. Recent Activity — last 30 mixed events for situational
//      awareness (signups, completions, packs, redemptions).
//
// Filters at the top: edition, partner (auto-derived from seat
// redemptions), date range (default last 30 days).
//
// Auth: platform_admin only (client-guarded + server-enforced).
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Users2,
  Trophy,
  BookOpen,
  Layers,
  Target,
  TrendingUp,
  X,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import ProtectedRoute from "@/components/ProtectedRoute";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";

function defaultRange() {
  const now = new Date();
  const ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  return { since: toInputDate(ago), until: toInputDate(now) };
}

function toInputDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function timeAgo(iso) {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "—";
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

function formatNumber(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return n.toLocaleString();
}

function formatDuration(ms) {
  if (typeof ms !== "number" || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return rem === 0 ? `${m}m` : `${m}m ${rem}s`;
}

function UsersAdminContent() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, loading: profileLoading } = usePlayerProfile(user?.id);

  useEffect(() => {
    if (profileLoading || !profile) return;
    if (profile.user_type !== "platform_admin") {
      router.replace("/lesson");
    }
  }, [profile, profileLoading, router]);

  const [edition, setEdition] = useState("wc2026");
  const [partner, setPartner] = useState("all");
  const [range, setRange] = useState(defaultRange());

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [drillId, setDrillId] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sinceISO = new Date(range.since + "T00:00:00").toISOString();
      const untilISO = new Date(range.until + "T23:59:59").toISOString();
      const params = new URLSearchParams({
        edition,
        partner,
        since: sinceISO,
        until: untilISO,
      });
      const res = await fetch(`/api/admin/users/stats?${params.toString()}`);
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
  }, [edition, partner, range.since, range.until]);

  useEffect(() => {
    if (profileLoading || profile?.user_type !== "platform_admin") return;
    fetchStats();
  }, [profile, profileLoading, fetchStats]);

  const kpiCards = useMemo(() => {
    if (!data?.kpis) return [];
    const k = data.kpis;
    return [
      {
        label: "Active · 7d",
        value: formatNumber(k.activeUsers7d),
        Icon: Users2,
        tone: "emerald",
      },
      {
        label: "Active · 30d",
        value: formatNumber(k.activeUsers30d),
        Icon: Users2,
      },
      {
        label: "Lessons done",
        value: formatNumber(k.lessonsCompleted),
        Icon: BookOpen,
      },
      {
        label: "XP earned",
        value: formatNumber(k.totalXpEarned),
        Icon: TrendingUp,
      },
      {
        label: "Packs opened",
        value: formatNumber(k.packsOpened),
        Icon: Layers,
      },
      {
        label: "Predictions",
        value: formatNumber(k.predictionsSubmitted),
        Icon: Target,
      },
      {
        label: "Avg lessons / user",
        value:
          typeof k.avgLessonsPerActiveUser === "number"
            ? k.avgLessonsPerActiveUser.toFixed(1)
            : "—",
        Icon: Trophy,
      },
      // Full Access roll-up. Single tile shows the headline count;
      // the hover/title surfaces the breakdown so the admin can see
      // how many of those came from each path.
      {
        label: "Full Access",
        value: formatNumber(k.fullAccessTotal || 0),
        Icon: Trophy,
        tone: "emerald",
        title:
          k.fullAccessBySource &&
          `Stripe sub: ${k.fullAccessBySource.subscription || 0}  ·  ` +
            `One-off: ${k.fullAccessBySource.one_time_purchase || 0}  ·  ` +
            `Seat code: ${k.fullAccessBySource.seat_redemption || 0}  ·  ` +
            `Admin grant: ${k.fullAccessBySource.admin_grant || 0}`,
      },
    ];
  }, [data]);

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707] text-white">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
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
            User tracking
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
            Live engagement snapshot. The{" "}
            <span className="text-emerald-300 font-semibold">Power users</span>{" "}
            table surfaces who&apos;s burning through content the fastest; the{" "}
            <span className="text-emerald-300 font-semibold">
              Lesson engagement
            </span>{" "}
            table flags lessons where users drop off (sorted by completion rate
            ascending). Click a user row for a deeper drill-down.
          </p>
        </header>

        {/* Filters */}
        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">
              Edition
            </label>
            <select
              value={edition}
              onChange={(e) => setEdition(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-emerald-400 text-sm"
            >
              <option value="all">All editions</option>
              {(data?.filters?.availableEditions || []).map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/50 mb-1">
              Partner
            </label>
            <select
              value={partner}
              onChange={(e) => setPartner(e.target.value)}
              className="px-3 py-2 rounded-lg bg-white/5 border border-white/15 text-white focus:outline-none focus:border-emerald-400 text-sm max-w-[220px]"
            >
              <option value="all">All players</option>
              {(data?.filters?.availablePartners || []).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
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
        </div>

        {error && (
          <div className="p-3 rounded-lg bg-red-500/15 border border-red-500/40 text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {kpiCards.map((c, i) => (
            <KpiCard key={i} {...c} />
          ))}
        </div>

        {/* Power Users */}
        <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
          <header className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-base sm:text-lg">Power users</h2>
            <p className="text-[11px] text-white/40 hidden sm:block">
              Top 25 · sorted by lessons completed
            </p>
          </header>
          {loading && !data ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
          ) : (data?.powerUsers || []).length === 0 ? (
            <div className="py-10 text-center text-sm text-white/50">
              No users yet for the selected filters.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/50">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Player</th>
                  <th className="text-left px-3 py-3 font-semibold hidden md:table-cell">
                    Partner
                  </th>
                  <th className="text-right px-3 py-3 font-semibold">
                    Lessons
                  </th>
                  <th className="text-right px-3 py-3 font-semibold">XP</th>
                  <th className="text-right px-3 py-3 font-semibold hidden sm:table-cell">
                    Packs
                  </th>
                  <th className="text-right px-3 py-3 font-semibold hidden sm:table-cell">
                    Last seen
                  </th>
                  <th className="text-center px-3 py-3 font-semibold">
                    Access
                  </th>
                  <th className="w-6" />
                </tr>
              </thead>
              <tbody>
                {data.powerUsers.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setDrillId(u.id)}
                    className="border-t border-white/5 hover:bg-white/[0.03] cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white truncate max-w-[200px]">
                        {u.name}
                      </div>
                      <div className="text-[11px] text-white/40 truncate max-w-[200px]">
                        {u.email || u.edition}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-white/65 text-xs hidden md:table-cell">
                      {u.partner || "—"}
                    </td>
                    <td className="text-right px-3 py-3 font-bold text-emerald-300 tabular-nums">
                      {u.lessonsCompleted}
                    </td>
                    <td className="text-right px-3 py-3 text-white/80 tabular-nums">
                      {formatNumber(u.totalXp)}
                    </td>
                    <td className="text-right px-3 py-3 text-white/80 tabular-nums hidden sm:table-cell">
                      {u.packsOpened}
                    </td>
                    <td className="text-right px-3 py-3 text-white/55 text-xs hidden sm:table-cell">
                      {timeAgo(u.lastActiveAt)}
                    </td>
                    <td className="text-center px-3 py-3">
                      <AccessBadge
                        has={u.hasFullAccess}
                        source={u.accessSource}
                      />
                    </td>
                    <td className="px-2 text-white/40">
                      <ChevronRight className="w-4 h-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* Lesson Engagement */}
        <section className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
          <header className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-bold text-base sm:text-lg">
              Lesson engagement
            </h2>
            <p className="text-[11px] text-white/40 hidden sm:block">
              Sorted by completion rate ascending — drop-off first
            </p>
          </header>
          {loading && !data ? (
            <div className="py-10 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
            </div>
          ) : (data?.lessonEngagement || []).length === 0 ? (
            <div className="py-10 text-center text-sm text-white/50">
              No lesson activity yet for the selected filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-[10px] uppercase tracking-wider text-white/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">
                      Lesson
                    </th>
                    <th className="text-left px-3 py-3 font-semibold hidden md:table-cell">
                      Pillar
                    </th>
                    <th className="text-right px-3 py-3 font-semibold">
                      Started
                    </th>
                    <th className="text-right px-3 py-3 font-semibold">Done</th>
                    <th className="text-right px-3 py-3 font-semibold">Rate</th>
                    <th className="text-right px-3 py-3 font-semibold hidden sm:table-cell">
                      Avg time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.lessonEngagement.map((l) => {
                    const ratePct =
                      l.started > 0 ? Math.round(l.completionRate * 100) : null;
                    const rateColour =
                      ratePct === null
                        ? "text-white/30"
                        : ratePct < 40
                          ? "text-red-300"
                          : ratePct < 70
                            ? "text-amber-300"
                            : "text-emerald-300";
                    return (
                      <tr key={l.id} className="border-t border-white/5">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white truncate max-w-[260px]">
                            {l.title}
                          </div>
                          <div className="text-[11px] text-white/40 md:hidden">
                            {l.pillar}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-white/65 text-xs hidden md:table-cell">
                          {l.pillar}
                        </td>
                        <td className="text-right px-3 py-3 text-white/80 tabular-nums">
                          {l.started}
                        </td>
                        <td className="text-right px-3 py-3 text-white/80 tabular-nums">
                          {l.completed}
                        </td>
                        <td
                          className={`text-right px-3 py-3 font-bold tabular-nums ${rateColour}`}
                        >
                          {ratePct === null ? "—" : `${ratePct}%`}
                        </td>
                        <td className="text-right px-3 py-3 text-white/55 text-xs hidden sm:table-cell">
                          {formatDuration(l.avgTimeMs)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent Activity */}
        <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 sm:p-5">
          <header className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-base sm:text-lg">Recent activity</h2>
            <p className="text-[11px] text-white/40 hidden sm:block">
              Last {data?.recentActivity?.length || 0} events
            </p>
          </header>
          {(data?.recentActivity || []).length === 0 ? (
            <p className="text-sm text-white/50 py-4 text-center">
              No activity yet.
            </p>
          ) : (
            <ol className="space-y-2">
              {data.recentActivity.map((e, i) => (
                <li
                  key={`${e.type}-${e.at}-${i}`}
                  className="flex items-start gap-3 text-sm"
                >
                  <span
                    className={`shrink-0 mt-0.5 w-2 h-2 rounded-full ${activityDot(e.type)}`}
                  />
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => setDrillId(e.playerId)}
                      className="font-semibold text-white hover:text-emerald-300"
                    >
                      {e.playerName}
                    </button>{" "}
                    <span className="text-white/65">{e.label}</span>
                  </div>
                  <span className="text-[11px] text-white/40 whitespace-nowrap">
                    {timeAgo(e.at)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </main>

      {/* Slide-over drill-down */}
      {drillId && (
        <UserDrillOver userId={drillId} onClose={() => setDrillId(null)} />
      )}
    </div>
  );
}

function KpiCard({ label, value, Icon, tone = "neutral", title }) {
  const accent = tone === "emerald" ? "text-emerald-300" : "text-white";
  return (
    <div
      className="rounded-2xl bg-white/[0.04] border border-white/10 p-3 sm:p-4"
      title={title}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[9px] uppercase tracking-wider text-white/50">
          {label}
        </p>
        <Icon className="w-3.5 h-3.5 text-white/30" />
      </div>
      <p className={`text-xl sm:text-2xl font-black tabular-nums ${accent}`}>
        {value}
      </p>
    </div>
  );
}

// One-line badge for the power-users table. Short label + colour by
// source so the admin can tell paying users from seat-code users at
// a glance.
function AccessBadge({ has, source }) {
  if (!has) {
    return <span className="text-white/30 text-[11px]">—</span>;
  }
  const map = {
    subscription: { label: "Sub", cls: "bg-emerald-500/15 text-emerald-200" },
    one_time_purchase: {
      label: "One-off",
      cls: "bg-emerald-500/15 text-emerald-200",
    },
    seat_redemption: {
      label: "Seat",
      cls: "bg-blue-500/15 text-blue-200",
    },
    admin_grant: {
      label: "Comp",
      cls: "bg-amber-300/15 text-amber-200",
    },
  };
  const meta = map[source] || {
    label: "Full",
    cls: "bg-white/10 text-white/70",
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${meta.cls}`}
      title={source || "full_access"}
    >
      {meta.label}
    </span>
  );
}

function accessSourceLabel(source) {
  switch (source) {
    case "subscription":
      return "Stripe subscription";
    case "one_time_purchase":
      return "Stripe one-off";
    case "seat_redemption":
      return "Seat code";
    case "admin_grant":
      return "Admin grant";
    default:
      return source || "—";
  }
}

function activityDot(type) {
  switch (type) {
    case "lesson_completion":
      return "bg-emerald-400";
    case "pack_open":
      return "bg-amber-300";
    case "seat_redemption":
      return "bg-blue-300";
    case "signup":
      return "bg-violet-300";
    default:
      return "bg-white/40";
  }
}

/**
 * Slide-over right-side panel showing one user's detail. Fetched on
 * mount so each open is a single round-trip.
 */
function UserDrillOver({ userId, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/admin/users/${userId}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Could not load user");
          return;
        }
        setData(json);
      } catch (err) {
        if (!cancelled) setError(err?.message || "Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Lock scrolling on the underlying page while the panel is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <aside
        className="relative w-full max-w-md sm:max-w-lg h-full bg-[#0b0b0b] border-l border-white/10 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {loading ? (
          <div className="min-h-screen flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
          </div>
        ) : error ? (
          <div className="p-6">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        ) : data ? (
          <UserDrillBody data={data} />
        ) : null}
      </aside>
    </div>
  );
}

function UserDrillBody({ data }) {
  const p = data.player;
  const pr = data.progress || {};
  return (
    <div className="p-6 space-y-6 text-white">
      <header className="pr-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70 font-semibold mb-1">
          Player detail
        </p>
        <h2 className="text-2xl font-black tracking-tight">{p.name}</h2>
        <p className="text-sm text-white/55 mt-1">{p.email || "no email"}</p>
        <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
          <span className="px-2 py-0.5 rounded-full bg-white/10 text-white/70">
            {p.edition || "no edition"}
          </span>
          {p.user_type && p.user_type !== "player" && (
            <span className="px-2 py-0.5 rounded-full bg-amber-300/20 text-amber-200">
              {p.user_type}
            </span>
          )}
          <span className="text-white/40">
            joined{" "}
            {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
          </span>
        </div>
      </header>

      {data.partner && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 p-3 text-sm">
          <p className="text-[10px] uppercase tracking-wider text-emerald-200/70 font-bold mb-1">
            Partner
          </p>
          <p className="font-semibold">{data.partner.name}</p>
          <p className="text-xs text-white/50">
            Redeemed{" "}
            {data.partner.redeemedAt
              ? new Date(data.partner.redeemedAt).toLocaleDateString()
              : "—"}
            {" · "}edition {data.partner.edition || "—"}
          </p>
        </div>
      )}

      {data.access && (
        <div
          className={`rounded-xl p-3 text-sm border ${
            data.access.hasFullAccess
              ? "bg-emerald-500/10 border-emerald-400/30"
              : "bg-white/[0.03] border-white/10"
          }`}
        >
          <p className="text-[10px] uppercase tracking-wider text-emerald-200/70 font-bold mb-1">
            Full Access
          </p>
          {data.access.hasFullAccess ? (
            <>
              <p className="font-semibold flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                  Active
                </span>
                <span className="text-white/75">
                  via {accessSourceLabel(data.access.source)}
                </span>
              </p>
              {data.access.until && (
                <p className="text-xs text-white/50 mt-1">
                  Until{" "}
                  {new Date(data.access.until).toLocaleDateString()}
                </p>
              )}
            </>
          ) : (
            <p className="text-white/55">No active access.</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <DetailStat label="Total XP" value={formatNumber(pr.total_xp || 0)} />
        <DetailStat label="Lessons done" value={data.lessonsCompleted.length} />
        <DetailStat label="Squad value" value={data.squadValue} />
        <DetailStat
          label="Album"
          value={`${data.albumCounts.owned}/${data.albumCounts.total}`}
        />
        <DetailStat label="Packs opened" value={data.packsOpenedTotal} />
        <DetailStat label="Predictions" value={data.predictionsSubmitted} />
      </div>

      <section>
        <h3 className="font-bold text-sm uppercase tracking-wider text-white/60 mb-2">
          Lessons completed
        </h3>
        {data.lessonsCompleted.length === 0 ? (
          <p className="text-sm text-white/45">None yet.</p>
        ) : (
          <ol className="space-y-2">
            {data.lessonsCompleted.slice(0, 15).map((l) => (
              <li
                key={l.id}
                className="rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold truncate">{l.title}</p>
                  <span className="text-[11px] text-emerald-300 tabular-nums shrink-0">
                    +{l.xp_earned || 0} XP
                  </span>
                </div>
                <p className="text-[11px] text-white/45 mt-0.5">
                  {l.pillar} · {timeAgo(l.completed_at)}
                  {l.time_spent ? ` · ${formatDuration(l.time_spent)}` : ""}
                </p>
              </li>
            ))}
            {data.lessonsCompleted.length > 15 && (
              <p className="text-[11px] text-white/40 text-center">
                + {data.lessonsCompleted.length - 15} more
              </p>
            )}
          </ol>
        )}
      </section>

      <section>
        <h3 className="font-bold text-sm uppercase tracking-wider text-white/60 mb-2">
          Recent XP events
        </h3>
        {data.recentXp.length === 0 ? (
          <p className="text-sm text-white/45">None.</p>
        ) : (
          <ol className="space-y-1.5">
            {data.recentXp.map((e) => (
              <li
                key={e.id}
                className="text-xs flex items-center justify-between gap-2"
              >
                <span className="text-white/80 truncate">
                  <span className="font-mono uppercase text-white/55">
                    {e.source}
                  </span>{" "}
                  +{e.amount} XP
                </span>
                <span className="text-white/40 whitespace-nowrap">
                  {timeAgo(e.earned_at)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function DetailStat({ label, value }) {
  return (
    <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/50">
        {label}
      </p>
      <p className="text-lg font-black tabular-nums">{value}</p>
    </div>
  );
}

export default function UsersAdminPage() {
  return (
    <ProtectedRoute>
      <UsersAdminContent />
    </ProtectedRoute>
  );
}

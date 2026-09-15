// src/app/(site)/coach/player/[id]/page.js
//
// Per-player drill-in (v3 shell). This is the "click a card, see
// the player up close" surface — a natural next step from the
// coach roster.
//
// v3 shell scope (what's here NOW):
//   - Player identity: avatar, name, edition, status pill, last seen
//   - Vital-signs row: lessons, streak, XP, mental minutes (StatTile ×4)
//   - Weekly engagement bar: this-week metrics as MetricBars (one
//     per module: lessons via English signal, mental via Mental signal)
//   - Recent events strip: last few activities (from API `recent_events`)
//   - Back link to /coach
//
// v3 follow-ups queued (see coach roadmap in memory):
//   - Full 12-week bar chart (lessons + mental minutes)
//   - Skill radar snapshot via useSkillRadar
//   - Coach WhatsApp send bar (Z-API integration)
//   - Coach-private notes (new coach_player_notes table)
//
// Access: `coach` OR `platform_admin` (server-gated on the API +
// ProtectedRoute on the client).

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  ChevronLeft,
  Trophy,
  Flame,
  Sparkles,
  Timer,
  Brain,
  BookOpen,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Avatar from "@/components/ui/avatar";
import Eyebrow from "@/components/ui/eyebrow";
import StatTile from "@/components/ui/stat-tile";
import MetricBar from "@/components/ui/metric-bar";
import Panel from "@/components/ui/panel";

export default function CoachPlayerPage() {
  return (
    <ProtectedRoute allowedRoles={["coach", "platform_admin"]}>
      <CoachPlayerContent />
    </ProtectedRoute>
  );
}

function CoachPlayerContent() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/coach/player/${id}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(json.error || "load_failed");
        else setData(json);
      } catch {
        if (!cancelled) setError("network");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/coach"
          className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-100 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to roster
        </Link>

        {loading ? (
          <div className="flex items-center gap-2 text-primary-400 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading player…
          </div>
        ) : error ? (
          <div className="rounded-card border border-signal-alert/40 bg-signal-alert/10 p-4 text-sm text-signal-alert">
            {error === "not_found"
              ? "This player isn't in your roster."
              : "Could not load the player."}
          </div>
        ) : (
          <>
            <PlayerHeader player={data.player} />
            <VitalSigns player={data.player} />
            <WeeklyEngagement player={data.player} />
            <RecentEvents events={data.recent_events} />
          </>
        )}
      </main>
    </div>
  );
}

/* ─── header ───────────────────────────────────────────────────── */

function PlayerHeader({ player }) {
  const statusTone = STATUS_TONE[player.status] || STATUS_TONE.never;
  return (
    <header className="mb-6 flex items-center gap-4 flex-wrap">
      <Avatar
        src={player.avatar_url || undefined}
        name={player.full_name || ""}
        size="lg"
      />
      <div className="min-w-0 flex-1">
        <Eyebrow className="mb-1">Global Player · Player detail</Eyebrow>
        <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-primary-50 truncate">
          {player.full_name || "—"}
        </h1>
        <div className="mt-2 flex items-center gap-2 text-xs text-primary-400">
          {player.edition && (
            <span className="uppercase tracking-label">{player.edition}</span>
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusTone.badge}`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${statusTone.dot}`}
              aria-hidden="true"
            />
            {formatLastActivity(player.days_since_last)}
          </span>
        </div>
      </div>
    </header>
  );
}

const STATUS_TONE = {
  active: {
    badge: "bg-accent-400/15 text-accent-400 border border-accent-400/30",
    dot: "bg-accent-400",
  },
  dormant: {
    badge: "bg-signal-performance/15 text-signal-performance border border-signal-performance/30",
    dot: "bg-signal-performance",
  },
  at_risk: {
    badge: "bg-signal-alert/15 text-signal-alert border border-signal-alert/30",
    dot: "bg-signal-alert",
  },
  never: {
    badge: "bg-primary-800 text-primary-400 border border-primary-700",
    dot: "bg-primary-500",
  },
};

/* ─── vital signs ─────────────────────────────────────────────── */

function VitalSigns({ player }) {
  // 4-up KPI strip mirroring the roster's aggregate strip, but per-
  // player. XP total carries tone="accent" as the composite hero
  // metric — an evaluator's fastest read.
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <StatTile
        label={<StatIcon Icon={Trophy}>Lessons</StatIcon>}
        value={formatNumber(player.lessons_completed)}
        caption={
          player.lessons_last_week > 0
            ? `+${player.lessons_last_week} in the last 7 days`
            : "Nothing in the last 7 days"
        }
      />
      <StatTile
        label={<StatIcon Icon={Flame}>Streak</StatIcon>}
        value={formatNumber(player.mental_streak)}
        caption={player.mental_streak > 0 ? "day streak" : "no active streak"}
      />
      <StatTile
        label={<StatIcon Icon={Sparkles}>XP total</StatIcon>}
        value={formatNumber(player.total_xp)}
        tone="accent"
        caption={
          player.xp_earned_last_week > 0
            ? `+${formatNumber(player.xp_earned_last_week)} in the last 7 days`
            : "No XP in the last 7 days"
        }
      />
      <StatTile
        label={<StatIcon Icon={Timer}>Mental min</StatIcon>}
        value={formatNumber(player.mental_minutes_all_time)}
        caption={
          player.mental_minutes_last_week > 0
            ? `+${player.mental_minutes_last_week} min · 7d`
            : "0 min in the last 7 days"
        }
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

/* ─── weekly engagement bars ──────────────────────────────────── */

// A rough weekly cadence heuristic. A "healthy" week is 5 lessons
// and 5 mental sessions (≈ daily practice). The MetricBar renders
// last-week counts as a percentage of that target so a coach can
// tell "on cadence" vs "coasting" vs "slipping" at a glance.
//
// Once v3 lands proper coach-set targets (see roadmap v8: mental
// training minutes goal per player), swap the constants for a
// per-player target read from the DB.
const WEEKLY_LESSON_TARGET = 5;
const WEEKLY_MENTAL_MIN_TARGET = 25; // 5 sessions × 5 min average

function WeeklyEngagement({ player }) {
  return (
    <Panel
      title="This week"
      eyebrow="Weekly engagement"
      className="mb-4"
    >
      <div className="space-y-3">
        <MetricBar
          label={
            <span className="inline-flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5" />
              Lessons
            </span>
          }
          value={(player.lessons_last_week / WEEKLY_LESSON_TARGET) * 100}
          signal="english"
        />
        <MetricBar
          label={
            <span className="inline-flex items-center gap-1.5">
              <Brain className="w-3.5 h-3.5" />
              Mental minutes
            </span>
          }
          value={(player.mental_minutes_last_week / WEEKLY_MENTAL_MIN_TARGET) * 100}
          signal="mental"
        />
      </div>
      <p className="text-[11px] text-primary-500 mt-3 leading-relaxed">
        Targets used here are provisional — {WEEKLY_LESSON_TARGET} lessons
        and {WEEKLY_MENTAL_MIN_TARGET} mental minutes a week. Coach-set
        per-player targets land with the v8 roadmap.
      </p>
    </Panel>
  );
}

/* ─── recent events strip ─────────────────────────────────────── */

function RecentEvents({ events }) {
  if (!events || events.length === 0) {
    return (
      <Panel title="Recent activity" eyebrow="Timeline">
        <p className="text-sm text-primary-400">
          Nothing in the last 90 days.
        </p>
      </Panel>
    );
  }
  return (
    <Panel
      title="Recent activity"
      eyebrow="Timeline"
      meta={`${events.length} events · last 90 days`}
    >
      <ul className="divide-y divide-primary-700 -mx-1">
        {events.map((e, i) => (
          <li
            key={`${e.kind}-${e.at}-${i}`}
            className="flex items-center gap-3 px-1 py-2 text-sm"
          >
            <EventIcon kind={e.kind} />
            <span className="flex-1 min-w-0">
              <span className="text-primary-100 font-medium">
                {eventLabel(e)}
              </span>
              {eventMeta(e) && (
                <span className="ml-2 text-xs text-primary-400">
                  · {eventMeta(e)}
                </span>
              )}
            </span>
            <span className="text-xs text-primary-500 tabular-nums shrink-0">
              {formatEventTime(e.at)}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-primary-500 mt-3 leading-relaxed">
        A 12-week bar chart and full timeline land with the v3 drill-in.
        This strip is a placeholder that gives the coach a sense of cadence
        without waiting on the charting work.
      </p>
    </Panel>
  );
}

function EventIcon({ kind }) {
  if (kind === "lesson") {
    return (
      <span className="w-6 h-6 shrink-0 rounded-full inline-flex items-center justify-center bg-signal-english/15 text-signal-english">
        <BookOpen className="w-3.5 h-3.5" />
      </span>
    );
  }
  return (
    <span className="w-6 h-6 shrink-0 rounded-full inline-flex items-center justify-center bg-signal-mental/15 text-signal-mental">
      <Brain className="w-3.5 h-3.5" />
    </span>
  );
}

function eventLabel(e) {
  if (e.kind === "lesson") return "Lesson completed";
  const activityLabel =
    ACTIVITY_TYPE_LABELS[e.meta?.activity_type] || "Mental session";
  return activityLabel;
}

function eventMeta(e) {
  if (e.kind === "lesson") {
    return e.meta?.xp_earned ? `+${e.meta.xp_earned} XP` : null;
  }
  const secs = e.meta?.duration_seconds || 0;
  if (secs <= 0) return null;
  const mins = Math.max(1, Math.round(secs / 60));
  return `${mins} min`;
}

const ACTIVITY_TYPE_LABELS = {
  breathing: "Breathing exercise",
  meditation: "Meditation",
  visualization: "Visualization",
  match_prep: "Match prep ritual",
  scenario: "Scenario training",
};

/* ─── helpers ─────────────────────────────────────────────────── */

function formatNumber(n) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1000) return n.toLocaleString("en-US");
  return String(n);
}

function formatLastActivity(days) {
  if (days == null) return "Never active";
  if (days === 0) return "Active today";
  if (days === 1) return "Active yesterday";
  if (days < 7) return `Active ${days}d ago`;
  if (days < 30) return `Active ${Math.floor(days / 7)}w ago`;
  return `Active ${Math.floor(days / 30)}mo ago`;
}

function formatEventTime(iso) {
  if (!iso) return "—";
  const now = Date.now();
  const t = new Date(iso).getTime();
  const diffSec = Math.floor((now - t) / 1000);
  if (diffSec < 60) return "just now";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
}

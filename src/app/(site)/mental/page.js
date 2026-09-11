// src/app/(site)/mental/page.js
//
// The Mental Training hub — player-facing entry point to meditations,
// scenarios, match prep, voices of champions, and the silent timer.
//
// Above the fold:
//   - Stats strip (streak / minutes / total)
//   - Mood picker (7 gradient cards)
//   - Silent-meditation feature card
//
// Below:
//   - Featured row (if any activities are marked featured)
//   - Full library grid with type filter chips
//
// A slow-drifting radial gradient sits behind everything — the
// "rippling water" ambient the plan called for. Deliberately kept
// subtle so activity cards stay readable.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Flame,
  Clock,
  Timer,
  Play,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import MentalActivityPlayer from "@/components/mental/MentalActivityPlayer";
import GrowingTree from "@/components/mental/GrowingTree";
import {
  t,
  pickLang,
  MOODS,
  ACTIVITY_TYPES,
  ACTIVITY_TONES,
} from "@/lib/mental/constants";

const TYPE_FILTERS = [
  "all",
  "meditation",
  "silent_timer",
  "champion_scenario",
  "match_prep",
  "voice_of_champion",
];

export default function MentalHubPage() {
  return (
    <ProtectedRoute>
      <MentalHubContent />
    </ProtectedRoute>
  );
}

function MentalHubContent() {
  const { lang } = useLanguage();
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mood, setMood] = useState(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [activePlayer, setActivePlayer] = useState(null);

  async function loadAll() {
    setLoading(true);
    try {
      const [actRes, statsRes] = await Promise.all([
        fetch("/api/mental/activities"),
        fetch("/api/mental/progress"),
      ]);
      const actJson = await actRes.json();
      const statsJson = await statsRes.json();
      if (actRes.ok) setActivities(actJson.activities || []);
      if (statsRes.ok) setStats(statsJson);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Filter activities by mood + type. All-mood + all-type = show
  // everything.
  const filtered = useMemo(() => {
    return activities.filter((a) => {
      if (typeFilter !== "all" && a.activity_type !== typeFilter) return false;
      if (mood && !(a.moods || []).includes(mood)) return false;
      return true;
    });
  }, [activities, mood, typeFilter]);

  const featured = useMemo(
    () => activities.filter((a) => a.featured),
    [activities],
  );

  // The dedicated silent_timer activity, if the admin has created one.
  // We surface it in a hero-style card because "bring your own
  // practice" deserves top billing.
  const silentActivity = useMemo(
    () => activities.find((a) => a.activity_type === "silent_timer"),
    [activities],
  );

  function openPlayer(activity) {
    setActivePlayer(activity);
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden">
      {/* Rippling water ambient — pure CSS. Two very slow-moving
          radial gradients layered so a subtle horizon is always
          moving, but never in a way that competes with the cards. */}
      <RippleBackdrop />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.35em] text-teal-300/80 font-semibold mb-2">
            FieldTalk
          </p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">
            {t("hub.title", lang)}
          </h1>
          <p className="text-sm text-white/60 mt-2 max-w-xl leading-relaxed">
            {t("hub.subtitle", lang)}
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-white/50 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            {lang === "pt" ? "Carregando…" : "Loading…"}
          </div>
        ) : (
          <>
            <StatsStrip stats={stats} lang={lang} />

            {/* Growing tree — sits between stats and mood picker as
                a "your progress lives here" anchor. Renders a compact
                inviting sapling even on day 1. */}
            <div className="mb-8">
              <GrowingTree
                completionsByDay={stats?.completions_by_day || []}
              />
            </div>

            <MoodPicker
              lang={lang}
              current={mood}
              onChange={setMood}
            />

            {silentActivity && (
              <SilentHeroCard
                activity={silentActivity}
                lang={lang}
                onOpen={() => openPlayer(silentActivity)}
              />
            )}

            {featured.length > 0 && (
              <section className="mt-8">
                <h2 className="text-sm font-black tracking-tight text-white mb-3">
                  {t("hub.featured", lang)}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {featured.map((a) => (
                    <ActivityCard
                      key={a.id}
                      activity={a}
                      lang={lang}
                      onOpen={() => openPlayer(a)}
                    />
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black tracking-tight text-white">
                  {t("hub.library", lang)}
                </h2>
                <TypeFilters
                  current={typeFilter}
                  onChange={setTypeFilter}
                  lang={lang}
                />
              </div>
              {filtered.length === 0 ? (
                <p className="text-sm text-white/40 py-6 text-center">
                  {t("hub.empty", lang)}
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filtered.map((a) => (
                    <ActivityCard
                      key={a.id}
                      activity={a}
                      lang={lang}
                      onOpen={() => openPlayer(a)}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {activePlayer && (
        <MentalActivityPlayer
          activity={activePlayer}
          onClose={() => {
            setActivePlayer(null);
            loadAll();
          }}
        />
      )}
    </div>
  );
}

/* ─── Rippling backdrop ───────────────────────────────────────── */

/**
 * Ambient water-ripple backdrop. Two layers stacked:
 *   - Slow drifting radial washes (the water surface tint)
 *   - Concentric expanding rings from 3 origin points (the ripples)
 *
 * Rings each cycle 9s, staggered by animation-delay so at any given
 * moment ~2-3 rings from each origin are visible at different sizes,
 * building a continuous "raindrops on water" texture.
 *
 * Deliberately positioned OUTSIDE the max-w container (uses viewport
 * units) so ripples originate off-screen for cinematic scale — you
 * see them enter the frame rather than pop into existence.
 */
function RippleBackdrop() {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Water surface — bold-enough radial washes so the effect
          reads on the darkest devices. Blur is intentional but
          smaller than the previous 80px so colour actually surfaces. */}
      <div className="wash wash-a" />
      <div className="wash wash-b" />
      <div className="wash wash-c" />

      {/* Ripple sources — 3 origins each spawning expanding rings.
          Colours are teal-family so the whole hub feels cool + calm. */}
      <div className="ripple-source src-a">
        <span className="ripple-ring" style={{ animationDelay: "0s" }} />
        <span className="ripple-ring" style={{ animationDelay: "-3s" }} />
        <span className="ripple-ring" style={{ animationDelay: "-6s" }} />
      </div>
      <div className="ripple-source src-b">
        <span className="ripple-ring" style={{ animationDelay: "-1.5s" }} />
        <span className="ripple-ring" style={{ animationDelay: "-4.5s" }} />
        <span className="ripple-ring" style={{ animationDelay: "-7.5s" }} />
      </div>
      <div className="ripple-source src-c">
        <span className="ripple-ring" style={{ animationDelay: "-2.2s" }} />
        <span className="ripple-ring" style={{ animationDelay: "-5.2s" }} />
        <span className="ripple-ring" style={{ animationDelay: "-8.2s" }} />
      </div>

      <style jsx>{`
        .wash {
          position: absolute;
          border-radius: 9999px;
          filter: blur(60px);
          opacity: 0.75;
        }
        .wash-a {
          top: -15%;
          left: -10%;
          width: 70vw;
          height: 70vw;
          background: radial-gradient(
            circle,
            rgba(20, 184, 166, 0.55),
            rgba(20, 184, 166, 0) 65%
          );
          animation: drift-a 40s ease-in-out infinite alternate;
        }
        .wash-b {
          bottom: -20%;
          right: -15%;
          width: 65vw;
          height: 65vw;
          background: radial-gradient(
            circle,
            rgba(76, 29, 149, 0.45),
            rgba(76, 29, 149, 0) 65%
          );
          animation: drift-b 55s ease-in-out infinite alternate;
        }
        .wash-c {
          top: 25%;
          right: 20%;
          width: 45vw;
          height: 45vw;
          background: radial-gradient(
            circle,
            rgba(59, 130, 246, 0.35),
            rgba(59, 130, 246, 0) 65%
          );
          animation: drift-c 70s ease-in-out infinite alternate;
        }
        @keyframes drift-a {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(6vw, 4vh) scale(1.08); }
        }
        @keyframes drift-b {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-5vw, -3vh) scale(1.05); }
        }
        @keyframes drift-c {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(-3vw, 4vh) scale(1.1); }
        }

        /* Ripple source — an origin point that emits expanding rings.
           Positioned via top/left; the child rings scale up + fade. */
        .ripple-source {
          position: absolute;
          width: 0;
          height: 0;
        }
        .src-a { top: 22%; left: 15%; }
        .src-b { top: 65%; left: 78%; }
        .src-c { top: 45%; left: 50%; }

        .ripple-ring {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 1px;
          height: 1px;
          border-radius: 9999px;
          border: 2px solid rgba(103, 232, 249, 0.55);
          box-shadow:
            0 0 40px rgba(103, 232, 249, 0.25),
            inset 0 0 20px rgba(103, 232, 249, 0.15);
          transform: translate(-50%, -50%) scale(0);
          opacity: 0;
          animation: ripple-expand 9s ease-out infinite;
        }
        @keyframes ripple-expand {
          0% {
            transform: translate(-50%, -50%) scale(0.4);
            opacity: 0;
            border-width: 3px;
          }
          10% {
            opacity: 0.8;
          }
          60% {
            opacity: 0.35;
            border-width: 2px;
          }
          100% {
            transform: translate(-50%, -50%) scale(80);
            opacity: 0;
            border-width: 0.5px;
          }
        }
      `}</style>
    </div>
  );
}

/* ─── Stats strip ─────────────────────────────────────────────── */

function StatsStrip({ stats, lang }) {
  const streak = stats?.streak ?? 0;
  const minutesWeek = stats?.minutes_this_week ?? 0;
  const minutesAll = stats?.minutes_all_time ?? 0;
  const completed = stats?.completed_all_time ?? 0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      <StatCard
        Icon={Flame}
        tone="amber"
        label={t("hub.stats.streak", lang)}
        value={streak}
        suffix={t("hub.stats.streakDays", lang)}
      />
      <StatCard
        Icon={Clock}
        tone="teal"
        label={t("hub.stats.minutesThisWeek", lang)}
        value={minutesWeek}
      />
      <StatCard
        Icon={Timer}
        tone="violet"
        label={t("hub.stats.minutesAllTime", lang)}
        value={minutesAll}
      />
      <StatCard
        Icon={Sparkles}
        tone="emerald"
        label={t("hub.stats.completedAllTime", lang)}
        value={completed}
      />
    </div>
  );
}

function StatCard({ Icon, tone, label, value, suffix }) {
  const toneClass = {
    amber: "border-amber-400/30 bg-amber-500/[0.05] text-amber-200",
    teal: "border-teal-400/30 bg-teal-500/[0.05] text-teal-200",
    violet: "border-violet-400/30 bg-violet-500/[0.05] text-violet-200",
    emerald: "border-emerald-400/30 bg-emerald-500/[0.05] text-emerald-200",
  }[tone];
  return (
    <div className={`rounded-2xl border p-3 ${toneClass}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-3.5 h-3.5" />
        <p className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">
          {label}
        </p>
      </div>
      <p className="text-2xl font-black tracking-tight tabular-nums">
        {value}
        {suffix && (
          <span className="text-xs font-normal opacity-70 ml-1">{suffix}</span>
        )}
      </p>
    </div>
  );
}

/* ─── Mood picker ─────────────────────────────────────────────── */

function MoodPicker({ lang, current, onChange }) {
  return (
    <section className="mb-8">
      <p className="text-[10px] uppercase tracking-[0.3em] text-white/40 font-semibold mb-2">
        {t("hub.moodPickerTitle", lang)}
      </p>
      <p className="text-xs text-white/50 mb-3">
        {t("hub.moodPickerHint", lang)}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
        {MOODS.map((m) => {
          const active = current === m.key;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => onChange(active ? null : m.key)}
              className={`group relative rounded-2xl border p-3 text-left transition-all ${moodToneClass(m.tone, active)}`}
            >
              <div className="text-xl mb-1">{m.emoji}</div>
              <p className={`text-xs font-semibold leading-tight ${active ? "text-white" : "text-white/85"}`}>
                {lang === "pt" ? m.pt : m.en}
              </p>
              {active && (
                <div className="absolute top-1 right-1 text-white">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function moodToneClass(tone, active) {
  const base =
    "hover:brightness-125 hover:-translate-y-0.5 transition-transform";
  switch (tone) {
    case "sky":
      return `${active ? "border-sky-400/60 bg-sky-500/15" : "border-sky-400/20 bg-sky-500/[0.04]"} ${base}`;
    case "indigo":
      return `${active ? "border-indigo-400/60 bg-indigo-500/15" : "border-indigo-400/20 bg-indigo-500/[0.04]"} ${base}`;
    case "amber":
      return `${active ? "border-amber-400/60 bg-amber-500/15" : "border-amber-400/20 bg-amber-500/[0.04]"} ${base}`;
    case "emerald":
      return `${active ? "border-emerald-400/60 bg-emerald-500/15" : "border-emerald-400/20 bg-emerald-500/[0.04]"} ${base}`;
    case "violet":
      return `${active ? "border-violet-400/60 bg-violet-500/15" : "border-violet-400/20 bg-violet-500/[0.04]"} ${base}`;
    case "teal":
      return `${active ? "border-teal-400/60 bg-teal-500/15" : "border-teal-400/20 bg-teal-500/[0.04]"} ${base}`;
    default:
      return `${active ? "border-white/40 bg-white/10" : "border-white/10 bg-white/[0.03]"} ${base}`;
  }
}

/* ─── Silent-timer hero ───────────────────────────────────────── */

function SilentHeroCard({ activity, lang, onOpen }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left mb-6 rounded-3xl border border-white/15 bg-gradient-to-br from-slate-800/60 via-slate-900/40 to-black hover:from-slate-700/70 transition-colors p-5 sm:p-6 relative overflow-hidden group"
    >
      <div className="absolute inset-0 pointer-events-none opacity-70">
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/[0.04] blur-3xl animate-slow-pulse"
          aria-hidden="true"
        />
      </div>
      <div className="relative flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-white/45 font-semibold mb-1">
            {t("hub.silentTimerCard.title", lang)}
          </p>
          <h2 className="text-xl sm:text-2xl font-light tracking-tight text-white">
            {pickLang(activity.title, lang) || t("hub.silentTimerCard.title", lang)}
          </h2>
          <p className="text-sm text-white/60 mt-1">
            {pickLang(activity.subtitle, lang) ||
              t("hub.silentTimerCard.subtitle", lang)}
          </p>
        </div>
        <div className="shrink-0 w-14 h-14 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play className="w-6 h-6 text-white" />
        </div>
      </div>
      <style jsx>{`
        @keyframes slow-pulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        .animate-slow-pulse {
          animation: slow-pulse 6s ease-in-out infinite;
        }
      `}</style>
    </button>
  );
}

/* ─── Activity library ────────────────────────────────────────── */

function TypeFilters({ current, onChange, lang }) {
  return (
    <div className="inline-flex flex-wrap gap-1">
      {TYPE_FILTERS.map((tKey) => {
        const active = current === tKey;
        const label =
          tKey === "all"
            ? t("hub.filterAll", lang)
            : pickLang(ACTIVITY_TONES[tKey]?.label, lang);
        return (
          <button
            key={tKey}
            type="button"
            onClick={() => onChange(tKey)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
              active
                ? "bg-white text-black"
                : "bg-white/[0.05] text-white/60 hover:text-white hover:bg-white/[0.1]"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ActivityCard({ activity, lang, onOpen }) {
  const tone = ACTIVITY_TONES[activity.activity_type] || ACTIVITY_TONES.meditation;
  const completedToday =
    activity.completion?.day_key ===
    new Date().toISOString().slice(0, 10);
  const title = pickLang(activity.title, lang);
  const subtitle = pickLang(activity.subtitle, lang);
  const durationMin = activity.duration_seconds
    ? Math.round(activity.duration_seconds / 60)
    : null;
  const hasCover =
    typeof activity.cover_image_url === "string" &&
    activity.cover_image_url.trim().length > 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`text-left rounded-2xl border ${tone.border} bg-white/[0.02] hover:bg-white/[0.04] transition-colors group relative overflow-hidden`}
    >
      {/* Optional hero cover — rendered as a full-bleed image at the
          top of the card. Height fixed at 128px so text below stays
          on a consistent baseline across cards with / without covers.
          Gradient overlay keeps the type badge legible even when the
          image is bright. */}
      {hasCover && (
        <div className="relative h-32 overflow-hidden">
          {/* Plain <img> rather than next/image — cover URLs come from
              any host the admin pastes; next/image would require the
              domain to be in next.config's remotePatterns allowlist. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activity.cover_image_url}
            alt=""
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
          <span
            className={`absolute top-2 left-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.chip}`}
          >
            {pickLang(tone.label, lang)}
          </span>
          {completedToday && (
            <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-emerald-300 drop-shadow" />
          )}
        </div>
      )}

      <div className="p-4 relative">
        {/* Type-tone diagonal accent — subtle, on hover only. Only
            shown when there's no cover image (covers already provide
            visual interest). */}
        {!hasCover && (
          <div
            className={`absolute -top-16 -right-16 w-40 h-40 rounded-full opacity-0 group-hover:opacity-30 transition-opacity bg-gradient-to-br ${tone.gradient} blur-3xl`}
            aria-hidden="true"
          />
        )}
        <div className="relative">
          {!hasCover && (
            <div className="flex items-center justify-between mb-2">
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${tone.chip}`}
              >
                {pickLang(tone.label, lang)}
              </span>
              {completedToday && (
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
              )}
            </div>
          )}
          <h3 className="font-semibold text-white text-base leading-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-white/50 mt-1 line-clamp-2">{subtitle}</p>
          )}
          <div className="flex items-center justify-between mt-3 text-[11px] text-white/45">
            {durationMin && (
              <span className="tabular-nums">
                {durationMin} {lang === "pt" ? "min" : "min"}
              </span>
            )}
            <span className="inline-flex items-center gap-1 group-hover:text-white transition-colors">
              <Play className="w-3 h-3" />
              {lang === "pt" ? "Começar" : "Start"}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// Suppress unused-import lint — kept for future extension.
void ACTIVITY_TYPES;
void Link;

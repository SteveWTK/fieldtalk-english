// src/components/lesson/LevelBanner.js
//
// A slim, single-row progress rail for the /lesson page. Shows the
// player's current Level and where they sit in the 10-Level journey
// while taking up the minimum possible vertical space. Reads at a
// glance:
//
//    ●  LEVEL 3 of 10 · A2 · Global Standard    ▓▓▓░░░ 2/4    🏆
//
// Deliberately spare. The full description, prose framing, and
// celebration all live elsewhere (dashboard, level-earned modal).
// This rail is the constant "you are here" affordance during a
// lesson-picking session.
//
// The `signal_tone` field on the level (english/mental/performance/
// alert/accent) drives:
//   - the leading dot colour
//   - a subtle horizontal wash (gradient stays inside the rail — no
//     multi-stop brand mixing per DS, just a signal-tinted 20%→0%
//     fade)
//   - the progress bar fill
// All editable per-level so content teams can tweak identity
// without a code change.

"use client";

import * as LucideIcons from "lucide-react";
import { Award, Trophy } from "lucide-react";

// Which signal token drives progress-fill + dot + wash per tone.
// Falls through to "accent" (lime) for any tone the DS doesn't
// recognise.
const SIGNAL_ALIAS = {
  english: "english",
  mental: "mental",
  performance: "performance",
  alert: "alert",
  accent: "accent",
};

// Tailwind classes per tone. Kept tight — only what the slim rail
// actually needs, no separate ink/inkSoft split.
const TONE_STYLES = {
  english: {
    wash: "bg-gradient-to-r from-signal-english/[0.14] via-signal-english/[0.05] to-transparent",
    ring: "border-signal-english/25",
    dot: "bg-signal-english",
    fill: "bg-signal-english",
    ink: "text-signal-english",
  },
  mental: {
    wash: "bg-gradient-to-r from-signal-mental/[0.14] via-signal-mental/[0.05] to-transparent",
    ring: "border-signal-mental/25",
    dot: "bg-signal-mental",
    fill: "bg-signal-mental",
    ink: "text-signal-mental",
  },
  performance: {
    wash: "bg-gradient-to-r from-signal-performance/[0.14] via-signal-performance/[0.05] to-transparent",
    ring: "border-signal-performance/25",
    dot: "bg-signal-performance",
    fill: "bg-signal-performance",
    ink: "text-signal-performance",
  },
  alert: {
    wash: "bg-gradient-to-r from-signal-alert/[0.14] via-signal-alert/[0.05] to-transparent",
    ring: "border-signal-alert/25",
    dot: "bg-signal-alert",
    fill: "bg-signal-alert",
    ink: "text-signal-alert",
  },
  accent: {
    wash: "bg-gradient-to-r from-accent-400/[0.14] via-accent-400/[0.05] to-transparent",
    ring: "border-accent-400/30",
    dot: "bg-accent-400",
    fill: "bg-accent-400",
    ink: "text-accent-400",
  },
};

function pickLevelName(level, lang) {
  if (!level) return "";
  if (lang === "pt") return level.display_name_pt || level.display_name_en || level.name;
  return level.display_name_en || level.display_name_pt || level.name;
}

function resolveIcon(name) {
  if (!name || typeof name !== "string") return Trophy;
  const Icon = LucideIcons[name];
  return Icon || Trophy;
}

/**
 * @param {{
 *   level: object,
 *   unitsComplete?: number,
 *   unitsTotal?: number,
 *   earnedCertificate?: object | null,
 *   levelIndex?: number | null,
 *   totalLevels?: number | null,
 *   lang?: 'pt' | 'en',
 * }} props
 */
export default function LevelBanner({
  level,
  unitsComplete = 0,
  unitsTotal = 0,
  earnedCertificate = null,
  levelIndex = null,
  totalLevels = null,
  lang = "pt",
}) {
  if (!level) return null;
  const tone = TONE_STYLES[SIGNAL_ALIAS[level.signal_tone] || "accent"] || TONE_STYLES.accent;
  const Icon = resolveIcon(level.icon_name);
  const pct = unitsTotal > 0
    ? Math.max(0, Math.min(100, (unitsComplete / unitsTotal) * 100))
    : 0;
  const isEarned = !!earnedCertificate;
  const name = pickLevelName(level, lang);

  return (
    <section
      className={[
        "relative overflow-hidden rounded-full border",
        tone.ring,
        "bg-primary-panel",
        "pl-3 pr-2 py-1.5",
      ].join(" ")}
      aria-label={`${name} level`}
    >
      {/* Signal-tinted wash — sits under the row content. */}
      <div
        className={`absolute inset-0 pointer-events-none ${tone.wash}`}
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-2.5">
        {/* Signal dot — the tiny colour anchor that identifies which
            tone this Level carries at a glance. */}
        <span
          className={`shrink-0 w-1.5 h-1.5 rounded-full ${tone.dot}`}
          aria-hidden="true"
        />

        {/* Compact icon — sits at 14px so the rail stays slim. */}
        <Icon
          className={`shrink-0 w-3.5 h-3.5 ${tone.ink}`}
          strokeWidth={2}
          aria-hidden="true"
        />

        {/* Level label — position eyebrow + CEFR + name on one line.
            Truncates on narrow screens so the rail height stays
            constant. */}
        <div className="min-w-0 flex-1 flex items-baseline gap-2 flex-wrap sm:flex-nowrap">
          <span className={`text-[10px] uppercase tracking-label font-bold ${tone.ink} whitespace-nowrap`}>
            {lang === "pt" ? "Nível" : "Level"}
            {typeof levelIndex === "number" && ` ${levelIndex}`}
            {typeof totalLevels === "number" && ` ${lang === "pt" ? "de" : "of"} ${totalLevels}`}
            {level.cefr_target && ` · ${level.cefr_target}`}
          </span>
          <span className="text-sm font-display font-bold text-primary-50 truncate">
            {name}
          </span>
        </div>

        {/* Inline progress — thin bar + fraction. Bar is fixed
            width on tablet+ so it stays consistent regardless of
            the level name length; on mobile the label truncates
            first and the bar keeps its size. */}
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="w-24 h-1 rounded-full bg-primary-800 overflow-hidden">
            <div
              className={`h-full ${tone.fill} transition-all duration-ui ease-brand`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] font-semibold tabular-nums text-primary-300 whitespace-nowrap">
            {unitsComplete}/{unitsTotal}
          </span>
        </div>

        {/* Certificate marker — small pill; solid + accent when
            earned, hollow signal-tinted when still pending. */}
        <span
          className={[
            "shrink-0 inline-flex items-center justify-center",
            "w-6 h-6 rounded-full border",
            isEarned
              ? "bg-accent-400 text-primary-900 border-transparent"
              : `bg-primary-800 ${tone.ring} ${tone.ink}`,
          ].join(" ")}
          title={
            isEarned
              ? lang === "pt" ? "Certificado conquistado" : "Certificate earned"
              : lang === "pt" ? "Certificado do nível" : "Level certificate"
          }
        >
          <Award className="w-3 h-3" strokeWidth={2.25} />
        </span>
      </div>

      {/* Mobile progress row — sits below the label on narrow
          screens where the desktop-inline progress hides. Keeps the
          rail short (~48px total height) while staying informative. */}
      <div className="relative sm:hidden mt-1.5 flex items-center gap-2">
        <div className="flex-1 h-1 rounded-full bg-primary-800 overflow-hidden">
          <div
            className={`h-full ${tone.fill} transition-all duration-ui ease-brand`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[10px] font-semibold tabular-nums text-primary-300 whitespace-nowrap">
          {unitsComplete}/{unitsTotal}
        </span>
      </div>
    </section>
  );
}

// src/components/lesson/LevelBanner.js
//
// Full-width slim banner for the /lesson page. Shows the player's
// current Level with a subtle signal-tinted wash + progress. Only
// ONE banner is visible at a time — the level the player is
// currently working through.
//
// Props:
//   level             — the level row (from /api/levels)
//   unitsComplete     — number of pillars in this level that hit 100%
//   unitsTotal        — number of pillars assigned to this level
//   earnedCertificate — the player_level_completions row for this
//                       level, if any (indicates a full completion)
//   lang              — 'pt' | 'en' — picks display_name field
//
// The `signal_tone` field on the level (english/mental/performance/
// alert/accent) drives:
//   - the subtle full-bleed gradient wash behind the banner
//   - the icon tint
//   - the small "Level N of M" eyebrow accent
//   - the MetricBar fill colour
// Editable per-level via the admin surface so content teams can
// tweak identity per level without a code change.

"use client";

import { Award, Trophy, Sparkles } from "lucide-react";
import * as LucideIcons from "lucide-react";
import MetricBar from "@/components/ui/metric-bar";

/**
 * Maps the level's `signal_tone` value (a string) to the DS token
 * name used by MetricBar + the tint classes below. Falls back to
 * "accent" (lime) if the level's tone isn't a recognised signal.
 */
const SIGNAL_ALIAS = {
  english: "english",
  mental: "mental",
  performance: "performance",
  alert: "alert",
  accent: "accent",
};

// Wash + text tint classes per signal. Deliberately subtle — the
// banner accents identity without overwhelming the units below.
// If more signals ever land (or the palette expands), add rows
// here; unrecognised tones fall through to the accent-lime block.
const TONE_STYLES = {
  english: {
    wash: "bg-gradient-to-r from-signal-english/[0.12] via-signal-english/[0.06] to-transparent",
    ring: "border-signal-english/25",
    ink: "text-signal-english",
    inkSoft: "text-signal-english/80",
  },
  mental: {
    wash: "bg-gradient-to-r from-signal-mental/[0.14] via-signal-mental/[0.07] to-transparent",
    ring: "border-signal-mental/25",
    ink: "text-signal-mental",
    inkSoft: "text-signal-mental/80",
  },
  performance: {
    wash: "bg-gradient-to-r from-signal-performance/[0.14] via-signal-performance/[0.07] to-transparent",
    ring: "border-signal-performance/25",
    ink: "text-signal-performance",
    inkSoft: "text-signal-performance/80",
  },
  alert: {
    wash: "bg-gradient-to-r from-signal-alert/[0.14] via-signal-alert/[0.07] to-transparent",
    ring: "border-signal-alert/25",
    ink: "text-signal-alert",
    inkSoft: "text-signal-alert/80",
  },
  accent: {
    wash: "bg-gradient-to-r from-accent-400/[0.14] via-accent-400/[0.07] to-transparent",
    ring: "border-accent-400/30",
    ink: "text-accent-400",
    inkSoft: "text-accent-400/80",
  },
};

function pickLevelName(level, lang) {
  if (!level) return "";
  if (lang === "pt") return level.display_name_pt || level.display_name_en || level.name;
  return level.display_name_en || level.display_name_pt || level.name;
}

function pickDescription(level, lang) {
  if (!level) return null;
  if (lang === "pt") return level.description_pt || level.description_en;
  return level.description_en || level.description_pt;
}

/**
 * Resolve a Lucide icon component from its string name. Falls back
 * to `Trophy` when the name isn't a valid Lucide export.
 */
function resolveIcon(name) {
  if (!name || typeof name !== "string") return Trophy;
  const Icon = LucideIcons[name];
  return Icon || Trophy;
}

export default function LevelBanner({
  level,
  unitsComplete = 0,
  unitsTotal = 0,
  earnedCertificate = null,
  levelIndex = null,       // 1-based position in the ordered list
  totalLevels = null,      // total count of active levels
  lang = "pt",
}) {
  if (!level) return null;
  const tone = TONE_STYLES[SIGNAL_ALIAS[level.signal_tone] || "accent"] || TONE_STYLES.accent;
  const Icon = resolveIcon(level.icon_name);
  const pct = unitsTotal > 0
    ? Math.round((unitsComplete / unitsTotal) * 100)
    : 0;
  const isEarned = !!earnedCertificate;
  const name = pickLevelName(level, lang);
  const description = pickDescription(level, lang);

  return (
    <section
      className={[
        "relative overflow-hidden",
        "rounded-panel border",
        tone.ring,
        "bg-primary-panel",
        "px-4 sm:px-6 py-4 sm:py-5",
      ].join(" ")}
      aria-label={`${name} level`}
    >
      {/* Signal-tinted wash — sits behind content, deliberately
          subtle so the level identity registers without shouting.
          Editable per-level via the level's `signal_tone` field. */}
      <div
        className={`absolute inset-0 pointer-events-none ${tone.wash}`}
        aria-hidden="true"
      />

      <div className="relative flex items-center gap-4 flex-wrap">
        {/* Icon tile — signal-tinted, feature-identity slot */}
        <div
          className={[
            "shrink-0 w-11 h-11 sm:w-12 sm:h-12 rounded-control",
            "bg-primary-800 border",
            tone.ring,
            "inline-flex items-center justify-center",
            tone.ink,
          ].join(" ")}
          aria-hidden="true"
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.75} />
        </div>

        {/* Title + eyebrow — takes remaining width */}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-label font-semibold font-sans">
            <span className={tone.ink}>
              {lang === "pt" ? "Nível" : "Level"}
              {typeof levelIndex === "number" && ` ${levelIndex}`}
              {typeof totalLevels === "number" && ` ${lang === "pt" ? "de" : "of"} ${totalLevels}`}
            </span>
            {level.cefr_target && (
              <span className={`ml-2 ${tone.inkSoft}`}>
                · {level.cefr_target}
              </span>
            )}
          </p>
          <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-primary-50 leading-tight">
            {name}
          </h2>
          {description && (
            <p className="text-xs sm:text-sm text-primary-400 mt-1 max-w-2xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {/* Certificate marker — solid + earned OR outlined + pending.
            Sized to sit alongside the title on tablet+; wraps below
            on narrow screens via the flex-wrap parent. */}
        <div className="shrink-0 flex items-center gap-2">
          <div
            className={[
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full",
              "text-[11px] font-semibold uppercase tracking-label",
              "border transition-colors",
              isEarned
                ? "bg-accent-400/15 border-accent-400/40 text-accent-400"
                : `bg-primary-800 ${tone.ring} ${tone.inkSoft}`,
            ].join(" ")}
            title={
              isEarned
                ? lang === "pt"
                  ? "Certificado conquistado"
                  : "Certificate earned"
                : lang === "pt"
                  ? "Certificado do nível"
                  : "Level certificate"
            }
          >
            {isEarned ? (
              <Sparkles className="w-3.5 h-3.5" />
            ) : (
              <Award className="w-3.5 h-3.5" />
            )}
            <span>
              {isEarned
                ? lang === "pt"
                  ? "Certificado"
                  : "Certificate"
                : lang === "pt"
                  ? "Certificado"
                  : "Certificate"}
            </span>
          </div>
        </div>
      </div>

      {/* Progress row — MetricBar tinted to the level's signal.
          Rendered separately so the header row can wrap cleanly
          on narrow screens. */}
      <div className="relative mt-3">
        <MetricBar
          label={
            <span className="text-[11px] font-sans font-medium text-primary-300">
              {lang === "pt"
                ? `${unitsComplete} de ${unitsTotal} unidades`
                : `${unitsComplete} of ${unitsTotal} units`}
            </span>
          }
          value={pct}
          signal={SIGNAL_ALIAS[level.signal_tone] || "accent"}
        />
      </div>
    </section>
  );
}

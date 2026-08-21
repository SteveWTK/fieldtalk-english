// src/components/dashboard/propath/ProPathSkillRadar.js
//
// Pro Path dashboard's flagship visual — a 6-axis radar with 4
// individually-lit segments per axis (24 cells total). Each segment
// corresponds to one Level-progressing lesson in that skill; its
// fill scales from 0 (not attempted) to 1 (passed threshold), with
// partial fills showing "close but keep going" states.
//
// Data source: useSkillRadar hook. This component is presentation-
// only — no data fetching or scoring lives here.
//
// Visual design:
//   - Six hexagonal-sector cells per axis (4 cells radiating from
//     the centre outward). Cells are curved wedge slices — cleaner
//     to draw and read than a strictly-hexagonal cell subdivision.
//   - Subtle hexagon ring outlines behind the cells preserve the
//     visual DNA of the previous version.
//   - Passed segments: solid lime + soft glow.
//   - Partial segments: proportional opacity + visible outline —
//     "you're on it, keep going".
//   - Not-yet-released segments (Level's lesson slot for that axis
//     doesn't exist in the DB yet): dashed outline only.
//   - Hover any cell → detail strip shows lesson info + XP earned
//     against threshold.
//
// Layout: SVG uses a viewBox so the whole tile scales to the parent.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, Trophy, PlayCircle } from "lucide-react";
import {
  SKILL_AXES,
  getSkillAxis,
  skillAxisLabel,
} from "@/lib/lessons/skillAxes";
import { LESSONS_PER_LEVEL, PASS_THRESHOLD } from "@/lib/hooks/useSkillRadar";

// Local copy dictionary — same colocated pattern as the rest of the
// Pro Path components.
const COPY = {
  en: {
    eyebrow: (level) => `Skill Radar — Level ${level}`,
    subtitle: "Your readiness across every side of the game",
    passedLabel: "Segments passed",
    aria: (done, total, level) =>
      `Skill radar, Level ${level}. ${done} of ${total} segments passed.`,
    trialReadyLabel: "Certificate progress",
    trialReadyExplain:
      "Pass all 4 segments in each of the 6 areas to earn the Level {level} certificate.",
    startFirstLesson: "Start your first lesson",
    keepGoing: "Keep going",
    detailEmptyBody:
      "Lessons coming soon. Start any area to begin filling out your radar.",
    detailNotReleasedBody:
      "This lesson isn't in your Training Ground yet — content team is on it.",
    detailNotStarted: "Not yet started",
    detailPassed: "Passed",
    detailPartial: "Keep going",
    lessonNumber: (n) => `Lesson ${n}`,
    xpOf: (earned, max) => `${earned} / ${max} XP`,
    passesAt: (n) => `Passes at ${n} XP`,
    certificateReadyEyebrow: (level) => `Level ${level} complete`,
    certificateReadyBody: "Every axis, every segment. Certificate ready.",
  },
  pt: {
    eyebrow: (level) => `Radar de Habilidades — Nível ${level}`,
    subtitle: "Sua prontidão para os desafios do jogo",
    passedLabel: "Segmentos concluídos",
    aria: (done, total, level) =>
      `Radar de habilidades, Nível ${level}. ${done} de ${total} segmentos concluídos.`,
    trialReadyLabel: "Progresso do certificado",
    trialReadyExplain:
      "Passe nos 4 segmentos de cada uma das 6 áreas para ganhar o certificado de Nível {level}.",
    startFirstLesson: "Começar a primeira aula",
    keepGoing: "Continuar",
    detailEmptyBody:
      "Aulas em breve. Comece por qualquer área para começar a preencher o radar.",
    detailNotReleasedBody:
      "Essa aula ainda não está no seu Centro de Treinamento — a equipe de conteúdo está trabalhando nela.",
    detailNotStarted: "Ainda não iniciada",
    detailPassed: "Passou",
    detailPartial: "Continue",
    lessonNumber: (n) => `Aula ${n}`,
    xpOf: (earned, max) => `${earned} / ${max} XP`,
    passesAt: (n) => `Passa em ${n} XP`,
    certificateReadyEyebrow: (level) => `Nível ${level} concluído`,
    certificateReadyBody:
      "Todos os eixos, todos os segmentos. Certificado pronto.",
  },
};

// SVG geometry constants. viewBox is 0..VIEW; radar sits at (CX, CY)
// with maximum radius R_MAX. Adjust these three to rescale the
// whole chart proportionally.
const VIEW = 400;
const CX = VIEW / 2;
const CY = VIEW / 2 + 6; // nudge down so top-axis label doesn't clip
const R_MAX = 130;
const AXIS_COUNT = SKILL_AXES.length;
const SECTOR_ANGLE = (2 * Math.PI) / AXIS_COUNT; // 60° per axis
// A tiny angular gap between adjacent axes' cells so the boundaries
// read cleanly — otherwise the 24 cells run into each other and the
// whole radar looks like a filled disc when everything is full.
const CELL_GAP_ANGLE = 0.018;

// Rings drawn behind the cells for visual guidance. Same 4 fractions
// as the segment boundaries so the grid + cells are visually
// consistent.
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1.0];

// Axis centre angle (top axis = -90°, i.e. -π/2).
function axisAngle(i) {
  return -Math.PI / 2 + i * SECTOR_ANGLE;
}

// (angle, radius) → SVG point in the tile's coordinate space.
function polarPoint(angle, r) {
  return {
    x: CX + Math.cos(angle) * r,
    y: CY + Math.sin(angle) * r,
  };
}

// Cell path (SVG `d` string) for segment N of axis A. Cell is a
// curved wedge bounded by two radial edges (with a small angular gap
// on each side) and two concentric arcs (inner + outer). Innermost
// segment (N=0) collapses inner arc to the centre point — a
// triangle-like wedge instead of a trapezoid.
function cellPath(axisIdx, segmentIdx) {
  const angleCenter = axisAngle(axisIdx);
  const angleStart = angleCenter - SECTOR_ANGLE / 2 + CELL_GAP_ANGLE / 2;
  const angleEnd = angleCenter + SECTOR_ANGLE / 2 - CELL_GAP_ANGLE / 2;
  const innerR = (segmentIdx / LESSONS_PER_LEVEL) * R_MAX;
  const outerR = ((segmentIdx + 1) / LESSONS_PER_LEVEL) * R_MAX;

  const outerStart = polarPoint(angleStart, outerR);
  const outerEnd = polarPoint(angleEnd, outerR);
  const innerStart = polarPoint(angleStart, innerR);
  const innerEnd = polarPoint(angleEnd, innerR);

  if (segmentIdx === 0) {
    // Triangle-wedge with centre apex — no inner arc.
    return [
      `M ${CX.toFixed(2)},${CY.toFixed(2)}`,
      `L ${outerStart.x.toFixed(2)},${outerStart.y.toFixed(2)}`,
      `A ${outerR.toFixed(2)},${outerR.toFixed(2)} 0 0 1 ${outerEnd.x.toFixed(2)},${outerEnd.y.toFixed(2)}`,
      "Z",
    ].join(" ");
  }
  return [
    `M ${innerStart.x.toFixed(2)},${innerStart.y.toFixed(2)}`,
    `A ${innerR.toFixed(2)},${innerR.toFixed(2)} 0 0 1 ${innerEnd.x.toFixed(2)},${innerEnd.y.toFixed(2)}`,
    `L ${outerEnd.x.toFixed(2)},${outerEnd.y.toFixed(2)}`,
    `A ${outerR.toFixed(2)},${outerR.toFixed(2)} 0 0 0 ${outerStart.x.toFixed(2)},${outerStart.y.toFixed(2)}`,
    "Z",
  ].join(" ");
}

// Label position sits slightly outside R_MAX so icons don't overlap
// the outer ring.
function labelPoint(axisIndex) {
  return polarPoint(axisAngle(axisIndex), R_MAX * 1.18);
}

export default function ProPathSkillRadar({
  perAxis,
  currentLevel,
  levelPct,
  // axesFullyPassed,
  totalPassedInLevel,
  totalPossibleInLevel,
  certificateReady,
  lang = "en",
  lessonHref = "/lesson",
  // Actual "next lesson" derived from the user's completions +
  // pillar/lesson sort order (see ProPathDashboard). When provided,
  // the default-state detail strip renders this as a clickable link
  // straight to /lesson/<id> — the primary CTA of the whole tile.
  // Falls back to the segment-walk heuristic when null (edge case:
  // dashboard callers that don't compute a next lesson).
  nextLessonInfo = null,
}) {
  const copy = COPY[lang] || COPY.en;

  // Entrance animation — cells fade in with a slight radial stagger
  // (inner cells first). Duration matched to the ambient landing-
  // page animations for family resemblance.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  // Hover state — { axisIdx, segmentIdx } identifying which cell.
  // Detail strip shows either the hovered cell OR (default) the
  // "next up" cell (lowest-fill, non-empty axis).
  const [hoverCell, setHoverCell] = useState(null);

  // Fast lookup: axis id → axis + segments (from useSkillRadar).
  const axisByIndex = perAxis; // already in SKILL_AXES order

  // Determine the "next up" cell for the default detail strip:
  // the first not-yet-passed segment across all axes, walking axes
  // left-to-right and segments inward-out. Feels like "here's what
  // to tackle next".
  const nextUp = useMemo(() => {
    for (let segIdx = 0; segIdx < LESSONS_PER_LEVEL; segIdx++) {
      for (let axisIdx = 0; axisIdx < axisByIndex.length; axisIdx++) {
        const seg = axisByIndex[axisIdx]?.segments?.[segIdx];
        if (seg && !seg.passed) return { axisIdx, segmentIdx: segIdx };
      }
    }
    return null;
  }, [axisByIndex]);

  const detailCell = hoverCell || nextUp;

  const isEmpty = perAxis.every((a) => a.available === 0);

  return (
    <section className="rounded-3xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300/80 font-bold">
            {copy.eyebrow(currentLevel)}
          </p>
          <h2 className="text-lg sm:text-xl font-black tracking-tight mt-1">
            {copy.subtitle}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">
            {copy.passedLabel}
          </p>
          <p className="text-2xl font-black tabular-nums text-accent-300">
            {totalPassedInLevel}
            <span className="text-white/40 text-sm font-bold">
              /{totalPossibleInLevel}
            </span>
          </p>
        </div>
      </header>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW + 20}`}
          className="w-full max-w-md mx-auto block"
          role="img"
          aria-label={copy.aria(
            totalPassedInLevel,
            totalPossibleInLevel,
            currentLevel,
          )}
        >
          {/* Background hex rings — nudged a touch stronger than the
              original 0.06/0.5 so the polygon reads clearly on mobile
              even at reduced size. Outer ring gets an extra bump so
              the radar has a decisive outer boundary. */}
          {RING_FRACTIONS.map((f, ri) => {
            const points = SKILL_AXES.map((_, i) => {
              const p = polarPoint(axisAngle(i), f * R_MAX);
              return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
            }).join(" ");
            return (
              <polygon
                key={ri}
                points={points}
                fill="none"
                stroke="rgba(255,255,255,0.11)"
                strokeWidth={ri === RING_FRACTIONS.length - 1 ? 1.4 : 0.8}
              />
            );
          })}

          {/* Radial axis lines — subtle but visible enough on mobile
              to hint the cell boundaries when the radar shrinks. */}
          {SKILL_AXES.map((axis, i) => {
            const outer = polarPoint(axisAngle(i), R_MAX);
            return (
              <line
                key={axis.id}
                x1={CX}
                y1={CY}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255,255,255,0.09)"
                strokeWidth={0.8}
              />
            );
          })}

          {/* Cells — 24 wedges. State-driven rendering:
                - passed (fill=1)        → solid lime + glow
                - partial (0 < fill < 1) → lime, opacity scales
                                            from a subtle 15%
                                            baseline with progress
                - not started (fill = 0
                    but lesson exists)   → NO fill, solid outline
                - not released (no lesson
                    yet in this slot)    → NO fill, dashed outline
              The empty-but-lesson-exists case previously showed a
              "ghost green" at 15% opacity which read as if the user
              had started something — moved to zero fill + slightly
              stronger outline to distinguish it from not-released
              without simulating progress. */}
          {perAxis.map((axisData, axisIdx) =>
            axisData.segments.map((seg, segIdx) => {
              const notReleased = seg.lessonId === null;
              const passed = seg.passed;
              const started = seg.fill > 0;
              const isHover =
                hoverCell?.axisIdx === axisIdx &&
                hoverCell?.segmentIdx === segIdx;
              const path = cellPath(axisIdx, segIdx);

              let fillOpacity = 0;
              if (passed) {
                fillOpacity = animate ? 0.9 : 0;
              } else if (started) {
                fillOpacity = animate ? 0.15 + seg.fill * 0.65 : 0;
              }
              // notReleased + not-started + not-passed cells all
              // stay at fillOpacity = 0; the stroke does the
              // differentiation.

              // Cell outlines default to LIME across all states (matches
              // the onboarding SkillRadarPreview) so the 24-cell shape
              // reads clearly even before any lesson is done. Passed
              // and started segments intensify the lime; not-started
              // released segments use the same tone as the preview.
              // Not-released cells stay dim white + dashed so the
              // "content coming" state is still distinguishable.
              const strokeColor = notReleased
                ? "rgba(255,255,255,0.14)"
                : passed
                  ? "rgba(163,230,53,0.95)"
                  : started
                    ? "rgba(163,230,53,0.65)"
                    : "rgba(163,230,53,0.4)";

              return (
                <path
                  key={`${axisIdx}-${segIdx}`}
                  d={path}
                  fill="rgb(163,230,53)"
                  fillOpacity={fillOpacity}
                  stroke={isHover ? "rgba(255,255,255,0.6)" : strokeColor}
                  strokeWidth={isHover ? 1.6 : 0.85}
                  strokeDasharray={notReleased ? "2 2" : undefined}
                  style={{
                    transition:
                      "fill-opacity 900ms cubic-bezier(0.16, 1, 0.3, 1), stroke 200ms ease",
                    // Passed cells glow — subtle drop shadow gives
                    // the "lit up" feel without overwhelming the
                    // partial cells nearby.
                    filter: passed
                      ? "drop-shadow(0 0 4px rgba(163,230,53,0.4))"
                      : "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={() =>
                    setHoverCell({ axisIdx, segmentIdx: segIdx })
                  }
                  onMouseLeave={() => setHoverCell(null)}
                  onFocus={() => setHoverCell({ axisIdx, segmentIdx: segIdx })}
                  onBlur={() => setHoverCell(null)}
                  tabIndex={0}
                >
                  <title>{`${skillAxisLabel(axisData.id, lang, "short")} — ${copy.lessonNumber(segIdx + 1)}`}</title>
                </path>
              );
            }),
          )}

          {/* Axis labels — icon + short text OUTSIDE the outer ring.
              foreignObject so we reuse Tailwind + Lucide icons
              rather than rebuilding icons as raw SVG paths. */}
          {SKILL_AXES.map((axis, i) => {
            const p = labelPoint(i);
            const axisData = perAxis[i];
            const Icon = axis.Icon;
            const active = axisData && axisData.passedInLevel > 0;
            const isHover = hoverCell?.axisIdx === i;
            // Enlarged from 92x44/w-4/text-[10px] so labels stay
            // legible when the radar shrinks on mobile. Icon + text
            // pair now reads at arm's length on a phone without
            // needing to zoom in.
            const w = 108;
            const h = 54;
            return (
              <foreignObject
                key={axis.id}
                x={p.x - w / 2}
                y={p.y - h / 2}
                width={w}
                height={h}
                style={{ overflow: "visible" }}
              >
                <div
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-0.5 outline-none transition-colors ${
                    isHover ? "bg-white/[0.06]" : ""
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      active ? "text-accent-300" : "text-white/55"
                    }`}
                  />
                  <span
                    className={`text-[11px] sm:text-xs font-bold leading-tight text-center ${
                      active ? "text-white/90" : "text-white/70"
                    }`}
                  >
                    {skillAxisLabel(axis.id, lang, "short")}
                  </span>
                </div>
              </foreignObject>
            );
          })}
        </svg>

        {/* Detail strip. Priority:
              1. If the user is hovering a cell → show that segment's
                 details (existing behaviour, non-clickable, so
                 casual exploration doesn't accidentally navigate).
              2. Else if nextLessonInfo is provided → show the actual
                 next lesson AS A CLICKABLE LINK. Primary CTA of the
                 whole tile.
              3. Else → fall back to the segment-walk nextUp cell
                 (legacy behaviour for callers that don't compute
                 a real next lesson). */}
        {hoverCell ? (
          <SkillRadarDetail
            axis={SKILL_AXES[hoverCell.axisIdx]}
            segment={
              perAxis[hoverCell.axisIdx]?.segments?.[hoverCell.segmentIdx]
            }
            segmentIndex={hoverCell.segmentIdx}
            lang={lang}
            copy={copy}
            isEmpty={isEmpty}
          />
        ) : nextLessonInfo ? (
          <NextLessonLink
            nextLesson={nextLessonInfo}
            lang={lang}
            copy={copy}
          />
        ) : (
          <SkillRadarDetail
            axis={detailCell ? SKILL_AXES[detailCell.axisIdx] : SKILL_AXES[0]}
            segment={
              detailCell
                ? perAxis[detailCell.axisIdx]?.segments?.[detailCell.segmentIdx]
                : null
            }
            segmentIndex={detailCell?.segmentIdx ?? 0}
            lang={lang}
            copy={copy}
            isEmpty={isEmpty}
          />
        )}
      </div>

      {/* Level progress footer — subtle bar toward the certificate.
          Uses the same fill palette as the cells for continuity. */}
      <div className="mt-5 pt-5 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-white/80">
            {copy.trialReadyLabel}
          </p>
          <p className="text-xs font-black tabular-nums text-accent-300">
            {levelPct}%
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-200 transition-[width] duration-1000"
            style={{ width: animate ? `${levelPct}%` : "0%" }}
          />
        </div>
        <p className="mt-2 text-[11px] text-white/50 leading-relaxed">
          {copy.trialReadyExplain.replace("{level}", currentLevel)}
        </p>

        {isEmpty && (
          <Link
            href={lessonHref}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {copy.startFirstLesson}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        )}

        {certificateReady && (
          <div className="mt-4 rounded-2xl border border-accent-400/50 bg-accent-400/[0.08] p-3 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-accent-300 shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-accent-300">
                {copy.certificateReadyEyebrow(currentLevel)}
              </p>
              <p className="text-xs text-white/80 mt-0.5">
                {copy.certificateReadyBody}
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// Clickable "next lesson" panel that replaces the SkillRadarDetail
// default (no-hover) state when the dashboard has computed an actual
// next lesson from completions + sort order. This IS the primary CTA
// of the whole tile — big tap target, lime accent, arrow affordance.
//
// Resume state (isResume=true) gets a "Continue" label + PlayCircle
// icon in place of the axis icon, signalling "pick up where you left
// off" rather than "start something new". Copy uses the same
// dictionary as SkillRadarDetail so the axis label + lesson number
// read consistently across states.
function NextLessonLink({ nextLesson, lang, copy }) {
  const axis = getSkillAxis(nextLesson.primaryAxisId);
  const AxisIcon = axis?.Icon ?? PlayCircle;
  const axisLabel = axis
    ? skillAxisLabel(axis.id, lang, "full")
    : lang === "pt"
      ? "Próxima aula"
      : "Next lesson";
  const threshold =
    nextLesson.maxXp > 0 ? Math.round(nextLesson.maxXp * PASS_THRESHOLD) : 0;
  const stateLabel = nextLesson.isResume
    ? lang === "pt"
      ? "Continuar"
      : "Continue"
    : lang === "pt"
      ? "Próxima aula"
      : "Next lesson";
  const StateIcon = nextLesson.isResume ? PlayCircle : ArrowRight;

  return (
    <Link
      href={`/lesson/${encodeURIComponent(nextLesson.id)}`}
      className="mt-4 group flex items-center gap-3 rounded-2xl border border-accent-400/40 bg-accent-400/[0.08] hover:bg-accent-400/[0.14] hover:border-accent-400/70 px-4 py-3 transition-colors"
      aria-label={
        nextLesson.title
          ? `${stateLabel} — ${nextLesson.title}`
          : stateLabel
      }
    >
      <div className="w-10 h-10 rounded-xl bg-accent-400/25 text-accent-200 flex items-center justify-center shrink-0">
        <AxisIcon className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-[0.2em] text-accent-300 font-bold">
          {stateLabel}
          <span className="text-white/40 font-normal normal-case tracking-normal">
            {" "}
            · {axisLabel} · {copy.lessonNumber(nextLesson.sortOrder)}
          </span>
        </p>
        {nextLesson.title ? (
          <p className="text-sm font-bold text-white/95 truncate mt-0.5">
            {nextLesson.title}
          </p>
        ) : null}
        {threshold > 0 && (
          <p className="text-[11px] text-white/55 leading-relaxed mt-0.5">
            {copy.passesAt(threshold)}
          </p>
        )}
      </div>
      <StateIcon className="w-4 h-4 text-accent-300 shrink-0 group-hover:translate-x-0.5 transition-transform" />
    </Link>
  );
}

// Detail strip — the always-visible info panel below the radar.
// Shows the hovered cell (or, by default, the "next up" cell) with
// context: axis, lesson number, XP earned vs threshold, state.
function SkillRadarDetail({
  axis,
  segment,
  segmentIndex,
  lang,
  copy,
  isEmpty,
}) {
  if (!axis) return null;
  const Icon = axis.Icon;
  const label = skillAxisLabel(axis.id, lang, "full");

  // Fully empty edition (no lessons authored for any axis yet).
  if (isEmpty || !segment) {
    return (
      <div className="mt-4 rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-white/50" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white/85">{label}</p>
          <p className="text-[11px] text-white/50 leading-relaxed">
            {copy.detailEmptyBody}
          </p>
        </div>
      </div>
    );
  }

  // Segment slot exists but no lesson released for that slot yet
  // (content team is behind, or Level has slots not yet populated).
  if (segment.lessonId === null) {
    return (
      <div className="mt-4 rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-white/50" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white/85">
            {label}
            <span className="text-white/40 font-normal">
              {" "}
              · {copy.lessonNumber(segmentIndex + 1)}
            </span>
          </p>
          <p className="text-[11px] text-white/50 leading-relaxed">
            {copy.detailNotReleasedBody}
          </p>
        </div>
      </div>
    );
  }

  const passed = segment.passed;
  const started = segment.earnedXp > 0;
  const threshold = Math.round(segment.maxXp * PASS_THRESHOLD);
  const stateLabel = passed
    ? copy.detailPassed
    : started
      ? copy.detailPartial
      : copy.detailNotStarted;
  const accentTone = passed
    ? "border-accent-400/40 bg-accent-400/[0.08]"
    : "border-white/10 bg-white/[0.03]";
  const iconTone = passed
    ? "bg-accent-400/20 text-accent-300"
    : "bg-white/[0.06] text-white/70";

  return (
    <div
      className={`mt-4 rounded-2xl border px-4 py-3 flex items-center gap-3 transition-colors ${accentTone}`}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${iconTone}`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white/90 truncate">
          {label}
          <span className="text-white/40 font-normal">
            {" "}
            · {copy.lessonNumber(segmentIndex + 1)}
          </span>
        </p>
        <p className="text-[11px] text-white/60 leading-relaxed">
          {copy.xpOf(segment.earnedXp, segment.maxXp)}
          <span className="text-white/40"> · {stateLabel}</span>
          {!passed && segment.maxXp > 0 && (
            <span className="text-white/40"> · {copy.passesAt(threshold)}</span>
          )}
        </p>
      </div>
    </div>
  );
}

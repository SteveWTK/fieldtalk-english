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
import { Sparkles, ArrowRight, Trophy } from "lucide-react";
import { SKILL_AXES, skillAxisLabel } from "@/lib/lessons/skillAxes";
import {
  LESSONS_PER_LEVEL,
  PASS_THRESHOLD,
} from "@/lib/hooks/useSkillRadar";

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
    certificateReadyBody: "Todos os eixos, todos os segmentos. Certificado pronto.",
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
  const angleStart =
    angleCenter - SECTOR_ANGLE / 2 + CELL_GAP_ANGLE / 2;
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
  axesFullyPassed,
  totalPassedInLevel,
  totalPossibleInLevel,
  certificateReady,
  lang = "en",
  lessonHref = "/lesson",
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
            currentLevel
          )}
        >
          {/* Background hex rings — subtle guidance for the eye,
              matching the previous version so the radar still reads
              as "hexagonal" even though cells are arc-bounded. */}
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
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={ri === RING_FRACTIONS.length - 1 ? 1 : 0.5}
              />
            );
          })}

          {/* Radial axis lines — very subtle, so hover boundaries
              are hinted but don't compete with the cells. */}
          {SKILL_AXES.map((axis, i) => {
            const outer = polarPoint(axisAngle(i), R_MAX);
            return (
              <line
                key={axis.id}
                x1={CX}
                y1={CY}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={0.5}
              />
            );
          })}

          {/* Cells — 24 wedges. Fill opacity scales with the
              segment's fill (baseline 6% so an empty cell is still
              visible as a subtle wedge). Passed cells get a soft
              glow via drop-shadow. Not-released cells (lessonId
              === null) render as dashed outlines only. */}
          {perAxis.map((axisData, axisIdx) =>
            axisData.segments.map((seg, segIdx) => {
              const notReleased = seg.lessonId === null;
              const passed = seg.passed;
              const isHover =
                hoverCell?.axisIdx === axisIdx &&
                hoverCell?.segmentIdx === segIdx;
              const path = cellPath(axisIdx, segIdx);

              // Fill opacity: passed = 0.9 (near-solid), partial =
              // 0.15 + fill*0.65 (rises with progress from a subtle
              // baseline), not-released = 0 (no fill, dashed
              // outline only).
              let fillOpacity = 0;
              if (notReleased) {
                fillOpacity = 0;
              } else if (passed) {
                fillOpacity = animate ? 0.9 : 0.06;
              } else {
                fillOpacity = animate ? 0.15 + seg.fill * 0.65 : 0.06;
              }

              const strokeColor = notReleased
                ? "rgba(255,255,255,0.15)"
                : passed
                  ? "rgba(163,230,53,0.9)"
                  : "rgba(255,255,255,0.2)";

              return (
                <path
                  key={`${axisIdx}-${segIdx}`}
                  d={path}
                  fill="rgb(163,230,53)"
                  fillOpacity={fillOpacity}
                  stroke={
                    isHover
                      ? "rgba(255,255,255,0.6)"
                      : strokeColor
                  }
                  strokeWidth={isHover ? 1.4 : 0.6}
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
                  onFocus={() =>
                    setHoverCell({ axisIdx, segmentIdx: segIdx })
                  }
                  onBlur={() => setHoverCell(null)}
                  tabIndex={0}
                >
                  <title>{`${skillAxisLabel(axisData.id, lang, "short")} — ${copy.lessonNumber(segIdx + 1)}`}</title>
                </path>
              );
            })
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
            const w = 92;
            const h = 44;
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
                    className={`w-4 h-4 ${
                      active ? "text-accent-300" : "text-white/40"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-bold leading-tight text-center ${
                      active ? "text-white/85" : "text-white/45"
                    }`}
                  >
                    {skillAxisLabel(axis.id, lang, "short")}
                  </span>
                </div>
              </foreignObject>
            );
          })}
        </svg>

        {/* Detail strip — persistently shows either the hovered
            cell or (default) the "next up" cell so the tile is
            always informative. */}
        <SkillRadarDetail
          axis={
            detailCell ? SKILL_AXES[detailCell.axisIdx] : SKILL_AXES[0]
          }
          segment={
            detailCell
              ? perAxis[detailCell.axisIdx]?.segments?.[
                  detailCell.segmentIdx
                ]
              : null
          }
          segmentIndex={detailCell?.segmentIdx ?? 0}
          lang={lang}
          copy={copy}
          isEmpty={isEmpty}
        />
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

// Detail strip — the always-visible info panel below the radar.
// Shows the hovered cell (or, by default, the "next up" cell) with
// context: axis, lesson number, XP earned vs threshold, state.
function SkillRadarDetail({ axis, segment, segmentIndex, lang, copy, isEmpty }) {
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
            <span className="text-white/40">
              {" "}
              · {copy.passesAt(threshold)}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

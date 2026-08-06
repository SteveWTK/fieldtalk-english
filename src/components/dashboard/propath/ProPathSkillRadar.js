// src/components/dashboard/propath/ProPathSkillRadar.js
//
// Pro Path dashboard's flagship visual — a 6-axis SVG radar chart
// showing per-axis completion for the user. The whole tile is
// designed to feel like the identity of the edition: dark glassy
// panel, electric-lime polygon, axis icons in slate. Animates on
// mount + hovers reveal per-axis detail without leaving the tile.
//
// Data source: useSkillRadar hook (upstream of this component).
// Empty state (no lessons or no completions yet) still renders the
// scaffold — a small centre dot + faint hexagonal grid — so the
// tile reads as an *invitation* rather than a broken chart. Copy
// nudges toward the first lesson.
//
// Sizing: the SVG uses a viewBox so it scales to the parent width;
// axis-label positions are pre-computed in unit space, letting the
// consumer control layout without recomputing angles.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { SKILL_AXES, skillAxisLabel } from "@/lib/lessons/skillAxes";

// Local copy dictionary — colocated because these strings are tightly
// coupled to this tile. Same pattern as ProPathDashboard /
// ProPathOnboarding. `aria` is a function so it can interpolate the
// live axesWithProgress + total count.
const COPY = {
  en: {
    eyebrow: "Skill Radar",
    subtitle: "Your readiness across every side of the game",
    areasStarted: "Areas started",
    aria: (done, total) => `Skill radar. ${done} of ${total} areas started.`,
    trialReadyLabel: "Trial-Ready score",
    trialReadyExplain:
      "Complete at least 1 lesson in each of the 6 areas to earn your Pro Path 26/27 certificate.",
    startFirstLesson: "Start your first lesson",
    detailEmptyBody:
      "Lessons coming soon. Start any area to begin filling out your radar.",
    lessonsComplete: "lessons complete",
  },
  pt: {
    eyebrow: "Radar de Habilidades",
    subtitle: "Sua prontidão para os desafios do jogo",
    areasStarted: "Áreas iniciadas",
    aria: (done, total) =>
      `Radar de habilidades. ${done} de ${total} áreas iniciadas.`,
    trialReadyLabel: "Prontidão para peneiras",
    trialReadyExplain:
      "Complete pelo menos 1 aula em cada uma das 6 áreas para ganhar seu certificado Pro Path 26/27.",
    startFirstLesson: "Começar a primeira aula",
    detailEmptyBody:
      "Aulas em breve. Comece por qualquer área para começar a preencher o radar.",
    lessonsComplete: "aulas concluídas",
  },
};

// SVG geometry constants. viewBox is 0..VIEW; radar sits at (CX, CY)
// with maximum radius R_MAX. All axis-endpoint positions are derived
// from these + the axis index, so tweaking VIEW/R_MAX in one place
// resizes the whole chart proportionally.
const VIEW = 400;
const CX = VIEW / 2;
const CY = VIEW / 2 + 6; // nudge down so top-axis label doesn't clip
const R_MAX = 130;
const AXIS_COUNT = SKILL_AXES.length;

// Rings drawn behind the polygon at these fractions of R_MAX. Four
// rings (25/50/75/100 %) is enough to read progress at a glance
// without cluttering the chart.
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1.0];

// Convert (axisIndex, fraction) → SVG point. Angle starts at -90°
// (top) and moves clockwise, matching the natural reading order of
// the axis labels around the tile.
function axisPoint(axisIndex, fraction) {
  const angle = -Math.PI / 2 + (axisIndex / AXIS_COUNT) * Math.PI * 2;
  const r = R_MAX * fraction;
  return {
    x: CX + Math.cos(angle) * r,
    y: CY + Math.sin(angle) * r,
    angle,
  };
}

// Label position sits slightly outside R_MAX so the icons don't
// overlap the outer ring. 1.15 gives comfortable breathing room on
// desktop; the SVG scales down for mobile automatically.
function labelPoint(axisIndex) {
  return axisPoint(axisIndex, 1.18);
}

export default function ProPathSkillRadar({
  perAxis,
  trialReadyPct,
  axesWithProgress,
  lang = "en",
  lessonHref = "/lesson",
}) {
  const copy = COPY[lang] || COPY.en;
  // Entrance animation — the polygon draws from 0% to its real value
  // on mount so users see it "fill in" rather than pop. Duration
  // matched to the ambient landing-page animations (~1s) for family
  // resemblance.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const [hoverAxisId, setHoverAxisId] = useState(null);

  const pctById = useMemo(() => {
    const m = new Map();
    for (const a of perAxis) m.set(a.id, a);
    return m;
  }, [perAxis]);

  // Polygon points. On mount `animate` is false → every axis reads 0
  // (a single point at centre). Flipping to true triggers the
  // browser's CSS transition on the polygon, drawing it to its real
  // shape. Simple and hard to break.
  const polygonPoints = SKILL_AXES.map((axis, i) => {
    const pctRaw = pctById.get(axis.id)?.pct || 0;
    const fraction = animate ? pctRaw / 100 : 0;
    const p = axisPoint(i, Math.max(fraction, 0.02)); // 0.02 so an
    // all-zero radar still renders as a tiny dot rather than a
    // degenerate polygon that Safari sometimes drops entirely.
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
  }).join(" ");

  const isEmpty = perAxis.every((a) => a.total === 0);
  const anyDone = perAxis.some((a) => a.done > 0);

  return (
    <section className="rounded-3xl bg-white/[0.04] backdrop-blur-sm border border-white/10 p-5 sm:p-6">
      <header className="flex items-start justify-between gap-3 mb-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent-300/80 font-bold">
            {copy.eyebrow}
          </p>
          <h2 className="text-lg sm:text-xl font-black tracking-tight mt-1">
            {copy.subtitle}
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">
            {copy.areasStarted}
          </p>
          <p className="text-2xl font-black tabular-nums text-accent-300">
            {axesWithProgress}
            <span className="text-white/40 text-sm font-bold">
              /{AXIS_COUNT}
            </span>
          </p>
        </div>
      </header>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW + 20}`}
          className="w-full max-w-md mx-auto block"
          role="img"
          aria-label={copy.aria(axesWithProgress, AXIS_COUNT)}
        >
          {/* Background rings — hex outlines drawn from the same axis
              geometry, so ring shape follows axis count automatically
              (drop an axis and the hex becomes a pentagon). */}
          {RING_FRACTIONS.map((f, ri) => {
            const points = SKILL_AXES.map((_, i) => {
              const p = axisPoint(i, f);
              return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
            }).join(" ");
            return (
              <polygon
                key={ri}
                points={points}
                fill="none"
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={ri === RING_FRACTIONS.length - 1 ? 1.25 : 0.75}
              />
            );
          })}

          {/* Radial axis lines — subtle, drawn to R_MAX. */}
          {SKILL_AXES.map((axis, i) => {
            const outer = axisPoint(i, 1);
            return (
              <line
                key={axis.id}
                x1={CX}
                y1={CY}
                x2={outer.x}
                y2={outer.y}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={0.75}
              />
            );
          })}

          {/* Filled polygon — the user's actual radar. Transitions
              from centre-point → real shape on mount, giving the
              "filling in" effect. */}
          <polygon
            points={polygonPoints}
            fill="rgba(163,230,53,0.18)"
            stroke="rgba(163,230,53,0.85)"
            strokeWidth={2}
            strokeLinejoin="round"
            style={{
              transition: "all 1000ms cubic-bezier(0.16, 1, 0.3, 1)",
              filter: anyDone
                ? "drop-shadow(0 0 12px rgba(163,230,53,0.35))"
                : "none",
            }}
          />

          {/* Per-axis vertex markers — small filled circles at each
              vertex. Larger + brighter when the axis has any
              progress, so a partially-filled radar reads clearly. */}
          {SKILL_AXES.map((axis, i) => {
            const data = pctById.get(axis.id) || { pct: 0, done: 0 };
            const fraction = animate ? Math.max(data.pct / 100, 0.02) : 0.02;
            const p = axisPoint(i, fraction);
            const active = data.done > 0;
            return (
              <circle
                key={axis.id}
                cx={p.x}
                cy={p.y}
                r={active ? 4 : 2.5}
                fill={active ? "rgb(190,242,100)" : "rgba(255,255,255,0.4)"}
                style={{
                  transition: "all 1000ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
              />
            );
          })}

          {/* Axis labels — icon + short text, positioned OUTSIDE the
              outer ring. Uses foreignObject to reuse Tailwind + Lucide
              icons rather than rebuilding icons as SVG paths. Hover
              reveals detail via the parent tooltip strip below. */}
          {SKILL_AXES.map((axis, i) => {
            const p = labelPoint(i);
            const data = pctById.get(axis.id) || {
              done: 0,
              total: 0,
              pct: 0,
            };
            const Icon = axis.Icon;
            const active = data.done > 0;
            const isHover = hoverAxisId === axis.id;
            // foreignObject dims are set so the icon+label group
            // centres on `p`. Width kept tight to avoid overlap
            // between adjacent labels on mobile.
            const w = 96;
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
                  onMouseEnter={() => setHoverAxisId(axis.id)}
                  onMouseLeave={() => setHoverAxisId(null)}
                  onFocus={() => setHoverAxisId(axis.id)}
                  onBlur={() => setHoverAxisId(null)}
                  tabIndex={0}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-0.5 outline-none transition-colors cursor-default ${
                    isHover ? "bg-white/[0.06]" : ""
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 ${
                      active ? "text-accent-300" : "text-white/40"
                    }`}
                  />
                  <span
                    className={`text-[12px] font-bold leading-tight text-center ${
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

        {/* Detail strip — persistently shows either the hovered axis
            or, when nothing is hovered, the axis with the LEAST
            progress (the natural "next place to work" nudge). Keeps
            the tile always-informative without an empty area. */}
        <SkillRadarDetail
          axis={
            hoverAxisId
              ? SKILL_AXES.find((a) => a.id === hoverAxisId)
              : nextUpAxis(perAxis)
          }
          data={
            hoverAxisId
              ? pctById.get(hoverAxisId)
              : pctById.get(nextUpAxis(perAxis)?.id || "")
          }
          lang={lang}
          copy={copy}
          isEmpty={isEmpty}
        />
      </div>

      {/* Trial-Ready footer strip — subtle progress bar toward the
          certificate. Sits at the base of the tile so the whole
          "your skill state" story reads top-to-bottom in one glance. */}
      <div className="mt-5 pt-5 border-t border-white/10">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold text-white/80">
            {copy.trialReadyLabel}
          </p>
          <p className="text-xs font-black tabular-nums text-accent-300">
            {trialReadyPct}%
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent-400 to-accent-200 transition-[width] duration-1000"
            style={{ width: animate ? `${trialReadyPct}%` : "0%" }}
          />
        </div>
        <p className="mt-2 text-[11px] text-white/50 leading-relaxed">
          {copy.trialReadyExplain}
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
      </div>
    </section>
  );
}

// Axis with the lowest completion % that ALSO has at least one lesson
// available — the natural "here's where to focus next" nudge. Falls
// back to the first axis when nothing has any lessons yet (empty
// state), so the detail strip still has something to describe.
function nextUpAxis(perAxis) {
  const withLessons = perAxis.filter((a) => a.total > 0);
  if (withLessons.length === 0) return SKILL_AXES[0];
  const sorted = [...withLessons].sort((a, b) => a.pct - b.pct);
  const bottomId = sorted[0].id;
  return SKILL_AXES.find((a) => a.id === bottomId) || SKILL_AXES[0];
}

function SkillRadarDetail({ axis, data, lang, copy, isEmpty }) {
  if (!axis) return null;
  const Icon = axis.Icon;
  const label = skillAxisLabel(axis.id, lang, "full");

  if (isEmpty || !data || data.total === 0) {
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

  return (
    <div className="mt-4 rounded-2xl bg-accent-400/[0.06] border border-accent-400/25 px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-accent-400/15 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-accent-300" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-white/90">{label}</p>
        <p className="text-[11px] text-white/60 leading-relaxed">
          {data.done} / {data.total} {copy.lessonsComplete}
          <span className="text-white/40"> · {data.pct}%</span>
        </p>
      </div>
    </div>
  );
}

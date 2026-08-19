// src/components/onboarding/propath/SkillRadarPreview.js
//
// Static miniature of the dashboard's Skill Radar, shown in the final
// slide of ProPathOnboarding as a "here's what you're about to build"
// teaser. All 24 cells render in the not-started state (outline only,
// no fill) — the exact shape a fresh account sees on their dashboard.
//
// Kept intentionally separate from ProPathSkillRadar (the dashboard
// component) because:
//   - No interactivity: no hover, no focus, no detail strip.
//   - No data dependency: doesn't take perAxis, doesn't call the hook.
//   - Different visual weight: smaller, ambient, subordinate to the
//     "You're set" celebration copy above it.
//
// The geometry constants mirror the dashboard version. If the
// dashboard radar is rescaled/reshaped later, both files need touching
// — small duplication cost, worth it to keep this component simple
// and free of the dashboard's data-driven state.
"use client";

import { useEffect, useState } from "react";
import { SKILL_AXES, skillAxisLabel } from "@/lib/lessons/skillAxes";

const SEGMENTS_PER_AXIS = 4;
const VIEW = 300;
const CX = VIEW / 2;
const CY = VIEW / 2 + 4;
const R_MAX = 92;
const AXIS_COUNT = SKILL_AXES.length;
const SECTOR_ANGLE = (2 * Math.PI) / AXIS_COUNT;
const CELL_GAP_ANGLE = 0.02;
const RING_FRACTIONS = [0.25, 0.5, 0.75, 1.0];

function axisAngle(i) {
  return -Math.PI / 2 + i * SECTOR_ANGLE;
}
function polarPoint(angle, r) {
  return { x: CX + Math.cos(angle) * r, y: CY + Math.sin(angle) * r };
}

function cellPath(axisIdx, segmentIdx) {
  const angleCenter = axisAngle(axisIdx);
  const angleStart = angleCenter - SECTOR_ANGLE / 2 + CELL_GAP_ANGLE / 2;
  const angleEnd = angleCenter + SECTOR_ANGLE / 2 - CELL_GAP_ANGLE / 2;
  const innerR = (segmentIdx / SEGMENTS_PER_AXIS) * R_MAX;
  const outerR = ((segmentIdx + 1) / SEGMENTS_PER_AXIS) * R_MAX;
  const outerStart = polarPoint(angleStart, outerR);
  const outerEnd = polarPoint(angleEnd, outerR);
  const innerStart = polarPoint(angleStart, innerR);
  const innerEnd = polarPoint(angleEnd, innerR);

  if (segmentIdx === 0) {
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

function labelPoint(axisIndex) {
  return polarPoint(axisAngle(axisIndex), R_MAX * 1.28);
}

/**
 * @param {{ lang: 'en' | 'pt' }} props
 */
export default function SkillRadarPreview({ lang = "en" }) {
  // Stagger the cells fading in from the centre outward for a subtle
  // "coming alive" moment as the ready slide lands. Matches the
  // pp-onb-rise animation cadence in the parent onboarding.
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="mx-auto max-w-xs sm:max-w-sm">
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW + 16}`}
        className="w-full block"
        role="img"
        aria-label={
          lang === "pt"
            ? "Prévia do radar de habilidades — seis áreas, quatro segmentos cada"
            : "Skill radar preview — six areas, four segments each"
        }
      >
        {/* Background hex rings — same subtle guidance as the dashboard */}
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

        {/* Radial axis lines — subtle */}
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

        {/* 24 cells — all outline-only "not started" state, with a
            gentle radial-stagger fade-in as the slide mounts. */}
        {SKILL_AXES.map((axis, axisIdx) =>
          Array.from({ length: SEGMENTS_PER_AXIS }).map((_, segIdx) => {
            const delay = (segIdx * 60 + axisIdx * 20) / 1000; // seconds
            return (
              <path
                key={`${axisIdx}-${segIdx}`}
                d={cellPath(axisIdx, segIdx)}
                fill="none"
                stroke="rgba(163,230,53,0.35)"
                strokeWidth={0.7}
                style={{
                  opacity: animate ? 1 : 0,
                  transition: `opacity 700ms cubic-bezier(0.16,1,0.3,1) ${delay}s`,
                }}
              />
            );
          }),
        )}

        {/* Axis labels — icon + short label outside the outer ring */}
        {SKILL_AXES.map((axis, i) => {
          const p = labelPoint(i);
          const Icon = axis.Icon;
          const w = 72;
          const h = 36;
          return (
            <foreignObject
              key={axis.id}
              x={p.x - w / 2}
              y={p.y - h / 2}
              width={w}
              height={h}
              style={{ overflow: "visible" }}
            >
              <div className="flex flex-col items-center justify-center gap-0.5">
                <Icon className="w-3.5 h-3.5 text-accent-300/70" />
                <span className="text-[9px] font-bold leading-tight text-center text-white/60">
                  {skillAxisLabel(axis.id, lang, "short")}
                </span>
              </div>
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}

// src/components/mental/GrowingTree.js
//
// Consistency visualization for the mental training hub — a stylized
// SVG tree that literally grows as the player builds a habit. No
// external library: pure SVG + CSS transitions.
//
// Growth logic:
//   - The trunk gets taller with total active weeks (0 → 12 weeks
//     drawn; beyond that the height plateaus and foliage densifies).
//   - Branches unfold at 1, 3, 6, 9, 12 active-week milestones.
//   - Leaves appear on branches by the ratio of "days completed / 84"
//     over the last 12 weeks. Leaves colour-shift by which activity
//     types the player has done, so a scenario-heavy player has a
//     mix of amber + emerald, a meditation-heavy player is teal.
//
// Interactive: hovering a leaf tooltips the date + activity type it
// represents. Newest leaves gently sway to draw the eye.

"use client";

import { useMemo } from "react";
import { useLanguage } from "@/lib/contexts/LanguageContext";

const TYPE_COLOR = {
  meditation: "#5eead4",        // teal-300
  silent_timer: "#e2e8f0",      // slate-200
  champion_scenario: "#fcd34d", // amber-300
  match_prep: "#86efac",        // emerald-300
  voice_of_champion: "#d8b4fe", // violet-300
};

/**
 * @param {{
 *   completionsByDay: Array<{ day_key: string, activity_types: string[] }>,
 * }} props
 *   completionsByDay is expected sorted newest-first, one entry per
 *   distinct day the player completed anything. activity_types is
 *   the distinct types done that day (for leaf colour distribution).
 */
export default function GrowingTree({ completionsByDay = [] }) {
  const { lang } = useLanguage();
  const isPt = lang === "pt";

  const stats = useMemo(() => computeStats(completionsByDay), [completionsByDay]);
  const { weekCount, dayCount, milestone, leaves } = stats;

  // Trunk height scales linearly with weekCount up to 12 weeks. Base
  // trunk shown even at 0 weeks so a fresh account still has a
  // sapling.
  const trunkGrowth = Math.min(1, weekCount / 12);
  const trunkTopY = 250 - trunkGrowth * 70; // higher = taller
  const trunkThickness = 6 + trunkGrowth * 4;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 relative overflow-hidden">
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <h2 className="text-sm font-black tracking-tight text-white">
            {isPt ? "Sua consistência" : "Your consistency"}
          </h2>
          <p className="text-[11px] text-white/45">
            {isPt
              ? "A árvore cresce a cada semana ativa. Cada folha é um dia de prática."
              : "The tree grows with every active week. Each leaf is a day of practice."}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black tabular-nums text-emerald-300">
            {dayCount}
          </p>
          <p className="text-[10px] uppercase tracking-wider text-white/40 font-semibold">
            {isPt ? "dias · " : "days · "}
            <span className="text-white/60">{weekCount}</span>{" "}
            {isPt ? "semanas" : "weeks"}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-center h-72 relative">
        <svg
          viewBox="0 0 300 300"
          className="w-full max-w-xs h-full"
          role="img"
          aria-label={
            isPt ? "Árvore de consistência" : "Consistency tree"
          }
        >
          {/* Ground curve — subtle horizon line under the tree. */}
          <path
            d="M 20,280 Q 150,290 280,280"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
            fill="none"
          />

          {/* Trunk — rooted at (150, 280), grows upward as weekCount
              increases. Slight gradient from dark brown at base to
              warm amber at top hints at "life rising through" it. */}
          <defs>
            <linearGradient id="trunk-grad" x1="0%" y1="100%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#3f2412" />
              <stop offset="100%" stopColor="#78462a" />
            </linearGradient>
          </defs>
          <path
            d={`M ${150 - trunkThickness},280
                L ${150 - trunkThickness * 0.6},${trunkTopY}
                Q 150,${trunkTopY - 6} ${150 + trunkThickness * 0.6},${trunkTopY}
                L ${150 + trunkThickness},280 Z`}
            fill="url(#trunk-grad)"
            style={{ transition: "all 0.8s ease-out" }}
          />

          {/* Branches — appear at milestone thresholds. Each is a
              curved path from a point on the trunk out to a leaf
              cluster location. */}
          {BRANCH_DEFS.map((b, i) => {
            if (milestone < b.milestone) return null;
            return (
              <path
                key={i}
                d={b.path}
                stroke="url(#trunk-grad)"
                strokeWidth={b.thickness}
                strokeLinecap="round"
                fill="none"
                style={{
                  opacity: 1,
                  transition: "opacity 1.2s ease-out",
                }}
              />
            );
          })}

          {/* Leaves — placed at pre-defined slots on branches + top of
              trunk. Number of visible leaves scales with dayCount. */}
          {LEAF_SLOTS.slice(0, leaves.count).map((slot, i) => {
            const type = leaves.colors[i % leaves.colors.length] || "meditation";
            const color = TYPE_COLOR[type] || "#5eead4";
            const isNew = i < 3; // newest 3 leaves sway
            return (
              <g
                key={i}
                transform={`translate(${slot.x} ${slot.y}) rotate(${slot.rot})`}
                className={isNew ? "leaf-sway" : ""}
                style={{ transformOrigin: "center" }}
              >
                <ellipse
                  cx="0"
                  cy="0"
                  rx="6"
                  ry="10"
                  fill={color}
                  opacity={slot.opacity || 0.9}
                />
                {/* Highlight dot — a small point of extra light so the
                    leaves catch attention against the dark backdrop. */}
                <circle cx="-2" cy="-4" r="1.5" fill="white" opacity="0.4" />
              </g>
            );
          })}
        </svg>

        {/* If no completions yet, invite the first tap. */}
        {dayCount === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xs text-white/50 text-center max-w-[220px]">
              {isPt
                ? "Comece com uma prática — a árvore vai crescer com você."
                : "Start with one practice — the tree grows with you."}
            </p>
          </div>
        )}
      </div>

      {/* Milestone strip — shows the next unlock so the player has a
          concrete goal to reach. */}
      <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold">
        {MILESTONES.map((m, i) => {
          const reached = weekCount >= m.weeks;
          return (
            <div
              key={i}
              className={`flex flex-col items-center gap-0.5 ${
                reached ? "text-emerald-300" : "text-white/25"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${reached ? "bg-emerald-400" : "bg-white/15"}`} />
              <span>{m.label[lang]}</span>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        :global(.leaf-sway) {
          animation: leaf-sway 4s ease-in-out infinite;
        }
        @keyframes leaf-sway {
          0%, 100% { transform: rotate(0deg); }
          50% { transform: rotate(6deg); }
        }
      `}</style>
    </div>
  );
}

/* ─── stats + layout ──────────────────────────────────────────── */

function computeStats(days) {
  const uniqueWeekKeys = new Set();
  for (const d of days) {
    const [y, m, dd] = d.day_key.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, dd));
    // ISO week key — same trick as in the leads metrics API.
    const t = new Date(
      Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()),
    );
    const dayNum = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
    uniqueWeekKeys.add(`${t.getUTCFullYear()}-W${weekNo}`);
  }
  const dayCount = days.length;
  const weekCount = uniqueWeekKeys.size;

  // Milestone tier — determines which branches are shown.
  let milestone = 0;
  if (weekCount >= 1) milestone = 1;
  if (weekCount >= 3) milestone = 2;
  if (weekCount >= 6) milestone = 3;
  if (weekCount >= 9) milestone = 4;
  if (weekCount >= 12) milestone = 5;

  // Leaf count — one leaf per completed day, capped at the number of
  // pre-defined slots so we never place a leaf in mid-air.
  const leafCount = Math.min(dayCount, LEAF_SLOTS.length);
  const colors = days.slice(0, leafCount).flatMap((d) =>
    Array.isArray(d.activity_types) && d.activity_types.length > 0
      ? d.activity_types
      : ["meditation"],
  );

  return {
    dayCount,
    weekCount,
    milestone,
    leaves: { count: leafCount, colors },
  };
}

/* ─── static branch + leaf layout ─────────────────────────────── */

// Each branch has a milestone threshold (must be reached before the
// branch appears) and an SVG path from a trunk anchor out to a
// terminal point where its leaves cluster.
const BRANCH_DEFS = [
  { milestone: 1, thickness: 3, path: "M 150,240 Q 130,225 105,215" },
  { milestone: 1, thickness: 3, path: "M 150,240 Q 170,225 195,215" },
  { milestone: 2, thickness: 3, path: "M 150,220 Q 128,205 100,195" },
  { milestone: 2, thickness: 3, path: "M 150,220 Q 172,205 200,195" },
  { milestone: 3, thickness: 3, path: "M 150,200 Q 125,185 95,175" },
  { milestone: 3, thickness: 3, path: "M 150,200 Q 175,185 205,175" },
  { milestone: 4, thickness: 3, path: "M 150,180 Q 130,165 110,150" },
  { milestone: 4, thickness: 3, path: "M 150,180 Q 170,165 190,150" },
  { milestone: 5, thickness: 3, path: "M 150,160 Q 135,140 120,125" },
  { milestone: 5, thickness: 3, path: "M 150,160 Q 165,140 180,125" },
];

// Pre-calculated leaf positions — the tree looks the same shape for
// every player; leaves just fill in the branches over time.
const LEAF_SLOTS = [
  // Newest leaves — top of tree, most visible + swaying
  { x: 150, y: 155, rot: 0, opacity: 0.95 },
  { x: 130, y: 130, rot: -15, opacity: 0.95 },
  { x: 170, y: 130, rot: 15, opacity: 0.95 },
  // Middle branches
  { x: 100, y: 180, rot: -25 },
  { x: 200, y: 180, rot: 25 },
  { x: 115, y: 155, rot: -20 },
  { x: 185, y: 155, rot: 20 },
  { x: 95, y: 200, rot: -30 },
  { x: 205, y: 200, rot: 30 },
  { x: 125, y: 195, rot: -18 },
  { x: 175, y: 195, rot: 18 },
  // Lower branches
  { x: 105, y: 220, rot: -32 },
  { x: 195, y: 220, rot: 32 },
  { x: 115, y: 230, rot: -22 },
  { x: 185, y: 230, rot: 22 },
  // Inner canopy
  { x: 140, y: 175, rot: -8 },
  { x: 160, y: 175, rot: 8 },
  { x: 140, y: 155, rot: -6 },
  { x: 160, y: 155, rot: 6 },
  { x: 145, y: 200, rot: -4 },
  { x: 155, y: 200, rot: 4 },
  // Outer canopy fillers
  { x: 85, y: 210, rot: -35 },
  { x: 215, y: 210, rot: 35 },
  { x: 90, y: 240, rot: -28 },
  { x: 210, y: 240, rot: 28 },
  { x: 135, y: 145, rot: -10 },
  { x: 165, y: 145, rot: 10 },
  // Higher canopy
  { x: 120, y: 115, rot: -12 },
  { x: 180, y: 115, rot: 12 },
  { x: 150, y: 108, rot: 0 },
];

const MILESTONES = [
  { weeks: 1, label: { pt: "1 sem", en: "1 wk" } },
  { weeks: 3, label: { pt: "3 sem", en: "3 wk" } },
  { weeks: 6, label: { pt: "6 sem", en: "6 wk" } },
  { weeks: 9, label: { pt: "9 sem", en: "9 wk" } },
  { weeks: 12, label: { pt: "12 sem", en: "12 wk" } },
];

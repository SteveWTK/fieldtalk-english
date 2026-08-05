// src/lib/hooks/useSkillRadar.js
//
// Computes the Pro Path Skill Radar's per-axis completion for the
// current user. Reads lessons + completions from Supabase (both
// scoped to the caller's edition already at the query layer), then
// derives:
//
//   perAxis: [{ id, total, done, pct }] — one entry per canonical
//            axis in SKILL_AXES order. `pct` is 0-100 integer.
//   trialReady: boolean — the certificate gate ("all 6 axes must
//               have at least 1 completed lesson") in one place,
//               so the dashboard tile and the certificate CTA can't
//               drift.
//   trialReadyPct: 0-100 integer — number of axes with ≥ 1 completion,
//                  divided by 6. Powers the progress ring UI.
//
// Empty-state behaviour: when a user has no lessons yet in their
// edition (Pro Path pre-launch, or a WC user hitting this hook by
// accident), every axis reports { total: 0, done: 0, pct: 0 } and
// `trialReady` is false. The Skill Radar component then renders its
// "empty" polygon (a small centre dot + faint grid) which reads as
// a goal state — inviting rather than broken.
"use client";

import { useMemo } from "react";
import { SKILL_AXES } from "@/lib/lessons/skillAxes";

/**
 * @param {object[]} lessons     — flat array of lessons for the
 *                                 user's edition, each with a
 *                                 `skill_axes` array (may be null)
 * @param {object[]} completions — array of { lesson_id } for the user
 * @returns {{
 *   perAxis: Array<{id: string, total: number, done: number, pct: number}>,
 *   trialReady: boolean,
 *   trialReadyPct: number,
 *   axesWithProgress: number,
 * }}
 */
export function useSkillRadar(lessons, completions) {
  return useMemo(() => {
    const completedSet = new Set(
      (completions || []).map((c) => c.lesson_id).filter(Boolean)
    );

    // Count lessons + completions per axis. A lesson tagged with
    // multiple axes counts once toward each — a media-training
    // lesson that also builds communication vocab contributes to
    // both bars.
    const totalByAxis = new Map();
    const doneByAxis = new Map();
    for (const l of lessons || []) {
      const axes = Array.isArray(l?.skill_axes) ? l.skill_axes : [];
      const isComplete = completedSet.has(l.id);
      for (const axisId of axes) {
        totalByAxis.set(axisId, (totalByAxis.get(axisId) || 0) + 1);
        if (isComplete) {
          doneByAxis.set(axisId, (doneByAxis.get(axisId) || 0) + 1);
        }
      }
    }

    const perAxis = SKILL_AXES.map((axis) => {
      const total = totalByAxis.get(axis.id) || 0;
      const done = doneByAxis.get(axis.id) || 0;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      return { id: axis.id, total, done, pct };
    });

    // Trial-Ready formula (iii from the plan): at least 1 completed
    // lesson in EACH of the 6 axes. Mirrors the "rounded player"
    // philosophy — a specialist who's mastered one area but neglected
    // others isn't ready. The 6/6 gate makes the certificate feel
    // earned rather than farmed.
    const axesWithProgress = perAxis.filter((a) => a.done > 0).length;
    const trialReadyPct = Math.round(
      (axesWithProgress / SKILL_AXES.length) * 100
    );
    const trialReady = axesWithProgress === SKILL_AXES.length;

    return { perAxis, trialReady, trialReadyPct, axesWithProgress };
  }, [lessons, completions]);
}

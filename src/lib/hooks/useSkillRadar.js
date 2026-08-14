// src/lib/hooks/useSkillRadar.js
//
// Computes the Pro Path Skill Radar's per-axis segment progression.
// The radar shows 6 axes × 4 segments = 24 individually-lit cells;
// this hook produces the fill value (0-1) for each cell plus the
// user's current Level and certificate-readiness.
//
// Model (locked in with the user):
//   - Each lesson belongs to ONE skill axis (skill_axes[0]).
//   - A "Level" = 4 lessons per axis. Level 1 uses lessons at index
//     [0..3] (sorted by the caller's order — typically pillar_id +
//     sort_order); Level 2 uses [4..7]; etc.
//   - Segment fill = min(earnedXp / (maxXp * PASS_THRESHOLD), 1.0)
//     where earnedXp comes from lesson_completions.xp_earned and
//     maxXp from lessons.max_xp (sum of step xp_reward, precomputed
//     by the DB trigger in PROPATH_LESSON_MAX_XP.sql).
//   - A segment is "passed" when fill === 1.0.
//   - Current Level advances when EVERY axis has 4 passed segments
//     in the current level. Deriving it: floor(min axis-passed-total
//     across axes / 4) + 1.
//   - Certificate for Level N unlocks when the user has 4 passed
//     lessons in EVERY axis within Level N.
//
// Empty edition (no lessons for user yet): every segment renders as
// { fill: 0, lessonId: null } — the radar component treats null
// lessonId as "not yet released" (subtle outline, not a broken
// filled shape).
"use client";

import { useMemo } from "react";
import { SKILL_AXES } from "@/lib/lessons/skillAxes";

// Global pass threshold. 80% of a lesson's max XP fills the segment;
// below that fills proportionally, giving the user visible incentive
// to retry without a "you failed" penalty. See the design doc in
// the model recap for rationale.
export const PASS_THRESHOLD = 0.8;

// Lessons per axis per level. Tied to the certificate cadence — 4
// units per level × 1 lesson per axis per unit = 4 per axis.
export const LESSONS_PER_LEVEL = 4;

/**
 * @param {object[]} lessons — flat array of lesson objects, each
 *   with at minimum: id, skill_axes[], max_xp, plus a stable order
 *   (either sort_order + pillar_id, or already pre-sorted by the
 *   caller in play order). We sort defensively below.
 * @param {object[]} completions — array of lesson_completions rows,
 *   each with: lesson_id, xp_earned. Lessons the user has NOT
 *   completed simply don't appear here (fill = 0 for that segment).
 * @returns object with perAxis segments, currentLevel, certificate
 *   readiness, and derived counts. See file header for shape.
 */
export function useSkillRadar(lessons, completions) {
  return useMemo(() => {
    // Build a fast lookup: lesson_id → { xp_earned }.
    const completionsByLessonId = new Map();
    for (const c of completions || []) {
      if (!c?.lesson_id) continue;
      completionsByLessonId.set(c.lesson_id, {
        xpEarned: c.xp_earned || 0,
      });
    }

    // Defensive ordering: sort by (pillar_id string, sort_order) so
    // Level 1 always covers the earliest lessons and Level advancement
    // reads the correct next slice, regardless of the caller's array
    // order. Uses string compare on pillar_id since it may be UUID
    // or integer — string compare works for both when values are
    // themselves stable.
    const sortedLessons = [...(lessons || [])].sort((a, b) => {
      const pa = String(a.pillar_id ?? "");
      const pb = String(b.pillar_id ?? "");
      if (pa !== pb) return pa < pb ? -1 : 1;
      return (a.sort_order || 0) - (b.sort_order || 0);
    });

    // Compute the segment fill for a single lesson.
    // Threshold-gated fill: earning `PASS_THRESHOLD` × max is what
    // pushes the segment to fully lit (fill = 1.0). Earning more
    // doesn't overfill; earning less shows a proportional partial.
    const segmentForLesson = (lesson) => {
      const completion = lesson
        ? completionsByLessonId.get(lesson.id)
        : null;
      const earned = completion?.xpEarned || 0;
      const maxXp = lesson?.max_xp || 0;
      if (!lesson) {
        return {
          fill: 0,
          passed: false,
          lessonId: null,
          earnedXp: 0,
          maxXp: 0,
        };
      }
      if (maxXp === 0) {
        // Lesson exists but has no XP-bearing steps (edge case for
        // pure-video lessons or admin-created placeholders). Treat
        // any completion row as a full pass — the user "did it".
        return {
          fill: completion ? 1 : 0,
          passed: !!completion,
          lessonId: lesson.id,
          earnedXp: earned,
          maxXp: 0,
        };
      }
      const fill = Math.min(earned / (maxXp * PASS_THRESHOLD), 1);
      return {
        fill,
        passed: fill >= 1,
        lessonId: lesson.id,
        earnedXp: earned,
        maxXp,
      };
    };

    // Per-axis, gather the sorted list of its lessons and compute
    // BOTH the current-level segments AND the all-time passed count
    // (needed for level advancement + certificate math).
    const rawPerAxis = SKILL_AXES.map((axis) => {
      const axisLessons = sortedLessons.filter((l) =>
        (l.skill_axes || []).includes(axis.id)
      );
      // All-time passed count across every level's worth of lessons.
      // Needed to derive current level: level advances when the
      // slowest axis catches up to 4×N.
      const allTimePassed = axisLessons
        .map(segmentForLesson)
        .filter((s) => s.passed).length;
      return {
        axis,
        axisLessons,
        allTimePassed,
      };
    });

    // Current level derivation. Level advances the moment EVERY axis
    // has 4×N passed lessons; the slowest axis is the gate.
    const slowestAxisPassed = rawPerAxis.reduce(
      (min, a) => Math.min(min, a.allTimePassed),
      Infinity
    );
    const clearedLevels = Number.isFinite(slowestAxisPassed)
      ? Math.floor(slowestAxisPassed / LESSONS_PER_LEVEL)
      : 0;
    const currentLevel = clearedLevels + 1;

    // Within the current level, take the 4 lessons at offset
    // [(level-1)*4, level*4) per axis. Missing lessons (axis has
    // fewer than needed) come back as null → segmentForLesson
    // returns an "empty / not yet released" cell.
    const levelStart = (currentLevel - 1) * LESSONS_PER_LEVEL;
    const perAxis = rawPerAxis.map(({ axis, axisLessons }) => {
      const currentLevelLessons = Array.from(
        { length: LESSONS_PER_LEVEL },
        (_, i) => axisLessons[levelStart + i] || null
      );
      const segments = currentLevelLessons.map(segmentForLesson);
      const passedInLevel = segments.filter((s) => s.passed).length;
      return {
        id: axis.id,
        segments,
        passedInLevel,
        // Total lessons available for this axis in the CURRENT level
        // (not counting future levels' lessons or missing slots).
        // Distinguishes "you haven't done these yet" (available > 0
        // and passed < available) from "these aren't released yet"
        // (available < 4) — the empty-state copy uses this.
        available: currentLevelLessons.filter(Boolean).length,
      };
    });

    // Aggregate stats for the tile footer / certificate CTA.
    const axesFullyPassed = perAxis.filter(
      (a) => a.passedInLevel === LESSONS_PER_LEVEL
    ).length;
    const certificateReady = axesFullyPassed === SKILL_AXES.length;
    // Overall Level progress: total passed segments across the
    // 6 × 4 = 24 cells. Percentage for the progress bar.
    const totalPassedInLevel = perAxis.reduce(
      (acc, a) => acc + a.passedInLevel,
      0
    );
    const levelPct = Math.round(
      (totalPassedInLevel / (SKILL_AXES.length * LESSONS_PER_LEVEL)) * 100
    );

    return {
      perAxis,
      currentLevel,
      certificateReady,
      levelPct,
      axesFullyPassed,
      totalPassedInLevel,
      totalPossibleInLevel: SKILL_AXES.length * LESSONS_PER_LEVEL,
    };
  }, [lessons, completions]);
}

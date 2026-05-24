// src/lib/xp/levels.js
//
// Player level math — derived from total XP, never stored.
// Two knobs:
//   BASE   — XP needed to clear Level 1 (Level 1 = 0…BASE-1 XP).
//   GROWTH — each subsequent level needs ~GROWTH× the previous level's span.
//
// Curve table with BASE = 100, GROWTH = 1.4 (current values):
//   L1: 0          L2: 100       L3: 240       L4: 436       L5: 711
//   L6: 1095       L7: 1633      L8: 2386      L9: 3441      L10: 4917
//
// Adjusting BASE or GROWTH is a one-line change — no migration needed.

const BASE = 100;
const GROWTH = 1.4;

/** Whole-number level given total XP. Level 1 minimum is 0. */
export function levelFromXp(totalXp) {
  if (!totalXp || totalXp <= 0) return 1;
  return Math.floor(Math.log(totalXp / BASE + 1) / Math.log(GROWTH)) + 1;
}

/** Total XP required to reach the start of a given level. */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  // Inverse of levelFromXp: xp = BASE * (GROWTH^(level-1) - 1)
  return Math.ceil(BASE * (Math.pow(GROWTH, level - 1) - 1));
}

/**
 * Convenience: rich progress info for UI rendering.
 * Returns { level, inLevel, span, pct, toNextLevel, currentLevelStart, nextLevelStart }.
 */
export function xpProgress(totalXp) {
  const xp = Math.max(0, Number(totalXp) || 0);
  const level = levelFromXp(xp);
  const currentLevelStart = xpForLevel(level);
  const nextLevelStart = xpForLevel(level + 1);
  const span = Math.max(1, nextLevelStart - currentLevelStart);
  const inLevel = Math.max(0, xp - currentLevelStart);
  const pct = Math.max(0, Math.min(100, (inLevel / span) * 100));
  const toNextLevel = Math.max(0, nextLevelStart - xp);
  return {
    level,
    currentLevelStart,
    nextLevelStart,
    inLevel,
    span,
    pct,
    toNextLevel,
  };
}

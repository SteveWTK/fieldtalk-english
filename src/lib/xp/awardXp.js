// src/lib/xp/awardXp.js
//
// Single client-side entry point for awarding XP. Posts to /api/xp/award,
// which writes a row to player_xp_events AND bumps player_progress.total_xp
// atomically (on the server, via the admin client to bypass RLS).
//
// Use this for every new XP source going forward — lesson completion,
// prediction resolution, streak bonuses, etc. Keeping it centralised
// means future features (pack-unlock counter, level recalculation,
// audit/analytics) have one consistent surface to read from.
"use client";

/**
 * @param {object}  opts
 * @param {number}  opts.amount      XP to award (>0)
 * @param {string}  opts.source      Short string identifying the origin
 *                                   ('lesson_completion', 'prediction', 'pack_bonus', …)
 * @param {string=} opts.sourceId    Optional id (lesson.id, step.id, prediction.id, …)
 * @param {object=} opts.metadata    Optional JSON metadata (stored on the event row)
 * @param {boolean=} opts.eventOnly  If true, ONLY insert the audit row — don't
 *                                   bump player_progress.total_xp. Use this when
 *                                   the caller (e.g. markLessonComplete) already
 *                                   updates the running total itself.
 *
 * Resolves to `{ ok: true, awarded, total }` on success, or `null` on failure.
 * Failures are silent by design — XP awarding should never block a user flow.
 */
export async function awardXp({
  amount,
  source,
  sourceId,
  metadata,
  eventOnly = false,
} = {}) {
  if (typeof window === "undefined") return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (!source) return null;

  try {
    const res = await fetch("/api/xp/award", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.floor(amount),
        source,
        source_id: sourceId || null,
        metadata: metadata || null,
        event_only: !!eventOnly,
      }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

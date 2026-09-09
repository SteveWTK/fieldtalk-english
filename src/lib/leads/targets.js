// src/lib/leads/targets.js
//
// Metric-target catalog + progress calculation. Called from both
// the /api/admin/leads/metrics endpoint (dashboard integration) and
// the /api/admin/targets/progress endpoint (targets admin page).

export const TARGET_KINDS = [
  "wins_in_range",
  "leads_created_in_range",
  "conversion_rate_at",
  "pipeline_value_at",
];

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 500;

/**
 * Normalise + validate a target payload. Partial-friendly.
 */
export function normalizeTarget(body, opts = {}) {
  const errors = [];
  const out = {};
  const has = (k) => body && Object.prototype.hasOwnProperty.call(body, k);

  if (opts.requireAll || has("kind")) {
    const raw = body?.kind;
    if (!TARGET_KINDS.includes(raw)) errors.push("kind invalid");
    else out.kind = raw;
  }
  if (opts.requireAll || has("title")) {
    const raw = body?.title;
    if (typeof raw !== "string" || !raw.trim()) errors.push("title required");
    else out.title = raw.trim().slice(0, MAX_TITLE);
  }
  if (opts.requireAll || has("target_value")) {
    const n = Number(body?.target_value);
    if (!Number.isFinite(n) || n <= 0) errors.push("target_value > 0");
    else out.target_value = n;
  }
  if (opts.requireAll || has("target_date")) {
    const raw = body?.target_date;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) errors.push("target_date invalid");
    else out.target_date = raw;
  }
  if (has("range_start")) {
    const raw = body.range_start;
    if (raw == null || raw === "") out.range_start = null;
    else {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) errors.push("range_start invalid");
      else out.range_start = raw;
    }
  }
  if (has("owner_id")) {
    const raw = body.owner_id;
    out.owner_id = raw == null || raw === "" ? null : String(raw);
  }
  if (has("description")) {
    const raw = body.description;
    out.description =
      raw == null || raw === "" ? null : String(raw).slice(0, MAX_DESCRIPTION);
  }
  if (has("active")) out.active = body.active === true;

  return { data: out, errors };
}

/**
 * Compute progress for a single target given the fully-loaded
 * dashboard dataset (leads + activities). Returns:
 *   {
 *     current, target, ratio, days_remaining, days_elapsed,
 *     projected, status: 'achieved' | 'on_track' | 'behind' | 'at_risk'
 *   }
 */
export function computeTargetProgress(target, ctx) {
  const { leads, activities, now } = ctx;
  const dayMs = 24 * 60 * 60 * 1000;
  const targetDate = new Date(target.target_date);
  const rangeStart = target.range_start
    ? new Date(target.range_start)
    : new Date(target.created_at);

  // Total window (start → target_date) and elapsed (start → now).
  const totalDays = Math.max(
    1,
    Math.ceil((targetDate.getTime() - rangeStart.getTime()) / dayMs),
  );
  const elapsedDays = Math.max(
    0,
    Math.min(
      totalDays,
      Math.ceil((now.getTime() - rangeStart.getTime()) / dayMs),
    ),
  );
  const remainingDays = Math.max(
    0,
    Math.ceil((targetDate.getTime() - now.getTime()) / dayMs),
  );

  let current = 0;

  if (target.kind === "wins_in_range") {
    for (const l of leads) {
      if (l.stage !== "won") continue;
      if (target.owner_id && l.assigned_to !== target.owner_id) continue;
      const wonAt = l.converted_at || l.updated_at;
      if (!wonAt) continue;
      const wonMs = new Date(wonAt).getTime();
      if (
        wonMs >= rangeStart.getTime() &&
        wonMs <= targetDate.getTime()
      ) {
        current++;
      }
    }
  } else if (target.kind === "leads_created_in_range") {
    for (const l of leads) {
      if (target.owner_id && l.assigned_to !== target.owner_id) continue;
      const createdMs = new Date(l.created_at).getTime();
      if (
        createdMs >= rangeStart.getTime() &&
        createdMs <= targetDate.getTime()
      ) {
        current++;
      }
    }
  } else if (target.kind === "conversion_rate_at") {
    let won = 0;
    let terminal = 0;
    for (const l of leads) {
      if (target.owner_id && l.assigned_to !== target.owner_id) continue;
      if (l.stage === "won") {
        won++;
        terminal++;
      } else if (l.stage === "lost" || l.stage === "dormant") {
        terminal++;
      }
    }
    current = terminal > 0 ? won / terminal : 0;
  } else if (target.kind === "pipeline_value_at") {
    for (const l of leads) {
      if (target.owner_id && l.assigned_to !== target.owner_id) continue;
      // Active pipeline only — terminal stages don't contribute.
      if (!["new", "contacted", "engaged", "qualified", "proposal"].includes(l.stage)) continue;
      if (Number.isFinite(l.estimated_value_cents)) {
        current += l.estimated_value_cents;
      }
    }
  }

  const ratio = target.target_value > 0 ? current / target.target_value : 0;
  const projected = elapsedDays > 0
    ? (current / elapsedDays) * totalDays
    : current;
  const projectedRatio =
    target.target_value > 0 ? projected / target.target_value : 0;

  let status;
  if (current >= target.target_value) status = "achieved";
  else if (projectedRatio >= 1) status = "on_track";
  else if (projectedRatio >= 0.6) status = "behind";
  else status = "at_risk";

  // Suppress unused-var lint — kept for future extensions.
  void activities;

  return {
    current,
    target: target.target_value,
    ratio: Math.min(1, ratio),
    ratio_raw: ratio,
    projected,
    projected_ratio: projectedRatio,
    days_remaining: remainingDays,
    days_elapsed: elapsedDays,
    days_total: totalDays,
    status,
  };
}

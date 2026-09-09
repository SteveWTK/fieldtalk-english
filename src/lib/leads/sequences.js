// src/lib/leads/sequences.js
//
// Shared helpers for drip sequences — validation + due-time
// computation. Kept in one file so the compose UI, enrollment
// endpoint, and cron dispatcher all speak the same rules.

const MAX_NAME = 120;
const MAX_DESCRIPTION = 500;
const MAX_STEP_NOTES = 500;
const MAX_STEP_BODY = 3000;

/**
 * Normalise + validate a sequence payload (name, description,
 * trigger_type, stop conditions, active). Partial-friendly.
 */
export function normalizeSequence(body, opts = {}) {
  const errors = [];
  const out = {};
  const has = (k) => body && Object.prototype.hasOwnProperty.call(body, k);

  if (opts.requireName || has("name")) {
    const raw = body?.name;
    if (typeof raw !== "string" || !raw.trim()) errors.push("name required");
    else out.name = raw.trim().slice(0, MAX_NAME);
  }

  if (has("description")) {
    const raw = body.description;
    if (raw == null || raw === "") out.description = null;
    else out.description = String(raw).slice(0, MAX_DESCRIPTION);
  }

  if (has("stop_on_reply")) out.stop_on_reply = body.stop_on_reply === true;
  if (has("stop_on_stage_change"))
    out.stop_on_stage_change = body.stop_on_stage_change === true;
  if (has("stop_on_dnc")) out.stop_on_dnc = body.stop_on_dnc === true;

  if (has("active")) out.active = body.active === true;

  return { data: out, errors };
}

/**
 * Normalise + validate a single step payload. Either template_id
 * OR body must be non-empty (schema enforces it too but a clear
 * client-side error is friendlier).
 */
export function normalizeStep(body, opts = {}) {
  const errors = [];
  const out = {};
  const has = (k) => body && Object.prototype.hasOwnProperty.call(body, k);

  if (opts.requirePosition || has("position")) {
    const n = Number(body?.position);
    if (!Number.isFinite(n) || n < 1) errors.push("position must be >= 1");
    else out.position = Math.floor(n);
  }

  if (has("day_offset")) {
    const n = Number(body.day_offset);
    if (!Number.isFinite(n) || n < 0 || n > 365)
      errors.push("day_offset 0..365");
    else out.day_offset = Math.floor(n);
  }

  if (has("time_of_day_brt")) {
    const n = Number(body.time_of_day_brt);
    if (!Number.isFinite(n) || n < 0 || n > 23)
      errors.push("time_of_day_brt 0..23");
    else out.time_of_day_brt = Math.floor(n);
  }

  if (has("template_id")) {
    const raw = body.template_id;
    out.template_id = raw == null || raw === "" ? null : String(raw);
  }

  if (has("body")) {
    const raw = body.body;
    if (raw == null || raw === "") {
      out.body = null;
    } else if (typeof raw !== "object" || Array.isArray(raw)) {
      errors.push("body must be {pt, en} or null");
    } else {
      const pt = typeof raw.pt === "string" ? raw.pt.trim().slice(0, MAX_STEP_BODY) : "";
      const en = typeof raw.en === "string" ? raw.en.trim().slice(0, MAX_STEP_BODY) : "";
      out.body = !pt && !en ? null : { pt, en };
    }
  }

  if (has("notes")) {
    const raw = body.notes;
    out.notes = raw == null || raw === "" ? null : String(raw).slice(0, MAX_STEP_NOTES);
  }

  if (opts.requireContent) {
    const hasTpl = out.template_id != null;
    const hasBody = out.body != null;
    if (!hasTpl && !hasBody) {
      errors.push("step requires template_id or inline body");
    }
  }

  return { data: out, errors };
}

/**
 * Compute the UTC ISO timestamp when a specific step should fire,
 * given the enrollment time. Uses BRT (UTC-3, no DST since 2019)
 * for the time_of_day interpretation.
 *
 * Rounding rule: if the computed moment is already in the past
 * (because enrolled_at is later than that day's target hour),
 * bump forward to the next occurrence — the step still fires,
 * just at the next allowed slot. This matches the cron's window
 * bumping in slots.js.
 */
export function computeStepDueAt(enrolledAt, dayOffset, timeOfDayBrt) {
  const enrolled = new Date(enrolledAt);
  const target = new Date(enrolled);
  target.setUTCDate(target.getUTCDate() + dayOffset);
  // Set to `timeOfDayBrt` BRT — which is `timeOfDayBrt + 3` in UTC.
  target.setUTCHours(timeOfDayBrt + 3, 0, 0, 0);
  if (target.getTime() < Date.now()) {
    // Missed slot — push to the next day at the same time.
    target.setUTCDate(target.getUTCDate() + 1);
  }
  return target.toISOString();
}

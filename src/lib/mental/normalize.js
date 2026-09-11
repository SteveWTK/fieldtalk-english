// src/lib/mental/normalize.js
//
// Payload validation for mental_activities. Partial-friendly.

import { ACTIVITY_TYPES, MOOD_KEYS } from "@/lib/mental/constants";

const MAX_TITLE = 120;
const MAX_SUBTITLE = 240;
const MAX_URL = 2048;

/**
 * Build a Postgres-ready update for a mental_activities row from a
 * partial payload. Returns { data, errors }.
 */
export function buildMentalActivityUpdate(body, opts = {}) {
  const errors = [];
  const out = {};
  const has = (k) => body && Object.prototype.hasOwnProperty.call(body, k);

  if (opts.requireAll || has("activity_type")) {
    const raw = body?.activity_type;
    if (!ACTIVITY_TYPES.includes(raw)) errors.push("activity_type invalid");
    else out.activity_type = raw;
  }

  if (opts.requireAll || has("title")) {
    out.title = pickLangBundle(body?.title, "title", errors, MAX_TITLE, true);
  }
  if (has("subtitle")) {
    out.subtitle = pickLangBundle(
      body.subtitle,
      "subtitle",
      errors,
      MAX_SUBTITLE,
      false,
    );
  }

  if (has("duration_seconds")) {
    const raw = body.duration_seconds;
    if (raw == null || raw === "") out.duration_seconds = null;
    else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) errors.push("duration_seconds >= 0");
      else out.duration_seconds = Math.floor(n);
    }
  }

  if (has("content")) {
    const raw = body.content;
    if (raw == null) out.content = {};
    else if (typeof raw !== "object" || Array.isArray(raw)) {
      errors.push("content must be an object");
    } else {
      out.content = raw;
    }
  }

  if (has("moods")) {
    const raw = body.moods;
    if (raw == null) out.moods = [];
    else if (!Array.isArray(raw)) errors.push("moods must be array");
    else {
      out.moods = raw
        .filter((m) => typeof m === "string" && MOOD_KEYS.includes(m))
        .slice(0, 10);
    }
  }

  for (const k of ["audio_url_pt", "audio_url_en", "cover_image_url"]) {
    if (has(k)) {
      const raw = body[k];
      if (raw == null || raw === "") out[k] = null;
      else if (typeof raw !== "string" || raw.length > MAX_URL) {
        errors.push(`${k} invalid`);
      } else out[k] = raw.trim();
    }
  }

  if (has("featured")) out.featured = body.featured === true;
  if (has("active")) out.active = body.active === true;
  if (has("sort_order")) {
    const n = Number(body.sort_order);
    if (!Number.isFinite(n)) errors.push("sort_order invalid");
    else out.sort_order = Math.floor(n);
  }

  return { data: out, errors };
}

function pickLangBundle(raw, name, errors, maxChars, required) {
  if (raw == null) {
    if (required) errors.push(`${name} required`);
    return null;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    errors.push(`${name} must be {pt, en}`);
    return null;
  }
  const pt =
    typeof raw.pt === "string" ? raw.pt.trim().slice(0, maxChars) : "";
  const en =
    typeof raw.en === "string" ? raw.en.trim().slice(0, maxChars) : "";
  if (required && !pt && !en) {
    errors.push(`${name}: at least one of pt/en required`);
    return null;
  }
  return { pt, en };
}

// src/lib/broadcasts/template-validation.js
//
// Shared payload validator for whatsapp_broadcast_templates. Lives
// outside src/app/api because Next.js's App Router only allows a
// fixed set of exports from a `route.js` file (HTTP method handlers
// + a small config allowlist) — any other named export fails the
// type check at build time. Putting the validator here keeps both
// POST (create) and PATCH (update) route files thin and lets them
// import from the same source of truth.

import { VALID_BROADCAST_LANGUAGES } from "@/lib/broadcasts/config";

const VALID_CADENCES = new Set(["daily", "weekly", "monthly"]);
const VALID_DAY_KEYS = new Set([
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
]);

/**
 * Validate a whatsapp_broadcast_templates POST/PATCH payload.
 * Returns { data } on success (fields normalised + defaults filled),
 * or { error } with a human-readable message on failure.
 *
 * Callers early-return NextResponse.json({ error }, { status: 400 })
 * when error is set.
 */
export function validateTemplatePayload(payload) {
  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  if (name.length < 3 || name.length > 120) {
    return { error: "name must be 3–120 characters" };
  }

  const bodyIn = payload?.body;
  if (!bodyIn || typeof bodyIn !== "object" || Array.isArray(bodyIn)) {
    return { error: "body must be an object of language → text" };
  }
  const body = {};
  for (const [lang, text] of Object.entries(bodyIn)) {
    if (!VALID_BROADCAST_LANGUAGES.has(lang)) continue;
    if (typeof text !== "string") continue;
    const trimmed = text.trim();
    if (!trimmed) continue;
    if (trimmed.length > 3000) {
      return { error: `body[${lang}] too long (max 3000 chars)` };
    }
    body[lang] = trimmed;
  }
  if (Object.keys(body).length === 0) {
    return { error: "at least one language body is required" };
  }

  const cadence = payload?.cadence;
  if (!VALID_CADENCES.has(cadence)) {
    return { error: "cadence must be daily, weekly, or monthly" };
  }

  const cadenceHourBrt = Number(payload?.cadence_hour_brt);
  if (
    !Number.isInteger(cadenceHourBrt) ||
    cadenceHourBrt < 0 ||
    cadenceHourBrt > 23
  ) {
    return { error: "cadence_hour_brt must be 0–23" };
  }

  let cadenceDayOfWeek = null;
  let cadenceDayOfMonth = null;
  if (cadence === "weekly") {
    cadenceDayOfWeek = Number(payload?.cadence_day_of_week);
    if (
      !Number.isInteger(cadenceDayOfWeek) ||
      cadenceDayOfWeek < 0 ||
      cadenceDayOfWeek > 6
    ) {
      return { error: "cadence_day_of_week must be 0–6 (Sun..Sat) for weekly" };
    }
  }
  if (cadence === "monthly") {
    cadenceDayOfMonth = Number(payload?.cadence_day_of_month);
    if (
      !Number.isInteger(cadenceDayOfMonth) ||
      cadenceDayOfMonth < 1 ||
      cadenceDayOfMonth > 28
    ) {
      return { error: "cadence_day_of_month must be 1–28 for monthly" };
    }
  }

  const targetFilter =
    payload?.target_filter && typeof payload.target_filter === "object"
      ? payload.target_filter
      : {};

  const interval = Number(payload?.interval_seconds);
  const intervalSeconds =
    Number.isInteger(interval) && interval >= 3 && interval <= 60
      ? interval
      : 8;

  const winStart = Number(payload?.window_start_hour_brt);
  const windowStart =
    Number.isInteger(winStart) && winStart >= 0 && winStart <= 23
      ? winStart
      : 8;

  const winEnd = Number(payload?.window_end_hour_brt);
  const windowEnd =
    Number.isInteger(winEnd) && winEnd >= 1 && winEnd <= 24 ? winEnd : 21;

  if (windowEnd <= windowStart) {
    return {
      error: "window_end_hour_brt must be greater than window_start_hour_brt",
    };
  }

  let sendOnDays = ["mon", "tue", "wed", "thu", "fri", "sat"];
  if (Array.isArray(payload?.send_on_days)) {
    const clean = payload.send_on_days.filter(
      (d) => typeof d === "string" && VALID_DAY_KEYS.has(d),
    );
    if (clean.length === 0) {
      return { error: "send_on_days must include at least one day" };
    }
    sendOnDays = clean;
  }

  const active = payload?.active !== false; // default true

  return {
    data: {
      name,
      body,
      target_filter: targetFilter,
      cadence,
      cadence_day_of_week: cadenceDayOfWeek,
      cadence_day_of_month: cadenceDayOfMonth,
      cadence_hour_brt: cadenceHourBrt,
      interval_seconds: intervalSeconds,
      window_start_hour_brt: windowStart,
      window_end_hour_brt: windowEnd,
      send_on_days: sendOnDays,
      active,
    },
  };
}

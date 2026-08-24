// src/lib/broadcasts/slots.js
//
// Slot scheduling — computes the exact UTC moment each recipient's
// message should be sent, given a broadcast's interval + business-
// hours window + allowed weekdays.
//
// Called at FAN-OUT time (not dispatch time) so the dispatcher stays
// simple: it just processes pending rows where scheduled_slot <= now.
// Any recipient whose "natural" slot falls outside the window or on
// a blocked day gets bumped forward to the next allowed moment.
//
// Timezone: all window/day arithmetic is in America/Sao_Paulo (BRT,
// UTC-3, no DST since 2019). We use Intl.DateTimeFormat with
// timeZone: 'America/Sao_Paulo' for parsing (DST-safe) and a fixed
// +3h shift for constructing "next 9:00 BRT" moments (stable
// because Brazil abolished DST — the day this reverses, we'd need
// to move construction through Intl too).

const BR_TZ = "America/Sao_Paulo";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
// Intl short weekday strings → our short keys. `en-US` "short" gives
// "Sun", "Mon" etc; we lowercase.
const INTL_WEEKDAY_TO_KEY = {
  Sun: "sun",
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
};

/**
 * Get BRT-local parts of a Date. Returns { year, month, day, hour,
 * minute, weekday } where weekday is a short key like 'mon'.
 */
export function brtParts(date) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: BR_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const pick = (t) => parts.find((p) => p.type === t)?.value ?? "";
  const hourRaw = pick("hour");
  // Intl returns "24" for midnight on some locales — normalise to 0.
  const hour = hourRaw === "24" ? 0 : parseInt(hourRaw, 10);
  return {
    year: parseInt(pick("year"), 10),
    month: parseInt(pick("month"), 10),
    day: parseInt(pick("day"), 10),
    hour,
    minute: parseInt(pick("minute"), 10),
    weekday: INTL_WEEKDAY_TO_KEY[pick("weekday")] || "mon",
  };
}

/**
 * Construct a Date representing a specific BRT wall-clock moment.
 * Brazil is fixed UTC-3 since 2019, so BRT hour X = UTC hour X+3.
 * @returns {Date}
 */
export function brtDate(year, month, day, hour, minute = 0) {
  // Note: JS month is 0-indexed. Callers pass 1..12; we subtract.
  return new Date(Date.UTC(year, month - 1, day, hour + 3, minute));
}

/**
 * Add N days to a BRT-local date (Y/M/D), returning a new (Y/M/D)
 * tuple that respects month/year rollover.
 */
function addBrtDays(year, month, day, n) {
  const d = new Date(Date.UTC(year, month - 1, day + n));
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * Advance a candidate Date to the next moment that lies inside the
 * broadcast's send window AND on an allowed weekday. If the candidate
 * is already valid, returns it unchanged.
 *
 * @param {Date} candidate
 * @param {{
 *   window_start_hour_brt: number,
 *   window_end_hour_brt: number,
 *   send_on_days: string[]
 * }} config
 * @returns {Date}
 */
export function nextAllowedSlot(candidate, config) {
  const start = config.window_start_hour_brt;
  const end = config.window_end_hour_brt;
  const allowedDays = new Set(config.send_on_days || WEEKDAY_KEYS);

  // Safety cap — should never trigger unless someone passes an
  // empty send_on_days AND an impossible window. Prevents an
  // infinite loop.
  for (let i = 0; i < 400; i++) {
    const p = brtParts(candidate);

    if (!allowedDays.has(p.weekday)) {
      // Jump to start-of-next-day at window_start_hour_brt.
      const next = addBrtDays(p.year, p.month, p.day, 1);
      candidate = brtDate(next.year, next.month, next.day, start, 0);
      continue;
    }

    if (p.hour < start) {
      // Bring forward to today's window opening.
      candidate = brtDate(p.year, p.month, p.day, start, 0);
      continue;
    }

    if (p.hour >= end) {
      // Push to tomorrow's window opening.
      const next = addBrtDays(p.year, p.month, p.day, 1);
      candidate = brtDate(next.year, next.month, next.day, start, 0);
      continue;
    }

    return candidate;
  }

  // Fallback: return the candidate unchanged rather than crash.
  // The dispatcher will still process it as soon as it's past.
  console.warn(
    "[broadcasts/slots] nextAllowedSlot iteration cap hit — check config",
    config,
  );
  return candidate;
}

/**
 * Compute the send slot for each recipient in a broadcast, given the
 * broadcast's config. Slots are packed as tightly as possible while
 * respecting the interval and staying inside allowed windows/days.
 *
 * The first recipient starts at max(scheduled_for or now, next
 * allowed slot from now). Each subsequent recipient's slot =
 * previous slot + interval_seconds, then bumped to the next allowed
 * slot if it fell outside the window (e.g. the window closed mid-batch,
 * so the next batch starts at tomorrow's window opening).
 *
 * @param {number} recipientCount
 * @param {{
 *   scheduled_for: Date | null,
 *   interval_seconds: number,
 *   window_start_hour_brt: number,
 *   window_end_hour_brt: number,
 *   send_on_days: string[],
 * }} config
 * @returns {Date[]} slots — one per recipient, oldest first.
 */
export function computeRecipientSlots(recipientCount, config) {
  if (recipientCount <= 0) return [];
  const startCandidate =
    config.scheduled_for instanceof Date
      ? new Date(Math.max(config.scheduled_for.getTime(), Date.now()))
      : new Date();

  const intervalMs = Math.max(1, config.interval_seconds) * 1000;

  const slots = [];
  let cursor = nextAllowedSlot(startCandidate, config);
  slots.push(cursor);

  for (let i = 1; i < recipientCount; i++) {
    const naive = new Date(cursor.getTime() + intervalMs);
    cursor = nextAllowedSlot(naive, config);
    slots.push(cursor);
  }

  return slots;
}

/**
 * Utility for the templates cron: has `date` already passed today's
 * cadence_hour_brt on the given day? Used to decide "should this
 * template generate a broadcast right now?".
 */
export function hasBrtHourPassed(date, cadenceHourBrt) {
  const p = brtParts(date);
  return p.hour >= cadenceHourBrt;
}

/**
 * Slot allocation for staggered WhatsApp broadcasts.
 *
 * Given a start moment, a per-recipient interval, a business-hour
 * window, and a "weekends allowed" flag, distribute N recipients
 * across a sequence of timestamps.
 *
 * Rules:
 *   - Slot 1 = the later of `startAt` and today's business-hour start.
 *   - Each subsequent slot = previous + `intervalSeconds`.
 *   - If a computed slot falls OUTSIDE the business-hour window OR on
 *     a disallowed weekday, jump forward to the next valid instant.
 *   - Sunday is ALWAYS excluded (WhatsApp culture: don't message on
 *     Sundays). Saturday is opt-in via `weekendsAllowed`.
 *
 * All calculations are in the school's local time (America/Fortaleza,
 * UTC-3, no DST). We work in millisecond arithmetic and use a helper
 * to convert to/from BRT wall-clock components.
 */

const BRT_OFFSET_MIN = -3 * 60; // BRT is UTC-3

/** BRT wall-clock components of a Date. */
function brtParts(d: Date): {
  year: number;
  month: number; // 1-12
  day: number;
  weekday: number; // 0=Sun ... 6=Sat
  hour: number;
  minute: number;
  second: number;
} {
  // Shift the UTC epoch by BRT offset so getUTC* gives BRT wall-clock.
  const shifted = new Date(d.getTime() + BRT_OFFSET_MIN * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
    second: shifted.getUTCSeconds(),
  };
}

/** Build a Date from BRT wall-clock components. */
function fromBrt(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute = 0,
  second = 0
): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return new Date(asUtc - BRT_OFFSET_MIN * 60_000);
}

/** Move `d` to the next valid business moment. Advances by whole days
 *  when needed; on the target day, snaps to the start hour. */
function nextValidMoment(
  d: Date,
  startH: number,
  endH: number,
  weekendsAllowed: boolean
): Date {
  const cursor = new Date(d);
  // Loop-guard: worst case we walk a full week + a bit.
  for (let i = 0; i < 14; i++) {
    const p = brtParts(cursor);
    const dayOk =
      p.weekday !== 0 && (weekendsAllowed || p.weekday !== 6);
    const hourOk = p.hour >= startH && p.hour < endH;
    if (dayOk && hourOk) return cursor;
    if (!dayOk) {
      // Advance to the START of the next day in BRT.
      const next = fromBrt(p.year, p.month, p.day, startH, 0, 0);
      // If we're already past today's start hour, next same-day is
      // "today at startH" which is in the past — jump one full day.
      const nextMs =
        cursor.getTime() >= next.getTime()
          ? next.getTime() + 86_400_000
          : next.getTime();
      cursor.setTime(nextMs);
      continue;
    }
    if (p.hour < startH) {
      cursor.setTime(fromBrt(p.year, p.month, p.day, startH, 0, 0).getTime());
      continue;
    }
    // p.hour >= endH: jump to next day's start.
    const nextDayStart = fromBrt(p.year, p.month, p.day, startH, 0, 0).getTime() + 86_400_000;
    cursor.setTime(nextDayStart);
  }
  return cursor;
}

/**
 * Return N ISO timestamps for the N recipients.
 *
 * @param recipientCount   number of slots to produce
 * @param startAt          earliest permitted moment (usually the
 *                         broadcast's `agendado_para`)
 * @param intervalSeconds  spacing between adjacent sends
 * @param janelaInicioH    business-hour window start (BRT hour, 0-23)
 * @param janelaFimH       business-hour window end (BRT hour, exclusive)
 * @param weekendsAllowed  if true, Saturdays are OK; Sundays never
 */
export function buildSlots(args: {
  recipientCount: number;
  startAt: Date;
  intervalSeconds: number;
  janelaInicioH: number;
  janelaFimH: number;
  weekendsAllowed: boolean;
}): Date[] {
  const {
    recipientCount,
    startAt,
    intervalSeconds,
    janelaInicioH,
    janelaFimH,
    weekendsAllowed,
  } = args;
  if (recipientCount <= 0) return [];

  const slots: Date[] = [];
  let cursor = nextValidMoment(
    startAt,
    janelaInicioH,
    janelaFimH,
    weekendsAllowed
  );
  for (let i = 0; i < recipientCount; i++) {
    slots.push(new Date(cursor));
    // Advance and then re-snap to the next valid window if we've
    // spilled past the end hour.
    cursor = new Date(cursor.getTime() + intervalSeconds * 1000);
    cursor = nextValidMoment(
      cursor,
      janelaInicioH,
      janelaFimH,
      weekendsAllowed
    );
  }
  return slots;
}

/** Convenience wrapper — returns ISO strings for direct DB insert. */
export function buildSlotIsos(
  args: Parameters<typeof buildSlots>[0]
): string[] {
  return buildSlots(args).map((d) => d.toISOString());
}

/**
 * Human-readable preview: "cerca de 40 min, terminando 09:47 (hoje)".
 * Handles the multi-day case: "termina 08:12 amanhã".
 */
export function previewFinishTime(args: Parameters<typeof buildSlots>[0]): {
  totalCount: number;
  firstAt: Date | null;
  lastAt: Date | null;
  spansMultipleDays: boolean;
} {
  const slots = buildSlots(args);
  if (slots.length === 0) {
    return {
      totalCount: 0,
      firstAt: null,
      lastAt: null,
      spansMultipleDays: false,
    };
  }
  const first = slots[0];
  const last = slots[slots.length - 1];
  const firstDay = brtParts(first);
  const lastDay = brtParts(last);
  const spansMultipleDays =
    firstDay.year !== lastDay.year ||
    firstDay.month !== lastDay.month ||
    firstDay.day !== lastDay.day;
  return {
    totalCount: slots.length,
    firstAt: first,
    lastAt: last,
    spansMultipleDays,
  };
}

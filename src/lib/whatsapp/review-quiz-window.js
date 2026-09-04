// src/lib/whatsapp/review-quiz-window.js
//
// "Is this the right moment (in the player's local time) to send a
// review quiz?" gate. Extracted for testability + so the cron doesn't
// have to think about Intl.DateTimeFormat internals inline.

/**
 * Return true when `at` (a Date) sits inside [startHour, endHour) in
 * the given IANA timezone. startHour inclusive, endHour exclusive.
 *
 *   isInLocalWindow(new Date(), "America/Sao_Paulo", 9, 20)
 *     → true when the player's local hour is 9, 10, 11, ..., 19
 *     → false at 8:59 or 20:00
 *
 * Uses Intl.DateTimeFormat's hourCycle:'h23' to get 0-23 hours, which
 * avoids the "24 vs 00" ambiguity of h24. Falls back to UTC if the
 * timezone string is invalid (defensive — the cron is upstream of any
 * validation).
 */
export function isInLocalWindow(at, timezone, startHour, endHour) {
  let hour;
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(at);
    const hourPart = parts.find((p) => p.type === "hour");
    hour = hourPart ? Number(hourPart.value) : NaN;
  } catch {
    // Invalid IANA name — fall back to UTC. Better than throwing and
    // knocking the cron over.
    hour = at.getUTCHours();
  }
  if (!Number.isFinite(hour)) return false;
  return hour >= startHour && hour < endHour;
}

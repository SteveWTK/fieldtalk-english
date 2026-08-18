/**
 * Phone-number normalization — Brazilian-first with an international
 * pass-through fallback.
 *
 * Every outbound WhatsApp / notification call must send numbers in the
 * exact shape Z-API expects (`55DDDNNNNNNNNN`). This module canonicalises
 * every plausibly-Brazilian input to that shape.
 *
 * International fallback: if the number cannot be validated as Brazilian
 * BUT looks like a plausible E.164 international number (11-15 digits,
 * doesn't start with 55), we pass it through as-is. Covers overseas
 * users (Stephen's UK phone during dev, expats, future markets). Z-API
 * validates international numbers on its side.
 *
 * Rules (Brazilian per ANATEL):
 *   - Country code is `55`.
 *   - DDD is two digits, must be in the 11..99 range.
 *   - Mobile: 9-digit subscriber part, first digit is `9`.
 *   - Landline: 8-digit subscriber part, first digit is 2..5.
 *   - Legacy mobile (10-digit, first digit 6..9): auto-prepend the
 *     mandatory `9`. Deterministic — landlines never start with 6..9.
 *
 * Returns:
 *   { ok: true, e164 }   — canonicalised, digits-only, no `+` prefix.
 *   { ok: false, reason } — structured reason for logging.
 */

export function normalizeBrazilianPhone(input) {
  const raw = (input ?? "").replace(/\D/g, "");
  if (!raw) return { ok: false, reason: "empty" };

  const br = tryBrazilian(raw);
  if (br.ok) return br;

  if (raw.length >= 11 && raw.length <= 15 && !raw.startsWith("55")) {
    return { ok: true, e164: raw };
  }

  return br;
}

function tryBrazilian(raw) {
  let core = raw;
  if (raw.startsWith("55") && (raw.length === 12 || raw.length === 13)) {
    core = raw.slice(2);
  }

  if (core.length !== 10 && core.length !== 11) {
    return { ok: false, reason: `unexpected_length_${core.length}` };
  }

  const ddd = core.slice(0, 2);
  const dddNum = Number(ddd);
  if (!Number.isInteger(dddNum) || dddNum < 11 || dddNum > 99) {
    return { ok: false, reason: `invalid_ddd_${ddd}` };
  }

  const subscriber = core.slice(2);
  const firstDigit = subscriber[0];

  if (subscriber.length === 9) {
    if (firstDigit !== "9") {
      return { ok: false, reason: `mobile_missing_leading_9_${firstDigit}` };
    }
    return { ok: true, e164: `55${ddd}${subscriber}` };
  }

  if (firstDigit >= "2" && firstDigit <= "5") {
    return { ok: true, e164: `55${ddd}${subscriber}` };
  }
  if (firstDigit >= "6" && firstDigit <= "9") {
    return { ok: true, e164: `55${ddd}9${subscriber}` };
  }
  return { ok: false, reason: `invalid_subscriber_first_digit_${firstDigit}` };
}

export function normalizePhoneOrNull(input) {
  const res = normalizeBrazilianPhone(input);
  return res.ok ? res.e164 : null;
}

/** Strip masks / non-digits. Useful for input handlers. */
export function onlyDigits(s) {
  return String(s ?? "").replace(/\D/g, "");
}

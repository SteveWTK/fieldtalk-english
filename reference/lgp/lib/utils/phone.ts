/**
 * Phone-number normalization — Brazilian-first with an international
 * pass-through fallback.
 *
 * INTEGRATIONS.md §4 requires a shared normaliser so every outbound
 * WhatsApp / Asaas / notification call sends numbers in the exact shape
 * providers expect. Primary target is Brazilian numbers (SPONTE-migrated
 * data is inconsistently formatted — mixes of `(86) 9 9999-8888`,
 * `86999998888`, `+55 86 99999-8888`, `55 86 9999 8888`, and legacy
 * 10-digit mobiles missing the leading 9). We canonicalise every
 * plausibly-Brazilian input to `55DDDNNNNNNNNN`.
 *
 * International fallback: if the number cannot be validated as Brazilian
 * BUT looks like a plausible E.164 international number (11-15 digits,
 * doesn't start with 55), we pass it through as-is. This covers expat
 * families and staff / test messages from foreign numbers (e.g. Stephen's
 * UK phone). Z-API validates international numbers on its side.
 *
 * Rules (Brazilian per ANATEL):
 *   - Country code is `55`.
 *   - DDD is two digits, must be in the 11..99 range.
 *   - Mobile: 9-digit subscriber part, first digit is `9`.
 *   - Landline: 8-digit subscriber part, first digit is 2..5.
 *   - Legacy mobile (10-digit, first digit 6..9): auto-prepend the
 *     mandatory `9`. Deterministic — landlines never start with 6..9.
 *
 * Non-goals:
 *   - Not touching CPF/CEP/RG — those are handled by masks.ts.
 *   - Not judging whether a number is reachable — Z-API will tell us.
 */

export type PhoneNormalization =
  | { ok: true; e164: string }
  | { ok: false; reason: string };

/**
 * Normaliser. Returns a canonical E.164-flavored digits-only string, or
 * a structured error so callers can log the reason without inventing one.
 *
 * Brazilian numbers get full validation and are canonicalised to
 * `55DDDNNNNNNNNN`. International numbers that don't fit the Brazilian
 * pattern pass through unchanged if they look like plausible E.164
 * (11-15 digits, doesn't start with 55).
 */
export function normalizeBrazilianPhone(input: string): PhoneNormalization {
  const raw = (input ?? "").replace(/\D/g, "");
  if (!raw) return { ok: false, reason: "empty" };

  // Try Brazilian first.
  const br = tryBrazilian(raw);
  if (br.ok) return br;

  // International fallback: pass through if it looks like a plausible
  // international E.164 (11-15 digits) that isn't Brazilian. The 55
  // exclusion avoids double-processing numbers that failed Brazilian
  // validation for a real reason (wrong DDD, malformed subscriber).
  if (raw.length >= 11 && raw.length <= 15 && !raw.startsWith("55")) {
    return { ok: true, e164: raw };
  }

  return br;
}

function tryBrazilian(raw: string): PhoneNormalization {
  // Strip country code if present so we can validate DDD + subscriber
  // uniformly. A leading `55` is only treated as country code when the
  // remaining length makes sense as a Brazilian number.
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

  // 11-digit format = modern mobile. First subscriber digit MUST be 9.
  if (subscriber.length === 9) {
    if (firstDigit !== "9") {
      return { ok: false, reason: `mobile_missing_leading_9_${firstDigit}` };
    }
    return { ok: true, e164: `55${ddd}${subscriber}` };
  }

  // 10-digit format = landline (2-5) OR legacy mobile (6-9, missing the 9).
  if (firstDigit >= "2" && firstDigit <= "5") {
    return { ok: true, e164: `55${ddd}${subscriber}` };
  }
  if (firstDigit >= "6" && firstDigit <= "9") {
    return { ok: true, e164: `55${ddd}9${subscriber}` };
  }
  return { ok: false, reason: `invalid_subscriber_first_digit_${firstDigit}` };
}

/**
 * Convenience wrapper for callers that don't need to distinguish "why".
 * Returns the E.164 string or null.
 */
export function normalizePhoneOrNull(input: string): string | null {
  const res = normalizeBrazilianPhone(input);
  return res.ok ? res.e164 : null;
}

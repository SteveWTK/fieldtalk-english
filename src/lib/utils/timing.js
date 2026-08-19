// src/lib/utils/timing.js
//
// Constant-time string comparison for shared-secret validation.
// Used by the Z-API webhook route to compare the received token
// against ZAPI_WEBHOOK_TOKEN without early-exiting on the first
// mismatched character. The security value here is modest (webhook
// tokens leak via timing far less readily than password hashes) but
// the habit is worth keeping consistent across all our webhook
// receivers.

/**
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
export function constantTimeEquals(a, b) {
  const sa = String(a ?? "");
  const sb = String(b ?? "");
  // Different lengths are always unequal, but we still run a full
  // constant-time loop over the longer string so the timing signal
  // doesn't leak the length differential. XOR-based accumulation.
  const len = Math.max(sa.length, sb.length);
  let mismatch = sa.length ^ sb.length;
  for (let i = 0; i < len; i++) {
    // charCodeAt returns NaN past the string end; coerce to 0 so the
    // XOR is well-defined without special-casing.
    const ca = i < sa.length ? sa.charCodeAt(i) : 0;
    const cb = i < sb.length ? sb.charCodeAt(i) : 0;
    mismatch |= ca ^ cb;
  }
  return mismatch === 0;
}

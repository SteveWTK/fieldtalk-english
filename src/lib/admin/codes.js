// src/lib/admin/codes.js
//
// Shared utilities for the bulk-code admin flows. Two concerns:
//   - generateCode() builds a random partner-friendly code with an
//     unambiguous alphabet (no 0/O/1/I/L) so codes are safe to dictate
//     or print without read errors.
//   - downloadCSV() is a client-side helper that turns an array of
//     row objects into a CSV file and triggers a browser download.

import crypto from "crypto";

// 32 chars, all unambiguous in print and speech. 6 chars → ~1B
// combinations, which is far more than we'll ever issue.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateCode({ prefix = "", suffixLength = 6 } = {}) {
  const bytes = crypto.randomBytes(suffixLength);
  let suffix = "";
  for (let i = 0; i < suffixLength; i++) {
    suffix += ALPHABET[bytes[i] % ALPHABET.length];
  }
  // Force the partner-prefix uppercase + strip whitespace so all
  // generated codes look uniform regardless of the form input.
  const clean = String(prefix).trim().toUpperCase();
  return clean ? `${clean}-${suffix}` : suffix;
}

/**
 * Generate `count` unique codes for a given prefix. Local dedup just
 * in case crypto.randomBytes hands us a freak collision — the caller
 * still owns the uniqueness contract against the persistent store.
 */
export function generateUniqueCodes({ prefix, count, suffixLength = 6 }) {
  const seen = new Set();
  const out = [];
  while (out.length < count) {
    const code = generateCode({ prefix, suffixLength });
    if (seen.has(code)) continue;
    seen.add(code);
    out.push(code);
  }
  return out;
}

/**
 * Client-only. Builds a CSV from `rows` (array of plain objects with
 * the same shape) and triggers a browser download. The header row
 * is taken from the first object's keys.
 */
export function downloadCSV(rows, filename) {
  if (typeof window === "undefined" || !rows || rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const body = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => esc(r[h])).join(",")),
  ].join("\n");
  const blob = new Blob([body], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

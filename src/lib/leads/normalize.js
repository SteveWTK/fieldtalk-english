// src/lib/leads/normalize.js
//
// Shared lead-payload validation + normalisation. Used by both POST
// (create) and PATCH (update) endpoints so the same shape/rules apply.
//
// The normaliser is "partial-friendly": pass any subset of the fields
// and it returns { update, errors }. Missing fields aren't defaulted
// on update — only touched fields land in the SQL UPDATE.

import { normalizeBrazilianPhone } from "@/lib/utils/phone";
import {
  LEAD_STAGES,
  LEAD_TYPES,
  LEAD_SOURCES,
  AGE_GROUPS,
  ENGLISH_LEVELS,
  ORG_LEAD_TYPES,
} from "@/lib/leads/constants";

const MAX_NAME = 120;
const MAX_ORG_NAME = 160;
const MAX_ROLE = 80;
const MAX_SUMMARY = 500;
const MAX_TAG = 40;
const MAX_TAGS = 20;
const MAX_FREE_TEXT = 2000;

/**
 * Build a Postgres-ready update object from a partial payload.
 *
 * @param {object} body — arbitrary JSON from the client
 * @param {{ requireName?: boolean }} opts
 * @returns {{ update: object, errors: string[] }}
 */
export function buildLeadUpdate(body, opts = {}) {
  const errors = [];
  const update = {};
  const has = (k) => body && Object.prototype.hasOwnProperty.call(body, k);

  // ── required-on-create ─────────────────────────────────────────
  if (opts.requireName || has("full_name")) {
    const raw = body?.full_name;
    if (typeof raw !== "string" || !raw.trim()) {
      errors.push("full_name required");
    } else {
      update.full_name = raw.trim().slice(0, MAX_NAME);
    }
  }

  if (has("lead_type")) {
    const raw = body.lead_type;
    if (!LEAD_TYPES.includes(raw)) {
      errors.push(`lead_type must be one of: ${LEAD_TYPES.join(", ")}`);
    } else {
      update.lead_type = raw;
    }
  }

  // ── contact ────────────────────────────────────────────────────
  if (has("email")) {
    const raw = body.email;
    if (raw == null || raw === "") {
      update.email = null;
    } else if (typeof raw !== "string" || !/^\S+@\S+\.\S+$/.test(raw)) {
      errors.push("email invalid");
    } else {
      update.email = raw.trim().slice(0, 200);
    }
  }

  if (has("phone_e164")) {
    const raw = body.phone_e164;
    if (raw == null || raw === "") {
      update.phone_e164 = null;
    } else {
      const norm = normalizeBrazilianPhone(String(raw));
      if (!norm.ok) {
        errors.push(`phone invalid: ${norm.reason}`);
      } else {
        update.phone_e164 = norm.e164;
      }
    }
  }

  // ── type-specific ──────────────────────────────────────────────
  if (has("age_group")) {
    const raw = body.age_group;
    if (raw == null || raw === "") {
      update.age_group = null;
    } else if (!AGE_GROUPS.includes(raw)) {
      errors.push(`age_group must be one of: ${AGE_GROUPS.join(", ")}`);
    } else {
      update.age_group = raw;
    }
  }

  if (has("english_level")) {
    const raw = body.english_level;
    if (raw == null || raw === "") {
      update.english_level = null;
    } else if (!ENGLISH_LEVELS.includes(raw)) {
      errors.push(
        `english_level must be one of: ${ENGLISH_LEVELS.join(", ")}`,
      );
    } else {
      update.english_level = raw;
    }
  }

  if (has("positions")) {
    const raw = body.positions;
    if (raw == null) {
      update.positions = null;
    } else if (!Array.isArray(raw)) {
      errors.push("positions must be an array");
    } else {
      update.positions = raw
        .filter((v) => typeof v === "string" && v.trim())
        .map((v) => v.trim().slice(0, 8))
        .slice(0, 20);
    }
  }

  if (has("organization_name")) {
    const raw = body.organization_name;
    if (raw == null || raw === "") {
      update.organization_name = null;
    } else {
      update.organization_name = String(raw).trim().slice(0, MAX_ORG_NAME);
    }
  }

  if (has("role_at_org")) {
    const raw = body.role_at_org;
    if (raw == null || raw === "") {
      update.role_at_org = null;
    } else {
      update.role_at_org = String(raw).trim().slice(0, MAX_ROLE);
    }
  }

  if (has("staff_count")) {
    const raw = body.staff_count;
    if (raw == null || raw === "") {
      update.staff_count = null;
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
        errors.push("staff_count must be a non-negative integer");
      } else {
        update.staff_count = Math.floor(n);
      }
    }
  }

  // ── pipeline ───────────────────────────────────────────────────
  if (has("stage")) {
    const raw = body.stage;
    if (!LEAD_STAGES.includes(raw)) {
      errors.push(`stage must be one of: ${LEAD_STAGES.join(", ")}`);
    } else {
      update.stage = raw;
    }
  }

  if (has("source")) {
    const raw = body.source;
    if (!LEAD_SOURCES.includes(raw)) {
      errors.push(`source must be one of: ${LEAD_SOURCES.join(", ")}`);
    } else {
      update.source = raw;
    }
  }

  if (has("source_detail")) {
    const raw = body.source_detail;
    if (raw == null || raw === "") {
      update.source_detail = null;
    } else {
      update.source_detail = String(raw).trim().slice(0, 200);
    }
  }

  if (has("assigned_to")) {
    const raw = body.assigned_to;
    // Null / empty = unassigned; a UUID string = pass through (the FK
    // constraint will reject bogus values at write time).
    update.assigned_to = raw == null || raw === "" ? null : String(raw);
  }

  // ── geography ──────────────────────────────────────────────────
  for (const k of ["country", "state", "city"]) {
    if (has(k)) {
      const raw = body[k];
      if (raw == null || raw === "") {
        update[k] = null;
      } else {
        update[k] = String(raw).trim().slice(0, 100);
      }
    }
  }

  // ── pipeline value ─────────────────────────────────────────────
  if (has("estimated_value_cents")) {
    const raw = body.estimated_value_cents;
    if (raw == null || raw === "") {
      update.estimated_value_cents = null;
    } else {
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0) {
        errors.push("estimated_value_cents must be a non-negative number");
      } else {
        update.estimated_value_cents = Math.floor(n);
      }
    }
  }

  // ── tags ───────────────────────────────────────────────────────
  if (has("tags")) {
    const raw = body.tags;
    if (raw == null) {
      update.tags = [];
    } else if (Array.isArray(raw)) {
      update.tags = normalizeTagsArray(raw);
    } else if (typeof raw === "string") {
      // Accept CSV shorthand from the form ("warm, event-carioca").
      update.tags = normalizeTagsArray(raw.split(","));
    } else {
      errors.push("tags must be an array or comma-separated string");
    }
  }

  // ── freeform ───────────────────────────────────────────────────
  if (has("summary")) {
    const raw = body.summary;
    if (raw == null || raw === "") {
      update.summary = null;
    } else {
      update.summary = String(raw).trim().slice(0, MAX_SUMMARY);
    }
  }

  if (has("next_action_at")) {
    const raw = body.next_action_at;
    if (raw == null || raw === "") {
      update.next_action_at = null;
    } else {
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) {
        errors.push("next_action_at invalid date");
      } else {
        update.next_action_at = d.toISOString();
      }
    }
  }

  if (has("next_action_note")) {
    const raw = body.next_action_note;
    if (raw == null || raw === "") {
      update.next_action_note = null;
    } else {
      update.next_action_note = String(raw).trim().slice(0, MAX_FREE_TEXT);
    }
  }

  if (has("do_not_contact")) {
    update.do_not_contact = body.do_not_contact === true;
  }

  return { update, errors };
}

function normalizeTagsArray(arr) {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    if (typeof v !== "string") continue;
    const clean = v.trim().toLowerCase().slice(0, MAX_TAG);
    if (!clean || seen.has(clean)) continue;
    seen.add(clean);
    out.push(clean);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/**
 * Check whether the lead_type suggests organisation fields should be
 * present. Not enforced (all fields nullable) but useful in the
 * client-side form to decide which section to reveal.
 */
export function isOrgLeadType(leadType) {
  return ORG_LEAD_TYPES.has(leadType);
}

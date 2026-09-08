// src/lib/leads/templates.js
//
// Shared substitution + validation for lead message templates. Kept
// here (not on the API route) so the client can render preview text
// using the same substitution rules — no drift between preview and
// what actually goes out on WhatsApp.

const MAX_NAME = 120;
const MAX_BODY = 3000;
const MAX_TAG = 40;
const MAX_TAGS = 10;

const VALID_LEAD_TYPES = [
  "individual_player",
  "academy",
  "school",
  "club",
  "partner_other",
];

/**
 * Validate + normalise a template payload. Returns { data, errors }.
 * Partial-friendly: unlisted keys aren't defaulted, so PATCH can send
 * only the changed keys.
 */
export function normalizeTemplate(body, opts = {}) {
  const errors = [];
  const out = {};
  const has = (k) => body && Object.prototype.hasOwnProperty.call(body, k);

  if (opts.requireName || has("name")) {
    const raw = body?.name;
    if (typeof raw !== "string" || !raw.trim()) {
      errors.push("name required");
    } else {
      out.name = raw.trim().slice(0, MAX_NAME);
    }
  }

  if (opts.requireBody || has("body")) {
    const raw = body?.body;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      errors.push("body must be an object {pt, en}");
    } else {
      const pt =
        typeof raw.pt === "string" ? raw.pt.trim().slice(0, MAX_BODY) : "";
      const en =
        typeof raw.en === "string" ? raw.en.trim().slice(0, MAX_BODY) : "";
      if (!pt && !en) {
        errors.push("body needs at least one of pt / en filled");
      } else {
        out.body = { pt, en };
      }
    }
  }

  if (has("lead_type")) {
    const raw = body.lead_type;
    if (raw == null || raw === "") {
      out.lead_type = null;
    } else if (!VALID_LEAD_TYPES.includes(raw)) {
      errors.push("lead_type invalid");
    } else {
      out.lead_type = raw;
    }
  }

  if (has("active")) {
    out.active = body.active === true;
  }

  if (has("tags")) {
    const raw = body.tags;
    if (raw == null) {
      out.tags = [];
    } else if (Array.isArray(raw)) {
      out.tags = normalizeTagsArray(raw);
    } else if (typeof raw === "string") {
      out.tags = normalizeTagsArray(raw.split(","));
    } else {
      errors.push("tags must be an array or comma-separated string");
    }
  }

  return { data: out, errors };
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
 * Render a template body with lead-context substitution. Never
 * throws; unknown placeholders render as empty string (safer than
 * leaking raw `{foo}` to the customer).
 *
 * Supported placeholders:
 *   {name}       — lead's first name (or full_name if no split)
 *   {full_name}  — lead's full name
 *   {org}        — organisation name (empty for individual players)
 *   {city}       — lead.city
 *
 * @param {{ pt?: string, en?: string } | string} template
 * @param {'pt' | 'en'} lang
 * @param {{ full_name?: string, organization_name?: string, city?: string }} lead
 */
export function renderTemplate(template, lang, lead) {
  const raw = pickLangString(template, lang);
  if (!raw) return "";
  const vars = {
    name: firstName(lead?.full_name),
    full_name: lead?.full_name || "",
    org: lead?.organization_name || "",
    city: lead?.city || "",
  };
  return String(raw).replace(/\{(\w+)\}/g, (_m, key) =>
    typeof vars[key] === "string" ? vars[key] : "",
  );
}

export function pickLangString(bundle, lang) {
  if (typeof bundle === "string") return bundle;
  if (!bundle || typeof bundle !== "object") return "";
  return bundle[lang] || bundle.pt || bundle.en || "";
}

function firstName(fullName) {
  const trimmed = typeof fullName === "string" ? fullName.trim() : "";
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
}

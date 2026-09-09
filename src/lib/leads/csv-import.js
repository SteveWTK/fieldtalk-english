// src/lib/leads/csv-import.js
//
// Minimal RFC-4180-ish CSV parser + column-mapping heuristics for
// the leads importer. Kept in-house (no external dependency) because
// (a) the input shape is small and controlled — spreadsheet exports
// max ~2000 rows — and (b) an external parser would bloat the client
// bundle for a rarely-used admin surface.
//
// Handles: quoted fields with embedded commas, escaped double
// quotes ("" inside a quoted field), \r\n and \n line endings.
// Does NOT handle: multiline embedded newlines (rare in exports,
// and confuses more than it helps at this scale).

import { normalizeBrazilianPhone } from "@/lib/utils/phone";
import {
  LEAD_TYPES,
  LEAD_SOURCES,
  AGE_GROUPS,
  ENGLISH_LEVELS,
} from "@/lib/leads/constants";

// Header name → canonical field key. Case- + accent-insensitive
// match. Alternative spellings and PT/EN synonyms are all mapped
// to one canonical field so exports from different tools land in
// the right column.
const HEADER_ALIASES = {
  full_name: [
    "full_name",
    "fullname",
    "name",
    "nome",
    "nome_completo",
    "contact_name",
  ],
  email: ["email", "e_mail", "e mail", "correio", "correio_eletronico"],
  phone_e164: [
    "phone",
    "phone_e164",
    "telefone",
    "celular",
    "whatsapp",
    "mobile",
    "cellphone",
    "phone_number",
  ],
  lead_type: ["type", "lead_type", "tipo", "tipo_lead", "kind"],
  organization_name: [
    "organization",
    "organization_name",
    "organizacao",
    "org",
    "empresa",
    "academy",
    "school",
    "club",
    "company",
  ],
  role_at_org: ["role", "role_at_org", "cargo", "posicao_org", "position_org"],
  staff_count: ["staff", "staff_count", "funcionarios", "team_size"],
  source: ["source", "origem", "canal", "channel"],
  source_detail: ["source_detail", "detalhe_origem", "campaign", "event"],
  age_group: ["age", "age_group", "categoria", "faixa"],
  english_level: [
    "english_level",
    "level",
    "nivel_ingles",
    "nivel",
    "english",
    "ingles",
  ],
  positions: ["positions", "posicoes", "position", "posicao"],
  tags: ["tags", "labels", "etiquetas"],
  country: ["country", "pais"],
  state: ["state", "estado", "uf"],
  city: ["city", "cidade"],
  summary: ["summary", "resumo", "note", "notes", "observacao"],
};

/**
 * Parse a raw CSV string into an array of arrays. Returns
 * { headers, rows } where rows is an array of arrays sized to
 * match the header count. Never throws — malformed cells become
 * empty strings.
 */
export function parseCsv(text) {
  const lines = splitLines(text);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cells = parseRow(line);
    // Pad or truncate to header count so downstream index-safe.
    while (cells.length < headers.length) cells.push("");
    if (cells.length > headers.length) cells.length = headers.length;
    rows.push(cells);
  }
  return { headers, rows };
}

function splitLines(text) {
  return String(text).replace(/\r\n/g, "\n").split("\n");
}

/**
 * Parse a single CSV line. Handles quoted fields + escaped quotes.
 * Not spec-perfect on embedded newlines but sufficient for the
 * spreadsheet exports admin will paste in.
 */
function parseRow(line) {
  const cells = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuote = false;
        }
      } else {
        cur += c;
      }
    } else {
      if (c === ",") {
        cells.push(cur);
        cur = "";
      } else if (c === '"' && cur === "") {
        inQuote = true;
      } else {
        cur += c;
      }
    }
  }
  cells.push(cur);
  return cells.map((c) => c.trim());
}

/**
 * Given a list of header strings, produce a { canonicalKey: headerIndex }
 * mapping using HEADER_ALIASES. Unmapped headers are ignored (the
 * admin can manually remap them in the UI if needed).
 */
export function detectColumnMapping(headers) {
  const norm = headers.map((h) => normalizeHeader(h));
  const mapping = {};
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const idx = norm.indexOf(normalizeHeader(alias));
      if (idx >= 0) {
        mapping[key] = idx;
        break;
      }
    }
  }
  return mapping;
}

/** Lowercase, strip accents, collapse punctuation → single word. */
function normalizeHeader(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Turn one raw CSV row into a normalized lead payload using the
 * mapping. Returns { row, errors } — errors is a per-cell array,
 * empty when the row is clean. Rows with critical missing fields
 * (no name) are still returned so the preview UI can show them
 * with a red flag rather than silently dropping.
 */
export function normalizeRow(cells, mapping) {
  const errors = [];
  const val = (key) => {
    const idx = mapping[key];
    return idx == null ? "" : (cells[idx] ?? "").trim();
  };

  const full_name = val("full_name");
  if (!full_name) errors.push("full_name required");

  const row = {
    full_name,
    email: val("email") || null,
    phone_e164: null,
    lead_type: normalizeEnum(val("lead_type"), LEAD_TYPES, "individual_player"),
    organization_name: val("organization_name") || null,
    role_at_org: val("role_at_org") || null,
    staff_count: parseIntOrNull(val("staff_count")),
    source: normalizeEnum(val("source"), LEAD_SOURCES, "import"),
    source_detail: val("source_detail") || null,
    age_group: normalizeEnum(val("age_group"), AGE_GROUPS, null),
    english_level: normalizeEnum(val("english_level"), ENGLISH_LEVELS, null),
    positions: splitList(val("positions")),
    tags: splitList(val("tags")).map((t) => t.toLowerCase()),
    country: val("country") || null,
    state: val("state") || null,
    city: val("city") || null,
    summary: val("summary") || null,
  };

  // Email loose check — a helpful warning, not a hard error.
  if (row.email && !/^\S+@\S+\.\S+$/.test(row.email)) {
    errors.push("email looks invalid");
  }

  // Phone normalisation — Brazilian-aware. Keep the raw input as
  // the original in errors so the admin can spot the fix easily.
  const rawPhone = val("phone_e164");
  if (rawPhone) {
    const norm = normalizeBrazilianPhone(rawPhone);
    if (norm.ok) row.phone_e164 = norm.e164;
    else errors.push(`phone invalid (${norm.reason}): ${rawPhone}`);
  }

  return { row, errors };
}

function normalizeEnum(raw, allowed, fallback) {
  if (!raw) return fallback;
  const norm = normalizeHeader(raw);
  const match = allowed.find((v) => normalizeHeader(v) === norm);
  return match || fallback;
}

function parseIntOrNull(raw) {
  if (!raw) return null;
  const n = Number(String(raw).replace(/[^\d-]/g, ""));
  return Number.isFinite(n) ? Math.floor(n) : null;
}

function splitList(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

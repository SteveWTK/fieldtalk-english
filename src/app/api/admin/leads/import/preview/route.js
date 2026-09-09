// src/app/api/admin/leads/import/preview/route.js
//
// POST /api/admin/leads/import/preview
//   Body: multipart form with `file` (a .csv) OR JSON { csv: "raw string" }.
//
// Returns a preview: parsed headers, detected column mapping, normalized
// rows with per-row errors, duplicate counts by phone + email. Does NOT
// write to the DB — the admin then calls /commit with the confirmed
// mapping + duplicate strategy.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { parseCsv, detectColumnMapping, normalizeRow } from "@/lib/leads/csv-import";

const MAX_ROWS = 2000;
const MAX_BYTES = 2 * 1024 * 1024;

export async function POST(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  let csvText = "";

  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await request.formData();
      const file = form.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "file_required" }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "file_too_large", limit_bytes: MAX_BYTES },
          { status: 413 },
        );
      }
      csvText = await file.text();
    } catch (err) {
      return NextResponse.json(
        { error: "multipart_parse_failed", message: err?.message },
        { status: 400 },
      );
    }
  } else {
    try {
      const body = await request.json();
      csvText = typeof body?.csv === "string" ? body.csv : "";
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    if (csvText.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "csv_too_large", limit_bytes: MAX_BYTES },
        { status: 413 },
      );
    }
  }

  if (!csvText.trim()) {
    return NextResponse.json({ error: "empty_csv" }, { status: 400 });
  }

  const { headers, rows } = parseCsv(csvText);
  if (headers.length === 0) {
    return NextResponse.json({ error: "no_headers" }, { status: 400 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ error: "no_rows" }, { status: 400 });
  }
  if (rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: "too_many_rows", limit: MAX_ROWS },
      { status: 413 },
    );
  }

  const mapping = detectColumnMapping(headers);
  const normalized = rows.map((cells, i) => {
    const { row, errors } = normalizeRow(cells, mapping);
    return { line: i + 2, ...row, _errors: errors }; // +2: header is line 1
  });

  // Duplicate detection against existing leads by phone (canonical)
  // OR email (lower-cased). One trip fetches only the fields we
  // need for the comparison.
  const supabase = await getSupabaseAdmin();
  const phones = normalized
    .map((r) => r.phone_e164)
    .filter((p) => typeof p === "string" && p);
  const emails = normalized
    .map((r) => (r.email ? r.email.toLowerCase() : null))
    .filter((e) => typeof e === "string" && e);

  const existingPhones = new Set();
  const existingEmails = new Set();
  if (phones.length > 0) {
    const { data } = await supabase
      .from("leads")
      .select("phone_e164")
      .in("phone_e164", phones);
    for (const r of data || []) {
      if (r.phone_e164) existingPhones.add(r.phone_e164);
    }
  }
  if (emails.length > 0) {
    const { data } = await supabase
      .from("leads")
      .select("email")
      .in("email", emails);
    for (const r of data || []) {
      if (r.email) existingEmails.add(r.email.toLowerCase());
    }
  }

  let newCount = 0;
  let dupCount = 0;
  let errorCount = 0;
  const previewRows = normalized.map((r) => {
    const isDup =
      (r.phone_e164 && existingPhones.has(r.phone_e164)) ||
      (r.email && existingEmails.has(r.email.toLowerCase()));
    const isErr = r._errors.length > 0;
    if (isErr) errorCount++;
    else if (isDup) dupCount++;
    else newCount++;
    return { ...r, _duplicate: isDup };
  });

  return NextResponse.json({
    headers,
    mapping,
    rows: previewRows,
    summary: {
      total: previewRows.length,
      new: newCount,
      duplicates: dupCount,
      errors: errorCount,
    },
  });
}

// src/app/api/admin/leads/import/commit/route.js
//
// POST /api/admin/leads/import/commit
//   Body: {
//     rows: NormalizedRow[],           // from preview response
//     duplicate_strategy: 'skip' | 'update' | 'create'
//   }
//
// Commits the import to the leads table. `skip` (default) drops
// duplicates entirely; `update` upserts changes onto matching rows;
// `create` always inserts fresh rows even when a duplicate exists.
//
// Server-side re-validates each row rather than trusting the client
// payload — the preview endpoint runs the same normalizer, so this
// is a belt-and-braces check against tampering / stale client state.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { buildLeadUpdate } from "@/lib/leads/normalize";

const MAX_ROWS = 2000;
const VALID_STRATEGIES = new Set(["skip", "update", "create"]);

export async function POST(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;
  const { user } = gate;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const strategy =
    typeof payload?.duplicate_strategy === "string" &&
    VALID_STRATEGIES.has(payload.duplicate_strategy)
      ? payload.duplicate_strategy
      : "skip";

  const rawRows = Array.isArray(payload?.rows) ? payload.rows : [];
  if (rawRows.length === 0) {
    return NextResponse.json({ error: "no_rows" }, { status: 400 });
  }
  if (rawRows.length > MAX_ROWS) {
    return NextResponse.json({ error: "too_many_rows" }, { status: 413 });
  }

  const supabase = await getSupabaseAdmin();

  // Re-run through normalize to catch anything the client may have
  // fiddled with. Skip rows the client already flagged as errored.
  const cleaned = [];
  for (const raw of rawRows) {
    if (Array.isArray(raw?._errors) && raw._errors.length > 0) continue;
    const { update, errors } = buildLeadUpdate(raw, { requireName: true });
    if (errors.length > 0) continue;
    cleaned.push(update);
  }

  // Look up existing rows by phone OR email in one query per column.
  const phones = cleaned
    .map((r) => r.phone_e164)
    .filter((p) => typeof p === "string" && p);
  const emails = cleaned
    .map((r) => (r.email ? r.email.toLowerCase() : null))
    .filter((e) => typeof e === "string" && e);

  const existingByPhone = new Map();
  const existingByEmail = new Map();
  if (phones.length > 0) {
    const { data } = await supabase
      .from("leads")
      .select("id, phone_e164")
      .in("phone_e164", phones);
    for (const r of data || []) {
      if (r.phone_e164) existingByPhone.set(r.phone_e164, r.id);
    }
  }
  if (emails.length > 0) {
    const { data } = await supabase
      .from("leads")
      .select("id, email")
      .in("email", emails);
    for (const r of data || []) {
      if (r.email) existingByEmail.set(r.email.toLowerCase(), r.id);
    }
  }

  const toInsert = [];
  const toUpdate = [];
  let skipped = 0;

  for (const row of cleaned) {
    const existingId =
      (row.phone_e164 && existingByPhone.get(row.phone_e164)) ||
      (row.email && existingByEmail.get(row.email.toLowerCase())) ||
      null;

    if (!existingId) {
      // Fresh insert regardless of strategy.
      toInsert.push({
        ...row,
        lead_type: row.lead_type || "individual_player",
        stage: row.stage || "new",
        source: row.source || "import",
        created_by: user.id,
      });
      continue;
    }

    if (strategy === "skip") {
      skipped++;
      continue;
    }
    if (strategy === "update") {
      toUpdate.push({ id: existingId, row });
      continue;
    }
    if (strategy === "create") {
      // Force fresh row even though there's a match. Only phone/email
      // uniqueness constraint might reject; catch and skip if it does.
      toInsert.push({
        ...row,
        // Clear the duplicate-conflicting field so we don't hit the
        // unique constraint. We keep the OTHER identifier so the row
        // isn't orphaned.
        phone_e164:
          row.phone_e164 && existingByPhone.has(row.phone_e164)
            ? null
            : row.phone_e164,
        email:
          row.email && existingByEmail.has(row.email.toLowerCase())
            ? null
            : row.email,
        lead_type: row.lead_type || "individual_player",
        stage: row.stage || "new",
        source: row.source || "import",
        created_by: user.id,
      });
    }
  }

  const results = {
    inserted: 0,
    updated: 0,
    skipped,
    failed: 0,
    failure_reasons: [],
  };

  // Bulk insert.
  if (toInsert.length > 0) {
    const { data, error } = await supabase
      .from("leads")
      .insert(toInsert)
      .select("id");
    if (error) {
      console.error("[admin/leads/import/commit] insert failed:", error);
      results.failed += toInsert.length;
      results.failure_reasons.push(`insert: ${error.message}`);
    } else {
      results.inserted = data?.length ?? 0;
      // Seed the timeline for each new lead — one activity row per.
      const activityRows = (data || []).map((r) => ({
        lead_id: r.id,
        activity_type: "stage_change",
        actor_id: user.id,
        payload: { from: null, to: "new" },
        summary: "Imported from CSV",
      }));
      if (activityRows.length > 0) {
        await supabase.from("lead_activities").insert(activityRows);
      }
    }
  }

  // Per-row updates (small numbers expected for `update` strategy).
  for (const { id, row } of toUpdate) {
    const { error } = await supabase.from("leads").update(row).eq("id", id);
    if (error) {
      results.failed++;
      results.failure_reasons.push(`update ${id}: ${error.message}`);
    } else {
      results.updated++;
    }
  }

  return NextResponse.json({ ok: true, results, strategy });
}

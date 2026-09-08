// src/app/api/admin/leads/broadcast/route.js
//
// GET  /api/admin/leads/broadcast/count?<lead-filters>
//   Returns { count: N } — powers the "will send to N leads" preview
//   on the compose page. Uses the same filter shape as GET
//   /api/admin/leads so the compose page can reuse the query string.
//
// POST /api/admin/leads/broadcast
//   Body: {
//     name: string,
//     body: { pt?: string, en?: string },
//     filter: { stages?, types?, sources?, owner?, tag?, has_email? },
//     language: 'pt' | 'en'    // which body key each recipient gets
//   }
//
//   Composes + fans out in one call — creates the whatsapp_broadcasts
//   row with target_kind='leads', fetches matching leads, inserts
//   recipient rows with lead_id populated, then flips the broadcast
//   to 'sending'. The existing dispatcher cron picks them up.
//
// Kept as a lead-specific route rather than extending the existing
// /admin/broadcasts endpoints so the leads admin flow stays fully
// self-contained.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import {
  countMatchingLeads,
  fetchMatchingLeads,
} from "@/lib/broadcasts/lead-segments";
import { computeRecipientSlots } from "@/lib/broadcasts/slots";

const MAX_NAME = 120;
const MAX_BODY = 3000;

export async function GET(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const filter = filterFromQuery(new URL(request.url));
  const supabase = await getSupabaseAdmin();
  const count = await countMatchingLeads(supabase, filter);
  return NextResponse.json({ count });
}

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

  const name =
    typeof payload?.name === "string" ? payload.name.trim().slice(0, MAX_NAME) : "";
  if (name.length < 3) {
    return NextResponse.json(
      { error: "name must be 3+ characters" },
      { status: 400 },
    );
  }

  const rawBody = payload?.body;
  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return NextResponse.json(
      { error: "body must be an object of language → text" },
      { status: 400 },
    );
  }
  const body = {};
  for (const [langKey, text] of Object.entries(rawBody)) {
    if (langKey !== "pt" && langKey !== "en") continue;
    if (typeof text !== "string" || !text.trim()) continue;
    if (text.length > MAX_BODY) {
      return NextResponse.json(
        { error: `body[${langKey}] too long (max ${MAX_BODY} chars)` },
        { status: 400 },
      );
    }
    body[langKey] = text.trim();
  }
  if (Object.keys(body).length === 0) {
    return NextResponse.json(
      { error: "at least one language body is required" },
      { status: 400 },
    );
  }

  const language =
    payload?.language === "en" ? "en" : "pt";
  if (!body[language]) {
    return NextResponse.json(
      { error: `body has no ${language} translation` },
      { status: 400 },
    );
  }

  const filter = normalizeLeadFilter(payload?.filter);

  const supabase = await getSupabaseAdmin();

  // Fetch recipients first — no reason to create a broadcast if it
  // matches zero leads.
  const leads = await fetchMatchingLeads(supabase, filter);
  if (leads.length === 0) {
    return NextResponse.json(
      { error: "no_matching_leads" },
      { status: 400 },
    );
  }

  // Create the broadcast in 'sending' state directly — the CRM flow
  // is a "send now" composer, not a save-draft-then-send one. Keeps
  // the round-trip count minimal.
  const nowIso = new Date().toISOString();
  const { data: broadcast, error: bcastErr } = await supabase
    .from("whatsapp_broadcasts")
    .insert({
      name,
      body,
      target_kind: "leads",
      target_filter: filter,
      status: "sending",
      recipient_count: leads.length,
      created_by: user.id,
      sent_started_at: nowIso,
    })
    .select("id, interval_seconds, window_start_hour_brt, window_end_hour_brt, send_on_days")
    .single();

  if (bcastErr) {
    console.error("[admin/leads/broadcast] broadcast insert failed:", bcastErr);
    return NextResponse.json(
      { error: "broadcast_insert_failed", message: bcastErr.message },
      { status: 500 },
    );
  }

  // Compute one slot per recipient using the broadcast's scheduling
  // defaults (Phase 6 columns filled by the DB defaults).
  const slots = computeRecipientSlots(leads.length, {
    scheduled_for: null,
    interval_seconds: broadcast.interval_seconds,
    window_start_hour_brt: broadcast.window_start_hour_brt,
    window_end_hour_brt: broadcast.window_end_hour_brt,
    send_on_days: broadcast.send_on_days,
  });

  // Bulk-insert recipient rows keyed by lead_id.
  const rows = leads.map((lead, idx) => ({
    broadcast_id: broadcast.id,
    player_id: null,
    lead_id: lead.id,
    phone_e164: lead.phone_e164,
    language,
    status: "pending",
    scheduled_slot: slots[idx].toISOString(),
  }));

  const { error: recipErr } = await supabase
    .from("whatsapp_broadcast_recipients")
    .upsert(rows, {
      onConflict: "broadcast_id,lead_id",
      ignoreDuplicates: true,
    });

  if (recipErr) {
    console.error("[admin/leads/broadcast] fan-out failed:", recipErr);
    // Roll the broadcast back so the admin can retry cleanly.
    await supabase
      .from("whatsapp_broadcasts")
      .update({ status: "cancelled" })
      .eq("id", broadcast.id);
    return NextResponse.json(
      { error: "fanout_failed", message: recipErr.message },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    broadcast_id: broadcast.id,
    recipient_count: leads.length,
  });
}

/**
 * Build a LeadFilter object from URL query params — same key names
 * as GET /api/admin/leads so the compose page can reuse the query
 * string it copied from /admin/leads.
 */
function filterFromQuery(url) {
  const stage = url.searchParams.get("stage");
  const type = url.searchParams.get("type");
  const source = url.searchParams.get("source");
  const owner = url.searchParams.get("owner");
  const tag = url.searchParams.get("tag");
  const hasEmail = url.searchParams.get("has_email");
  return normalizeLeadFilter({
    stages: stage ? stage.split(",") : null,
    types: type ? type.split(",") : null,
    sources: source ? source.split(",") : null,
    owner: owner || null,
    tag: tag || null,
    has_email:
      hasEmail === "true" ? true : hasEmail === "false" ? false : null,
  });
}

function normalizeLeadFilter(raw) {
  const out = {};
  if (!raw || typeof raw !== "object") return out;
  if (Array.isArray(raw.stages) && raw.stages.length > 0)
    out.stages = raw.stages.filter((s) => typeof s === "string");
  if (Array.isArray(raw.types) && raw.types.length > 0)
    out.types = raw.types.filter((s) => typeof s === "string");
  if (Array.isArray(raw.sources) && raw.sources.length > 0)
    out.sources = raw.sources.filter((s) => typeof s === "string");
  if (typeof raw.owner === "string" && raw.owner) out.owner = raw.owner;
  if (typeof raw.tag === "string" && raw.tag) out.tag = raw.tag.toLowerCase();
  if (typeof raw.has_email === "boolean") out.has_email = raw.has_email;
  return out;
}

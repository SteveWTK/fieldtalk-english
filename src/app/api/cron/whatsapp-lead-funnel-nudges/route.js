// src/app/api/cron/whatsapp-lead-funnel-nudges/route.js
//
// Hourly cron that keeps the WhatsApp lead-funnel moving between the
// user's replies. Two independent sweeps in one endpoint so we only
// spend one cron slot on the whole pipeline:
//
//   1. NUDGE — leads at q1_sent / q2_sent that were sent ~24h ago and
//      have not answered nor been nudged yet get a short poke asking
//      them to tap the buttons they saw earlier. One nudge per stage
//      (the funnel_nudged_at column tracks that).
//
//   2. COLD  — leads at pending_oi / q1_sent / q2_sent / cta_sent
//      whose updated_at is older than COLD_THRESHOLD_DAYS get flipped
//      to funnel_stage='cold' + a lead_activities entry. Keeps the CRM
//      timeline honest (the salesperson sees leads have gone quiet
//      rather than continuing to nudge indefinitely).
//
// Auth: bearer CRON_SECRET, same as every other cron in this project.
// Failure mode: any single lead's send / update failing gets logged
// and the sweep continues with the rest.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { sendWhatsapp } from "@/lib/integrations/zapi";
import { buildNudge } from "@/lib/whatsapp/lead-funnel-messages";

// Send at least 24h after the original message. Upper bound wide so a
// dropped hour of cron time doesn't skip an entire cohort — any lead
// in the 24h–30h window that hasn't been nudged still gets picked up
// on a later run.
const NUDGE_LOWER_HOURS = 24;
const NUDGE_UPPER_HOURS = 30;

// After 7 days on a live stage with no forward motion, we accept the
// lead is silent for good and stop treating them as active.
const COLD_THRESHOLD_DAYS = 7;

// Batch sizes — keeps a single tick under a couple of seconds even
// when a backlog builds up (missed cron runs, launch spike, etc).
const NUDGE_LIMIT_PER_RUN = 50;
const COLD_LIMIT_PER_RUN = 200;

const LIVE_STAGES = ["pending_oi", "q1_sent", "q2_sent", "cta_sent"];

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseAdmin();
  const now = new Date();

  const nudgeResult = await runNudgeSweep(supabase, now);
  const coldResult = await runColdSweep(supabase, now);

  return NextResponse.json({
    ok: true,
    nudge: nudgeResult,
    cold: coldResult,
  });
}

/* ─── Nudge sweep ─────────────────────────────────────────────── */

async function runNudgeSweep(supabase, now) {
  const lowerCutoff = new Date(
    now.getTime() - NUDGE_UPPER_HOURS * 60 * 60 * 1000,
  ).toISOString();
  const upperCutoff = new Date(
    now.getTime() - NUDGE_LOWER_HOURS * 60 * 60 * 1000,
  ).toISOString();

  // One query per stage keeps the where-clause simple + hits the
  // partial index on (funnel_stage, updated_at) cleanly.
  const q1 = await pickNudgeCandidates(
    supabase,
    "q1_sent",
    "funnel_q1_sent_at",
    lowerCutoff,
    upperCutoff,
  );
  const q2 = await pickNudgeCandidates(
    supabase,
    "q2_sent",
    "funnel_q2_sent_at",
    lowerCutoff,
    upperCutoff,
  );

  const candidates = [...(q1 || []), ...(q2 || [])].slice(
    0,
    NUDGE_LIMIT_PER_RUN,
  );

  if (candidates.length === 0) {
    return { picked: 0, sent: 0, failed: 0 };
  }

  const nowIso = now.toISOString();
  let sent = 0;
  let failed = 0;

  for (const lead of candidates) {
    const outcome = await sendNudge(supabase, lead, nowIso);
    if (outcome === "sent") sent++;
    else if (outcome === "failed") failed++;
  }

  return { picked: candidates.length, sent, failed };
}

async function pickNudgeCandidates(
  supabase,
  stage,
  sentAtColumn,
  lowerCutoff,
  upperCutoff,
) {
  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, phone_e164, funnel_stage, funnel_nudged_at, do_not_contact, funnel_q1_sent_at, funnel_q2_sent_at",
    )
    .eq("funnel_stage", stage)
    .is("funnel_nudged_at", null)
    .eq("do_not_contact", false)
    .not("phone_e164", "is", null)
    .gte(sentAtColumn, lowerCutoff)
    .lte(sentAtColumn, upperCutoff)
    .order(sentAtColumn, { ascending: true })
    .limit(NUDGE_LIMIT_PER_RUN);

  if (error) {
    console.error(
      "[cron/lead-funnel-nudges] candidate fetch failed:",
      stage,
      error,
    );
    return [];
  }
  return data || [];
}

async function sendNudge(supabase, lead, nowIso) {
  // Claim the lead by stamping funnel_nudged_at BEFORE we send. If
  // the send fails afterwards, we accept a missed nudge rather than
  // risk sending twice — the cold sweep will still catch the lead
  // once it's stale enough.
  const { error: claimErr } = await supabase
    .from("leads")
    .update({ funnel_nudged_at: nowIso })
    .eq("id", lead.id)
    .is("funnel_nudged_at", null);
  if (claimErr) {
    console.error(
      "[cron/lead-funnel-nudges] claim failed:",
      lead.id,
      claimErr,
    );
    return "failed";
  }

  const message = buildNudge({ stage: lead.funnel_stage });

  let providerMessageId = null;
  let sendError = null;
  try {
    const send = await sendWhatsapp({
      telefone: lead.phone_e164,
      mensagem: message,
    });
    providerMessageId = send.messageId;
  } catch (err) {
    sendError = err?.message ?? String(err);
    console.error(
      "[cron/lead-funnel-nudges] send failed:",
      lead.id,
      sendError,
    );
  }

  // Log to whatsapp_messages either way — a failed send still deserves
  // a row so the admin can see we tried.
  await supabase.from("whatsapp_messages").insert({
    player_id: null,
    phone_e164: lead.phone_e164,
    direction: "outbound",
    provider: "zapi",
    provider_message_id: providerMessageId,
    via: "lead_funnel_nudge",
    body: message,
    metadata: {
      lead_id: lead.id,
      funnel_stage: lead.funnel_stage,
      send_error: sendError,
    },
  });

  // Timeline entry so the CRM detail page shows the nudge went out.
  await supabase.from("lead_activities").insert({
    lead_id: lead.id,
    activity_type: "whatsapp_outbound",
    actor_id: null,
    payload: {
      kind: "funnel_nudge",
      funnel_stage: lead.funnel_stage,
      body: message,
      send_error: sendError,
    },
    summary: sendError
      ? `Funnel nudge failed to send: ${sendError.slice(0, 100)}`
      : `Funnel nudge sent (${lead.funnel_stage})`,
  });

  return sendError ? "failed" : "sent";
}

/* ─── Cold sweep ──────────────────────────────────────────────── */

async function runColdSweep(supabase, now) {
  const cutoff = new Date(
    now.getTime() - COLD_THRESHOLD_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data: stale, error: fetchErr } = await supabase
    .from("leads")
    .select("id, funnel_stage")
    .in("funnel_stage", LIVE_STAGES)
    .lt("updated_at", cutoff)
    .limit(COLD_LIMIT_PER_RUN);

  if (fetchErr) {
    console.error("[cron/lead-funnel-nudges] cold fetch failed:", fetchErr);
    return { picked: 0, marked: 0 };
  }
  if (!stale || stale.length === 0) {
    return { picked: 0, marked: 0 };
  }

  let marked = 0;

  for (const lead of stale) {
    // Serialise the update + activity insert per-lead so the timeline
    // entry only lands when the stage actually flipped (an incoming
    // reply between the fetch and the update flips the row out of the
    // WHERE clause and we correctly skip the activity insert).
    const { data: updated, error: updateErr } = await supabase
      .from("leads")
      .update({ funnel_stage: "cold" })
      .eq("id", lead.id)
      .in("funnel_stage", LIVE_STAGES)
      .lt("updated_at", cutoff)
      .select("id")
      .maybeSingle();

    if (updateErr) {
      console.error(
        "[cron/lead-funnel-nudges] cold update failed:",
        lead.id,
        updateErr,
      );
      continue;
    }
    if (!updated) continue;

    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      activity_type: "note_added",
      actor_id: null,
      payload: {
        kind: "funnel_cold",
        from_stage: lead.funnel_stage,
        threshold_days: COLD_THRESHOLD_DAYS,
      },
      summary: `Funnel marked cold — no forward motion for ${COLD_THRESHOLD_DAYS}+ days.`,
    });

    marked++;
  }

  return { picked: stale.length, marked };
}

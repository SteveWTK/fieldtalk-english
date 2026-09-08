// src/lib/broadcasts/dispatch.js
//
// Broadcast dispatch — takes pending whatsapp_broadcast_recipients
// rows and actually sends the messages via Z-API. Called from:
//
//   - The cron every minute (see /api/cron/dispatch-broadcasts).
//     Processes up to DISPATCHER_TICK_LIMIT recipients per tick,
//     giving a ~8s effective stagger while staying inside Vercel's
//     serverless timeout window.
//
//   - The admin "send test" flow (bypasses the DB — see the test-send
//     route). Doesn't touch this module.
//
// Per-recipient safety checks at dispatch time (re-verified from the
// DB, not from stale fan-out snapshots):
//   - Player still opted in
//   - Agent not paused by admin
//   - Broadcast body has a translation for the recipient's language
//   - Subscription-state auto-skip (see below)
//
// Subscription-state auto-skip: if the broadcast filter narrowed on
// subscription_statuses, we re-check that the player STILL matches
// at dispatch time. Someone who converted trial→paid between compose
// and send gets skipped on a "come back and upgrade!" campaign.
//
// After processing recipients, we call maybeCompleteBroadcast() to
// flip the parent broadcast's status to 'complete' when the last
// pending recipient is handled. Race-safe via a status guard: only
// flips 'sending' → 'complete', never 'cancelled' → 'complete'.

import { sendWhatsapp } from "@/lib/integrations/zapi";
import { DISPATCHER_TICK_LIMIT } from "./config";

/**
 * Drain up to `limit` pending recipients across ALL sending broadcasts,
 * oldest first. Returns a summary for the cron log.
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase
 * @param {number} [limit]
 */
export async function drainPendingRecipients(
  supabase,
  limit = DISPATCHER_TICK_LIMIT,
) {
  // Only recipients whose scheduled_slot has arrived. Ordered by
  // scheduled_slot so oldest overdue slots get processed first —
  // keeps a warm broadcast steady even if a backlog builds up during
  // an outage.
  //
  // Per-broadcast interval enforcement is done implicitly via the
  // spacing between scheduled_slot values that fan-out set up. The
  // dispatcher doesn't need to know about interval_seconds at all.
  //
  // Recipients can be player-keyed (`player_id`) or lead-keyed
  // (`lead_id`). Exactly one is set — the schema CHECK guarantees
  // that. The per-recipient handler branches on which is populated.
  const nowIso = new Date().toISOString();
  const { data: recipients, error } = await supabase
    .from("whatsapp_broadcast_recipients")
    .select("id, broadcast_id, player_id, lead_id, phone_e164, language")
    .eq("status", "pending")
    .lte("scheduled_slot", nowIso)
    .order("scheduled_slot", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("[broadcasts/dispatch] fetch pending failed:", error);
    return { drained: 0, sent: 0, failed: 0, skipped: 0, error: error.message };
  }

  if (!recipients || recipients.length === 0) {
    return { drained: 0, sent: 0, failed: 0, skipped: 0 };
  }

  const stats = { drained: recipients.length, sent: 0, failed: 0, skipped: 0 };

  // Cache broadcasts we've loaded during this tick to avoid re-fetching.
  const broadcastCache = new Map();
  const touchedBroadcastIds = new Set();

  for (const recipient of recipients) {
    touchedBroadcastIds.add(recipient.broadcast_id);
    const outcome = await processRecipient(supabase, recipient, broadcastCache);
    stats[outcome] = (stats[outcome] || 0) + 1;
  }

  // After processing, check each touched broadcast: if it has no more
  // pending recipients, flip it to 'complete'. Cheap query, keeps the
  // admin UI's "complete/sending" badge accurate without waiting for
  // another cron tick.
  for (const broadcastId of touchedBroadcastIds) {
    await maybeCompleteBroadcast(supabase, broadcastId);
  }

  return stats;
}

/**
 * Handle a single recipient. Returns 'sent' | 'failed' | 'skipped'.
 * Bumps the parent broadcast's counters on the way.
 */
async function processRecipient(supabase, recipient, broadcastCache) {
  // Load broadcast (cached).
  let broadcast = broadcastCache.get(recipient.broadcast_id);
  if (!broadcast) {
    const { data, error } = await supabase
      .from("whatsapp_broadcasts")
      .select("id, body, target_filter, target_kind, status")
      .eq("id", recipient.broadcast_id)
      .single();
    if (error || !data) {
      await markRecipientSkipped(
        supabase,
        recipient,
        `broadcast_load_failed: ${error?.message ?? "not_found"}`,
      );
      return "skipped";
    }
    broadcast = data;
    broadcastCache.set(recipient.broadcast_id, broadcast);
  }

  // Cancelled between fan-out and now — skip cleanly.
  if (broadcast.status === "cancelled") {
    await markRecipientSkipped(supabase, recipient, "broadcast_cancelled");
    return "skipped";
  }

  // Lead-keyed recipients follow a simpler eligibility check: has
  // phone still, not marked do_not_contact. No player-side gates
  // apply (there's no player row).
  if (recipient.lead_id) {
    return processLeadRecipient(supabase, recipient, broadcast);
  }

  // Player-keyed path — original behaviour preserved.
  return processPlayerRecipient(supabase, recipient, broadcast);
}

async function processPlayerRecipient(supabase, recipient, broadcast) {
  // Re-check eligibility against current player state (opted-in +
  // not paused). Snapshots at fan-out time can go stale if a user
  // opts out or gets paused between compose and dispatch.
  const { data: player, error: playerErr } = await supabase
    .from("players")
    .select(
      "whatsapp_opted_in, whatsapp_agent_paused, preferred_language",
    )
    .eq("id", recipient.player_id)
    .maybeSingle();

  if (playerErr || !player) {
    await markRecipientSkipped(
      supabase,
      recipient,
      "player_lookup_failed",
    );
    return "skipped";
  }
  if (player.whatsapp_opted_in === false) {
    await markRecipientSkipped(supabase, recipient, "opted_out_after_fanout");
    return "skipped";
  }
  if (player.whatsapp_agent_paused === true) {
    await markRecipientSkipped(
      supabase,
      recipient,
      "agent_paused_after_fanout",
    );
    return "skipped";
  }

  // Subscription auto-skip. If the original filter narrowed on
  // subscription_statuses, verify the player STILL matches now.
  const requiredStatuses = broadcast.target_filter?.subscription_statuses;
  if (Array.isArray(requiredStatuses) && requiredStatuses.length > 0) {
    const { data: access } = await supabase
      .from("player_edition_access")
      .select("status")
      .eq("player_id", recipient.player_id)
      .in("status", requiredStatuses)
      .limit(1)
      .maybeSingle();
    if (!access) {
      await markRecipientSkipped(
        supabase,
        recipient,
        "subscription_no_longer_matches",
      );
      return "skipped";
    }
  }

  // Pick the message body for this recipient's language. Missing
  // translation → skip. Uses the SNAPSHOTTED language on the
  // recipient row so a user changing language between compose and
  // send gets the language the admin was expecting.
  const body = broadcast.body?.[recipient.language];
  if (!body || typeof body !== "string" || !body.trim()) {
    await markRecipientSkipped(supabase, recipient, "no_translation");
    return "skipped";
  }

  // Fire the send. Any error → 'failed' with the error string; the
  // dispatcher moves on to the next recipient rather than aborting.
  try {
    const sendResult = await sendWhatsapp({
      telefone: recipient.phone_e164,
      mensagem: body,
    });
    await supabase
      .from("whatsapp_broadcast_recipients")
      .update({
        status: "sent",
        provider_message_id: sendResult.messageId,
        sent_at: new Date().toISOString(),
      })
      .eq("id", recipient.id);
    await bumpBroadcastCounter(supabase, recipient.broadcast_id, "sent_count");
    // Also log the outbound to whatsapp_messages so the conversation
    // view (future) shows broadcast messages inline with other
    // outbound activity.
    await supabase.from("whatsapp_messages").insert({
      player_id: recipient.player_id,
      phone_e164: recipient.phone_e164,
      direction: "outbound",
      provider: "zapi",
      provider_message_id: sendResult.messageId,
      via: "broadcast",
      body,
      metadata: { broadcast_id: recipient.broadcast_id },
    });
    // Bump the shared activity gate so the review-quiz cron doesn't
    // fire on top of a broadcast (back-to-back unsolicited messages
    // = bad UX).
    await supabase
      .from("players")
      .update({
        whatsapp_last_outbound_at: new Date().toISOString(),
        last_whatsapp_activity_at: new Date().toISOString(),
      })
      .eq("id", recipient.player_id);
    return "sent";
  } catch (err) {
    const errMsg = err?.message ?? String(err ?? "unknown");
    console.error(
      "[broadcasts/dispatch] send failed:",
      recipient.id,
      errMsg,
    );
    await supabase
      .from("whatsapp_broadcast_recipients")
      .update({ status: "failed", error: errMsg })
      .eq("id", recipient.id);
    await bumpBroadcastCounter(
      supabase,
      recipient.broadcast_id,
      "failed_count",
    );
    return "failed";
  }
}

/**
 * Lead-keyed dispatch. Simpler than the player path — no opted-in /
 * paused / subscription logic. Just re-checks the do-not-contact
 * flag against the current lead row (which may have flipped since
 * fan-out), then sends + logs to lead_activities + whatsapp_messages.
 */
async function processLeadRecipient(supabase, recipient, broadcast) {
  const { data: lead, error: leadErr } = await supabase
    .from("leads")
    .select("id, phone_e164, do_not_contact, stage")
    .eq("id", recipient.lead_id)
    .maybeSingle();

  if (leadErr || !lead) {
    await markRecipientSkipped(supabase, recipient, "lead_lookup_failed");
    return "skipped";
  }
  if (lead.do_not_contact === true) {
    await markRecipientSkipped(
      supabase,
      recipient,
      "do_not_contact_after_fanout",
    );
    return "skipped";
  }

  // Body-language picker — same shape as player path. Leads don't
  // have a preferred_language column, so the recipient row's snapshot
  // (defaulted at fan-out to 'pt') is authoritative.
  const body = broadcast.body?.[recipient.language];
  if (!body || typeof body !== "string" || !body.trim()) {
    await markRecipientSkipped(supabase, recipient, "no_translation");
    return "skipped";
  }

  try {
    const sendResult = await sendWhatsapp({
      telefone: recipient.phone_e164,
      mensagem: body,
    });
    const nowIso = new Date().toISOString();
    await supabase
      .from("whatsapp_broadcast_recipients")
      .update({
        status: "sent",
        provider_message_id: sendResult.messageId,
        sent_at: nowIso,
      })
      .eq("id", recipient.id);
    await bumpBroadcastCounter(supabase, recipient.broadcast_id, "sent_count");

    // Log to whatsapp_messages with player_id=null — the phone
    // snapshot is the only join key. Kept in the same table so an
    // eventual conversation-view UI shows lead broadcasts alongside
    // player messages.
    await supabase.from("whatsapp_messages").insert({
      player_id: null,
      phone_e164: recipient.phone_e164,
      direction: "outbound",
      provider: "zapi",
      provider_message_id: sendResult.messageId,
      via: "broadcast",
      body,
      metadata: {
        broadcast_id: recipient.broadcast_id,
        lead_id: recipient.lead_id,
      },
    });

    // Log the outbound to the lead's own activity timeline so the
    // CRM detail view surfaces broadcasts inline with 1:1 sends.
    await supabase.from("lead_activities").insert({
      lead_id: recipient.lead_id,
      activity_type: "whatsapp_outbound",
      actor_id: null,
      payload: {
        body,
        provider_message_id: sendResult.messageId,
        broadcast_id: recipient.broadcast_id,
      },
      summary: `[broadcast] ${body.slice(0, 128)}${body.length > 128 ? "…" : ""}`,
    });

    // Auto-bump 'new' → 'contacted' — same rule as the 1:1 send
    // path. A broadcast counts as first contact.
    if (lead.stage === "new") {
      await supabase
        .from("leads")
        .update({ stage: "contacted" })
        .eq("id", recipient.lead_id);
      await supabase.from("lead_activities").insert({
        lead_id: recipient.lead_id,
        activity_type: "stage_change",
        actor_id: null,
        payload: {
          from: "new",
          to: "contacted",
          reason: "auto_broadcast_send",
        },
        summary: null,
      });
    }
    return "sent";
  } catch (err) {
    const errMsg = err?.message ?? String(err ?? "unknown");
    console.error("[broadcasts/dispatch] lead send failed:", recipient.id, errMsg);
    await supabase
      .from("whatsapp_broadcast_recipients")
      .update({ status: "failed", error: errMsg })
      .eq("id", recipient.id);
    await bumpBroadcastCounter(
      supabase,
      recipient.broadcast_id,
      "failed_count",
    );
    return "failed";
  }
}

async function markRecipientSkipped(supabase, recipient, reason) {
  await supabase
    .from("whatsapp_broadcast_recipients")
    .update({ status: "skipped", skip_reason: reason })
    .eq("id", recipient.id);
  await bumpBroadcastCounter(
    supabase,
    recipient.broadcast_id,
    "skipped_count",
  );
}

/**
 * Increment one of the aggregate counters on a broadcast row. Uses a
 * raw RPC-style approach: fetch → increment → update. Not race-safe
 * if two dispatcher workers ever run concurrently, but the current
 * design has a single cron worker and we never process the same
 * recipient row twice (the status transition guards against that).
 */
async function bumpBroadcastCounter(supabase, broadcastId, field) {
  const { data, error } = await supabase
    .from("whatsapp_broadcasts")
    .select(field)
    .eq("id", broadcastId)
    .single();
  if (error) return;
  const current = Number(data[field]) || 0;
  await supabase
    .from("whatsapp_broadcasts")
    .update({ [field]: current + 1 })
    .eq("id", broadcastId);
}

/**
 * If a broadcast has no more pending recipients, flip its status to
 * 'complete'. Guards on 'sending' → 'complete' so a cancelled
 * broadcast doesn't accidentally get "resurrected".
 */
async function maybeCompleteBroadcast(supabase, broadcastId) {
  const { count, error } = await supabase
    .from("whatsapp_broadcast_recipients")
    .select("id", { count: "exact", head: true })
    .eq("broadcast_id", broadcastId)
    .eq("status", "pending");
  if (error) return;
  if ((count ?? 0) > 0) return;
  await supabase
    .from("whatsapp_broadcasts")
    .update({ status: "complete", completed_at: new Date().toISOString() })
    .eq("id", broadcastId)
    .eq("status", "sending");
}

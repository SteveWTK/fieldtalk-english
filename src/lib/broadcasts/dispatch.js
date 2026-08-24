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
  const { data: recipients, error } = await supabase
    .from("whatsapp_broadcast_recipients")
    .select("id, broadcast_id, player_id, phone_e164, language")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
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
      .select("id, body, target_filter, status")
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

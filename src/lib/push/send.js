// src/lib/push/send.js
//
// Server-only — handles the actual Web Push send + dead-subscription
// cleanup + notification_log writing. Every cron route, webhook
// trigger and admin test endpoint goes through sendToPlayer().
//
// Why a single chokepoint:
//   - Translation lookup happens in one place (so a missing kind
//     can't leak through one trigger that forgot to localise).
//   - Dead subscriptions (410 Gone) are deleted automatically, so
//     the push_subscriptions table self-cleans rather than growing
//     stale.
//   - Every send writes a notification_log row — that's our dedup
//     primitive AND the admin audit trail.
//
// What this file is NOT responsible for:
//   - Deciding *whom* to send to. Cron routes pick targets via a
//     Supabase query, then call sendToPlayer() per player.
//   - Translating arbitrary user-supplied text. Copy lives in
//     copy.js and is keyed by `kind`.

import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { buildNotificationPayload } from "./copy";

// Lazy webpush init. Top-level import would crash the bundle at
// build time on the rare environment without the env vars, and the
// build server doesn't have them set.
let _webpush = null;
async function getWebPush() {
  if (_webpush) return _webpush;
  const mod = await import("web-push");
  const webpush = mod.default || mod;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) {
    throw new Error(
      "VAPID env vars are missing. Required: " +
        "NEXT_PUBLIC_VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT."
    );
  }
  webpush.setVapidDetails(subject, publicKey, privateKey);
  _webpush = webpush;
  return _webpush;
}

/**
 * Send a notification to every active subscription for a player.
 *
 * @param {object}  opts
 * @param {string}  opts.playerId  — UUID
 * @param {string}  opts.kind      — matches copy.js keys
 * @param {object}  [opts.vars]    — interpolated into the template
 * @param {string}  [opts.refId]   — payload reference for dedup/audit
 * @param {string}  [opts.lang]    — overrides the per-subscription
 *                                   stored language (handy for tests)
 * @returns {Promise<{sent: number, dead: number}>}
 */
export async function sendToPlayer({
  playerId,
  kind,
  vars = {},
  refId = null,
  lang = null,
}) {
  if (!playerId || !kind) {
    throw new Error("sendToPlayer: playerId and kind are required");
  }

  const supabase = await getSupabaseAdmin();
  const { data: subs, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth, language")
    .eq("player_id", playerId);
  if (error) {
    console.error("[push/send] could not load subscriptions:", error.message);
    return { sent: 0, dead: 0 };
  }
  if (!subs || subs.length === 0) {
    return { sent: 0, dead: 0 };
  }

  const webpush = await getWebPush();

  let sent = 0;
  let dead = 0;

  // We send sequentially within a player's devices — there'll usually
  // be only 1–2 of them, and serial sends keep the failure-mode
  // diagnostics readable. Cron routes that fan out across many
  // players should parallelise at the player level instead.
  for (const sub of subs) {
    const effectiveLang = lang || sub.language || "en";
    const payload = buildNotificationPayload(kind, effectiveLang, vars);
    if (!payload) {
      console.warn(
        `[push/send] no template for kind=${kind} lang=${effectiveLang}`
      );
      continue;
    }

    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 } // 24h — drop the message if it can't
        // be delivered within a day; relevance decays quickly for
        // match-starting / pack-ready prompts.
      );
      sent += 1;
      // Touch last_used_at so we know this subscription is alive.
      await supabase
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", sub.id);
    } catch (err) {
      // 410 Gone = subscription has been revoked/expired. The spec
      // says delete it. 404 sometimes carries the same meaning on
      // older push servers.
      const status = err?.statusCode;
      if (status === 410 || status === 404) {
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        dead += 1;
      } else {
        console.error(
          `[push/send] send failed (status=${status}):`,
          err?.message || err
        );
      }
    }
  }

  // Audit row — one per kind+player+attempt, not per device. The
  // dedup query reads (player_id, kind, sent_at) so per-player is
  // the right grain.
  if (sent > 0) {
    await supabase.from("notification_log").insert({
      player_id: playerId,
      kind,
      ref_id: refId,
      delivered: true,
    });
  }

  return { sent, dead };
}

/**
 * Have we already notified this player about this kind recently?
 * Used by the daily cron to avoid hammering the same user.
 *
 * @param {string} playerId
 * @param {string} kind
 * @param {number} windowHours — look-back window
 * @returns {Promise<boolean>}
 */
export async function wasRecentlyNotified(playerId, kind, windowHours = 24) {
  const supabase = await getSupabaseAdmin();
  const cutoff = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
  const { data, error } = await supabase
    .from("notification_log")
    .select("id")
    .eq("player_id", playerId)
    .eq("kind", kind)
    .gte("sent_at", cutoff)
    .limit(1);
  if (error) {
    console.warn("[push/send] wasRecentlyNotified lookup failed:", error.message);
    // Fail-closed: when we can't tell, assume we already notified
    // so we err on the side of *not* spamming.
    return true;
  }
  return (data?.length || 0) > 0;
}

// src/app/api/cron/whatsapp-inactivity-reminders/route.js
//
// Fires the "we haven't seen you in a while" WhatsApp nudge to users
// whose activity has gone quiet for INACTIVITY_DAYS+ days.
//
// Runs hourly. Bearer-token protected via CRON_SECRET.
//
// Eligibility filter (all must hold):
//   - whatsapp_opted_in = true
//   - phone_e164 IS NOT NULL
//   - whatsapp_agent_paused = false
//   - whatsapp_welcomed_at IS NOT NULL  (don't nag before we've said hi)
//   - Last activity older than INACTIVITY_DAYS days ago
//   - No reminder sent in the last INACTIVITY_DAYS days (throttle)
//
// "Last activity" is the max of:
//   - player_progress.updated_at (any XP-earning event)
//   - whatsapp_last_inbound_at (they messaged the coach)
//   - players.created_at (fallback for accounts with no activity yet)
//
// Rate limit: same DISPATCHER_TICK_LIMIT (7 per tick) as broadcasts,
// so a burst of eligible users doesn't hammer Z-API. Users not
// picked up this tick roll into the next hour's tick — everyone
// eligible eventually gets reminded.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import {
  firstName,
  sendSystemMessage,
} from "@/lib/whatsapp/system-messages";
import { DISPATCHER_TICK_LIMIT } from "@/lib/broadcasts/config";

// Editable — the user asked for 3 days but explicitly flagged this
// might tune based on feedback. Change here or make it configurable
// per-user later if we add nudge-frequency prefs back to onboarding.
const INACTIVITY_DAYS = 3;

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseAdmin();
  const cutoff = new Date(
    Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  // Fetch base pool from partial index (opted-in + phone + not paused
  // + welcomed). Ordered by whatsapp_last_reminder_at ASC NULLS FIRST
  // so users who have NEVER been reminded get picked up first.
  const { data: candidates, error: candErr } = await supabase
    .from("players")
    .select(
      "id, full_name, phone_e164, preferred_language, whatsapp_last_inbound_at, whatsapp_last_reminder_at, created_at",
    )
    .eq("whatsapp_opted_in", true)
    .eq("whatsapp_agent_paused", false)
    .not("phone_e164", "is", null)
    .not("whatsapp_welcomed_at", "is", null)
    .or(
      `whatsapp_last_reminder_at.is.null,whatsapp_last_reminder_at.lt.${cutoff}`,
    )
    .order("whatsapp_last_reminder_at", {
      ascending: true,
      nullsFirst: true,
    })
    .limit(200); // pool cap — we'll narrow further before sending

  if (candErr) {
    console.error(
      "[cron/whatsapp-inactivity-reminders] fetch failed:",
      candErr,
    );
    return NextResponse.json(
      { error: "fetch_failed", details: candErr.message },
      { status: 500 },
    );
  }

  if (!candidates || candidates.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, sent: 0 });
  }

  // Pull player_progress.updated_at for the candidate set — a single
  // query keyed by id, then merged in JS. Cheaper than N queries.
  const candidateIds = candidates.map((c) => c.id);
  const { data: progressRows } = await supabase
    .from("player_progress")
    .select("player_id, updated_at")
    .in("player_id", candidateIds);

  const progressByPlayer = new Map(
    (progressRows || []).map((r) => [r.player_id, r.updated_at]),
  );

  // Narrow: keep only those whose LATEST activity is older than cutoff.
  const eligible = [];
  for (const p of candidates) {
    const latest = latestActivity(p, progressByPlayer.get(p.id));
    if (latest < new Date(cutoff)) {
      eligible.push(p);
      if (eligible.length >= DISPATCHER_TICK_LIMIT) break;
    }
  }

  if (eligible.length === 0) {
    return NextResponse.json({
      ok: true,
      checked: candidates.length,
      sent: 0,
    });
  }

  let sent = 0;
  let failed = 0;
  const nowIso = new Date().toISOString();

  for (const player of eligible) {
    const lang = player.preferred_language || "pt";
    const name = firstName(player.full_name, lang);
    const result = await sendSystemMessage(supabase, {
      kind: "inactivity_reminder",
      playerId: player.id,
      phoneE164: player.phone_e164,
      lang,
      vars: { name },
      via: "system",
    });
    if (result.ok) {
      await supabase
        .from("players")
        .update({ whatsapp_last_reminder_at: nowIso })
        .eq("id", player.id);
      sent++;
    } else {
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    eligible: eligible.length,
    sent,
    failed,
  });
}

/**
 * Compute a player's most recent activity across all signal sources.
 * Falls back to created_at when they've done nothing at all yet.
 */
function latestActivity(player, progressUpdatedAt) {
  const candidates = [
    progressUpdatedAt,
    player.whatsapp_last_inbound_at,
    player.created_at,
  ]
    .filter(Boolean)
    .map((iso) => new Date(iso).getTime());
  if (candidates.length === 0) return new Date(0);
  return new Date(Math.max(...candidates));
}

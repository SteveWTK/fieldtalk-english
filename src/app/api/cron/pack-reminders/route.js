// src/app/api/cron/pack-reminders/route.js
//
// Daily Vercel cron — finds players with unopened sticker packs who
// haven't been active in the last 2 days, and sends them a push.
//
// Same logical trigger covers BOTH user-listed flows:
//   - "Pack ready: day-2 reminder if unopened"  → kind = pack_reminder
//   - "Pack ready: welcome on new account"      → kind = welcome_pack
//                                                  (first time only)
//
// The kind is determined per-player based on whether they've ever
// received either notification before — the first one always carries
// the welcoming framing; every subsequent one is the generic reminder.
//
// Dedup: a 4-day window per (player, "pack_reminder" or
// "welcome_pack"). A player who keeps accumulating packs without
// returning gets nudged at most ~twice a week, not daily.
//
// Schedule: see vercel.json — once daily at 14:00 UTC (11:00 BRT).
// Authentication: CRON_SECRET in the Authorization header (matches
// the pattern in /api/cron/cleanup-guests).

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { sendToPlayer, wasRecentlyNotified } from "@/lib/push/send";

const DEFAULT_PACK_XP_COST = 200;
const INACTIVITY_DAYS = 2;
const DEDUP_WINDOW_HOURS = 4 * 24; // 4 days

// Concurrency cap so a large player base doesn't blow the Vercel
// function timeout. 10 parallel sends keeps wall time bounded
// (~5–10 seconds for hundreds of players).
const SEND_CONCURRENCY = 10;

async function runInBatches(items, concurrency, fn) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const slice = items.slice(i, i + concurrency);
    const settled = await Promise.allSettled(slice.map(fn));
    for (const r of settled) {
      results.push(r.status === "fulfilled" ? r.value : { error: r.reason });
    }
  }
  return results;
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getSupabaseAdmin();

    // ── 1. Pack XP cost from app_settings (fallback to default) ──
    const { data: settingsRow } = await supabase
      .from("app_settings")
      .select("pack_xp_cost")
      .eq("id", "singleton")
      .maybeSingle();
    const packXpCost =
      Math.max(1, Number(settingsRow?.pack_xp_cost) || DEFAULT_PACK_XP_COST);

    // ── 2. Pull every player who has a push subscription ──
    // We do this rather than filtering in the players query so we
    // skip the work of computing pack counts for users who can't
    // receive a push anyway.
    const { data: subs, error: subsError } = await supabase
      .from("push_subscriptions")
      .select("player_id");
    if (subsError) {
      console.error("[cron/pack-reminders] subs query failed:", subsError);
      return NextResponse.json(
        { error: "Failed to load subscriptions" },
        { status: 500 }
      );
    }

    const subscribedIds = Array.from(
      new Set((subs || []).map((s) => s.player_id).filter(Boolean))
    );
    if (subscribedIds.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No subscribed players — nothing to do.",
        considered: 0,
        sent: 0,
      });
    }

    // ── 3. Pull their progress + signup date ──
    // We need last_activity_date for the idle filter and total_xp
    // for the pack math. created_at on players is the signup
    // timestamp, used only for diagnostics in the response payload.
    const inactivityCutoff = new Date(
      Date.now() - INACTIVITY_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    const { data: progressRows, error: progressError } = await supabase
      .from("player_progress")
      .select("player_id, total_xp, last_activity_date")
      .in("player_id", subscribedIds)
      .or(`last_activity_date.lte.${inactivityCutoff},last_activity_date.is.null`);

    if (progressError) {
      console.error("[cron/pack-reminders] progress query failed:", progressError);
      return NextResponse.json(
        { error: "Failed to load progress" },
        { status: 500 }
      );
    }

    if (!progressRows || progressRows.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No idle subscribed players — nothing to do.",
        considered: subscribedIds.length,
        sent: 0,
      });
    }

    // ── 4. Pull pack-openings counts for these players ──
    // One round-trip rather than N — group in JS afterwards.
    const candidateIds = progressRows.map((r) => r.player_id);
    const { data: openingRows, error: openingsError } = await supabase
      .from("pack_openings")
      .select("player_id")
      .in("player_id", candidateIds);
    if (openingsError) {
      console.error("[cron/pack-reminders] openings query failed:", openingsError);
      return NextResponse.json(
        { error: "Failed to load pack openings" },
        { status: 500 }
      );
    }
    const openedCountByPlayer = new Map();
    for (const row of openingRows || []) {
      openedCountByPlayer.set(
        row.player_id,
        (openedCountByPlayer.get(row.player_id) || 0) + 1
      );
    }

    // ── 5. Pull prior notification history for "first push" detection ──
    // We need to know which players have ever received welcome_pack
    // OR pack_reminder, so a brand-new player gets the welcome
    // framing instead of the generic reminder.
    const { data: priorNotifs } = await supabase
      .from("notification_log")
      .select("player_id, kind")
      .in("player_id", candidateIds)
      .in("kind", ["welcome_pack", "pack_reminder"]);
    const everReceivedPackKind = new Set(
      (priorNotifs || []).map((n) => n.player_id)
    );

    // ── 6. Compute targets ──
    const targets = [];
    for (const p of progressRows) {
      const packsEarned = Math.floor(
        Math.max(0, Number(p.total_xp) || 0) / packXpCost
      );
      const packsOpened = openedCountByPlayer.get(p.player_id) || 0;
      const packsAvailable = Math.max(0, packsEarned - packsOpened);
      if (packsAvailable <= 0) continue;
      const kind = everReceivedPackKind.has(p.player_id)
        ? "pack_reminder"
        : "welcome_pack";
      targets.push({
        playerId: p.player_id,
        kind,
        count: packsAvailable,
      });
    }

    if (targets.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No idle players with unopened packs.",
        considered: progressRows.length,
        sent: 0,
      });
    }

    // ── 7. Send (with per-player dedup) ──
    const sendResults = await runInBatches(
      targets,
      SEND_CONCURRENCY,
      async ({ playerId, kind, count }) => {
        // Dedup uses the SAME pool across welcome_pack + pack_reminder:
        // a player who got welcome_pack 2 days ago shouldn't get
        // pack_reminder today even though it's a "different" kind.
        // We do this by checking both kinds explicitly.
        const [recentWelcome, recentGeneric] = await Promise.all([
          wasRecentlyNotified(playerId, "welcome_pack", DEDUP_WINDOW_HOURS),
          wasRecentlyNotified(playerId, "pack_reminder", DEDUP_WINDOW_HOURS),
        ]);
        if (recentWelcome || recentGeneric) {
          return { playerId, skipped: true, reason: "deduped" };
        }
        const result = await sendToPlayer({
          playerId,
          kind,
          vars: { count },
        });
        return { playerId, kind, ...result };
      }
    );

    const sent = sendResults.reduce(
      (acc, r) => acc + (r?.sent || 0),
      0
    );
    const skipped = sendResults.filter((r) => r?.skipped).length;

    return NextResponse.json({
      ok: true,
      considered: progressRows.length,
      targets: targets.length,
      sent,
      skipped,
    });
  } catch (err) {
    console.error("[cron/pack-reminders] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

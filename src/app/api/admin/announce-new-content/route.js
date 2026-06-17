// src/app/api/admin/announce-new-content/route.js
//
// POST /api/admin/announce-new-content
//   body: { count?: number }   // how many lessons were just released
//
// Fires a "New content available" push notification to every player
// with a subscription. The admin clicks this AFTER flipping
// under_construction = false on one or more lessons.
//
// Why an explicit button rather than a DB trigger:
//   - Admin batches releases ("publishing 4 lessons at once") and
//     wants ONE notification, not four.
//   - A bug in a lesson's content shouldn't go out to thousands of
//     phones the moment a column flips.
//
// Dedup:
//   - The send utility writes a notification_log row per (player,
//     kind). We don't dedup here because batched releases are
//     legitimate distinct events; the admin sees the count of recent
//     fires in the response and can choose to skip if they just sent
//     one. A 24h cooldown could be added later if abuse is a concern.
//
// Banner:
//   - The in-app banner detects new content client-side (compares
//     localStorage to the current open-lesson count), so it lights
//     up automatically the moment any lesson flips — no extra DB
//     write required from this endpoint.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";
import { sendToPlayer } from "@/lib/push/send";

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

export async function POST(request) {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;
    const supabase = guard.supabase;

    let body = {};
    try {
      body = await request.json();
    } catch {
      /* empty body is fine */
    }
    const rawCount = Number(body?.count);
    const count =
      Number.isFinite(rawCount) && rawCount > 0 ? Math.floor(rawCount) : 0;

    // Distinct subscribed players. push_subscriptions can have 1-2
    // rows per player (different devices); we dedupe at the player
    // level so a user with phone + desktop gets ONE log entry, not
    // two. sendToPlayer handles fan-out per device internally.
    const { data: subs, error } = await supabase
      .from("push_subscriptions")
      .select("player_id");
    if (error) {
      console.error("[announce-new-content] subs error:", error);
      return NextResponse.json(
        { error: "Could not load subscriptions" },
        { status: 500 }
      );
    }
    const playerIds = Array.from(
      new Set((subs || []).map((s) => s.player_id).filter(Boolean))
    );
    if (playerIds.length === 0) {
      return NextResponse.json({
        ok: true,
        playersTargeted: 0,
        sent: 0,
        dead: 0,
        message: "No subscribed players to notify.",
      });
    }

    const results = await runInBatches(
      playerIds,
      SEND_CONCURRENCY,
      async (playerId) => {
        try {
          const res = await sendToPlayer({
            playerId,
            kind: "new_content_available",
            vars: { count },
          });
          return { playerId, ...res };
        } catch (err) {
          return { playerId, error: err?.message || String(err) };
        }
      }
    );

    const sent = results.reduce((acc, r) => acc + (r?.sent || 0), 0);
    const dead = results.reduce((acc, r) => acc + (r?.dead || 0), 0);
    const failed = results.filter((r) => r?.error).length;

    return NextResponse.json({
      ok: true,
      playersTargeted: playerIds.length,
      sent,
      dead,
      failed,
      lessonCount: count,
    });
  } catch (err) {
    console.error("[announce-new-content] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

// src/app/api/push/subscribe/route.js
//
// POST /api/push/subscribe
//
// The opt-in component calls PushManager.subscribe() in the browser
// to get a PushSubscription object, then POSTs the relevant bits to
// this route. We store it server-side keyed by player_id so the
// send utility can fan out to all of a user's devices.
//
// Body:
//   {
//     endpoint:  "https://fcm.googleapis.com/...",
//     keys:      { p256dh: "...", auth: "..." },
//     language?: "pt" | "en"
//   }
//
// Idempotent on the endpoint column — re-posting an existing
// subscription updates its language + player_id (in case the user
// logged out + back in as someone else on the same device) rather
// than creating duplicates.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { sendToPlayer } from "@/lib/push/send";

export async function POST(request) {
  try {
    // Auth — must be a signed-in player.
    const cookieStore = await cookies();
    const supabaseAuth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );
    const {
      data: { user },
    } = await supabaseAuth.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    const p256dh = body?.keys?.p256dh;
    const auth = body?.keys?.auth;
    const language =
      typeof body.language === "string" ? body.language.slice(0, 10) : "en";
    const userAgent = request.headers.get("user-agent") || null;

    if (!endpoint || !p256dh || !auth) {
      return NextResponse.json(
        { error: "Missing endpoint or keys" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseAdmin();

    // Upsert on endpoint. If this device re-subscribes after a
    // permission reset (or a different player logged in on the same
    // device) we just update the existing row's ownership rather
    // than leaving an orphan.
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          player_id: user.id,
          endpoint,
          p256dh,
          auth,
          user_agent: userAgent,
          language,
        },
        { onConflict: "endpoint" }
      );

    if (error) {
      console.error("[push/subscribe] upsert failed:", error.message);
      return NextResponse.json(
        { error: "Could not save subscription" },
        { status: 500 }
      );
    }

    // ── First-time opt-in: fire the welcome push immediately ──
    // Doing this here (rather than only via the daily cron) closes
    // the loop for brand-new users: signup → onboarding → opt-in →
    // notification arrives "Your first sticker pack is waiting!"
    // within seconds, which both confirms the subscription works
    // AND points them at the starter pack we just gave them on
    // signup. Logged via notification_log so the daily cron won't
    // double-send.
    try {
      const { data: priorWelcome } = await supabase
        .from("notification_log")
        .select("id")
        .eq("player_id", user.id)
        .eq("kind", "welcome_pack")
        .limit(1);
      const alreadySent = (priorWelcome?.length || 0) > 0;
      if (!alreadySent) {
        // Are there unopened packs to nudge about? Skip if not, so
        // the welcome push doesn't fire when there's literally
        // nothing for the user to open.
        const [{ data: progress }, { count: openedCount }] = await Promise.all([
          supabase
            .from("player_progress")
            .select("total_xp")
            .eq("player_id", user.id)
            .maybeSingle(),
          supabase
            .from("pack_openings")
            .select("*", { count: "exact", head: true })
            .eq("player_id", user.id),
        ]);
        const totalXp = progress?.total_xp || 0;
        const packsEarned = Math.floor(totalXp / 200);
        const packsOpened = openedCount || 0;
        if (packsEarned > packsOpened) {
          // Fire-and-forget — don't block the subscribe response on
          // the webpush round-trip.
          sendToPlayer({ playerId: user.id, kind: "welcome_pack" }).catch(
            (err) =>
              console.warn(
                "[push/subscribe] welcome push failed:",
                err?.message
              )
          );
        }
      }
    } catch (err) {
      // Welcome-push errors are non-fatal — the subscription is
      // saved, the cron will catch them later if needed.
      console.warn("[push/subscribe] welcome trigger error:", err?.message);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/subscribe] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

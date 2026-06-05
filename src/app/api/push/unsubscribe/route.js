// src/app/api/push/unsubscribe/route.js
//
// POST /api/push/unsubscribe
//
// Removes a single subscription (by endpoint) belonging to the
// authenticated user. The opt-in component calls this after the
// user revokes browser permission OR clicks "Turn off" in settings.
//
// We delete by (player_id, endpoint) rather than just endpoint so
// a hostile caller can't trivially clear another user's
// subscriptions by guessing endpoints.
//
// Body:
//   { endpoint: "https://fcm.googleapis.com/..." }

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function POST(request) {
  try {
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
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const endpoint = typeof body.endpoint === "string" ? body.endpoint : "";
    if (!endpoint) {
      return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
    }

    const supabase = await getSupabaseAdmin();
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("player_id", user.id)
      .eq("endpoint", endpoint);

    if (error) {
      console.error("[push/unsubscribe] delete failed:", error.message);
      return NextResponse.json(
        { error: "Could not remove subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/unsubscribe] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

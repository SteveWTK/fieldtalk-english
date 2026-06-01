// src/app/api/seat-license/redeem/route.js
//
// POST /api/seat-license/redeem
//
// Body: { code: string }
//
// Calls the redeem_seat_license() Postgres function which atomically
// checks capacity + expiry, inserts a seat_redemption row, ticks the
// license's seats_used counter, and upserts the player_edition_access
// row granting the player access to the license's edition.
//
// The Postgres function returns one of these reasons on failure:
//   'unknown_code'      — no license matches the code
//   'expired'           — license valid_until has passed
//   'no_seats'          — license seats_used >= seats_total
//   'already_redeemed'  — this player already redeemed this code
//
// We surface those back to the client as `reason` so the UI can show
// a specific message.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code.trim() : "";
    if (!code) {
      return NextResponse.json(
        { error: "Missing 'code' in request body" },
        { status: 400 }
      );
    }

    // ── Auth ──
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
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // ── Defensive player-row check ──
    // The function references players(id) so a missing row would 500
    // with a foreign-key error; bail early with a clearer message.
    const supabase = await getSupabaseAdmin();
    const { data: playerRow } = await supabase
      .from("players")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!playerRow) {
      return NextResponse.json(
        {
          error:
            "No players row for this user. Sign out and back in once, then retry.",
        },
        { status: 412 }
      );
    }

    // ── Call the Postgres function ──
    // redeem_seat_license is SECURITY DEFINER so the service-role
    // admin client can invoke it without touching the underlying
    // RLS-locked tables directly.
    const { data, error } = await supabase.rpc("redeem_seat_license", {
      p_player_id: user.id,
      p_code: code,
    });

    if (error) {
      console.error("[seat-license/redeem] rpc error:", error);
      return NextResponse.json(
        {
          error: error.message || "Could not redeem code",
          details: { code: error.code, hint: error.hint },
        },
        { status: 500 }
      );
    }

    // RETURNS TABLE → Supabase gives an array; the function only ever
    // returns one row.
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) {
      return NextResponse.json(
        { error: "Empty response from redeem function" },
        { status: 500 }
      );
    }

    if (!result.ok) {
      // Map function reason → HTTP status. 'unknown_code' is a 404,
      // everything else is a 400 (bad request / capacity).
      const status = result.reason === "unknown_code" ? 404 : 400;
      return NextResponse.json(
        {
          ok: false,
          reason: result.reason,
          // Include edition when known so the UI can show what the
          // license *was* for (e.g. when no_seats / expired).
          edition: result.edition || null,
        },
        { status }
      );
    }

    return NextResponse.json({
      ok: true,
      edition: result.edition,
      license_id: result.license_id,
    });
  } catch (err) {
    console.error("[seat-license/redeem] unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

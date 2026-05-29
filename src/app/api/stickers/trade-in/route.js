// src/app/api/stickers/trade-in/route.js
//
// POST /api/stickers/trade-in  — convert one duplicate sticker into XP.
//
// Body: { sticker_id: string }
//
// Rules:
//   - Caller must be authenticated.
//   - Caller must own ≥ 2 of the sticker (we never let the last copy be
//     traded — that keeps the Album's "filled" status honest).
//   - XP awarded scales with rarity (see XP_PER_RATING). The amounts
//     are deliberately a notch below the marginal value of a fresh pack
//     so packs remain the primary acquisition path.
//
// Race safety: the update uses a compare-and-swap (the WHERE clause
// includes the exact quantity we just read). If two trade-ins for the
// same sticker race, only one update lands; the other gets 0 rows
// affected and we respond 409.
//
// XP is credited identically to /api/xp/award:
//   1. Insert an audit row into player_xp_events with source
//      "duplicate_trade_in" and source_id = sticker_id.
//   2. Bump player_progress.total_xp.
// We do both writes here directly with the admin client rather than
// re-call /api/xp/award so the whole trade-in happens in one server hop.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

// Rating tier → XP awarded for each duplicate traded in. Chosen so a
// duplicate is worth a bit less than its proportional share of a pack:
// 1★ pulls dominate so they're the cheapest; 5★ pulls are rare so a
// dupe is genuinely valuable. Adjust here as we tune the economy.
const XP_PER_RATING = { 1: 5, 2: 10, 3: 20, 4: 40, 5: 80 };

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const stickerId =
      typeof body.sticker_id === "string" ? body.sticker_id.trim() : "";
    if (!stickerId) {
      return NextResponse.json(
        { error: "Missing sticker_id" },
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const supabase = await getSupabaseAdmin();

    // ── Look up the player's holding + the sticker's rating ──
    const [{ data: holding }, { data: sticker }] = await Promise.all([
      supabase
        .from("player_stickers")
        .select("quantity")
        .eq("player_id", user.id)
        .eq("sticker_id", stickerId)
        .maybeSingle(),
      supabase
        .from("sticker_players")
        .select("rating, name")
        .eq("id", stickerId)
        .maybeSingle(),
    ]);

    if (!sticker) {
      return NextResponse.json({ error: "Unknown sticker" }, { status: 404 });
    }
    if (!holding || (holding.quantity || 0) < 2) {
      return NextResponse.json(
        { error: "You need at least two of this sticker to trade in" },
        { status: 400 }
      );
    }

    const rating = Math.max(1, Math.min(5, Number(sticker.rating) || 1));
    const xpAward = XP_PER_RATING[rating] || XP_PER_RATING[1];
    const prevQty = holding.quantity;
    const newQty = prevQty - 1;

    // ── Compare-and-swap on quantity ──
    const { data: updated, error: updateError } = await supabase
      .from("player_stickers")
      .update({ quantity: newQty })
      .eq("player_id", user.id)
      .eq("sticker_id", stickerId)
      .eq("quantity", prevQty)
      .select("quantity");

    if (updateError) {
      console.error("[trade-in] update error:", updateError);
      return NextResponse.json(
        { error: updateError.message || "Could not trade in sticker" },
        { status: 500 }
      );
    }
    if (!updated || updated.length === 0) {
      // Lost a race with another request — caller can retry.
      return NextResponse.json(
        { error: "Sticker quantity changed, please try again" },
        { status: 409 }
      );
    }

    // ── Audit event + total_xp bump ──
    const { error: eventError } = await supabase
      .from("player_xp_events")
      .insert({
        player_id: user.id,
        source: "duplicate_trade_in",
        source_id: stickerId,
        amount: xpAward,
        metadata: {
          rating,
          sticker_name: sticker.name,
          previous_quantity: prevQty,
        },
      });
    if (eventError) {
      console.error("[trade-in] event insert error:", eventError);
      // Quantity already decremented — fail soft so the user isn't left
      // worse off. They'll still see the dupe gone but no XP awarded;
      // the audit trail will be missing for this trade. Surface a 500
      // so the client doesn't claim success.
      return NextResponse.json(
        { error: "Trade recorded but XP could not be credited" },
        { status: 500 }
      );
    }

    const { data: existingProgress } = await supabase
      .from("player_progress")
      .select("total_xp")
      .eq("player_id", user.id)
      .maybeSingle();

    let newTotal = xpAward;
    if (existingProgress) {
      newTotal = (existingProgress.total_xp || 0) + xpAward;
      const { error: progressError } = await supabase
        .from("player_progress")
        .update({ total_xp: newTotal, updated_at: new Date().toISOString() })
        .eq("player_id", user.id);
      if (progressError) {
        console.error("[trade-in] progress update error:", progressError);
        // Event row already recorded — caller can resync from events
        // later if needed.
      }
    } else {
      const { error: insertProgressError } = await supabase
        .from("player_progress")
        .insert({ player_id: user.id, total_xp: xpAward });
      if (insertProgressError) {
        console.error(
          "[trade-in] progress insert error:",
          insertProgressError
        );
      }
    }

    return NextResponse.json({
      ok: true,
      xpAwarded: xpAward,
      remainingQuantity: newQty,
      newTotalXp: newTotal,
    });
  } catch (err) {
    console.error("[trade-in] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// src/app/api/packs/open/route.js
//
// Open one pack for the authenticated user. Flow:
//   1. Auth via session cookie.
//   2. Confirm the user has at least one unopened pack:
//        floor(total_xp / pack_xp_cost) - count(pack_openings) >= 1
//   3. Draw 7 stickers from the active roster, weighted so higher
//      ratings are rarer (5★ ≈ 2% chance per draw).
//   4. Atomically upsert into player_stickers via the give_player_sticker
//      RPC (handles the duplicate quantity bump).
//   5. Insert a pack_openings row with the 7 sticker ids.
//   6. Return the 7 drawn stickers with full data for the reveal UI.
//
// Stickers are drawn WITH replacement so duplicates within a single pack
// are possible — mirrors the actual Panini experience.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const STICKERS_PER_PACK = 7;

// Weights mean: how often a sticker of that rating appears in the
// weighted pool. Lower rating = much more likely to be drawn.
// Adjust here if pack drops feel off — no schema migration needed.
const RATING_WEIGHTS = { 1: 25, 2: 15, 3: 8, 4: 3, 5: 1 };

export async function POST() {
  try {
    // ── 1. Auth ──
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

    // ── 2. Pack-eligibility check ──
    // Fetch total_xp, pack_xp_cost, and packs already opened in parallel.
    const [progressRes, settingsRes, openedRes] = await Promise.all([
      supabase
        .from("player_progress")
        .select("total_xp")
        .eq("player_id", user.id)
        .maybeSingle(),
      supabase
        .from("app_settings")
        .select("pack_xp_cost")
        .eq("id", "singleton")
        .maybeSingle(),
      supabase
        .from("pack_openings")
        .select("*", { count: "exact", head: true })
        .eq("player_id", user.id),
    ]);

    const totalXp = progressRes.data?.total_xp || 0;
    const packXpCost = settingsRes.data?.pack_xp_cost || 200;
    const packsOpened = openedRes.count || 0;
    const packsEarned = Math.floor(totalXp / packXpCost);
    const packsAvailable = packsEarned - packsOpened;

    if (packsAvailable <= 0) {
      return NextResponse.json(
        {
          error: "No packs available",
          totalXp,
          packXpCost,
          packsEarned,
          packsOpened,
        },
        { status: 400 }
      );
    }

    // ── 3. Weighted random draw ──
    const { data: roster, error: rosterError } = await supabase
      .from("sticker_players")
      .select("*")
      .eq("is_active", true);

    if (rosterError || !roster || roster.length === 0) {
      return NextResponse.json(
        { error: "No stickers available to draw from" },
        { status: 500 }
      );
    }

    // Pre-compute cumulative weights for fast random selection.
    let totalWeight = 0;
    const cumulative = roster.map((s) => {
      totalWeight += RATING_WEIGHTS[s.rating] || 1;
      return { sticker: s, cw: totalWeight };
    });

    const pickOne = () => {
      const r = Math.random() * totalWeight;
      // Linear scan is fine for ~hundreds of stickers; binary search later
      // if the roster grows into the thousands.
      for (const entry of cumulative) {
        if (r < entry.cw) return entry.sticker;
      }
      return cumulative[cumulative.length - 1].sticker;
    };

    const drawnStickers = [];
    for (let i = 0; i < STICKERS_PER_PACK; i++) {
      drawnStickers.push(pickOne());
    }

    // ── 4. Apply to player_stickers (group dupes, single RPC per unique) ──
    const counts = new Map(); // sticker.id → count
    for (const s of drawnStickers) {
      counts.set(s.id, (counts.get(s.id) || 0) + 1);
    }

    // Determine which stickers are new for this user BEFORE writes, so the
    // UI can show a "New!" badge on the reveal.
    const uniqueIds = [...counts.keys()];
    const { data: alreadyOwned } = await supabase
      .from("player_stickers")
      .select("sticker_id")
      .eq("player_id", user.id)
      .in("sticker_id", uniqueIds);
    const ownedSet = new Set((alreadyOwned || []).map((r) => r.sticker_id));

    // Fire upserts (await all — the user needs them committed before we
    // log the pack opening).
    await Promise.all(
      [...counts.entries()].map(([stickerId, qty]) =>
        supabase.rpc("give_player_sticker", {
          p_player_id: user.id,
          p_sticker_id: stickerId,
          p_quantity: qty,
        })
      )
    );

    // ── 5. Log the pack ──
    const stickerIdsInOrder = drawnStickers.map((s) => s.id);
    const { error: openError } = await supabase.from("pack_openings").insert({
      player_id: user.id,
      sticker_ids: stickerIdsInOrder,
      xp_spent: packXpCost,
    });
    if (openError) {
      console.error("[packs/open] insert error:", openError);
      // Stickers are already in the user's collection. Surface a warning
      // but don't fail the request — pack history is recoverable later.
    }

    // ── 6. Response ──
    const result = drawnStickers.map((s, idx) => ({
      ...s,
      is_new_for_user: !ownedSet.has(s.id) && idx === drawnStickers.findIndex((x) => x.id === s.id),
    }));

    return NextResponse.json({
      ok: true,
      stickers: result,
      packsRemaining: packsAvailable - 1,
    });
  } catch (err) {
    console.error("[packs/open] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

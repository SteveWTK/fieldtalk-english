// src/lib/players/awardWelcomeBonus.js
//
// Server-only helper. Gives a brand-new player their starter sticker
// pack by inserting a `welcome_bonus` row into player_xp_events and
// bumping player_progress.total_xp by one pack's worth of XP.
//
// Why XP-only (no separate "pack credit" column): the existing
// pack-vault math already says
//   packsAvailable = floor(total_xp / pack_xp_cost) - count(pack_openings)
// so awarding 200 XP (= one pack at the default cost) produces
// exactly one unopened pack waiting on the dashboard. No new code
// paths, no schema change.
//
// Idempotent: if the player already has a welcome_bonus event we
// skip — calling this from multiple signup hooks (ensure-player +
// signup-instant + admin grant) is safe.

import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const STARTER_XP = 200;

export async function awardWelcomeBonusIfMissing(playerId) {
  if (!playerId) return { awarded: false, reason: "missing_player_id" };

  const supabase = await getSupabaseAdmin();

  // 1. Skip if this player already got the welcome bonus.
  const { data: existing, error: lookupError } = await supabase
    .from("player_xp_events")
    .select("id")
    .eq("player_id", playerId)
    .eq("source", "welcome_bonus")
    .limit(1);
  if (lookupError) {
    console.error("[awardWelcomeBonus] lookup error:", lookupError);
    return { awarded: false, error: lookupError.message };
  }
  if (existing && existing.length > 0) {
    return { awarded: false, reason: "already_awarded" };
  }

  // 2. Insert the XP event row (audit trail).
  const { error: eventError } = await supabase
    .from("player_xp_events")
    .insert({
      player_id: playerId,
      source: "welcome_bonus",
      amount: STARTER_XP,
      metadata: { note: "Welcome sticker pack on first signup" },
    });
  if (eventError) {
    console.error("[awardWelcomeBonus] event insert error:", eventError);
    return { awarded: false, error: eventError.message };
  }

  // 3. Bump player_progress.total_xp (or create a row if missing).
  // We can't use upsert with an arithmetic add because Supabase
  // upsert is set-based, not delta-based; the lookup + branch
  // pattern matches what predictions/resolve and resolve_match use.
  const { data: progress } = await supabase
    .from("player_progress")
    .select("total_xp")
    .eq("player_id", playerId)
    .maybeSingle();
  if (progress) {
    const { error: updateError } = await supabase
      .from("player_progress")
      .update({
        total_xp: (progress.total_xp || 0) + STARTER_XP,
        updated_at: new Date().toISOString(),
      })
      .eq("player_id", playerId);
    if (updateError) {
      console.error("[awardWelcomeBonus] progress update error:", updateError);
      // Don't unwind — the XP event is already in. A backfill query
      // can heal the total later. Returning awarded:true keeps the
      // signup flow moving.
    }
  } else {
    const { error: insertError } = await supabase
      .from("player_progress")
      .insert({ player_id: playerId, total_xp: STARTER_XP });
    if (insertError) {
      console.error("[awardWelcomeBonus] progress insert error:", insertError);
    }
  }

  return { awarded: true, xp: STARTER_XP };
}

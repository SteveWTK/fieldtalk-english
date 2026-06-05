// src/app/api/admin/users/[id]/route.js
//
// GET /api/admin/users/<player-id>
//
// Drill-down detail for the slide-over panel on the User Tracking
// page. Returns:
//
//   - player        basic profile + edition + partner + signup date
//   - progress      total_xp, level, streak, last activity
//   - squadValue    sum of placed sticker ratings
//   - albumCounts   { owned, total }
//   - lessonsCompleted [{ title, pillar, completed_at, xp_earned,
//                          score, time_spent }] (newest first)
//   - recentXp      last 20 player_xp_events rows
//   - packsOpened   total + last 5 with sticker counts
//   - predictionsSubmitted total count
//
// Light intentionally — the table view answers "who's most active"
// and this just gives enough context to drill in on one user without
// jumping to a dedicated page.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

const RECENT_XP_LIMIT = 20;
const RECENT_PACKS_LIMIT = 5;

export async function GET(_request, ctx) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const { supabase } = guard;

  const { id } = await ctx.params;
  if (!id) {
    return NextResponse.json(
      { error: "Missing player id in URL" },
      { status: 400 }
    );
  }

  // Player + everything related in parallel.
  const [
    playerRes,
    progressRes,
    completionsRes,
    xpRes,
    packsRes,
    squadRes,
    stickerCollectionRes,
    stickerRosterRes,
    seatRedemptionsRes,
    predictionsRes,
  ] = await Promise.all([
    supabase
      .from("players")
      .select("id, full_name, email, edition, user_type, created_at")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("player_progress")
      .select("total_xp, current_level, current_streak, longest_streak, last_activity_date")
      .eq("player_id", id)
      .maybeSingle(),
    supabase
      .from("lesson_completions")
      .select(
        "id, lesson_id, score, time_spent, xp_earned, completed_at"
      )
      .eq("player_id", id)
      .order("completed_at", { ascending: false }),
    supabase
      .from("player_xp_events")
      .select("id, source, source_id, amount, metadata, earned_at")
      .eq("player_id", id)
      .order("earned_at", { ascending: false })
      .limit(RECENT_XP_LIMIT),
    supabase
      .from("pack_openings")
      .select("id, sticker_ids, opened_at")
      .eq("player_id", id)
      .order("opened_at", { ascending: false }),
    supabase
      .from("player_squads")
      .select("positions")
      .eq("player_id", id)
      .maybeSingle(),
    supabase
      .from("player_stickers")
      .select("sticker_id, quantity")
      .eq("player_id", id),
    supabase.from("sticker_players").select("id, rating, is_active"),
    supabase
      .from("seat_redemptions")
      .select(
        "license_id, redeemed_at, seat_licenses!inner(partner_name, edition)"
      )
      .eq("player_id", id)
      .order("redeemed_at", { ascending: false }),
    supabase
      .from("predictions")
      .select("id")
      .eq("player_id", id),
  ]);

  if (playerRes.error || !playerRes.data) {
    return NextResponse.json(
      { error: "Player not found" },
      { status: 404 }
    );
  }
  for (const res of [
    progressRes,
    completionsRes,
    xpRes,
    packsRes,
    squadRes,
    stickerCollectionRes,
    stickerRosterRes,
    seatRedemptionsRes,
    predictionsRes,
  ]) {
    if (res.error) {
      console.error("[admin/users/:id] sub-fetch error:", res.error);
    }
  }

  const player = playerRes.data;
  const completions = completionsRes.data || [];
  const xp = xpRes.data || [];
  const packs = packsRes.data || [];
  const squad = squadRes.data || null;
  const stickerCollection = stickerCollectionRes.data || [];
  const stickerRoster = stickerRosterRes.data || [];
  const seatRedemptions = seatRedemptionsRes.data || [];
  const predictions = predictionsRes.data || [];

  // Pull lesson titles for the completions list.
  const lessonIds = [
    ...new Set(completions.map((c) => c.lesson_id).filter(Boolean)),
  ];
  let lessonsLookup = new Map();
  if (lessonIds.length > 0) {
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, title, pillar_id");
    if (lessons) {
      const { data: pillars } = await supabase
        .from("pillars")
        .select("id, name, display_name");
      const pillarById = new Map((pillars || []).map((p) => [p.id, p]));
      lessonsLookup = new Map(
        lessons
          .filter((l) => lessonIds.includes(l.id))
          .map((l) => {
            const p = pillarById.get(l.pillar_id);
            return [
              l.id,
              {
                title: l.title || "Untitled",
                pillar: p?.display_name || p?.name || "—",
              },
            ];
          })
      );
    }
  }

  // Squad value: sum of ratings of placed sticker ids.
  const ratingById = new Map(stickerRoster.map((s) => [s.id, s.rating || 0]));
  let squadValue = 0;
  if (squad?.positions) {
    for (const stickerId of Object.values(squad.positions)) {
      squadValue += ratingById.get(stickerId) || 0;
    }
  }

  // Album: owned count over active roster.
  const activeStickerIds = new Set(
    stickerRoster
      .filter((s) => s.is_active !== false)
      .map((s) => s.id)
  );
  const ownedActive = stickerCollection.filter(
    (row) => (row.quantity || 0) > 0 && activeStickerIds.has(row.sticker_id)
  ).length;

  // Latest partner attribution (most recent redemption wins).
  const partner =
    seatRedemptions.length > 0
      ? {
          name: seatRedemptions[0].seat_licenses?.partner_name || null,
          edition: seatRedemptions[0].seat_licenses?.edition || null,
          redeemedAt: seatRedemptions[0].redeemed_at || null,
        }
      : null;

  const completionsOut = completions.map((c) => {
    const lookup = lessonsLookup.get(c.lesson_id);
    return {
      id: c.id,
      lessonId: c.lesson_id,
      title: lookup?.title || "Lesson",
      pillar: lookup?.pillar || "—",
      completed_at: c.completed_at,
      xp_earned: c.xp_earned,
      score: c.score,
      time_spent: c.time_spent,
    };
  });

  return NextResponse.json({
    player: {
      id: player.id,
      name: player.full_name || player.email?.split("@")[0] || "Player",
      email: player.email,
      edition: player.edition,
      user_type: player.user_type,
      created_at: player.created_at,
    },
    progress: progressRes.data || null,
    squadValue,
    albumCounts: { owned: ownedActive, total: activeStickerIds.size },
    partner,
    lessonsCompleted: completionsOut,
    recentXp: xp,
    packsOpenedTotal: packs.length,
    recentPacks: packs.slice(0, RECENT_PACKS_LIMIT).map((p) => ({
      id: p.id,
      opened_at: p.opened_at,
      stickerCount: Array.isArray(p.sticker_ids) ? p.sticker_ids.length : 0,
    })),
    predictionsSubmitted: predictions.length,
  });
}

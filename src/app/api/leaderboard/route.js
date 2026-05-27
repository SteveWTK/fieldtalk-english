// src/app/api/leaderboard/route.js
//
// Returns the top players ranked by either squad value or total XP.
// Uses the admin client to read across all users (RLS keeps player_xp
// and squad rows private otherwise). The current user's row is flagged
// in the response so the UI can highlight it even if they aren't in
// the visible top slice.
//
// Query params:
//   sort=squad_value | xp   (default "squad_value")
//   limit=20                (default 20, max 100)
//
// Response:
//   {
//     entries: [{ id, name, totalXp, squadValue, isYou }],
//     you?:    { rank, totalXp, squadValue }      // when current user
//                                                     isn't in the slice
//   }
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sort = url.searchParams.get("sort") === "xp" ? "xp" : "squad_value";
    const limit = Math.min(
      Math.max(1, Number(url.searchParams.get("limit") || 20)),
      100
    );

    // Auth — identify the caller so we can flag their row.
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
    // Unauthenticated users still see the leaderboard — just without
    // any "(you)" highlight.
    const currentUserId = user?.id || null;

    const supabase = await getSupabaseAdmin();

    // Pull players + their progress + their squads. Filter out admin
    // accounts so the leaderboard only ranks actual players.
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, full_name, email, user_type")
      .neq("user_type", "platform_admin");
    if (playersError) {
      return NextResponse.json(
        { error: playersError.message || "Could not load players" },
        { status: 500 }
      );
    }
    if (!players || players.length === 0) {
      return NextResponse.json({ entries: [], you: null });
    }

    const playerIds = players.map((p) => p.id);

    const [progressRes, squadsRes, stickerRes] = await Promise.all([
      supabase
        .from("player_progress")
        .select("player_id, total_xp")
        .in("player_id", playerIds),
      supabase
        .from("player_squads")
        .select("player_id, positions")
        .in("player_id", playerIds),
      supabase.from("sticker_players").select("id, rating"),
    ]);

    if (progressRes.error || squadsRes.error || stickerRes.error) {
      console.error("[leaderboard] sub-fetch error:", {
        progress: progressRes.error,
        squads: squadsRes.error,
        stickers: stickerRes.error,
      });
      return NextResponse.json(
        { error: "Could not load leaderboard data" },
        { status: 500 }
      );
    }

    // Sticker → rating lookup
    const ratingById = new Map();
    for (const s of stickerRes.data || []) ratingById.set(s.id, s.rating || 0);

    // player_id → total_xp lookup
    const xpById = new Map();
    for (const p of progressRes.data || []) xpById.set(p.player_id, p.total_xp || 0);

    // player_id → squad_value lookup
    const squadValueById = new Map();
    for (const sq of squadsRes.data || []) {
      const positions = sq.positions || {};
      let sum = 0;
      for (const stickerId of Object.values(positions)) {
        sum += ratingById.get(stickerId) || 0;
      }
      squadValueById.set(sq.player_id, sum);
    }

    // Build the ranked list
    const enriched = players.map((p) => ({
      id: p.id,
      name: p.full_name || p.email?.split("@")[0] || "Player",
      totalXp: xpById.get(p.id) || 0,
      squadValue: squadValueById.get(p.id) || 0,
    }));

    // Sort by chosen metric; tiebreak by the other metric for stability.
    enriched.sort((a, b) => {
      if (sort === "squad_value") {
        if (b.squadValue !== a.squadValue) return b.squadValue - a.squadValue;
        return b.totalXp - a.totalXp;
      }
      if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp;
      return b.squadValue - a.squadValue;
    });

    // Slice to the visible top + compute the caller's rank (1-indexed).
    const youIndex = currentUserId
      ? enriched.findIndex((e) => e.id === currentUserId)
      : -1;
    const youRank = youIndex >= 0 ? youIndex + 1 : null;

    const entries = enriched.slice(0, limit).map((e, idx) => ({
      rank: idx + 1,
      name: e.name,
      totalXp: e.totalXp,
      squadValue: e.squadValue,
      isYou: e.id === currentUserId,
    }));

    const you =
      youIndex >= 0 && youIndex >= limit
        ? {
            rank: youRank,
            name: enriched[youIndex].name,
            totalXp: enriched[youIndex].totalXp,
            squadValue: enriched[youIndex].squadValue,
            isYou: true,
          }
        : null;

    return NextResponse.json({ entries, you, sort });
  } catch (err) {
    console.error("[leaderboard] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// src/app/api/leaderboard/route.js
//
// Returns the top players ranked by squad value, total XP, or
// album-completion percentage. Uses the admin client to read across
// all users (RLS keeps player_xp and squad rows private otherwise).
// The current user's row is flagged in the response so the UI can
// highlight it even if they aren't in the visible top slice.
//
// Query params:
//   sort=squad_value | xp | album   (default "squad_value")
//   limit=20                        (default 20, max 100)
//
// Response:
//   {
//     entries: [{ id, name, totalXp, squadValue, albumOwned,
//                 albumTotal, albumPct, isYou }],
//     you?:    { rank, totalXp, squadValue, albumOwned,
//                albumTotal, albumPct }   // when current user isn't
//                                            in the visible slice
//   }
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sortRaw = url.searchParams.get("sort");
    const sort =
      sortRaw === "xp" || sortRaw === "album" ? sortRaw : "squad_value";
    const limit = Math.min(
      Math.max(1, Number(url.searchParams.get("limit") || 20)),
      100
    );
    // Edition scoping. If the request specifies one we honour it; if
    // not, we default to the caller's own players.edition so the WC2026
    // dashboard naturally shows the WC2026 leaderboard. Pass
    // `?edition=all` to bypass the filter entirely (admin use only).
    const editionParam = url.searchParams.get("edition");

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

    // Resolve the edition to filter on. Explicit ?edition=... wins,
    // otherwise we look at the caller's row. "all" disables filtering.
    let edition = editionParam;
    if (!edition && currentUserId) {
      const { data: me } = await supabase
        .from("players")
        .select("edition")
        .eq("id", currentUserId)
        .maybeSingle();
      edition = me?.edition || null;
    }

    // Pull players + their progress + their squads. Admin accounts are
    // included on purpose — during the early WC2026 demo they're
    // legitimate test users and would otherwise vanish from their own
    // leaderboard. Tighten later by adding .neq("user_type",
    // "platform_admin") once there's a real player cohort.
    let playersQuery = supabase
      .from("players")
      .select("id, full_name, email, user_type, edition");
    if (edition && edition !== "all") {
      playersQuery = playersQuery.eq("edition", edition);
    }
    const { data: players, error: playersError } = await playersQuery;
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

    const [progressRes, squadsRes, stickerRes, collectionsRes] =
      await Promise.all([
        supabase
          .from("player_progress")
          .select("player_id, total_xp")
          .in("player_id", playerIds),
        supabase
          .from("player_squads")
          .select("player_id, positions")
          .in("player_id", playerIds),
        // Active stickers only — matches the album view, so the
        // denominator a user sees here is the same one they see on
        // /dashboard/album. Inactive/retired stickers are excluded.
        supabase.from("sticker_players").select("id, rating, is_active"),
        supabase
          .from("player_stickers")
          .select("player_id, sticker_id, quantity")
          .in("player_id", playerIds),
      ]);

    if (
      progressRes.error ||
      squadsRes.error ||
      stickerRes.error ||
      collectionsRes.error
    ) {
      console.error("[leaderboard] sub-fetch error:", {
        progress: progressRes.error,
        squads: squadsRes.error,
        stickers: stickerRes.error,
        collections: collectionsRes.error,
      });
      return NextResponse.json(
        { error: "Could not load leaderboard data" },
        { status: 500 }
      );
    }

    // Sticker → rating, and the set of active sticker ids. The active
    // set defines the denominator for album-completion percentage so
    // retired cards can't drag everyone's % down.
    const ratingById = new Map();
    const activeStickerIds = new Set();
    for (const s of stickerRes.data || []) {
      ratingById.set(s.id, s.rating || 0);
      if (s.is_active !== false) activeStickerIds.add(s.id);
    }
    const albumTotal = activeStickerIds.size;

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

    // player_id → count of distinct active stickers owned (quantity ≥ 1).
    // A player can hold a row with quantity 0 after trading a final
    // duplicate (shouldn't happen — we guard ≥2 in trade-in — but be
    // defensive), so we filter on quantity > 0.
    const albumOwnedById = new Map();
    for (const row of collectionsRes.data || []) {
      if (!row.player_id || !row.sticker_id) continue;
      if ((row.quantity || 0) <= 0) continue;
      if (!activeStickerIds.has(row.sticker_id)) continue;
      albumOwnedById.set(
        row.player_id,
        (albumOwnedById.get(row.player_id) || 0) + 1
      );
    }

    // Build the ranked list
    const enriched = players.map((p) => {
      const albumOwned = albumOwnedById.get(p.id) || 0;
      const albumPct =
        albumTotal > 0
          ? Math.min(100, Math.round((albumOwned / albumTotal) * 100))
          : 0;
      return {
        id: p.id,
        name: p.full_name || p.email?.split("@")[0] || "Player",
        totalXp: xpById.get(p.id) || 0,
        squadValue: squadValueById.get(p.id) || 0,
        albumOwned,
        albumTotal,
        albumPct,
      };
    });

    // Sort by chosen metric; tiebreak by total XP for stability.
    enriched.sort((a, b) => {
      if (sort === "squad_value") {
        if (b.squadValue !== a.squadValue) return b.squadValue - a.squadValue;
        return b.totalXp - a.totalXp;
      }
      if (sort === "album") {
        // Compare owned counts (integer) rather than albumPct so two
        // players with very small denominators don't tie at 100% by
        // coincidence. albumTotal is the same for everyone in the
        // same edition so this is equivalent to comparing %.
        if (b.albumOwned !== a.albumOwned) return b.albumOwned - a.albumOwned;
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
      albumOwned: e.albumOwned,
      albumTotal: e.albumTotal,
      albumPct: e.albumPct,
      isYou: e.id === currentUserId,
    }));

    const you =
      youIndex >= 0 && youIndex >= limit
        ? {
            rank: youRank,
            name: enriched[youIndex].name,
            totalXp: enriched[youIndex].totalXp,
            squadValue: enriched[youIndex].squadValue,
            albumOwned: enriched[youIndex].albumOwned,
            albumTotal: enriched[youIndex].albumTotal,
            albumPct: enriched[youIndex].albumPct,
            isYou: true,
          }
        : null;

    return NextResponse.json({ entries, you, sort, edition });
  } catch (err) {
    console.error("[leaderboard] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

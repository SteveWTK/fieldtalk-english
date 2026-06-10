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
import { BRANCHES, canonicalPartnerName } from "@/lib/branches";

// Resolve a partner-branch slug ("fortaleza", "teresina", …) to the
// full set of player IDs affiliated with that branch via ANY of three
// signals:
//
//   1. players.partner_referrer = <slug>
//        — set when the user signed up via /wc2026?branch=<slug>.
//   2. seat_redemptions → seat_licenses.partner_name matches the
//      branch's canonical partner name (aliases included via
//      canonicalPartnerName).
//        — covers the case a partner needs to count students who
//          came in via a generic FieldTalk link but redeemed a
//          partner-issued seat licence.
//   3. player_edition_access.promo_code_prefix maps (via
//      partner_promo_prefixes) to the branch's canonical partner.
//        — covers the same case with discounted Stripe purchases.
//
// Union of the three is what an admin or partner would intuitively
// think of as "their students" — anyone who came in via the
// partner's link, code, or licence. Returns null when slug is
// falsy (caller should treat as "no filter").
async function resolveBranchPlayerIds(supabase, slug) {
  if (!slug) return null;

  const branchAlt = BRANCHES[slug]?.alt || null;

  const [directRes, redemptionsRes, prefixesRes] = await Promise.all([
    supabase.from("players").select("id").eq("partner_referrer", slug),
    branchAlt
      ? supabase
          .from("seat_redemptions")
          .select("player_id, seat_licenses(partner_name)")
      : Promise.resolve({ data: [], error: null }),
    branchAlt
      ? supabase
          .from("partner_promo_prefixes")
          .select("prefix, partner_name")
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (directRes.error) throw directRes.error;
  if (redemptionsRes.error) throw redemptionsRes.error;
  if (prefixesRes.error) throw prefixesRes.error;

  const ids = new Set();
  for (const p of directRes.data || []) ids.add(p.id);

  if (branchAlt) {
    for (const r of redemptionsRes.data || []) {
      const partner = canonicalPartnerName(
        r.seat_licenses?.partner_name || ""
      );
      if (partner === branchAlt && r.player_id) ids.add(r.player_id);
    }

    // Promo prefixes are stored upper-case in the lookup table; the
    // events route assumes the same on player_edition_access. Match
    // the convention so we don't miss rows.
    const matchingPrefixes = (prefixesRes.data || [])
      .filter((p) => canonicalPartnerName(p.partner_name) === branchAlt)
      .map((p) => (p.prefix || "").toUpperCase())
      .filter(Boolean);

    if (matchingPrefixes.length > 0) {
      const { data: promoAccess, error: promoErr } = await supabase
        .from("player_edition_access")
        .select("player_id, promo_code_prefix")
        .in("promo_code_prefix", matchingPrefixes);
      if (promoErr) throw promoErr;
      for (const a of promoAccess || []) {
        if (a.player_id) ids.add(a.player_id);
      }
    }
  }

  return Array.from(ids);
}

// Infer a caller's branch slug from their seat redemptions when
// players.partner_referrer is null. Used so users who signed up via
// a generic link but redeemed a partner seat code still get the
// "My school" toggle pointing at the right partner.
async function inferCallerBranchFromRedemptions(supabase, userId) {
  if (!userId) return null;
  const { data: redemptions } = await supabase
    .from("seat_redemptions")
    .select("redeemed_at, seat_licenses(partner_name)")
    .eq("player_id", userId)
    .order("redeemed_at", { ascending: false })
    .limit(5);
  for (const r of redemptions || []) {
    const partner = canonicalPartnerName(
      r.seat_licenses?.partner_name || ""
    );
    if (!partner) continue;
    for (const [slug, branch] of Object.entries(BRANCHES)) {
      if (slug === "default") continue;
      if (branch.alt === partner) return slug;
    }
  }
  return null;
}

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const sortRaw = url.searchParams.get("sort");
    const sort = [
      "xp",
      "album",
      "predictions_xp",
    ].includes(sortRaw)
      ? sortRaw
      : "squad_value";
    const limit = Math.min(
      Math.max(1, Number(url.searchParams.get("limit") || 20)),
      100
    );
    // Edition scoping. If the request specifies one we honour it; if
    // not, we default to the caller's own players.edition so the WC2026
    // dashboard naturally shows the WC2026 leaderboard. Pass
    // `?edition=all` to bypass the filter entirely (admin use only).
    const editionParam = url.searchParams.get("edition");
    // Partner branch filter. Three values supported:
    //   - explicit slug ("teresina", "fortaleza", …) → filter to
    //     players with that exact partner_referrer
    //   - "mine" → server resolves to the caller's own
    //              partner_referrer (saves the client a round-trip)
    //   - omitted / "all" → no filter (global leaderboard)
    // Cultura Teresina + Fortaleza use this for school-local
    // competitions; students compete against people they know.
    const branchParamRaw = url.searchParams.get("branch");
    const branchParam =
      branchParamRaw && branchParamRaw !== "all"
        ? branchParamRaw.toLowerCase().trim()
        : null;

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

    // Resolve the edition to filter on. Also pull the caller's own
    // partner_referrer in the same round-trip so we can (a) resolve
    // branch=mine, and (b) tell the client whether to show a "My
    // school" toggle. Single query for both saves a hop.
    let edition = editionParam;
    let callerBranch = null;
    if (currentUserId) {
      const { data: me } = await supabase
        .from("players")
        .select("edition, partner_referrer")
        .eq("id", currentUserId)
        .maybeSingle();
      if (!edition) edition = me?.edition || null;
      callerBranch = me?.partner_referrer || null;
      // Fallback: caller has no partner_referrer (e.g. signed up via
      // a generic FieldTalk link) but redeemed a partner seat code.
      // Infer their branch from the redemption so the "My school"
      // toggle works.
      if (!callerBranch) {
        callerBranch = await inferCallerBranchFromRedemptions(
          supabase,
          currentUserId
        );
      }
    }

    // Resolve branch filter. "mine" maps to the caller's own
    // partner_referrer; anything else is taken verbatim. A "mine"
    // call by an un-attributed user disables the filter rather than
    // returning an empty leaderboard.
    const resolvedBranch =
      branchParam === "mine" ? callerBranch : branchParam;

    // If a branch filter was requested, resolve it to the union of
    // player IDs that match via partner_referrer, seat redemption, or
    // promo-code attribution. Empty set → short-circuit to an empty
    // leaderboard before we fetch anything else.
    let branchPlayerIds = null;
    if (resolvedBranch) {
      try {
        branchPlayerIds = await resolveBranchPlayerIds(
          supabase,
          resolvedBranch
        );
      } catch (err) {
        console.error("[leaderboard] branch resolution error:", err);
        return NextResponse.json(
          { error: "Could not resolve branch" },
          { status: 500 }
        );
      }
      if (!branchPlayerIds || branchPlayerIds.length === 0) {
        return NextResponse.json({
          entries: [],
          you: null,
          sort,
          edition,
          callerBranch,
          branch: resolvedBranch,
        });
      }
    }

    // Pull players + their progress + their squads. Admin accounts are
    // included on purpose — during the early WC2026 demo they're
    // legitimate test users and would otherwise vanish from their own
    // leaderboard. Tighten later by adding .neq("user_type",
    // "platform_admin") once there's a real player cohort.
    let playersQuery = supabase
      .from("players")
      .select("id, full_name, email, user_type, edition, partner_referrer");
    if (edition && edition !== "all") {
      playersQuery = playersQuery.eq("edition", edition);
    }
    if (branchPlayerIds) {
      // Union of partner_referrer + seat redemption + promo-code
      // attribution paths. PK lookup; index-backed.
      playersQuery = playersQuery.in("id", branchPlayerIds);
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

    // ⚠ Two of these tables can exceed Supabase's PostgREST
    // db-max-rows cap (1000 rows by default) and silently truncate:
    //
    //   sticker_players  — 1248 active rows once all 48 WC2026
    //                       squads are loaded
    //   player_stickers  — ~50 users × ~50 stickers each grows
    //                       past 1000 quickly
    //
    // `.limit(N)` on the client CANNOT override db-max-rows — the
    // hard cap is enforced server-side regardless of what the
    // request asks for ("There's no way to override the value of
    // db-max-rows from the request" — PostgREST docs). So our
    // previous explicit limits were a no-op against the same
    // truncation that produced the original bug (squad value 49
    // vs 37 in the leaderboard).
    //
    // The reliable fix is range-based pagination — multiple
    // 1000-row requests stitched together. fetchAllRows below
    // pages until the chunk comes back smaller than the page size.
    const PAGE_SIZE = 1000;
    async function fetchAllRows(buildQuery) {
      const out = [];
      let offset = 0;
      // Hard safety cap so a runaway DB never spins this loop
      // forever. 100k rows × any of these tables is far beyond
      // what FieldTalk could realistically have at WC2026 scale.
      const HARD_CAP = 100_000;
      while (offset < HARD_CAP) {
        const { data, error } = await buildQuery().range(
          offset,
          offset + PAGE_SIZE - 1
        );
        if (error) return { data: null, error };
        const rows = data || [];
        out.push(...rows);
        if (rows.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }
      return { data: out, error: null };
    }

    const [
      progressRes,
      squadsRes,
      stickerRes,
      collectionsRes,
      predictionsRes,
    ] = await Promise.all([
      // Bounded by `playerIds.length` (one row per player). Safe to
      // single-shot — capped at 1000 only matters if you have 1000+
      // players in one edition, which is well past where we are.
      supabase
        .from("player_progress")
        .select("player_id, total_xp, hat_trick_count")
        .in("player_id", playerIds),
      supabase
        .from("player_squads")
        .select("player_id, positions")
        .in("player_id", playerIds),
      // Active stickers only — matches the album view, so the
      // denominator a user sees here is the same one they see on
      // /dashboard/album. Inactive/retired stickers are excluded.
      // PAGED — 1248+ rows is past the default cap.
      fetchAllRows(() =>
        supabase.from("sticker_players").select("id, rating, is_active")
      ),
      // PAGED — grows past the cap as users accumulate stickers.
      fetchAllRows(() =>
        supabase
          .from("player_stickers")
          .select("player_id, sticker_id, quantity")
          .in("player_id", playerIds)
      ),
      // Predictions XP — sum of xp_awarded across all resolved
      // match_predictions per player. Could exceed the cap mid-
      // tournament; page just in case.
      fetchAllRows(() =>
        supabase
          .from("match_predictions")
          .select("player_id, xp_awarded")
          .in("player_id", playerIds)
          .gt("xp_awarded", 0)
      ),
    ]);

    if (
      progressRes.error ||
      squadsRes.error ||
      stickerRes.error ||
      collectionsRes.error ||
      predictionsRes.error
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

    // player_id → total_xp + hat_trick_count lookup
    const xpById = new Map();
    const hatTrickById = new Map();
    for (const p of progressRes.data || []) {
      xpById.set(p.player_id, p.total_xp || 0);
      hatTrickById.set(p.player_id, p.hat_trick_count || 0);
    }

    // player_id → sum of xp_awarded on resolved match_predictions
    const predictionsXpById = new Map();
    for (const row of predictionsRes.data || []) {
      predictionsXpById.set(
        row.player_id,
        (predictionsXpById.get(row.player_id) || 0) + (row.xp_awarded || 0)
      );
    }

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
        predictionsXp: predictionsXpById.get(p.id) || 0,
        hatTricks: hatTrickById.get(p.id) || 0,
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
      if (sort === "predictions_xp") {
        // Tiebreak by hat-tricks (rewards quality over quantity)
        // then total XP.
        if (b.predictionsXp !== a.predictionsXp)
          return b.predictionsXp - a.predictionsXp;
        if (b.hatTricks !== a.hatTricks) return b.hatTricks - a.hatTricks;
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
      predictionsXp: e.predictionsXp,
      hatTricks: e.hatTricks,
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
            predictionsXp: enriched[youIndex].predictionsXp,
            hatTricks: enriched[youIndex].hatTricks,
            isYou: true,
          }
        : null;

    return NextResponse.json({
      entries,
      you,
      sort,
      edition,
      // Caller's own partner_referrer (so the client can decide
      // whether to show the "My school" toggle) and the branch the
      // current response was filtered on (or null when global).
      callerBranch,
      branch: resolvedBranch,
    });
  } catch (err) {
    console.error("[leaderboard] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

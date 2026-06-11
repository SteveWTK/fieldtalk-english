// src/app/api/admin/sticker-mapping/route.js
//
// Admin endpoints for the dynamic-rating mapping workflow:
//
//   GET /api/admin/sticker-mapping
//     → list every active sticker with its current
//       api_football_player_id (null = unmapped), plus filter +
//       pagination metadata. Drives the admin mapping table.
//
//   PATCH /api/admin/sticker-mapping
//     body: { sticker_id, api_football_player_id }
//     → set or clear a sticker's mapping (null clears).
//
//   GET /api/admin/sticker-mapping/search?q=<name>&team=<code>
//     handled by the sibling /search route — proxies API-Football
//     player search so the admin can find a candidate without
//     leaving the page.
//
// Auth: platform_admin only.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

const PAGE_SIZE_HARD = 2000;

export async function GET(request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const supabase = guard.supabase;

  const url = new URL(request.url);
  // "mapped" | "unmapped" | "all" (default unmapped — the workflow is
  // about filling in the gaps, not browsing already-mapped rows).
  const filter = url.searchParams.get("filter") || "unmapped";
  const search = (url.searchParams.get("q") || "").trim();

  let q = supabase
    .from("sticker_players")
    .select(
      "id, name, country, country_code, position, rating, previous_rating, rating_updated_at, rating_change_reason, api_football_player_id, is_active"
    )
    .eq("is_active", true)
    .order("country", { ascending: true })
    .order("name", { ascending: true })
    .range(0, PAGE_SIZE_HARD - 1);

  if (filter === "mapped") {
    q = q.not("api_football_player_id", "is", null);
  } else if (filter === "unmapped") {
    q = q.is("api_football_player_id", null);
  }
  if (search) {
    // ilike pattern — supports player name + country (which IS the
    // team at WC2026). Wrap in % manually so the caller doesn't have to.
    q = q.or(`name.ilike.%${search}%,country.ilike.%${search}%`);
  }

  const { data, error } = await q;
  if (error) {
    console.error("[admin/sticker-mapping] list error:", error);
    return NextResponse.json(
      { error: error.message || "Could not load stickers" },
      { status: 500 }
    );
  }

  // Headline counts for the filter pills.
  const [mappedRes, unmappedRes] = await Promise.all([
    supabase
      .from("sticker_players")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .not("api_football_player_id", "is", null),
    supabase
      .from("sticker_players")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)
      .is("api_football_player_id", null),
  ]);

  return NextResponse.json({
    stickers: data || [],
    counts: {
      mapped: mappedRes.count || 0,
      unmapped: unmappedRes.count || 0,
    },
  });
}

export async function PATCH(request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;
  const supabase = guard.supabase;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // sticker_players.id is UUID; keep as string.
  const stickerId =
    typeof body?.sticker_id === "string" ? body.sticker_id.trim() : null;
  if (!stickerId) {
    return NextResponse.json({ error: "sticker_id required" }, { status: 400 });
  }

  // null / 0 / "" clears the mapping (cron will skip the row again).
  const apiFootballPlayerId =
    body?.api_football_player_id == null || body?.api_football_player_id === ""
      ? null
      : Number(body.api_football_player_id);

  if (
    apiFootballPlayerId != null &&
    (!Number.isFinite(apiFootballPlayerId) || apiFootballPlayerId <= 0)
  ) {
    return NextResponse.json(
      { error: "api_football_player_id must be a positive integer or null" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("sticker_players")
    .update({ api_football_player_id: apiFootballPlayerId })
    .eq("id", stickerId);
  if (error) {
    console.error("[admin/sticker-mapping] update error:", error);
    return NextResponse.json(
      { error: error.message || "Could not save mapping" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}

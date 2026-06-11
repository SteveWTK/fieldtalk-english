// src/app/api/admin/sticker-mapping/search/route.js
//
// Server-side proxy for API-Football's player search, used by the
// admin mapping page so the API key stays on the server.
//
//   GET /api/admin/sticker-mapping/search?q=<name>&season=<year>
//     → returns top candidate players from API-Football matching
//       the name. Each candidate carries enough metadata (id, name,
//       team, age, nationality, photo) for the admin to confidently
//       pick the right one before clicking Save.
//
// API-Football constraint: /players endpoint requires `search` of
// at least 3 characters AND either `team` or `league` or `season`.
// We pass `season` (defaulting to the current WC2026 season) so the
// admin can search by name alone.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
const DEFAULT_SEASON = Number(process.env.API_FOOTBALL_SEASON || 2026);

export async function GET(request) {
  const guard = await requireAdmin();
  if (guard.response) return guard.response;

  if (!process.env.API_FOOTBALL_KEY) {
    return NextResponse.json(
      { error: "API_FOOTBALL_KEY not configured" },
      { status: 500 }
    );
  }

  const url = new URL(request.url);
  const q = (url.searchParams.get("q") || "").trim();
  const season = Number(url.searchParams.get("season") || DEFAULT_SEASON);
  if (q.length < 3) {
    return NextResponse.json(
      { error: "Search query must be at least 3 characters." },
      { status: 400 }
    );
  }

  const apiUrl = `${API_FOOTBALL_BASE}/players?search=${encodeURIComponent(q)}&season=${season}`;
  let payload;
  try {
    const res = await fetch(apiUrl, {
      headers: { "x-apisports-key": process.env.API_FOOTBALL_KEY },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error: `API-Football ${res.status}`,
          details: body.slice(0, 300),
        },
        { status: 502 }
      );
    }
    payload = await res.json();
  } catch (err) {
    return NextResponse.json(
      { error: "Could not reach API-Football", details: err?.message },
      { status: 502 }
    );
  }

  // Flatten the API-Football shape to what the UI actually needs.
  // Each response[i] is { player: {...}, statistics: [{ team, league, ...}, ...] }
  // Take the first statistics entry as the "primary" team — fine
  // for disambiguation in the UI.
  const candidates = (payload?.response || []).map((row) => {
    const player = row?.player || {};
    const primary = row?.statistics?.[0] || {};
    return {
      api_football_player_id: player.id,
      name: player.name,
      firstname: player.firstname,
      lastname: player.lastname,
      age: player.age,
      nationality: player.nationality,
      photo: player.photo,
      team_name: primary?.team?.name || null,
      team_logo: primary?.team?.logo || null,
      league_name: primary?.league?.name || null,
      position: primary?.games?.position || null,
    };
  });

  return NextResponse.json({
    query: q,
    season,
    candidates,
    total: candidates.length,
  });
}

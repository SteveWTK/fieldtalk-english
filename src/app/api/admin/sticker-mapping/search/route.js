// src/app/api/admin/sticker-mapping/search/route.js
//
// Server-side proxy for API-Football's player-profile search, used
// by the admin mapping page so the API key stays on the server.
//
//   GET /api/admin/sticker-mapping/search?q=<name>
//     → returns top candidate players from API-Football matching
//       the name. Each candidate carries enough metadata (id,
//       name, position, nationality, photo, birth) for the admin
//       to confidently pick the right one before clicking Save.
//
// Why /players/profiles and not /players?
//   /players?search=…&season=… only returns players who already
//   have statistics in that season. Early in WC2026 that set is
//   nearly empty — every search returns "No candidates found".
//   /players/profiles?search=… queries the profile registry
//   directly and doesn't need a season. The recompute cron still
//   uses /players?id=X&season=2026 (works by ID regardless of
//   whether stats exist yet).
//
// Min query length:
//   API-Football requires at least 4 characters on this endpoint.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";

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
  if (q.length < 4) {
    return NextResponse.json(
      { error: "Search query must be at least 4 characters." },
      { status: 400 }
    );
  }

  const apiUrl = `${API_FOOTBALL_BASE}/players/profiles?search=${encodeURIComponent(q)}`;
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

  // Flatten the API-Football /players/profiles shape to what the UI
  // actually needs. Each response[i] is { player: { id, name, ... } }.
  const candidates = (payload?.response || []).map((row) => {
    const player = row?.player || {};
    return {
      api_football_player_id: player.id,
      name: player.name,
      firstname: player.firstname,
      lastname: player.lastname,
      age: player.age,
      nationality: player.nationality,
      birth_date: player.birth?.date || null,
      position: player.position || null,
      photo: player.photo || null,
    };
  });

  return NextResponse.json({
    query: q,
    candidates,
    total: candidates.length,
  });
}

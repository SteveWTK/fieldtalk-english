// src/app/api/cron/recompute-sticker-ratings/route.js
//
// Daily Vercel cron — recomputes every mapped sticker's rating from
// API-Football season stats. Runs at 06:00 BRT (09:00 UTC) so users
// see fresh ratings when they open the app for the day.
//
// Schedule: 0 9 * * * (every day at 09:00 UTC). See vercel.json.
//
// Flow:
//   1. Auth via CRON_SECRET header (same pattern as the other crons).
//   2. Pull every sticker_player with api_football_player_id NOT NULL.
//      Unmapped stickers are skipped — their static rating stays
//      untouched until an admin maps them.
//   3. For each, hit API-Football /players?id=X&season=Y, compute a
//      new 1-5★ rating from the aggregate stats, and update the row
//      if it differs. Capture previous_rating + a human-readable
//      reason so the UI can render ★↑/★↓ animations + tooltips.
//   4. Insert a sticker_rating_history row per change for audit /
//      sanity-check / rollback.
//
// Rate limiting:
//   API-Football's Ultra plan is 450 req/min ≈ 7.5/s. We throttle
//   to 6/s (some headroom). 1248 mapped stickers at 6/s ≈ 3.5 min,
//   well inside Vercel Pro's 300s function timeout.
//
// Tuning the rating algorithm:
//   `ratingFromApiStats` below is intentionally simple v1. Once
//   the tournament has a few rounds of data we should switch to a
//   blended WC-form + pre-WC-season aggregation. Source payload is
//   stored on each history row so we can backfill new algorithms.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const API_FOOTBALL_BASE = "https://v3.football.api-sports.io";
// API-Football resets seasons on calendar year for international
// competitions. WC2026 is the 2026 season. Override via env if a
// player's club season needs a different year (e.g. 2025/26 league).
const DEFAULT_SEASON = Number(process.env.API_FOOTBALL_SEASON || 2026);
const REQUESTS_PER_SECOND = 6;
const PAGE_SIZE = 1000;

// Maps an aggregate avg fixture rating to a 1-5★ sticker rating.
// Thresholds are calibrated so WC superstars (Mbappé, Bellingham,
// Vinícius, etc.) sit at 5★ when in form, regular starters at 3-4★,
// fringe squad players at 1-2★. Tune in production once we see the
// real distribution.
const RATING_BANDS = [
  { min: 7.5, stars: 5 },
  { min: 7.1, stars: 4 },
  { min: 6.7, stars: 3 },
  { min: 6.3, stars: 2 },
  { min: 0, stars: 1 },
];

function bandForAvg(avg) {
  for (const b of RATING_BANDS) if (avg >= b.min) return b.stars;
  return 1;
}

// Returns { newRating, reason, summary } or null when the payload
// carries no usable stats (no minutes played anywhere this season).
// The caller treats null as "keep current rating" rather than 1★.
function ratingFromApiStats(payload) {
  const stats = payload?.response?.[0]?.statistics || [];
  let weightedSum = 0;
  let weightTotal = 0;
  let totalMinutes = 0;
  let goals = 0;
  let assists = 0;
  let appearances = 0;

  for (const s of stats) {
    const minutes = s?.games?.minutes || 0;
    const rating = parseFloat(s?.games?.rating || "0");
    if (rating > 0 && minutes > 0) {
      weightedSum += rating * minutes;
      weightTotal += minutes;
    }
    totalMinutes += minutes;
    goals += s?.goals?.total || 0;
    assists += s?.goals?.assists || 0;
    appearances += s?.games?.appearences || 0;
  }

  if (weightTotal === 0) return null;

  const avgRating = weightedSum / weightTotal;
  const newRating = bandForAvg(avgRating);

  const parts = [`${appearances} app${appearances === 1 ? "" : "s"}`];
  parts.push(`avg ${avgRating.toFixed(2)}`);
  if (goals > 0) parts.push(`${goals} goal${goals === 1 ? "" : "s"}`);
  if (assists > 0) parts.push(`${assists} assist${assists === 1 ? "" : "s"}`);

  return {
    newRating,
    reason: parts.join(", "),
    summary: { avgRating, totalMinutes, goals, assists, appearances },
  };
}

async function fetchPlayerStats(playerId, season, apiKey) {
  const url = `${API_FOOTBALL_BASE}/players?id=${playerId}&season=${season}`;
  const res = await fetch(url, {
    headers: { "x-apisports-key": apiKey },
    // Force fresh data each cron run; caching would defeat the point.
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API-Football ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

// Tiny token-bucket throttle. Resolves after enough time has passed
// to stay under REQUESTS_PER_SECOND on average.
async function throttle(lastTick) {
  const minGap = 1000 / REQUESTS_PER_SECOND;
  const elapsed = Date.now() - lastTick;
  if (elapsed < minGap) {
    await new Promise((r) => setTimeout(r, minGap - elapsed));
  }
}

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!process.env.API_FOOTBALL_KEY) {
      return NextResponse.json(
        { error: "API_FOOTBALL_KEY not configured" },
        { status: 500 }
      );
    }

    const url = new URL(request.url);
    const season = Number(url.searchParams.get("season") || DEFAULT_SEASON);
    const dryRun = url.searchParams.get("dry") === "1";
    const limitParam = Number(url.searchParams.get("limit") || 0);

    const supabase = await getSupabaseAdmin();

    // Page through all mapped stickers (db-max-rows caps a single
    // .select() at 1000; the catalogue is 1248 + room to grow).
    const stickers = [];
    let offset = 0;
    while (true) {
      let q = supabase
        .from("sticker_players")
        .select("id, rating, api_football_player_id")
        .not("api_football_player_id", "is", null)
        .eq("is_active", true)
        .range(offset, offset + PAGE_SIZE - 1);
      const { data, error } = await q;
      if (error) {
        console.error("[cron/recompute-sticker-ratings] fetch error:", error);
        return NextResponse.json(
          { error: "Could not load mapped stickers" },
          { status: 500 }
        );
      }
      stickers.push(...(data || []));
      if (!data || data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const target = limitParam > 0 ? stickers.slice(0, limitParam) : stickers;

    let updated = 0;
    let unchanged = 0;
    let skipped = 0;
    let failed = 0;
    const failures = [];
    let lastTick = 0;

    for (const sticker of target) {
      await throttle(lastTick);
      lastTick = Date.now();

      let payload;
      try {
        payload = await fetchPlayerStats(
          sticker.api_football_player_id,
          season,
          process.env.API_FOOTBALL_KEY
        );
      } catch (err) {
        failed += 1;
        failures.push({ sticker_id: sticker.id, error: err.message });
        continue;
      }

      const result = ratingFromApiStats(payload);
      if (!result) {
        skipped += 1;
        continue;
      }
      if (result.newRating === sticker.rating) {
        unchanged += 1;
        continue;
      }

      if (dryRun) {
        updated += 1;
        continue;
      }

      const now = new Date().toISOString();
      const { error: updateErr } = await supabase
        .from("sticker_players")
        .update({
          rating: result.newRating,
          previous_rating: sticker.rating,
          rating_updated_at: now,
          rating_change_reason: result.reason,
        })
        .eq("id", sticker.id);
      if (updateErr) {
        failed += 1;
        failures.push({ sticker_id: sticker.id, error: updateErr.message });
        continue;
      }

      await supabase.from("sticker_rating_history").insert({
        sticker_id: sticker.id,
        recomputed_at: now,
        previous_rating: sticker.rating,
        new_rating: result.newRating,
        reason: result.reason,
        source: payload?.response?.[0] || null,
      });
      updated += 1;
    }

    return NextResponse.json({
      ok: true,
      season,
      dryRun,
      considered: target.length,
      updated,
      unchanged,
      skipped,
      failed,
      failures: failures.slice(0, 20),
    });
  } catch (err) {
    console.error("[cron/recompute-sticker-ratings] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

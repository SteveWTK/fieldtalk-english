// src/app/api/admin/matches/list/route.js
//
// GET /api/admin/matches/list
//
// Returns the tournament schedule for the admin matches console.
// Three buckets, all in a single call (the admin console is small
// enough to load everything at once):
//
//   needsResolution  — kickoff has passed and resolved_at is null.
//                       These are the matches the admin needs to
//                       enter results for.
//   upcoming         — kickoff in the future. Useful to sanity-check
//                       the schedule.
//   resolved         — already graded, most-recent first. Showing
//                       the last 20 so the admin can spot a bad
//                       result entry quickly.

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin/requireAdmin";

const RESOLVED_LIMIT = 20;

export async function GET() {
  try {
    const guard = await requireAdmin();
    if (guard.response) return guard.response;
    const supabase = guard.supabase;
    const nowIso = new Date().toISOString();

    const [needsRes, upcomingRes, resolvedRes] = await Promise.all([
      supabase
        .from("matches")
        .select("*")
        .lte("kickoff_at", nowIso)
        .is("resolved_at", null)
        .order("kickoff_at", { ascending: true }),
      supabase
        .from("matches")
        .select("*")
        .gt("kickoff_at", nowIso)
        .order("kickoff_at", { ascending: true }),
      supabase
        .from("matches")
        .select("*")
        .not("resolved_at", "is", null)
        .order("resolved_at", { ascending: false })
        .limit(RESOLVED_LIMIT),
    ]);

    for (const r of [needsRes, upcomingRes, resolvedRes]) {
      if (r.error) {
        console.error("[admin/matches/list] query error:", r.error);
        return NextResponse.json(
          { error: "Could not load matches" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      needsResolution: needsRes.data || [],
      upcoming: upcomingRes.data || [],
      resolved: resolvedRes.data || [],
    });
  } catch (err) {
    console.error("[admin/matches/list] unhandled error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}

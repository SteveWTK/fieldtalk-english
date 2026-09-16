// src/app/api/player-level-completions/route.js
//
// GET /api/player-level-completions
//
// Returns the caller's earned Level certificates. Auto-awards any
// levels the player has newly completed since their last dashboard
// load — the endpoint computes "did every pillar in Level N reach
// 100%?" server-side and upserts a `player_level_completions` row
// per newly-earned level.
//
// This "compute + upsert on read" pattern keeps the client simple:
// the /lesson + dashboard pages just call GET and get the current
// state, no separate "claim certificate" step. Idempotent — the
// UNIQUE (player_id, level_id) constraint means re-checks are no-ops
// after the first award.
//
// Response shape:
//   {
//     completions: [
//       {
//         id, level_id, earned_at,
//         level_name_snapshot,
//         level_display_name_snapshot,
//         newly_awarded: boolean   // true if this call inserted the row
//       }
//     ]
//   }
//
// Access: authed player only. No admin bypass — this is a personal
// record, not an admin resource.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function GET() {
  // ── Auth ──────────────────────────────────────────────────────
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
    },
  );
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseAdmin();

  // ── Fetch the pieces we need for the completion check ─────────
  // Levels + their pillars + those pillars' lessons + the player's
  // completions. All in parallel — this is a read-heavy endpoint.
  const [levelsRes, pillarsRes, lessonsRes, completionsRes, existingRes] =
    await Promise.all([
      supabase
        .from("levels")
        .select("id, name, display_name_pt, display_name_en, sort_order")
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      supabase.from("pillars").select("id, level_id"),
      supabase
        .from("lessons")
        .select("id, pillar_id, under_construction"),
      supabase
        .from("lesson_completions")
        .select("lesson_id")
        .eq("player_id", user.id),
      supabase
        .from("player_level_completions")
        .select(
          "id, level_id, earned_at, level_name_snapshot, level_display_name_snapshot",
        )
        .eq("player_id", user.id),
    ]);

  if (levelsRes.error || pillarsRes.error || lessonsRes.error || completionsRes.error || existingRes.error) {
    console.error("[plc] fetch failed:", {
      levels: levelsRes.error,
      pillars: pillarsRes.error,
      lessons: lessonsRes.error,
      completions: completionsRes.error,
      existing: existingRes.error,
    });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }

  const levels = levelsRes.data || [];
  const pillars = pillarsRes.data || [];
  const lessons = lessonsRes.data || [];
  const completedLessonIds = new Set(
    (completionsRes.data || []).map((c) => c.lesson_id).filter(Boolean),
  );
  const existingByLevelId = new Map(
    (existingRes.data || []).map((r) => [r.level_id, r]),
  );

  // ── Compute "which levels does the player now qualify for?" ──
  // A level is earned when every open (non-under_construction) lesson
  // inside every pillar assigned to that level is in completedLessonIds.
  // Levels with zero pillars OR zero open lessons don't qualify — no
  // "instant win" from a level that has no content yet.
  const lessonsByPillarId = new Map();
  for (const l of lessons) {
    if (!lessonsByPillarId.has(l.pillar_id)) {
      lessonsByPillarId.set(l.pillar_id, []);
    }
    lessonsByPillarId.get(l.pillar_id).push(l);
  }

  const pillarsByLevelId = new Map();
  for (const p of pillars) {
    if (p.level_id == null) continue;
    if (!pillarsByLevelId.has(p.level_id)) {
      pillarsByLevelId.set(p.level_id, []);
    }
    pillarsByLevelId.get(p.level_id).push(p);
  }

  const newlyAwardedLevelIds = [];
  const toInsert = [];
  for (const lvl of levels) {
    if (existingByLevelId.has(lvl.id)) continue; // already earned
    const levelPillars = pillarsByLevelId.get(lvl.id) || [];
    if (levelPillars.length === 0) continue; // no pillars assigned
    let anyOpenLesson = false;
    let allComplete = true;
    for (const p of levelPillars) {
      const pLessons = (lessonsByPillarId.get(p.id) || []).filter(
        (l) => !l.under_construction,
      );
      if (pLessons.length === 0) continue;
      anyOpenLesson = true;
      for (const l of pLessons) {
        if (!completedLessonIds.has(l.id)) {
          allComplete = false;
          break;
        }
      }
      if (!allComplete) break;
    }
    if (anyOpenLesson && allComplete) {
      newlyAwardedLevelIds.push(lvl.id);
      toInsert.push({
        player_id: user.id,
        level_id: lvl.id,
        level_name_snapshot: lvl.name,
        // Snapshot both PT + EN so a later PDF pipeline picks up
        // the right language at rendering time. Language-neutral
        // fallback: join with " · " so both survive in one column.
        level_display_name_snapshot:
          `${lvl.display_name_pt} · ${lvl.display_name_en}`,
      });
    }
  }

  // Insert any new completions. UNIQUE constraint keeps this idempotent
  // under concurrent requests (a duplicate insert would fail — we ignore
  // that case and re-read the full list below).
  if (toInsert.length > 0) {
    const { error: insertErr } = await supabase
      .from("player_level_completions")
      .upsert(toInsert, { onConflict: "player_id,level_id" });
    if (insertErr) {
      console.error("[plc] insert failed:", insertErr);
      // Non-fatal — we still return whatever's already earned.
    }
  }

  // ── Return the full up-to-date list ──────────────────────────
  const { data: finalList, error: finalErr } = await supabase
    .from("player_level_completions")
    .select(
      "id, level_id, earned_at, level_name_snapshot, level_display_name_snapshot",
    )
    .eq("player_id", user.id)
    .order("earned_at", { ascending: true });

  if (finalErr) {
    console.error("[plc] final read failed:", finalErr);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }

  const newlyAwardedSet = new Set(newlyAwardedLevelIds);
  const enriched = (finalList || []).map((row) => ({
    ...row,
    newly_awarded: newlyAwardedSet.has(row.level_id),
  }));

  return NextResponse.json({ completions: enriched });
}

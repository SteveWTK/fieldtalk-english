// src/app/api/access/me/route.js
//
// GET /api/access/me?edition=<slug>
//
// Returns the caller's access state for a given edition, plus the
// list of "preview" lesson IDs they can view even without access.
// A preview lesson = the first lesson (by sort_order) in each pillar
// of that edition. That gives a free taster across every pillar
// without needing a schema change.
//
// Shape:
//   {
//     edition: "wc2026",
//     hasAccess: true | false,
//     expiresAt: "2026-08-31T…" | null,
//     previewLessonIds: ["…", "…"],
//     isAdmin: boolean
//   }
//
// Platform admins ALWAYS get hasAccess: true so we can QA without
// having to keep an active subscription on every test account.
//
// If the caller is signed out, hasAccess = false and previewLessonIds
// is still returned so anonymous browsing of the lesson list works.

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { getEditionAccess } from "@/lib/access/editionAccess";

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export async function GET(request) {
  try {
    const url = new URL(request.url);
    const editionParam = url.searchParams.get("edition");

    // ── Auth (optional — anonymous callers get previews only) ──
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

    const supabase = await getSupabaseAdmin();

    // Resolve target edition: explicit ?edition= wins, otherwise we
    // use the signed-in user's players.edition. Anonymous + no param
    // → default to wc2026 (the launch edition).
    let edition = editionParam;
    let isAdmin = false;
    if (user?.id) {
      const { data: playerRow } = await supabase
        .from("players")
        .select("edition, user_type")
        .eq("id", user.id)
        .maybeSingle();
      if (!edition) edition = playerRow?.edition || null;
      isAdmin = playerRow?.user_type === "platform_admin";
    }
    if (!edition) edition = "wc2026";

    // ── Preview lesson IDs (first lesson per pillar in this edition) ──
    // We list pillars for the edition, then for each pillar grab the
    // lesson with the lowest sort_order. Anonymous users can use these
    // ids in the UI to mark non-locked cards.
    const previewLessonIds = await fetchPreviewLessonIds(supabase, edition);

    // ── Access status for signed-in users ──
    let hasAccess = false;
    let expiresAt = null;
    if (user?.id) {
      if (isAdmin) {
        hasAccess = true;
      } else {
        const row = await getEditionAccess(user.id, edition);
        if (row && ACTIVE_STATUSES.has(row.status)) {
          // Belt-and-braces — webhook usually flips status on expiry
          // but a missed event could leave a stale 'active' row.
          if (
            !row.current_period_end ||
            new Date(row.current_period_end).getTime() > Date.now()
          ) {
            hasAccess = true;
            expiresAt = row.current_period_end || null;
          }
        }
      }
    }

    return NextResponse.json({
      edition,
      hasAccess,
      expiresAt,
      previewLessonIds,
      isAdmin,
    });
  } catch (err) {
    console.error("[access/me] unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}

async function fetchPreviewLessonIds(supabase, edition) {
  // Lessons that admins have explicitly flagged as preview via the
  // `lessons.is_preview` column. Toggle via the Supabase table editor
  // (or a SQL UPDATE) to change what's available to unpaid users —
  // no code change needed.
  const { data: pillars, error: pillarsErr } = await supabase
    .from("pillars")
    .select("id")
    .eq("edition", edition);
  if (pillarsErr || !pillars || pillars.length === 0) return [];

  const pillarIds = pillars.map((p) => p.id);
  const { data: lessons, error: lessonsErr } = await supabase
    .from("lessons")
    .select("id")
    .eq("is_preview", true)
    .in("pillar_id", pillarIds);
  if (lessonsErr || !lessons) return [];

  return lessons.map((l) => l.id);
}

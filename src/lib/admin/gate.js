// src/lib/admin/gate.js
//
// Admin + coach authorization helpers. Entry points:
//
//   assertAdmin(): NextResponse | { user, playerRow }
//     For API routes. Returns a 401/403 NextResponse when the caller
//     isn't authenticated OR isn't a platform_admin. Returns the
//     player row when they are. Callers early-return the response
//     when it comes back.
//
//   getAdminOrRedirect(): { user, playerRow } | redirect
//     For server components (layouts). Redirects to /dashboard when
//     the caller isn't a platform admin.
//
//   assertCoach(): NextResponse | { user, playerRow }
//     For API routes on coach-scoped endpoints (/api/coach/*).
//     Accepts either `coach` or `platform_admin`. Platform admins
//     always have access — coaches only if their user_type row says
//     so. Callers use `playerRow.user_type` to decide whether to
//     scope to a single academy or return the whole population.
//
// Reuses the existing `players.user_type` column already in use for
// the Game Centre gate on the WC dashboard. The `coach` value is
// added by COACH_USER_TYPE.sql at repo root.

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const ADMIN_USER_TYPES = new Set(["platform_admin"]);
const COACH_USER_TYPES = new Set(["coach", "platform_admin"]);

async function loadAuthedPlayer() {
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
    error: authError,
  } = await supabaseAuth.auth.getUser();
  if (authError || !user) return { user: null, playerRow: null };

  const admin = await getSupabaseAdmin();
  const { data: playerRow } = await admin
    .from("players")
    .select("id, full_name, user_type, academy_id")
    .eq("id", user.id)
    .maybeSingle();

  return { user, playerRow: playerRow ?? null };
}

/**
 * For API routes. Returns { user, playerRow } on success, or a
 * NextResponse to early-return on failure.
 */
export async function assertAdmin() {
  const { user, playerRow } = await loadAuthedPlayer();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!playerRow || !ADMIN_USER_TYPES.has(playerRow.user_type)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return { user, playerRow };
}

/**
 * For server components / layouts. Redirects when not admin.
 * Returns the caller when they are.
 */
export async function getAdminOrRedirect() {
  const { user, playerRow } = await loadAuthedPlayer();
  if (!user || !playerRow || !ADMIN_USER_TYPES.has(playerRow.user_type)) {
    redirect("/dashboard");
  }
  return { user, playerRow };
}

/**
 * Coach gate — accepts either `coach` or `platform_admin`. Callers
 * inspect `playerRow.user_type` to decide whether to scope results
 * to `playerRow.academy_id` (coach) or return the whole population
 * (platform_admin).
 */
export async function assertCoach() {
  const { user, playerRow } = await loadAuthedPlayer();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!playerRow || !COACH_USER_TYPES.has(playerRow.user_type)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return { user, playerRow };
}

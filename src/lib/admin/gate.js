// src/lib/admin/gate.js
//
// Admin authorization helpers. Two entry points:
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
// Reuses the existing `players.user_type === 'platform_admin'`
// convention already in use for the Game Centre gate on the WC
// dashboard — no schema change needed.

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const ADMIN_USER_TYPES = new Set(["platform_admin"]);

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
    .select("id, full_name, user_type")
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

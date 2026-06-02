// src/lib/admin/requireAdmin.js
//
// Server-side helper for API routes that need platform_admin auth.
// Usage:
//
//   const guard = await requireAdmin();
//   if (guard.response) return guard.response;  // 401 or 403
//   const { user, supabase } = guard;
//
// We piggy-back on the same Supabase cookie auth pattern the rest of
// the app uses, then verify players.user_type === 'platform_admin'
// via the admin client (bypassing RLS so the lookup is consistent).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function requireAdmin() {
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
    error: authError,
  } = await supabaseAuth.auth.getUser();
  if (authError || !user) {
    return {
      response: NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      ),
    };
  }

  const supabase = await getSupabaseAdmin();
  const { data: playerRow, error: playerErr } = await supabase
    .from("players")
    .select("user_type")
    .eq("id", user.id)
    .maybeSingle();
  if (playerErr) {
    return {
      response: NextResponse.json(
        { error: "Could not verify admin status" },
        { status: 500 }
      ),
    };
  }
  if (playerRow?.user_type !== "platform_admin") {
    return {
      response: NextResponse.json(
        { error: "Admin only" },
        { status: 403 }
      ),
    };
  }

  return { user, supabase };
}

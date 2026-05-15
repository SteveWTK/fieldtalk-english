// src/app/api/auth/ensure-player/route.js
//
// Server-side upsert into public.players for the just-signed-in user.
// Used by /auth/callback after OAuth (Google) signin to guarantee a
// player row exists with the right edition tag, since OAuth signups
// don't pass our metadata through and the handle_new_user DB trigger
// is currently unreliable.
//
// Reads the user from their session (via the cookie) and uses the
// admin client to write the players row (bypassing RLS).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const SUPPORTED_EDITIONS = new Set(["players", "wc2026"]);

export async function POST(request) {
  try {
    const body = await request.json();
    const rawEdition = body.edition || "players";
    const edition = SUPPORTED_EDITIONS.has(rawEdition) ? rawEdition : "players";

    // Identify the caller via their session cookie
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Build a sensible full_name from whatever we have
    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "";

    const supabase = await getSupabaseAdmin();
    const { error: upsertError } = await supabase.from("players").upsert(
      {
        id: user.id,
        email: user.email,
        full_name: fullName,
        user_type: "player",
        edition,
        preferred_language: "en",
      },
      { onConflict: "id" }
    );

    if (upsertError) {
      console.error("[ensure-player] upsert error:", upsertError);
      return NextResponse.json(
        { error: upsertError.message || "Could not ensure player row" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, edition });
  } catch (err) {
    console.error("[ensure-player] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

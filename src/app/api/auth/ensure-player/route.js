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

    // Look up the existing row first. We can't use a blanket upsert because
    // it would clobber `user_type` (e.g. platform_admin → player) and
    // `edition` (e.g. wc2026 → players) every time the user signs back in.
    // Those fields are only allowed to be set when the row is CREATED.
    const { data: existing, error: selectError } = await supabase
      .from("players")
      .select("id, user_type, edition")
      .eq("id", user.id)
      .maybeSingle();

    if (selectError) {
      console.error("[ensure-player] select error:", selectError);
      return NextResponse.json(
        { error: selectError.message || "Could not look up player row" },
        { status: 500 }
      );
    }

    if (existing) {
      // Row already there — refresh only the harmless identity fields and
      // leave user_type / edition exactly as they are.
      const { error: updateError } = await supabase
        .from("players")
        .update({ email: user.email, full_name: fullName })
        .eq("id", user.id);
      if (updateError) {
        console.error("[ensure-player] update error:", updateError);
        return NextResponse.json(
          { error: updateError.message || "Could not refresh player row" },
          { status: 500 }
        );
      }
      return NextResponse.json({
        success: true,
        created: false,
        edition: existing.edition || edition,
      });
    }

    // No row yet — first-time login. Safe to write the defaults.
    const { error: insertError } = await supabase.from("players").insert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      user_type: "player",
      edition,
      preferred_language: "en",
    });

    if (insertError) {
      console.error("[ensure-player] insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Could not create player row" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, created: true, edition });
  } catch (err) {
    console.error("[ensure-player] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

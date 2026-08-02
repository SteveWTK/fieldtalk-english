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
import { awardWelcomeBonusIfMissing } from "@/lib/players/awardWelcomeBonus";
import { getSupportedEditionIds } from "@/lib/editions/editions";

// Derived from EDITIONS in editions.js at import time. Adding a new
// edition there automatically expands what the auth flow accepts —
// no allow-list to hand-maintain here.
const SUPPORTED_EDITIONS = getSupportedEditionIds();

export async function POST(request) {
  try {
    const body = await request.json();
    // Default-to-wc2026 (same rationale as signup-instant — see comment
    // there). Pre-launch the default was "players"; every live
    // acquisition channel is now WC2026.
    const rawEdition = body.edition || "wc2026";
    const edition = SUPPORTED_EDITIONS.has(rawEdition) ? rawEdition : "wc2026";

    // Partner attribution slug from /wc2026?branch=<slug>. Sanitised
    // client-side; we re-validate the shape here.
    const rawReferrer =
      typeof body.partnerReferrer === "string" ? body.partnerReferrer : null;
    const partnerReferrer = rawReferrer
      ? rawReferrer
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\-_]/g, "")
          .slice(0, 64) || null
      : null;

    // Client-detected preferred language. Same rationale as
    // signup-instant: writing "en" by default would cause the
    // LanguageContext's DB-seed effect to overwrite a Brazilian
    // browser's correctly-detected "pt" on first signed-in render.
    const SUPPORTED_LANGS = ["en", "pt", "es", "th"];
    const rawLang =
      typeof body.preferredLanguage === "string"
        ? body.preferredLanguage.toLowerCase().trim()
        : null;
    const preferredLanguage =
      rawLang && SUPPORTED_LANGS.includes(rawLang) ? rawLang : "en";

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

    // No row yet — first-time login. Safe to write the defaults, and
    // this is THE place we'll ever stamp partner_referrer: subsequent
    // logins on the existing branch above don't touch it, matching
    // the "first touch wins" attribution rule.
    const { error: insertError } = await supabase.from("players").insert({
      id: user.id,
      email: user.email,
      full_name: fullName,
      user_type: "player",
      edition,
      preferred_language: preferredLanguage,
      ...(partnerReferrer ? { partner_referrer: partnerReferrer } : {}),
    });

    if (insertError) {
      console.error("[ensure-player] insert error:", insertError);
      return NextResponse.json(
        { error: insertError.message || "Could not create player row" },
        { status: 500 }
      );
    }

    // First-time signup → grant the starter sticker pack (200 XP).
    // Idempotent inside the helper, so if this route runs twice for
    // any reason we don't double-grant. Only granted for editions
    // that have a sticker/pack economy (currently just wc2026); Pro
    // Path and future non-pack editions skip.
    if (edition === "wc2026") {
      await awardWelcomeBonusIfMissing(user.id);
    }

    return NextResponse.json({ success: true, created: true, edition });
  } catch (err) {
    console.error("[ensure-player] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

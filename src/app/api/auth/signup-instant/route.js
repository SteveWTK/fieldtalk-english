// src/app/api/auth/signup-instant/route.js
//
// Server-side signup that bypasses email confirmation. Used by the
// fan-edition /join flow so directors and demo users can hit "Create
// account" → land on /lesson immediately without clicking an email link.
//
// Uses the admin client (service role key) so we can set
// `email_confirm: true` regardless of the project's email confirmation
// setting.
import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { awardWelcomeBonusIfMissing } from "@/lib/players/awardWelcomeBonus";

const SUPPORTED_EDITIONS = new Set(["players", "wc2026"]);

export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const fullName = (body.fullName || "").trim();
    // Default-to-wc2026: every signup we do not explicitly tag as
    // anything else lands in the WC2026 edition. Pre-launch the
    // default was "players", but every active acquisition channel is
    // now WC2026-shaped (root landing, /wc2026, partner branch
    // links), so falling back to wc2026 is the correct behaviour.
    const rawEdition = body.edition || "wc2026";
    const edition = SUPPORTED_EDITIONS.has(rawEdition) ? rawEdition : "wc2026";

    // Partner attribution slug (e.g. "fortaleza", "ceara-aldeota").
    // Sanitised client-side already, but defence-in-depth:
    // re-validate the shape here so a malicious caller can't push
    // arbitrary text into the players row.
    const rawReferrer =
      typeof body.partnerReferrer === "string" ? body.partnerReferrer : null;
    const partnerReferrer = rawReferrer
      ? rawReferrer
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9\-_]/g, "")
          .slice(0, 64) || null
      : null;

    // Preferred language passed from the client (which has
    // browser-detected this from navigator.language and/or the
    // user's explicit toggle on /wc2026). Falls back to "en" only if
    // the client doesn't send anything — every modern call path
    // does. Without this, the LanguageContext's one-time DB seed
    // would overwrite a Brazilian browser's correctly-detected "pt"
    // back to "en" on the first signed-in render.
    const SUPPORTED_LANGS = ["en", "pt", "es", "th"];
    const rawLang =
      typeof body.preferredLanguage === "string"
        ? body.preferredLanguage.toLowerCase().trim()
        : null;
    const preferredLanguage =
      rawLang && SUPPORTED_LANGS.includes(rawLang) ? rawLang : "en";

    // Basic validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }
    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseAdmin();

    // Create the user with email already confirmed. The handle_new_user
    // trigger will copy user_metadata into the players row, including
    // edition (so the lesson list filters correctly from the first visit).
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        user_type: "player",
        edition,
      },
    });

    if (error) {
      // Translate the most common Supabase errors into something cleaner
      const msg = error.message || "";
      if (msg.toLowerCase().includes("already")) {
        return NextResponse.json(
          { error: "An account with that email already exists." },
          { status: 409 }
        );
      }
      console.error("[signup-instant] admin.createUser error:", error);
      return NextResponse.json(
        { error: msg || "Could not create account" },
        { status: 400 }
      );
    }

    // Belt-and-braces: don't rely on the DB trigger. Write the players row
    // directly with the admin client so the lesson page sees a correctly
    // tagged player even if handle_new_user is silently failing.
    const { error: playerError } = await supabase.from("players").upsert(
      {
        id: data.user.id,
        email: data.user.email,
        full_name: fullName || email.split("@")[0],
        user_type: "player",
        edition,
        preferred_language: preferredLanguage,
        // partner_referrer is conditionally included so a re-upsert
        // (e.g. the user signs up twice) doesn't overwrite an
        // existing attribution with null.
        ...(partnerReferrer ? { partner_referrer: partnerReferrer } : {}),
      },
      { onConflict: "id" }
    );

    if (playerError) {
      // Don't fail the signup — the auth user exists and the lesson page
      // can recover. Just log so we can see this in Vercel logs.
      console.error("[signup-instant] players upsert error:", playerError);
    }

    // Grant the starter sticker pack (idempotent inside the helper).
    // Fire-and-forget would be tempting, but we await so the welcome
    // push fired by the next opt-in step has a pack to nudge about.
    await awardWelcomeBonusIfMissing(data.user.id);

    return NextResponse.json({ success: true, userId: data.user.id });
  } catch (err) {
    console.error("[signup-instant] unexpected error:", err);
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}

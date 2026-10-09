// src/app/api/guest-access/try/activate/route.js
//
// POST /api/guest-access/try/activate
//
// No-code variant of the QR-based guest activation. Powers the
// link-shareable "try Lesson 1" flow at /o-campo — one click (plus
// the sign-in handshake) and the visitor is a guest player landing
// inside Lesson 1.
//
// Deliberately NOT reusing the activate_guest_code RPC because that
// requires a row in guest_access_codes (QR-campaign metadata we don't
// have for this link-based entry). Instead we create the auth user +
// public.users row directly with the sensible defaults a QR activate
// would produce.
//
// Lifecycle:
//   1. New Supabase auth user with a random guest_<hex>@fieldtalk.guest
//      email + random password. user_metadata.is_guest=true so
//      GuestPromptProvider picks them up throughout the app.
//   2. public.users row with role='guest' (matches existing patterns
//      so SaveProgressButton + friends in /components/guest/* light up
//      automatically).
//   3. Response returns the email+password; the client calls
//      supabase.auth.signInWithPassword to establish the session
//      cookies, then redirects to the destination.
//
// No expiry — this guest can come back whenever, which is what makes
// link-sharing powerful. If a lead abandons at Lesson 1, hitting the
// same /o-campo URL later gives them a fresh guest (we don't bind one
// browser to a specific guest).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import crypto from "crypto";

// Hardcoded for now — this entry point is specifically "O Campo",
// Unit 1 Lesson 1. Future variants (different lesson, different
// landing) would get their own routes rather than overload this one.
const DEFAULT_DESTINATION = "/lesson/d2f55a9c-6ac6-4276-b5a2-2a67d22b3911";

export async function POST() {
  try {
    const supabaseAdmin = await getSupabaseAdmin();

    // Already signed in? Just hand back the destination so the client
    // can redirect without stacking another guest account.
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
      data: { user: existingUser },
    } = await supabaseAuth.auth.getUser();
    if (existingUser) {
      return NextResponse.json({
        success: true,
        already_authenticated: true,
        destination_path: DEFAULT_DESTINATION,
      });
    }

    // Fresh guest identity.
    const guestSuffix = crypto.randomBytes(6).toString("hex");
    const guestEmail = `guest_${guestSuffix}@fieldtalk.guest`;
    const guestPassword = crypto.randomBytes(20).toString("base64url");

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: guestEmail,
        password: guestPassword,
        email_confirm: true,
        user_metadata: {
          is_guest: true,
          try_source: "o-campo",
        },
      });

    if (authError) {
      console.error("[guest-access/try] auth create failed:", authError);
      return NextResponse.json(
        { error: "Failed to create guest account" },
        { status: 500 },
      );
    }

    // public.users row — role='guest' so SaveProgressButton,
    // CoachTipReminder etc. show as expected.
    const { error: userError } = await supabaseAdmin.from("users").upsert(
      {
        id: authData.user.id,
        email: guestEmail,
        name: "Guest Player",
        role: "guest",
        is_premium: false,
        premium_source: "try_lesson_1",
      },
      { onConflict: "id" },
    );

    if (userError) {
      console.error("[guest-access/try] users upsert failed:", userError);
      // Roll back the auth user so a stuck signup doesn't leave debris.
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Failed to create guest profile" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      guest_email: guestEmail,
      guest_password: guestPassword,
      destination_path: DEFAULT_DESTINATION,
    });
  } catch (error) {
    console.error("[guest-access/try] unhandled:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

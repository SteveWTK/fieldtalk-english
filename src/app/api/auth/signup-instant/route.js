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

const SUPPORTED_EDITIONS = new Set(["players", "wc2026"]);

export async function POST(request) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const fullName = (body.fullName || "").trim();
    const rawEdition = body.edition || "players";
    const edition = SUPPORTED_EDITIONS.has(rawEdition) ? rawEdition : "players";

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

    return NextResponse.json({ success: true, userId: data.user.id });
  } catch (err) {
    console.error("[signup-instant] unexpected error:", err);
    return NextResponse.json(
      { error: "Server error. Please try again." },
      { status: 500 }
    );
  }
}

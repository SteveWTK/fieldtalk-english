// src/app/api/profile/check-phone/route.js
//
// POST /api/profile/check-phone
//
// Lightweight availability check for the WhatsApp phone step in
// onboarding (and PhoneCollectionModal for existing users). Lets the
// client validate BEFORE advancing past the phone slide, so a user
// who typed a number already linked to another FieldTalk account
// gets a friendly warning immediately instead of hitting the raw
// duplicate error at the final "go to dashboard" step.
//
// Body: { phone_e164?: string, phone?: string }  (either key works)
// Response:
//   200 { available: true, phone_e164: "5586999998888" }
//   200 { available: false, reason: "invalid_format" | "in_use" }
//
// Never writes to the DB. Requires an authenticated user so we can
// exclude the caller's own row from the "already in use" check
// (re-entering your own phone must not fail this check).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { normalizeBrazilianPhone } from "@/lib/utils/phone";

export async function POST(request) {
  try {
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
    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const raw = body?.phone_e164 ?? body?.phone;
    if (typeof raw !== "string" || !raw.trim()) {
      return NextResponse.json({
        available: false,
        reason: "invalid_format",
      });
    }

    const norm = normalizeBrazilianPhone(raw);
    if (!norm.ok) {
      return NextResponse.json({
        available: false,
        reason: "invalid_format",
      });
    }

    const supabase = await getSupabaseAdmin();
    const { data: match } = await supabase
      .from("players")
      .select("id")
      .eq("phone_e164", norm.e164)
      .neq("id", user.id)
      .maybeSingle();

    if (match) {
      return NextResponse.json({
        available: false,
        reason: "in_use",
      });
    }

    return NextResponse.json({
      available: true,
      phone_e164: norm.e164,
    });
  } catch (err) {
    console.error("[profile/check-phone] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

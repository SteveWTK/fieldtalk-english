// src/app/api/profile/route.js
//
// PATCH /api/profile  — update the signed-in user's own profile.
//
// Only two fields are writable here: full_name (display name shown on
// the dashboard / leaderboard) and avatar_url. Everything else on
// the players row (user_type, edition, email, …) is read-only from this
// endpoint by design — those would need separate, more guarded paths.
//
// Display name is trimmed and clamped at 60 chars.
// avatar_url is rejected unless it's a recognised flag CDN host
// (flagcdn.com) or the project's own Supabase Storage host.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const MAX_NAME_LEN = 60;
const ALLOWED_AVATAR_HOSTS = new Set([
  "flagcdn.com",
  // Same project ref as in next.config.ts. Adjust if you move to a
  // different Supabase project or bucket host.
  "ojxmpejjvwfaxtlmcnuq.supabase.co",
]);

function sanitiseName(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s.length === 0) return ""; // empty string = clear
  return s.slice(0, MAX_NAME_LEN);
}

function validateAvatarUrl(raw) {
  if (raw == null || raw === "") return ""; // empty = clear
  try {
    const url = new URL(String(raw));
    if (url.protocol !== "https:") return null;
    if (!ALLOWED_AVATAR_HOSTS.has(url.hostname)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json();

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

    const update = {};

    if ("full_name" in body) {
      const name = sanitiseName(body.full_name);
      if (name === null) {
        return NextResponse.json(
          { error: "Invalid full_name" },
          { status: 400 }
        );
      }
      update.full_name = name;
    }

    if ("avatar_url" in body) {
      const avatar = validateAvatarUrl(body.avatar_url);
      if (avatar === null) {
        return NextResponse.json(
          {
            error:
              "avatar_url must be empty or a URL on an allowed host (flagcdn.com or our Supabase project)",
          },
          { status: 400 }
        );
      }
      update.avatar_url = avatar;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "Nothing to update" },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseAdmin();
    const { error: updateError } = await supabase
      .from("players")
      .update(update)
      .eq("id", user.id);
    if (updateError) {
      console.error("[profile] update error:", updateError);
      return NextResponse.json(
        {
          error: updateError.message || "Could not update profile",
          details: {
            code: updateError.code,
            hint: updateError.hint,
            details: updateError.details,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, updated: update });
  } catch (err) {
    console.error("[profile] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

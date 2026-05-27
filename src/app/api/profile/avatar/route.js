// src/app/api/profile/avatar/route.js
//
// POST /api/profile/avatar — upload a user-supplied profile photo.
//
// Accepts multipart/form-data with a single "file" field. The server:
//   1. validates the size (≤ 2MB) and MIME type (jpeg/png/webp).
//   2. uploads to the public "avatars" bucket at
//      <user_id>/<timestamp>.<ext> — keyed by user so each user has
//      their own folder, with a timestamp so cached old images don't
//      mask the new one.
//   3. updates players.avatar_url to the new public URL.
//   4. returns { ok: true, avatar_url } to the client.
//
// The bucket must exist and be marked PUBLIC in Supabase Storage,
// otherwise the returned public URL will 403 in the browser.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

const AVATARS_BUCKET = "avatars";
const MAX_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const MIME_EXT = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request) {
  try {
    // ── Auth ──
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

    // ── Read + validate the upload ──
    let form;
    try {
      form = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 }
      );
    }
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG or WebP images are allowed" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be 2MB or smaller" },
        { status: 400 }
      );
    }

    // ── Upload to Storage ──
    const supabase = await getSupabaseAdmin();
    const ext = MIME_EXT[file.type];
    const path = `${user.id}/${Date.now()}.${ext}`;
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(AVATARS_BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });
    if (uploadError) {
      console.error("[avatar] upload error:", uploadError);
      return NextResponse.json(
        {
          error: uploadError.message || "Could not upload image",
          hint:
            "Confirm the 'avatars' bucket exists in Supabase Storage and is marked Public.",
        },
        { status: 500 }
      );
    }

    // ── Build the public URL + persist on the player row ──
    const {
      data: { publicUrl },
    } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("players")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);
    if (updateError) {
      console.error("[avatar] db update error:", updateError);
      return NextResponse.json(
        {
          error: updateError.message || "Uploaded, but could not update profile",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, avatar_url: publicUrl });
  } catch (err) {
    console.error("[avatar] unexpected error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

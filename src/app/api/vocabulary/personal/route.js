// src/app/api/vocabulary/personal/route.js
//
// GET    /api/vocabulary/personal        — list the caller's saved vocab
// POST   /api/vocabulary/personal        — save a word (idempotent — duplicates return alreadyExists=true)
// DELETE /api/vocabulary/personal?id=X   — remove a saved word
//
// Adapted from Habitat's equivalent endpoint. Differences:
//   - Supabase session cookie auth (FieldTalk convention) instead of
//     NextAuth `auth()` — one fewer library, native to our stack.
//   - Uses players.id directly (no email → users lookup).
//   - Extra fields: tip, cultural_note, skill_axis (FieldTalk's
//     vocabulary items carry these; users want to keep the context
//     they originally learned the word with).

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

async function requireUser() {
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
    error,
  } = await supabaseAuth.auth.getUser();
  if (error || !user) return null;
  return user;
}

// Standard shape for the client — dates as ISO strings, snake_case
// collapsed to camel where the UI reads it. Keeps the client hook
// simple + independent of the DB schema.
function shapeRow(row) {
  return {
    id: row.id,
    english: row.english,
    translation: row.translation,
    englishImage: row.english_image,
    translationImage: row.translation_image,
    tip: row.tip,
    culturalNote: row.cultural_note,
    sourceLessonId: row.source_lesson_id,
    sourceStepType: row.source_step_type,
    skillAxis: row.skill_axis,
    timesPracticed: row.times_practiced || 0,
    lastPracticedAt: row.last_practiced_at,
    createdAt: row.created_at,
  };
}

export async function GET() {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("personal_vocabulary")
    .select("*")
    .eq("player_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[vocabulary/personal] list failed:", error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    vocabulary: (data || []).map(shapeRow),
    count: (data || []).length,
  });
}

export async function POST(request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const english =
    typeof body?.english === "string" ? body.english.trim() : "";
  const translation =
    typeof body?.translation === "string" ? body.translation.trim() : "";
  if (!english || !translation) {
    return NextResponse.json(
      { error: "english and translation are required" },
      { status: 400 },
    );
  }
  if (english.length > 200 || translation.length > 400) {
    return NextResponse.json({ error: "too_long" }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();

  // Case-insensitive dupe check — matches the LOWER() unique index.
  // Return alreadyExists=true so the bookmark button can show the
  // "already saved" state without treating this as an error.
  const { data: existing } = await supabase
    .from("personal_vocabulary")
    .select("id")
    .eq("player_id", user.id)
    .ilike("english", english)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({
      ok: true,
      alreadyExists: true,
      id: existing.id,
    });
  }

  const insertRow = {
    player_id: user.id,
    english,
    translation,
    english_image:
      typeof body?.englishImage === "string" ? body.englishImage : null,
    translation_image:
      typeof body?.translationImage === "string"
        ? body.translationImage
        : null,
    tip: typeof body?.tip === "string" ? body.tip : null,
    cultural_note:
      typeof body?.culturalNote === "string" ? body.culturalNote : null,
    source_lesson_id:
      typeof body?.sourceLessonId === "string" ? body.sourceLessonId : null,
    source_step_type:
      typeof body?.sourceStepType === "string" ? body.sourceStepType : null,
    skill_axis: typeof body?.skillAxis === "string" ? body.skillAxis : null,
  };

  const { data, error } = await supabase
    .from("personal_vocabulary")
    .insert(insertRow)
    .select("*")
    .single();

  if (error) {
    // 23505 = the unique index caught a race. Return alreadyExists so
    // the client renders the "saved" state, matching the pre-check.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, alreadyExists: true });
    }
    console.error("[vocabulary/personal] insert failed:", error);
    return NextResponse.json(
      { error: "insert_failed", details: error.message },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, vocabulary: shapeRow(data) });
}

export async function DELETE(request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const supabase = await getSupabaseAdmin();
  const { error } = await supabase
    .from("personal_vocabulary")
    .delete()
    .eq("id", id)
    .eq("player_id", user.id);
  if (error) {
    console.error("[vocabulary/personal] delete failed:", error);
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

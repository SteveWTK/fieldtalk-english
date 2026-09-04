// src/app/api/vocabulary/practice/route.js
//
// POST /api/vocabulary/practice
//
// Bumps times_practiced + last_practiced_at for a saved vocabulary
// row. Called by Game Centre games (Vocabulary Speed Match, future
// flashcard drills) at the end of each round so we can drive
// "needs practice" filters + future spaced-repetition sorting.
//
// Body: { vocabularyId: string }
// Response: { ok: true, timesPracticed: number }

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

export async function POST(request) {
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
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const vocabularyId =
    typeof body?.vocabularyId === "string" ? body.vocabularyId : null;
  if (!vocabularyId) {
    return NextResponse.json(
      { error: "vocabularyId required" },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseAdmin();

  // Read current count first — supabase-js has no atomic increment
  // helper, so we do fetch-then-update. Race conditions here would
  // undercount by 1 in the rare case two games ran concurrently on
  // the same word, which is acceptable for a practice counter.
  const { data: existing, error: readErr } = await supabase
    .from("personal_vocabulary")
    .select("times_practiced")
    .eq("id", vocabularyId)
    .eq("player_id", user.id)
    .maybeSingle();

  if (readErr) {
    console.error("[vocabulary/practice] read failed:", readErr);
    return NextResponse.json({ error: "read_failed" }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const nextCount = (Number(existing.times_practiced) || 0) + 1;
  const { error: updateErr } = await supabase
    .from("personal_vocabulary")
    .update({
      times_practiced: nextCount,
      last_practiced_at: new Date().toISOString(),
    })
    .eq("id", vocabularyId)
    .eq("player_id", user.id);

  if (updateErr) {
    console.error("[vocabulary/practice] update failed:", updateErr);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, timesPracticed: nextCount });
}

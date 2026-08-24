// src/app/api/admin/broadcasts/route.js
//
// GET  /api/admin/broadcasts        — list all broadcasts (newest first)
// POST /api/admin/broadcasts        — create a new draft broadcast
//
// Both admin-gated via assertAdmin(). Create endpoint validates the
// body shape (name, body languages, target_filter) before insert.
// It does NOT fan out recipients or send — that's the /send route.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { VALID_BROADCAST_LANGUAGES } from "@/lib/broadcasts/config";

export async function GET() {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("whatsapp_broadcasts")
    .select(
      "id, name, body, target_filter, status, recipient_count, sent_count, failed_count, skipped_count, created_by, created_at, sent_started_at, completed_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("[admin/broadcasts] list failed:", error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }
  return NextResponse.json({ broadcasts: data ?? [] });
}

export async function POST(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const name = typeof payload?.name === "string" ? payload.name.trim() : "";
  if (name.length < 3 || name.length > 120) {
    return NextResponse.json(
      { error: "name must be 3–120 characters" },
      { status: 400 },
    );
  }

  const bodyIn = payload?.body;
  if (!bodyIn || typeof bodyIn !== "object" || Array.isArray(bodyIn)) {
    return NextResponse.json(
      { error: "body must be an object of language → text" },
      { status: 400 },
    );
  }
  // Filter to only valid language keys with non-empty trimmed strings.
  const body = {};
  for (const [lang, text] of Object.entries(bodyIn)) {
    if (!VALID_BROADCAST_LANGUAGES.has(lang)) continue;
    if (typeof text !== "string") continue;
    const trimmed = text.trim();
    if (!trimmed) continue;
    if (trimmed.length > 3000) {
      return NextResponse.json(
        { error: `body[${lang}] too long (max 3000 chars)` },
        { status: 400 },
      );
    }
    body[lang] = trimmed;
  }
  if (Object.keys(body).length === 0) {
    return NextResponse.json(
      { error: "at least one language body is required" },
      { status: 400 },
    );
  }

  // target_filter — lightly validated (empty object is fine = send to
  // every opted-in player). Full validation happens implicitly in
  // segments.js when we query.
  const targetFilter =
    payload?.target_filter && typeof payload.target_filter === "object"
      ? payload.target_filter
      : {};

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("whatsapp_broadcasts")
    .insert({
      name,
      body,
      target_filter: targetFilter,
      status: "draft",
      created_by: gate.user.id,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[admin/broadcasts] create failed:", error);
    return NextResponse.json(
      { error: "create_failed", details: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ id: data.id });
}

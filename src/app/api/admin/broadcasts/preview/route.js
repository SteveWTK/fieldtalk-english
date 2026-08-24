// src/app/api/admin/broadcasts/preview/route.js
//
// POST /api/admin/broadcasts/preview
//
// Body: { target_filter: {...} }
// Returns: { count: number }
//
// Used by the compose form's live "will send to N people" indicator.
// Doesn't create anything — pure query.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { countMatchingRecipients } from "@/lib/broadcasts/segments";

export async function POST(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const filter =
    payload?.target_filter && typeof payload.target_filter === "object"
      ? payload.target_filter
      : {};

  const supabase = await getSupabaseAdmin();
  const count = await countMatchingRecipients(supabase, filter);
  return NextResponse.json({ count });
}

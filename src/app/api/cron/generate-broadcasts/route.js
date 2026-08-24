// src/app/api/cron/generate-broadcasts/route.js
//
// Hourly cron that scans active broadcast templates and generates
// fresh whatsapp_broadcasts rows for templates whose cadence has
// hit. The regular dispatcher then handles the actual sends via
// pre-computed scheduled_slot values on the generated recipients.
//
// Bearer-token protected via CRON_SECRET.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { generateDueBroadcasts } from "@/lib/broadcasts/templates";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseAdmin();
  const stats = await generateDueBroadcasts(supabase);

  return NextResponse.json({ ok: true, ...stats });
}

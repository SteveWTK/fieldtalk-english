// src/app/api/cron/dispatch-broadcasts/route.js
//
// Broadcast dispatcher cron. Runs every minute (vercel.json), drains
// up to DISPATCHER_TICK_LIMIT pending recipients per tick, and moves
// them through send/failed/skipped states.
//
// Phase 5: fixed 7-per-minute stagger (~8s effective), no business
// hours enforcement, no per-broadcast interval customisation. Phase 6
// adds those knobs on top of this same route.
//
// Bearer-token protected via CRON_SECRET — same pattern as the other
// cron routes.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { drainPendingRecipients } from "@/lib/broadcasts/dispatch";

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseAdmin();
  const stats = await drainPendingRecipients(supabase);

  return NextResponse.json({ ok: true, ...stats });
}

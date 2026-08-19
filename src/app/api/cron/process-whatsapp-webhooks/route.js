// src/app/api/cron/process-whatsapp-webhooks/route.js
//
// Safety-net cron for the Z-API webhook flow.
//
// The webhook receiver (/api/zapi/webhook) fires the processor via
// Next's after() for near-instant reply latency, but that runs in
// the same request container as the ack — if the container is killed
// (deploy, cold start reap, timeout) the processor may never complete.
// This cron catches those orphans.
//
// Scans webhook_events where:
//   status = 'received'
//   AND created_at older than 1 minute (grace for after() to finish first)
//   AND provider = 'zapi'
//
// Runs the processor on each, updates the row's status accordingly.
// Same idempotency guarantees as the webhook itself: duplicate
// message inserts are absorbed by the whatsapp_messages UNIQUE
// constraint.
//
// Scheduled every 5 minutes (see vercel.json). Bearer token protected
// via CRON_SECRET — same pattern as the other cron routes.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { processZapiEvent } from "@/lib/integrations/zapi-processor";

const PROVIDER = "zapi";
const GRACE_MS = 60 * 1000; // 1 minute — leave the fast-path a chance
const BATCH_SIZE = 25; // small — cron runs every 5 min

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await getSupabaseAdmin();
  const cutoffIso = new Date(Date.now() - GRACE_MS).toISOString();

  const { data: orphans, error: fetchError } = await supabase
    .from("webhook_events")
    .select("id, event_type, payload")
    .eq("provider", PROVIDER)
    .eq("status", "received")
    .lt("created_at", cutoffIso)
    .order("created_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("[cron/process-whatsapp-webhooks] fetch failed:", fetchError);
    return NextResponse.json(
      { error: "fetch_failed", details: fetchError.message },
      { status: 500 }
    );
  }

  if (!orphans || orphans.length === 0) {
    return NextResponse.json({ ok: true, drained: 0 });
  }

  let processed = 0;
  let failed = 0;
  const nowIso = new Date().toISOString();

  for (const row of orphans) {
    try {
      const res = await processZapiEvent(supabase, {
        id: row.id,
        event_type: row.event_type,
        payload: row.payload,
      });
      if (res.ok) {
        await supabase
          .from("webhook_events")
          .update({
            processed_at: nowIso,
            status: "processed",
            error: res.note ?? null,
          })
          .eq("id", row.id);
        processed++;
      } else {
        await supabase
          .from("webhook_events")
          .update({
            processed_at: nowIso,
            status: "failed",
            error: res.error,
          })
          .eq("id", row.id);
        failed++;
      }
    } catch (err) {
      // Row stays 'received' — next cron tick will retry. Log so a
      // pattern of repeated failures surfaces in logs.
      console.error(
        "[cron/process-whatsapp-webhooks] processor threw:",
        row.id,
        err
      );
      failed++;
    }
  }

  return NextResponse.json({
    ok: true,
    drained: orphans.length,
    processed,
    failed,
  });
}

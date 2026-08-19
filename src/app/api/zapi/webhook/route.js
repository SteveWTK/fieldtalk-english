// src/app/api/zapi/webhook/route.js
//
// Z-API inbound webhook.
//
// Sequence:
//   1. Verify shared-secret (constant-time compare).
//   2. Persist raw event to `webhook_events`; UNIQUE (provider, event_id)
//      is our idempotency guarantee — duplicate replays no-op.
//   3. Return HTTP 200 immediately (Z-API retries aggressively).
//   4. Fire the processor via Next.js `after()` for the near-instant
//      path; the 5-minute cron drain (/api/cron/process-whatsapp-webhooks)
//      is the safety net if `after()` fails silently.
//
// Auth: both `?token=X` query param AND `x-webhook-secret` header are
// accepted so the Z-API dashboard config can be flipped without
// redeploying.
//
// GET is exposed for Z-API's "test webhook" button (dashboard sends a
// GET as its ping). It returns a plain ack without any auth so the
// dashboard test succeeds; only POST is auth-gated.

import { createHash } from "node:crypto";
import { after, NextResponse } from "next/server";

import { processZapiEvent } from "@/lib/integrations/zapi-processor";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { constantTimeEquals } from "@/lib/utils/timing";

const PROVIDER = "zapi";

export async function POST(request) {
  const configuredToken = process.env.ZAPI_WEBHOOK_TOKEN;
  if (!configuredToken) {
    // Fail closed — persisting events with no authenticity guarantee is
    // worse than dropping them.
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const receivedToken =
    url.searchParams.get("token") ??
    request.headers.get("x-webhook-secret") ??
    "";
  if (!constantTimeEquals(receivedToken, configuredToken)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let raw;
  try {
    raw = await request.text();
  } catch {
    // Unreadable body — 200 so Z-API stops retrying pathological requests.
    return NextResponse.json({ ok: true, skipped: "unreadable_body" });
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true, skipped: "invalid_json" });
  }

  // Z-API's stable id is `messageId`; some payload variants use `zaapId`.
  // Fallback to SHA256 of the raw body for oddball payload types so we
  // still have deterministic idempotency.
  const providerEventId =
    (typeof payload.messageId === "string" && payload.messageId) ||
    (typeof payload.zaapId === "string" && payload.zaapId) ||
    createHash("sha256").update(raw).digest("hex");

  const eventType =
    typeof payload.type === "string" && payload.type.length > 0
      ? payload.type
      : null;

  const supabase = await getSupabaseAdmin();
  const { data: inserted, error } = await supabase
    .from("webhook_events")
    .insert({
      provider: PROVIDER,
      provider_event_id: providerEventId,
      event_type: eventType,
      payload,
      status: "received",
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = duplicate. Z-API replayed an event we already have —
    // return 200 so it stops. Do NOT re-fire the processor.
    if (error.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    console.error("[zapi/webhook] persist_failed:", error);
    return NextResponse.json({ error: "persist_failed" }, { status: 500 });
  }

  // Fast path: run the processor after the response is sent. Cron is
  // the safety net if this doesn't complete (container killed mid-run).
  after(async () => {
    try {
      const svc = await getSupabaseAdmin();
      const res = await processZapiEvent(svc, {
        id: inserted.id,
        event_type: eventType,
        payload,
      });
      const nowIso = new Date().toISOString();
      if (res.ok) {
        await svc
          .from("webhook_events")
          .update({
            processed_at: nowIso,
            status: "processed",
            error: res.note ?? null,
          })
          .eq("id", inserted.id);
      } else {
        await svc
          .from("webhook_events")
          .update({
            processed_at: nowIso,
            status: "failed",
            error: res.error,
          })
          .eq("id", inserted.id);
      }
    } catch (err) {
      // Swallow — the row stays 'received' and cron will retry.
      console.error("[zapi/webhook] after() processor failed:", err);
    }
  });

  return NextResponse.json({ ok: true, id: providerEventId });
}

/** Z-API dashboard "test webhook" button pings via GET; ack it. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "zapi-webhook" });
}

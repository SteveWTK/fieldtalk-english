import { createHash } from "node:crypto";

import { after, NextResponse } from "next/server";

import { processZapiEvent } from "@/lib/integrations/zapi-processor";
import { createSupabaseServiceClient } from "@/lib/supabase/server";
import { constantTimeEquals } from "@/lib/utils/timing";

/**
 * Z-API inbound webhook — async pattern, matches Asaas.
 *
 * INTEGRATIONS.md §2 mandates:
 *   1. Verify shared-secret header (constant time).
 *   2. Persist raw event to `webhook_events`; UNIQUE (provider, event_id)
 *      is the idempotency mechanism.
 *   3. Return HTTP 200 immediately.
 *   4. Process asynchronously.
 *
 * We also use Next.js `after()` to fire the processor as soon as the
 * response is sent — that keeps agent replies near-instant instead of
 * waiting up to 5 minutes for the cron drain. Cron remains the safety net:
 * if `after()` fails or the container is killed mid-processing, the event
 * stays unprocessed and the next cron tick picks it up.
 *
 * Auth mechanism: `?token=X` query param OR `x-webhook-secret` header.
 * We keep both because Z-API's dashboard was configured with one of them
 * (unknown which — probably query param) and re-configuring the webhook
 * URL there is a manual step. The env var was renamed from
 * ZAPI_WEBHOOK_SECRET → ZAPI_WEBHOOK_TOKEN in Slice C to align with
 * INTEGRATIONS.md §1.
 */

const PROVIDER = "zapi";

export async function POST(request: Request) {
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

  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return NextResponse.json({ ok: true, skipped: "unreadable_body" });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // Malformed JSON — 200 so Z-API doesn't retry indefinitely.
    return NextResponse.json({ ok: true, skipped: "invalid_json" });
  }

  // Z-API's stable id for a message is `messageId`; some payload variants
  // use `zaapId`. Fallback to a SHA256 of the raw body so we still have
  // deterministic idempotency for oddball payloads.
  const providerEventId =
    (typeof payload.messageId === "string" && payload.messageId) ||
    (typeof payload.zaapId === "string" && (payload.zaapId as string)) ||
    createHash("sha256").update(raw).digest("hex");

  const eventType =
    typeof payload.type === "string" && payload.type.length > 0
      ? payload.type
      : null;

  const supabase = createSupabaseServiceClient();
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
    // Postgres 23505 = duplicate. Z-API replayed an event we already have —
    // return 200 so it stops. Do NOT trigger the processor.
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    return NextResponse.json({ error: "persist_failed" }, { status: 500 });
  }

  // Fast path: run the processor after the response is sent. Cron is the
  // safety net if this doesn't complete.
  after(async () => {
    try {
      const svc = createSupabaseServiceClient();
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
      // Swallow — the row stays unprocessed and cron will retry.
      console.error("zapi after() processor failed:", err);
    }
  });

  return NextResponse.json({ ok: true, id: providerEventId });
}

/** Z-API's dashboard "test webhook" button issues a GET; ack it. */
export async function GET() {
  return NextResponse.json({ ok: true, service: "zapi-webhook" });
}

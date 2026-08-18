import { NextResponse } from "next/server";

import { sendWhatsapp } from "@/lib/integrations/zapi";
import { createSupabaseServiceClient } from "@/lib/supabase/server";

/**
 * Broadcast dispatcher — fires any `broadcast_recipients` whose slot
 * has arrived and status is still `agendado`.
 *
 * Called by Vercel Cron every 2 minutes during business hours (see
 * vercel.json). Small BATCH_LIMIT keeps a single run bounded; anything
 * not drained this tick fires on the next.
 *
 * Auto-skip rules (evaluated at send-time, not at fan-out):
 *   - Leads: if the lead's status flipped to `convertido` since the
 *     broadcast was scheduled, mark skipped. No point pestering
 *     someone who already came in.
 *   - Cancelled broadcast: parent broadcast.status === 'cancelado'
 *     → mark skipped.
 *
 * Progress rollup:
 *   - After each recipient result, increment the counter on the
 *     parent broadcast (enviados / falhou / skipped). Flip the
 *     parent status from `agendado` → `em_envio` on the first
 *     result, and from `em_envio` → `concluido` when
 *     enviados + falhou + skipped === total_recipients.
 */

const BATCH_LIMIT = 25;

type Row = {
  id: string;
  broadcast_id: string;
  lead_id: string | null;
  aluno_id: string | null;
  telefone: string;
};

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization") ?? "";
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json(
        { ok: false, error: "unauthorized" },
        { status: 401 }
      );
    }
  }

  const supabase = createSupabaseServiceClient();
  const nowIso = new Date().toISOString();

  const { data: due, error } = await supabase
    .from("broadcast_recipients")
    .select("id, broadcast_id, lead_id, aluno_id, telefone")
    .eq("status", "agendado")
    .lte("agendado_para", nowIso)
    .order("agendado_para")
    .limit(BATCH_LIMIT);
  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }

  const results = {
    considered: due?.length ?? 0,
    sent: 0,
    failed: 0,
    skipped: 0,
  };
  if (!due || due.length === 0) {
    return NextResponse.json({ ok: true, ...results });
  }

  // Cache broadcast rows we've already read this tick so we don't
  // re-fetch the same parent for each recipient.
  const broadcastCache = new Map<
    string,
    { mensagem: string; status: string } | null
  >();

  async function getBroadcast(id: string) {
    if (broadcastCache.has(id)) return broadcastCache.get(id) ?? null;
    const { data } = await supabase
      .from("broadcasts")
      .select("mensagem, status")
      .eq("id", id)
      .maybeSingle();
    broadcastCache.set(id, data ?? null);
    return data;
  }

  // Cache lead statuses for auto-skip (fetch on-demand per recipient).
  async function shouldSkipLead(leadId: string): Promise<string | null> {
    const { data } = await supabase
      .from("leads")
      .select("status")
      .eq("id", leadId)
      .maybeSingle();
    if (!data) return "lead_removido";
    if (data.status === "convertido") return "lead_convertido";
    return null;
  }

  for (const r of due as Row[]) {
    const parent = await getBroadcast(r.broadcast_id);
    if (!parent) {
      // Parent gone — mark orphan skipped and move on.
      await markRecipient(supabase, r.id, "skipped", null, null, "parent_removido");
      results.skipped++;
      continue;
    }
    if (parent.status === "cancelado") {
      await markRecipient(supabase, r.id, "skipped", null, null, "broadcast_cancelado");
      await bumpBroadcastCounters(supabase, r.broadcast_id, { skipped: 1 });
      results.skipped++;
      continue;
    }

    // Auto-skip converted leads.
    if (r.lead_id) {
      const skipReason = await shouldSkipLead(r.lead_id);
      if (skipReason) {
        await markRecipient(supabase, r.id, "skipped", null, null, skipReason);
        await bumpBroadcastCounters(supabase, r.broadcast_id, { skipped: 1 });
        results.skipped++;
        continue;
      }
    }

    // Send.
    try {
      const send = await sendWhatsapp({
        telefone: r.telefone,
        mensagem: parent.mensagem,
      });
      await markRecipient(supabase, r.id, "enviada", send.messageId, null, null);
      await bumpBroadcastCounters(supabase, r.broadcast_id, { enviados: 1 });
      results.sent++;
    } catch (err) {
      const msg = (err instanceof Error ? err.message : String(err)).slice(0, 500);
      console.error(
        `dispatch-broadcasts send failed recipient=${r.id} tel=${r.telefone}:`,
        msg
      );
      await markRecipient(supabase, r.id, "falhou", null, msg, null);
      await bumpBroadcastCounters(supabase, r.broadcast_id, { falhou: 1 });
      results.failed++;
    }
  }

  // For any parent we touched, check if it's done and flip status.
  for (const broadcastId of broadcastCache.keys()) {
    await maybeCloseBroadcast(supabase, broadcastId);
  }

  return NextResponse.json({ ok: true, ...results });
}

async function markRecipient(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  id: string,
  status: "enviada" | "falhou" | "skipped",
  zapi_message_id: string | null,
  error: string | null,
  skip_reason: string | null
) {
  await supabase
    .from("broadcast_recipients")
    .update({
      status,
      zapi_message_id,
      error,
      skip_reason,
      sent_at: new Date().toISOString(),
    })
    .eq("id", id);
}

async function bumpBroadcastCounters(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  broadcastId: string,
  bump: { enviados?: number; falhou?: number; skipped?: number }
) {
  // Read-then-write is fine for the volumes here (max BATCH_LIMIT per
  // tick × recipients per broadcast). If broadcasts grew into tens of
  // thousands we'd swap for a Postgres function that does an atomic
  // UPDATE ... SET enviados = enviados + $1.
  const { data: b } = await supabase
    .from("broadcasts")
    .select("enviados, falhou, skipped, status")
    .eq("id", broadcastId)
    .maybeSingle();
  if (!b) return;
  const patch: {
    enviados: number;
    falhou: number;
    skipped: number;
    status?: "em_envio";
  } = {
    enviados: b.enviados + (bump.enviados ?? 0),
    falhou: b.falhou + (bump.falhou ?? 0),
    skipped: b.skipped + (bump.skipped ?? 0),
  };
  if (b.status === "agendado") patch.status = "em_envio";
  await supabase.from("broadcasts").update(patch).eq("id", broadcastId);
}

async function maybeCloseBroadcast(
  supabase: ReturnType<typeof createSupabaseServiceClient>,
  broadcastId: string
) {
  const { data: b } = await supabase
    .from("broadcasts")
    .select("total_recipients, enviados, falhou, skipped, status")
    .eq("id", broadcastId)
    .maybeSingle();
  if (!b) return;
  if (b.status === "concluido" || b.status === "cancelado") return;
  const done = b.enviados + b.falhou + b.skipped;
  if (done >= b.total_recipients) {
    await supabase
      .from("broadcasts")
      .update({ status: "concluido" })
      .eq("id", broadcastId);
  }
}

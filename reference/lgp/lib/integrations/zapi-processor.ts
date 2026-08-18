import type { SupabaseClient } from "@supabase/supabase-js";

import { decideAgentAction } from "@/lib/agents/leads/agent";
import { executeAgentAction } from "@/lib/agents/leads/execute";
import { markReactivationResponse } from "@/lib/agents/reactivation/response";
import { decideStudentReply, type IncomingMessage } from "@/lib/agents/student/agent";
import { findAlunoByPhone, loadStudentContext } from "@/lib/agents/student/context";
import { onlyDigits, parseZapiInbound, sendWhatsapp } from "@/lib/integrations/zapi";
import type { Database, Lead } from "@/lib/supabase/types";

/**
 * Async processor: reads persisted `webhook_events` rows (provider='zapi')
 * and drives the appropriate AI agent (Leads or Student) to reply.
 *
 * Idempotent by construction: the webhook_events row's status flips to
 * 'processed' only after this function returns ok. If we crash mid-way,
 * the row stays pending and the next cron tick retries the whole event.
 * The DOWNSTREAM side effects (lead_messages inserts, sendWhatsapp) are
 * NOT individually idempotent — a retry after a partial run could produce
 * a duplicate outbound message. Accepted trade-off for now; a proper fix
 * would key each outbound send on the provider_event_id.
 *
 * Called from two places:
 *   1. `/api/zapi/webhook` via Next.js `after()` — the fast path, runs
 *      within milliseconds of receipt so replies feel instant.
 *   2. `/api/cron/process-webhooks` — the safety net, catches events that
 *      after() couldn't complete (container killed, transient error).
 *
 * Routing rule (unchanged from the pre-Slice-B webhook):
 *   - Phone matches an existing responsavel/aluno → Student Agent
 *   - Otherwise → Leads Agent
 */

type SupaSvc = SupabaseClient<Database>;

export type ProcessResult =
  | { ok: true; note?: string }
  | { ok: false; error: string };

const MAX_RECENT_MESSAGES = 20;
const MAX_STUDENT_HISTORY = 12;

/** Handle one persisted Z-API webhook event. */
export async function processZapiEvent(
  supabase: SupaSvc,
  event: {
    id: string;
    event_type: string | null;
    payload: Record<string, unknown>;
  }
): Promise<ProcessResult> {
  const inbound = parseZapiInbound(event.payload);
  if (!inbound) {
    // Group / media / echo / non-text — nothing to reply to. Marked
    // processed so it never retries.
    return { ok: true, note: "unsupported_payload" };
  }

  const phone = onlyDigits(inbound.phone);
  if (!phone) return { ok: true, note: "empty_phone" };

  // fromMe=true: this is an outbound message from the school WhatsApp
  // number — either our own agent send echoing back OR a human atendente
  // who typed directly into WhatsApp Web/mobile. We route it to the
  // ficha-capture branch so the atendente-side of the conversation shows
  // up in the lead/aluno record instead of being invisible.
  if (inbound.fromMe) {
    return handleFromMeMessage(supabase, {
      phone,
      text: inbound.text,
      messageId: inbound.messageId,
    });
  }

  // Flag any active reactivation sequence whose responsavel matches this
  // phone. Non-fatal — even if it fails we still route the message
  // normally to student/lead agent. Per briefing: response does NOT
  // close the sequence, it only alerts the atendente.
  await markReactivationResponse(supabase, phone, inbound.text).catch((err) => {
    console.error("reactivation flag failed:", err);
  });

  // Kill-switch check (0041). Load the singleton once so both branches
  // see the same snapshot within one webhook call.
  const { data: config } = await supabase
    .from("configuracoes_escola")
    .select("agente_leads_ativo, agente_aluno_ativo")
    .eq("id", true)
    .maybeSingle();
  const leadsAgentEnabled = config?.agente_leads_ativo ?? true;
  const alunoAgentEnabled = config?.agente_aluno_ativo ?? true;

  // Staff-first check: teachers, gestores, atendentes, monitors often
  // reach the school WhatsApp for internal comms. They must NEVER be
  // treated as leads. We fetch all active staff and match locally
  // because profiles.telefone is stored in mixed formats (masked,
  // digits, with/without country code) and we don't want a schema
  // migration for the low volume this involves.
  const staffMatch = await matchStaffByPhone(supabase, phone);
  if (staffMatch) {
    await supabase.from("audit_log").insert({
      ator_id: staffMatch.id,
      acao: "staff_message.received",
      contexto: {
        phone,
        profile_id: staffMatch.id,
        profile_nome: staffMatch.nome,
        perfil: staffMatch.perfil,
        text_preview: inbound.text.slice(0, 140),
      },
      motivo: `staff:${staffMatch.perfil}`,
    });
    return { ok: true, note: `staff_message:${staffMatch.perfil}` };
  }

  // Known-client short-circuit (0048). Once someone has self-identified
  // as an existing client via the first-contact menu (or been detected
  // mid-conversation by the agent's discard_lead branch), their phone
  // is in `clientes_conhecidos`. Skip lead creation and Claude entirely
  // — the atendente handles them directly via WhatsApp. If we later
  // link the phone to a responsavel, the aluno route above will catch
  // them first.
  const knownClientMatch = await matchKnownClientPhone(supabase, phone);
  if (knownClientMatch) {
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "known_client.message_received",
      contexto: {
        phone,
        matched_variant: knownClientMatch,
        origem: "clientes_conhecidos",
        text_preview: inbound.text.slice(0, 140),
      },
      motivo: "known_client",
    });
    return { ok: true, note: "known_client_message" };
  }

  // Route: known aluno → Student Agent.
  const alunoId = await findAlunoByPhone(supabase, phone);
  if (alunoId) {
    return handleStudentMessage(supabase, {
      alunoId,
      phone,
      text: inbound.text,
      messageId: inbound.messageId,
      senderName: inbound.senderName,
      agentEnabled: alunoAgentEnabled,
    });
  }

  // Otherwise: Leads Agent flow.
  return handleLeadMessage(supabase, {
    phone,
    text: inbound.text,
    messageId: inbound.messageId,
    senderName: inbound.senderName,
    type: inbound.type,
    agentEnabled: leadsAgentEnabled,
  });
}

/* ─────────────────────────────────────────────────────────────
   Leads Agent
   ───────────────────────────────────────────────────────────── */

async function handleLeadMessage(
  supabase: SupaSvc,
  args: {
    phone: string;
    text: string;
    messageId: string;
    senderName?: string;
    type: string;
    agentEnabled: boolean;
  }
): Promise<ProcessResult> {
  // Lookup: order + limit 1 (NOT maybeSingle). Two reasons:
  //   1. maybeSingle errors on 2+ rows — if legacy duplicates exist,
  //      it would treat them as "no lead" and INSERT another one,
  //      snowballing forever (the 2026-07-27 incident).
  //   2. Even after the UNIQUE constraint (0047) lands, this pattern
  //      is more forgiving to any future data anomaly.
  const { data: existingLeads } = await supabase
    .from("leads")
    .select("*")
    .eq("telefone", args.phone)
    .order("created_at", { ascending: true })
    .limit(1);
  let leadRow = existingLeads?.[0] ?? null;

  let leadId: string;
  let leadPaused = false;
  if (leadRow) {
    leadId = leadRow.id;
    leadPaused = !!leadRow.agente_pausado;
  } else {
    const { data: inserted, error: insErr } = await supabase
      .from("leads")
      .insert({
        nome: args.senderName ?? args.phone,
        telefone: args.phone,
        origem: "whatsapp",
        status: "novo",
        origem_metadata: { firstMessageId: args.messageId },
      })
      .select("*")
      .single();
    if (insErr || !inserted) {
      // 23505 = unique_violation. Someone else won the race — refetch
      // the winner and continue with it, so this event still lands
      // in lead_messages and the family gets a reply (idempotent).
      if ((insErr as { code?: string })?.code === "23505") {
        const { data: winners } = await supabase
          .from("leads")
          .select("*")
          .eq("telefone", args.phone)
          .order("created_at", { ascending: true })
          .limit(1);
        leadRow = winners?.[0] ?? null;
        if (!leadRow) {
          return {
            ok: false,
            error: `lead_race_refetch_failed: ${insErr.message}`,
          };
        }
        leadId = leadRow.id;
        leadPaused = !!leadRow.agente_pausado;
      } else {
        return { ok: false, error: `lead_insert_failed: ${insErr?.message}` };
      }
    } else {
      leadId = inserted.id;
      leadRow = inserted;
    }
  }

  await supabase.from("lead_messages").insert({
    lead_id: leadId,
    direction: "inbound",
    content: args.text,
    meta: {
      via: "zapi",
      messageId: args.messageId,
      senderName: args.senderName,
      type: args.type,
    },
  });

  // Kill-switch checks after the inbound is persisted so the atendente
  // still sees the family message in the UI even when the agent is off.
  if (!args.agentEnabled || leadPaused) {
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "leads_agent.skipped",
      contexto: {
        lead_id: leadId,
        reason: !args.agentEnabled ? "global_flag_off" : "conversation_paused",
      },
    });
    return {
      ok: true,
      note: !args.agentEnabled ? "leads_agent_disabled" : "lead_paused",
    };
  }

  // Verification gate (0048). Every first-contact lead gets the
  // numbered menu until they self-identify as a real lead (option 1)
  // or an existing client (option 2). Skips Claude entirely while
  // pending — deterministic wording, cheap, and cuts down on
  // existing clients accidentally getting qualified as leads.
  if (leadRow && !leadRow.verificado) {
    return handleVerification(supabase, {
      lead: leadRow,
      phone: args.phone,
      text: args.text,
    });
  }

  const [{ data: lead }, { data: recentMessages }, { data: nivRow }] =
    await Promise.all([
      supabase.from("leads").select("*").eq("id", leadId).single(),
      supabase
        .from("lead_messages")
        .select("direction, content, created_at")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: true })
        .limit(MAX_RECENT_MESSAGES),
      supabase
        .from("nivelamentos_escritos")
        .select("id, respostas, score")
        .eq("lead_id", leadId)
        .eq("status", "em_progresso")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!lead) return { ok: false, error: "lead_missing_after_insert" };

  const decision = await decideAgentAction({
    lead,
    recentMessages: recentMessages ?? [],
    activeNivelamento: nivRow ?? null,
  });

  if (!decision.ok) {
    // Message is stored; atendente can follow up manually.
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "leads_agent.decide_failed",
      contexto: { lead_id: leadId, error: decision.error },
      motivo: decision.error,
    });
    return { ok: true, note: `leads_agent_failed:${decision.error}` };
  }

  const result = await executeAgentAction(supabase, {
    leadId,
    telefone: args.phone,
    action: decision.action,
    source: decision.source,
  });

  // If the outbound Z-API send failed, propagate as a failed event so
  // it shows up in the webhook_events.error column instead of hiding
  // under a bland "processed" status. Also audit for postmortems.
  if (!result.ok) {
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "leads_agent.send_failed",
      contexto: { lead_id: leadId, error: result.error },
      motivo: result.error,
    });
    return {
      ok: false,
      error: `leads_agent_send_failed: ${result.error ?? "unknown"}`,
    };
  }

  return {
    ok: true,
    note: `leads_agent_applied:${JSON.stringify(result.actionsApplied)}`,
  };
}

/* ─────────────────────────────────────────────────────────────
   Student Agent
   ───────────────────────────────────────────────────────────── */

async function handleStudentMessage(
  supabase: SupaSvc,
  args: {
    alunoId: string;
    phone: string;
    text: string;
    messageId: string;
    senderName?: string;
    agentEnabled: boolean;
  }
): Promise<ProcessResult> {
  await supabase.from("agent_conversas_aluno").insert({
    aluno_id: args.alunoId,
    direction: "inbound",
    content: args.text,
    telefone: args.phone,
    message_id: args.messageId,
    meta: { senderName: args.senderName, via: "zapi" },
  });

  // Per-aluno pause check — done as a separate query since agents
  // that read the aluno for their own context also need this later.
  const { data: alunoFlag } = await supabase
    .from("alunos")
    .select("agente_pausado")
    .eq("id", args.alunoId)
    .maybeSingle();
  const alunoPaused = !!alunoFlag?.agente_pausado;

  // Skip after inbound is persisted so the atendente sees the message
  // in the UI even when the agent is off.
  if (!args.agentEnabled || alunoPaused) {
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "student_agent.skipped",
      contexto: {
        aluno_id: args.alunoId,
        reason: !args.agentEnabled ? "global_flag_off" : "conversation_paused",
      },
    });
    return {
      ok: true,
      note: !args.agentEnabled ? "student_agent_disabled" : "aluno_paused",
    };
  }

  const ctx = await loadStudentContext(supabase, args.alunoId);
  if (!ctx) {
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "student_agent.context_missing",
      contexto: { aluno_id: args.alunoId, phone: args.phone },
    });
    return { ok: true, note: "student_agent_no_context" };
  }

  const { data: history } = await supabase
    .from("agent_conversas_aluno")
    .select("direction, content, created_at")
    .eq("aluno_id", args.alunoId)
    .order("created_at", { ascending: false })
    .limit(MAX_STUDENT_HISTORY);

  const messages: IncomingMessage[] = (history ?? [])
    .reverse()
    .map((m) => ({
      role: m.direction === "inbound" ? ("user" as const) : ("assistant" as const),
      content: m.content,
    }));

  const decision = await decideStudentReply({ ctx, history: messages });
  if (!decision.ok) {
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "student_agent.decide_failed",
      contexto: { aluno_id: args.alunoId, error: decision.error },
      motivo: decision.error,
    });
    return { ok: true, note: `student_agent_failed:${decision.error}` };
  }

  let sentMessageId: string | undefined;
  let sendError: string | null = null;
  try {
    const send = await sendWhatsapp({
      telefone: args.phone,
      mensagem: decision.action.reply,
    });
    sentMessageId = send.messageId;
  } catch (err) {
    sendError = err instanceof Error ? err.message : "unknown";
    console.error("student agent Z-API send failed:", err);
  }

  await supabase.from("agent_conversas_aluno").insert({
    aluno_id: args.alunoId,
    direction: "outbound",
    content: decision.action.reply,
    telefone: args.phone,
    message_id: sentMessageId ?? null,
    meta: {
      source: decision.source,
      via: "agent",
      escalated: !!decision.action.escalate,
      // Persist send failure on the message record so the atendente
      // sees "agent tried to reply but Z-API rejected" in the
      // conversation, not a silent gap.
      send_failed: sendError ? true : undefined,
      send_error: sendError ?? undefined,
    },
    escalated: !!decision.action.escalate,
  });

  if (sendError) {
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "student_agent.send_failed",
      contexto: { aluno_id: args.alunoId, error: sendError },
      motivo: sendError,
    });
  }

  if (decision.action.escalate) {
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "student_agent.escalate",
      contexto: {
        aluno_id: args.alunoId,
        phone: args.phone,
        reason: decision.action.escalate,
      },
      motivo: decision.action.escalate,
    });
  }

  return {
    ok: true,
    note: decision.action.escalate
      ? "student_agent_replied_escalated"
      : "student_agent_replied",
  };
}

/* ─────────────────────────────────────────────────────────────
   VERIFICATION MENU (0048)
   ───────────────────────────────────────────────────────────── */

const VERIFICATION_MENU = `👋 Seja bem-vindo à Cultura Inglesa Teresina.

Por favor, escolha uma opção respondendo com o número:

1️⃣  Ainda não sou cliente. Gostaria de informações.
2️⃣  Já sou cliente.`;

// Deliberately ends with a real question, not a promise like "vou te
// fazer algumas perguntinhas" — the leads agent is only invoked on
// the NEXT inbound message, so a promise here would leave the user
// waiting forever ("goes silent" report, 2026-08-01).
const VERIFICATION_TRANSITION_NOT_CLIENT =
  "Ótimo! 😊 Pra começar, você está procurando o curso para você mesma ou para outra pessoa da família?";

const VERIFICATION_HANDOFF_EXISTING_CLIENT =
  "Perfeito! Vou te conectar com nossa atendente para dar continuidade. 😊";

const VERIFICATION_FALLBACK_TO_HUMAN =
  "Sem problema — vou te conectar com nossa atendente para continuar por aqui. 😊";

const MAX_VERIFICATION_ATTEMPTS = 2;

type VerificationAnswer = "not_client" | "existing_client" | "unclear";

/**
 * Parse the user's reply against the first-contact menu. Liberal — we
 * accept the digit, the word ("um"/"dois"), and a handful of paraphrases
 * because families under term-week stress rarely type exactly "1".
 */
function parseVerificationAnswer(text: string): VerificationAnswer {
  const t = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
  if (!t) return "unclear";

  // Existing client checked first — the phrase "sou cliente" would also
  // trigger "1" if we searched for "1" naively, since "1" appears in
  // messages like "1o filho". Anchor digit checks to the whole token.
  const tokens = t.split(/\s+/);
  const hasToken = (needle: string) => tokens.includes(needle);

  if (
    hasToken("2") ||
    hasToken("dois") ||
    t.includes("sou cliente") ||
    t.includes("ja sou") ||
    t.includes("sou aluno") ||
    t.includes("sou aluna") ||
    t.includes("sou responsavel") ||
    t.includes("meu filho") ||
    t.includes("minha filha") ||
    t.includes("opcao 2") ||
    t.includes("opção 2")
  ) {
    return "existing_client";
  }

  if (
    hasToken("1") ||
    hasToken("um") ||
    t.includes("nao sou cliente") ||
    t.includes("nao sou aluno") ||
    t.includes("gostaria de informac") || // "informações" / "informacoes"
    t.includes("quero informac") ||
    t.includes("opcao 1") ||
    t.includes("opção 1") ||
    t.includes("novo aluno") ||
    t.includes("novo cliente")
  ) {
    return "not_client";
  }

  return "unclear";
}

/**
 * Send a canned outbound as if the Leads Agent had produced it, and
 * mirror it into lead_messages so the atendente panel shows the full
 * conversation. `via` distinguishes verification-menu turns from
 * agent-generated ones.
 */
async function sendVerificationOutbound(
  supabase: SupaSvc,
  args: {
    leadId: string;
    phone: string;
    text: string;
    via: string;
  }
): Promise<void> {
  let messageId: string | undefined;
  try {
    const send = await sendWhatsapp({ telefone: args.phone, mensagem: args.text });
    messageId = send.messageId;
  } catch (err) {
    console.error("verification outbound send failed:", err);
    // Non-fatal: log the failure and still persist the intended
    // outbound so the atendente can see what we tried to send.
  }
  await supabase.from("lead_messages").insert({
    lead_id: args.leadId,
    direction: "outbound",
    content: args.text,
    meta: {
      via: args.via,
      source: "verification_menu",
      messageId: messageId ?? null,
    },
  });
}

/**
 * Handle a single inbound turn while the lead is still unverified.
 * Doesn't call Claude — deterministic branching based on menu answer.
 */
async function handleVerification(
  supabase: SupaSvc,
  args: { lead: Lead; phone: string; text: string }
): Promise<ProcessResult> {
  const leadId = args.lead.id;
  const answer = parseVerificationAnswer(args.text);

  if (answer === "not_client") {
    await supabase
      .from("leads")
      .update({ verificado: true })
      .eq("id", leadId);
    await sendVerificationOutbound(supabase, {
      leadId,
      phone: args.phone,
      text: VERIFICATION_TRANSITION_NOT_CLIENT,
      via: "verification_transition",
    });
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "leads_agent.verification.confirmed_lead",
      contexto: { lead_id: leadId, phone: args.phone },
    });
    return { ok: true, note: "verification.confirmed_as_lead" };
  }

  if (answer === "existing_client") {
    // Order matters: log the outbound + remember the phone BEFORE
    // deleting the lead, so if any step throws we're not left with a
    // deleted lead and no trace of what happened.
    await sendVerificationOutbound(supabase, {
      leadId,
      phone: args.phone,
      text: VERIFICATION_HANDOFF_EXISTING_CLIENT,
      via: "verification_handoff",
    });
    await supabase
      .from("clientes_conhecidos")
      .upsert(
        {
          telefone: args.phone,
          origem: "verificacao_menu",
        },
        { onConflict: "telefone", ignoreDuplicates: true }
      );
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "leads_agent.verification.existing_client",
      contexto: { lead_id: leadId, phone: args.phone },
      motivo: "existing_client",
    });
    await supabase.from("leads").delete().eq("id", leadId);
    return { ok: true, note: "verification.existing_client_handoff" };
  }

  // Unclear — either resend the menu (once more) or fall back to a
  // human if we've already tried twice.
  const nextAttempt = args.lead.verificacao_tentativas + 1;
  if (nextAttempt <= MAX_VERIFICATION_ATTEMPTS) {
    await supabase
      .from("leads")
      .update({ verificacao_tentativas: nextAttempt })
      .eq("id", leadId);
    await sendVerificationOutbound(supabase, {
      leadId,
      phone: args.phone,
      text: VERIFICATION_MENU,
      via: "verification_menu",
    });
    return { ok: true, note: `verification.menu_attempt_${nextAttempt}` };
  }

  // Give up: pause the agent and let the atendente take over.
  await sendVerificationOutbound(supabase, {
    leadId,
    phone: args.phone,
    text: VERIFICATION_FALLBACK_TO_HUMAN,
    via: "verification_fallback",
  });
  await supabase
    .from("leads")
    .update({ agente_pausado: true, status: "novo" })
    .eq("id", leadId);
  await supabase.from("audit_log").insert({
    ator_id: null,
    acao: "leads_agent.verification.fallback_to_human",
    contexto: {
      lead_id: leadId,
      phone: args.phone,
      attempts: nextAttempt,
    },
    motivo: "unclear_after_max_attempts",
  });
  return { ok: true, note: "verification.fallback_to_human" };
}

/* ─────────────────────────────────────────────────────────────
   FROM-ME CAPTURE (manual atendente WhatsApp replies)
   ───────────────────────────────────────────────────────────── */

/**
 * When the school WhatsApp sends a message (fromMe=true), Z-API echoes
 * the event back to our webhook. Two possible sources:
 *   1. Our own agent — we already inserted the message row when we
 *      called sendWhatsapp() and stored the Z-API messageId. Dedupe by
 *      looking up that messageId; if it's ours, skip.
 *   2. A human atendente typed directly in WhatsApp Web/mobile. The
 *      messageId won't match anything; we route it to the matching
 *      lead ficha (or aluno conversation) as an outbound row so the
 *      full conversation is visible in the atendente panel.
 */
async function handleFromMeMessage(
  supabase: SupaSvc,
  args: { phone: string; text: string; messageId: string }
): Promise<ProcessResult> {
  if (!args.messageId) {
    // No Z-API messageId means we can't dedupe against our own sends.
    // Safer to drop than risk double-logging every agent reply.
    return { ok: true, note: "fromMe_no_messageId" };
  }

  // Dedupe: our own agent sends were already inserted into
  // lead_messages / agent_conversas_aluno with meta.messageId=M.
  // If we find M, this echo is ours — nothing to do.
  const [{ data: existingLead }, { data: existingStudent }] = await Promise.all([
    supabase
      .from("lead_messages")
      .select("id")
      .eq("meta->>messageId", args.messageId)
      .limit(1),
    supabase
      .from("agent_conversas_aluno")
      .select("id")
      .eq("message_id", args.messageId)
      .limit(1),
  ]);
  if ((existingLead?.length ?? 0) > 0 || (existingStudent?.length ?? 0) > 0) {
    return { ok: true, note: "fromMe_own_agent_echo" };
  }

  // Not ours — human atendente typed this. Attach to the matching lead
  // AND/OR aluno so both views stay in sync (a phone can be both a
  // lead in progress and a linked responsavel for a different aluno).
  let attached = false;

  const { data: leadRows } = await supabase
    .from("leads")
    .select("id")
    .eq("telefone", args.phone)
    .order("created_at", { ascending: false })
    .limit(1);
  const leadId = leadRows?.[0]?.id ?? null;
  if (leadId) {
    await supabase.from("lead_messages").insert({
      lead_id: leadId,
      direction: "outbound",
      content: args.text,
      meta: {
        via: "atendente_manual",
        messageId: args.messageId,
      },
    });
    attached = true;
  }

  const alunoId = await findAlunoByPhone(supabase, args.phone);
  if (alunoId) {
    await supabase.from("agent_conversas_aluno").insert({
      aluno_id: alunoId,
      direction: "outbound",
      content: args.text,
      telefone: args.phone,
      message_id: args.messageId,
      meta: { via: "atendente_manual" },
    });
    attached = true;
  }

  if (!attached) {
    // Neither lead nor aluno matched — a staff message or an ad-hoc
    // outbound to someone we don't have on file. Audit-only trail so
    // the message isn't completely invisible.
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "atendente_manual.orphan",
      contexto: {
        phone: args.phone,
        message_id: args.messageId,
        text_preview: args.text.slice(0, 140),
      },
    });
    return { ok: true, note: "fromMe_no_match" };
  }

  return { ok: true, note: "fromMe_atendente_captured" };
}

/* ─────────────────────────────────────────────────────────────
   STAFF LOOKUP
   ───────────────────────────────────────────────────────────── */

/**
 * Match an incoming WhatsApp phone against active staff profiles.
 * Staff = anyone with perfil ≠ 'cliente' (teachers, gestores,
 * atendentes, monitors). We fetch the full staff list and filter in
 * JS because profiles.telefone is stored in mixed formats — some are
 * masked ("(86) 99999-0000"), some plain digits, some with 55 prefix.
 * A schema migration to normalise the column is overkill for the
 * volume (dozens of staff, one query per inbound message).
 */
async function matchStaffByPhone(
  supabase: SupaSvc,
  phoneDigits: string
): Promise<{ id: string; nome: string; perfil: string } | null> {
  const target = new Set(staffPhoneCandidates(phoneDigits));
  if (target.size === 0) return null;

  const { data: staff } = await supabase
    .from("profiles")
    .select("id, nome, perfil, telefone")
    .neq("perfil", "cliente")
    .eq("ativo", true);
  if (!staff) return null;

  for (const p of staff) {
    if (!p.telefone) continue;
    const digits = p.telefone.replace(/\D/g, "");
    if (!digits) continue;
    for (const cand of staffPhoneCandidates(digits)) {
      if (target.has(cand)) return { id: p.id, nome: p.nome, perfil: p.perfil };
    }
  }
  return null;
}

/**
 * Match an incoming phone against `clientes_conhecidos`. Same
 * 55-prefix variance tolerance as the aluno lookup — legacy entries
 * may be stored without the country code. Returns the matched stored
 * form so the audit trail records which variant hit.
 */
async function matchKnownClientPhone(
  supabase: SupaSvc,
  phoneDigits: string
): Promise<string | null> {
  const candidates = staffPhoneCandidates(phoneDigits);
  if (candidates.length === 0) return null;
  const { data } = await supabase
    .from("clientes_conhecidos")
    .select("telefone")
    .in("telefone", candidates)
    .limit(1);
  return data?.[0]?.telefone ?? null;
}

/** Same 55-prefix normalisation as findAlunoByPhone. Two variants:
 *  raw digits (as stored) and the with/without 55 counterpart. */
function staffPhoneCandidates(phoneDigits: string): string[] {
  const out = new Set<string>();
  out.add(phoneDigits);
  if (
    phoneDigits.startsWith("55") &&
    (phoneDigits.length === 12 || phoneDigits.length === 13)
  ) {
    out.add(phoneDigits.slice(2));
  } else if (phoneDigits.length === 10 || phoneDigits.length === 11) {
    out.add(`55${phoneDigits}`);
  }
  return Array.from(out);
}

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Lead } from "@/lib/supabase/types";
import { sendWhatsapp } from "@/lib/integrations/zapi";

import type { AgentAction } from "./types";

export type ExecuteResult = {
  ok: boolean;
  error?: string;
  sentMessageId?: string;
  actionsApplied: {
    lead: boolean;
    nivelamento: "started" | "updated" | "concluded" | null;
    escalated: boolean;
    handoff:
      | { ok: true; alunoId: string; alunoNome: string }
      | { ok: false; reason: "ambiguous" | "not_found" }
      | null;
  };
};

/**
 * Normalize a name for fuzzy matching — accent-stripped, lowercased,
 * whitespace-collapsed. Mirrors scripts/import-rema.ts so behaviour is
 * consistent between bulk import and handoff lookup.
 */
function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Handoff to Student Agent when the caller confirms they're a client.
 * Searches alunos by nome; on a unique match:
 *   1. Appends the incoming phone to responsavel.telefones_extras
 *   2. Sends a canned Student Agent greeting via Z-API
 *   3. Persists that greeting to agent_conversas_aluno so the
 *      /admin/student-agent dashboard shows a coherent conversation
 * Returns a discriminated result so the caller can distinguish
 * success from ambiguous/not-found and act appropriately.
 */
async function attemptHandoffToStudent(
  supabase: SupabaseClient<Database>,
  args: { alunoNome: string; phone: string }
): Promise<
  | { ok: true; alunoId: string; alunoNome: string }
  | { ok: false; reason: "ambiguous" | "not_found" }
> {
  const query = normalizeName(args.alunoNome);
  if (!query) return { ok: false, reason: "not_found" };

  // Strip Portuguese connectors — they carry no matching signal and
  // dilute the overlap score.
  const STOPWORDS = new Set(["de", "da", "do", "dos", "das", "e"]);
  const qTokens = query.split(" ").filter((t) => t && !STOPWORDS.has(t));
  if (qTokens.length === 0) return { ok: false, reason: "not_found" };

  // Shortlist strategy: fetch all alunos whose name contains ANY of
  // the query tokens (OR). PostgREST .or() with ilike.* wildcards.
  // Limit high because active + pré + trancado alunos number in the
  // hundreds, not thousands, and we filter+rank locally anyway.
  const orExpr = qTokens.map((t) => `nome.ilike.*${t}*`).join(",");
  const { data: shortlist } = await supabase
    .from("alunos")
    .select("id, nome, responsavel_id, status")
    .in("status", ["ativo", "pre", "trancado"])
    .or(orExpr)
    .limit(200);

  // Rank each candidate by token-overlap count against the query.
  // Exact normalized match wins outright. Anything scoring < 2 is a
  // weak signal (just a shared first name) and doesn't count.
  const ranked = (shortlist ?? [])
    .map((a) => {
      const norm = normalizeName(a.nome);
      const exact = norm === query;
      const nTokens = new Set(norm.split(" ").filter(Boolean));
      let overlap = 0;
      for (const t of qTokens) if (nTokens.has(t)) overlap++;
      const score = exact ? 1000 : overlap;
      return { aluno: a, score, norm };
    })
    .filter((r) => r.score >= 2)
    .sort((a, b) => b.score - a.score);

  if (ranked.length === 0) return { ok: false, reason: "not_found" };

  // Clear-winner rule: the top match must score strictly higher than
  // the runner-up. This handles "José Artur Silva" vs "José Artur
  // Souza" (both share 2 tokens with a "José Artur…" query) — we send
  // it to a human rather than guess. If it's tied but there's ONE
  // exact-normalised match, that always wins.
  if (ranked.length > 1 && ranked[0].score === ranked[1].score) {
    return { ok: false, reason: "ambiguous" };
  }

  const aluno = ranked[0].aluno;

  // 1. Append phone to responsavel.telefones_extras (dedupe).
  const { data: resp } = await supabase
    .from("responsaveis")
    .select("id, telefone, telefones_extras")
    .eq("id", aluno.responsavel_id)
    .maybeSingle();
  if (!resp) return { ok: false, reason: "not_found" };
  const already =
    resp.telefone === args.phone ||
    (resp.telefones_extras ?? []).includes(args.phone);
  if (!already) {
    const next = [...(resp.telefones_extras ?? []), args.phone];
    await supabase
      .from("responsaveis")
      .update({ telefones_extras: next })
      .eq("id", resp.id);
  }

  // 2. Fire the Student Agent greeting. Canned so it's deterministic
  //    and cheap; can switch to decideStudentReply later if David
  //    wants generative first-contact.
  const firstName = aluno.nome.split(/\s+/)[0];
  const greeting = `Oi! Aqui é o suporte pedagógico da Cultura Inglesa Teresina. Como posso ajudar ${firstName} hoje?`;
  let studentMessageId: string | undefined;
  try {
    const send = await sendWhatsapp({ telefone: args.phone, mensagem: greeting });
    studentMessageId = send.messageId;
  } catch (err) {
    console.error("student greeting Z-API send failed:", err);
    // Non-fatal: linkage already happened; atendente sees the handoff
    // in audit_log and can send the greeting manually.
  }

  // 3. Persist the greeting so /admin/student-agent shows it.
  await supabase.from("agent_conversas_aluno").insert({
    aluno_id: aluno.id,
    direction: "outbound",
    content: greeting,
    telefone: args.phone,
    message_id: studentMessageId ?? null,
    meta: { via: "handoff_from_leads", source: "canned_greeting" },
  });

  return { ok: true, alunoId: aluno.id, alunoNome: aluno.nome };
}

/**
 * Apply the agent's decided action:
 *   1. Send the reply via Z-API (real or stub)
 *   2. Persist the outbound message in lead_messages
 *   3. Apply leadUpdate patch
 *   4. Handle nivelamento events (start, answer, conclude)
 *   5. On escalate, audit and set lead.status='novo' so a human sees it
 *
 * All writes use the service-role client (this runs from the public webhook
 * where there's no user session).
 */
export async function executeAgentAction(
  supabase: SupabaseClient<Database>,
  args: {
    leadId: string;
    telefone: string;
    action: AgentAction;
    source: "claude" | "stub";
  }
): Promise<ExecuteResult> {
  const { leadId, telefone, action, source } = args;

  const applied: ExecuteResult["actionsApplied"] = {
    lead: false,
    nivelamento: null,
    escalated: false,
    handoff: null,
  };

  // 1. Send the WhatsApp reply.
  let sentMessageId: string | undefined;
  try {
    const send = await sendWhatsapp({ telefone, mensagem: action.reply });
    sentMessageId = send.messageId;
  } catch (err) {
    console.error("Z-API send failed:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Z-API send failed",
      actionsApplied: applied,
    };
  }

  // 2. Persist outbound message.
  await supabase.from("lead_messages").insert({
    lead_id: leadId,
    direction: "outbound",
    content: action.reply,
    meta: {
      via: "agent",
      source,
      messageId: sentMessageId,
      escalated: !!action.escalate,
    },
  });

  // 3. Apply lead update.
  const patch: Partial<Lead> = {};
  if (action.leadUpdate) {
    if (action.leadUpdate.status) patch.status = action.leadUpdate.status;
    if (action.leadUpdate.nivel_sugerido)
      patch.nivel_sugerido = action.leadUpdate.nivel_sugerido;
    if (action.leadUpdate.faixa_etaria)
      patch.faixa_etaria = action.leadUpdate.faixa_etaria;
    if (action.leadUpdate.nome && action.leadUpdate.nome.trim())
      patch.nome = action.leadUpdate.nome.trim();
    if (action.leadUpdate.responsavel_nome)
      patch.responsavel_nome = action.leadUpdate.responsavel_nome;
    if (action.leadUpdate.notas) patch.notas = action.leadUpdate.notas;
  }

  // 4. Nivelamento escrito state machine.
  if (action.nivelamento) {
    const n = action.nivelamento;
    // Look for an in-progress nivelamento to append to (else create).
    const { data: existing } = await supabase
      .from("nivelamentos_escritos")
      .select("id, respostas")
      .eq("lead_id", leadId)
      .eq("status", "em_progresso")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (n.action === "start" && !existing) {
      await supabase.from("nivelamentos_escritos").insert({
        lead_id: leadId,
        respostas: [{ n: 1, question: n.question, correct: null, answer: null }],
        status: "em_progresso",
        iniciado_em: new Date().toISOString(),
        meta: { source, agent_started: true },
      });
      applied.nivelamento = "started";
    } else if (n.action === "answer" && existing) {
      const respostas = Array.isArray(existing.respostas)
        ? (existing.respostas as Array<Record<string, unknown>>)
        : [];
      // Attach judgement to the last question, then append the next.
      if (respostas.length > 0) {
        respostas[respostas.length - 1] = {
          ...respostas[respostas.length - 1],
          correct: n.correct ?? null,
        };
      }
      if (n.question) {
        respostas.push({
          n: respostas.length + 1,
          question: n.question,
          correct: null,
          answer: null,
        });
      }
      await supabase
        .from("nivelamentos_escritos")
        .update({ respostas })
        .eq("id", existing.id);
      applied.nivelamento = "updated";
    } else if (n.action === "conclude") {
      const nowIso = new Date().toISOString();
      if (existing) {
        await supabase
          .from("nivelamentos_escritos")
          .update({
            status: "concluido",
            concluido_em: nowIso,
            nivel_detectado: n.level,
            score: n.score,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("nivelamentos_escritos").insert({
          lead_id: leadId,
          respostas: [],
          status: "concluido",
          iniciado_em: nowIso,
          concluido_em: nowIso,
          nivel_detectado: n.level,
          score: n.score,
          meta: { source, agent_concluded_directly: true },
        });
      }
      // Also stamp the detected level on the lead itself.
      if (!patch.nivel_sugerido) patch.nivel_sugerido = n.level;
      if (!patch.status) patch.status = "nivelado";
      applied.nivelamento = "concluded";
    }
  }

  // 5. Escalation — set status back to 'novo' if not otherwise touched so
  //    the human atendente sees it as new work, AND flip agente_pausado
  //    so the next inbound message doesn't get another agent reply while
  //    the human is taking over on WhatsApp. Un-pausing is a deliberate
  //    action via the AgentPauseToggle on the lead ficha.
  if (action.escalate) {
    if (!patch.status) patch.status = "novo";
    patch.agente_pausado = true;
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "leads_agent.escalate",
      contexto: { lead_id: leadId, reason: action.escalate },
      motivo: action.escalate,
    });
    applied.escalated = true;
  }

  // 6. Handoff to Student Agent — after the Leads Agent's reply has
  //    already been sent, so the family sees the "passing you along"
  //    message THEN the Student Agent greeting arrives seconds later.
  //    On ambiguous/not-found we fall back to escalating for a human
  //    to unblock the family manually.
  if (action.handoff_to_student?.aluno_nome) {
    const handoff = await attemptHandoffToStudent(supabase, {
      alunoNome: action.handoff_to_student.aluno_nome,
      phone: telefone,
    });
    applied.handoff = handoff;
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: handoff.ok
        ? "leads_agent.handoff_to_student.ok"
        : "leads_agent.handoff_to_student.failed",
      contexto: {
        lead_id: leadId,
        phone: telefone,
        aluno_nome_query: action.handoff_to_student.aluno_nome,
        ...(handoff.ok
          ? { matched_aluno_id: handoff.alunoId, matched_aluno_nome: handoff.alunoNome }
          : { reason: handoff.reason }),
      },
      motivo: handoff.ok ? "handoff_success" : `handoff_${handoff.reason}`,
    });
    if (handoff.ok) {
      // Mark the lead so the atendente pipeline reflects the resolution.
      // Not 'convertido' — that's for matriculated leads; use 'stand_by'
      // with a note so it's clear this was a client, not a new lead.
      if (!patch.status) patch.status = "stand_by";
      patch.notas = `[handoff] Cliente existente vinculado ao aluno ${handoff.alunoNome} em ${new Date().toISOString().slice(0, 10)}.`;
    } else if (!applied.escalated) {
      // No successful handoff → force an escalation so a human unblocks
      // the family. Pause the agent so it doesn't butt in on the next
      // family message while the atendente is handling it.
      if (!patch.status) patch.status = "novo";
      patch.agente_pausado = true;
      applied.escalated = true;
    }
  }

  if (Object.keys(patch).length > 0) {
    await supabase.from("leads").update(patch).eq("id", leadId);
    applied.lead = true;
  }

  // 7. discard_lead — the contact turned out not to be a real lead
  //    (existing client / teacher / staff member reaching the school
  //    WhatsApp). Reply already went out; delete the ficha so the
  //    atendente queue stays clean. FK cascade wipes lead_messages,
  //    visitas, nivelamentos.
  //
  //    We also record the phone in clientes_conhecidos so a follow-up
  //    message from the same family tomorrow short-circuits at the
  //    webhook (0048) instead of creating a fresh lead and letting
  //    the agent respond again — the exact "rejoins after handoff"
  //    bug David reported.
  if (action.discard_lead) {
    await supabase.from("audit_log").insert({
      ator_id: null,
      acao: "leads_agent.discard_lead",
      contexto: { lead_id: leadId, reason: action.discard_lead.reason },
      motivo: action.discard_lead.reason,
    });
    await supabase
      .from("clientes_conhecidos")
      .upsert(
        {
          telefone,
          origem: "discard_lead",
          observacao: action.discard_lead.reason,
        },
        { onConflict: "telefone", ignoreDuplicates: true }
      );
    await supabase.from("leads").delete().eq("id", leadId);
  }

  return { ok: true, sentMessageId, actionsApplied: applied };
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { audit, requireGestor } from "@/lib/auth";
import {
  pickAlunosRecipients,
  pickLeadsRecipients,
  type AlunosFilter,
  type LeadsFilter,
} from "@/lib/broadcasts/recipients";
import { buildSlots } from "@/lib/broadcasts/scheduler";
import { sendWhatsapp } from "@/lib/integrations/zapi";
import {
  fieldErrors,
  readBool,
  readInt,
  readString,
  type FormState,
} from "@/lib/forms";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { normalizePhoneOrNull } from "@/lib/utils/phone";

/* ─────────────────────────────────────────────────────────────
   Shared helpers
   ───────────────────────────────────────────────────────────── */

type ScheduleInputs = {
  nome: string;
  mensagem: string;
  agendadoPara: Date;
  intervaloSeg: number;
  weekendsAllowed: boolean;
  janelaInicioH: number;
  janelaFimH: number;
};

function parseScheduleInputs(
  fd: FormData
): { ok: true; inputs: ScheduleInputs } | { ok: false; errors: FormState } {
  const errors: Record<string, string> = {};
  const nome = readString(fd, "nome");
  const mensagem = readString(fd, "mensagem");
  const enviarAgora = readBool(fd, "enviar_agora");
  const agendadoParaRaw = readString(fd, "agendado_para");
  const intervaloSeg = readInt(fd, "intervalo_seg", { min: 3, max: 60 });
  const weekendsAllowed = readBool(fd, "respeitar_fim_de_semana");

  if (!nome) errors.nome = "Informe um nome interno para o broadcast.";
  if (!mensagem) errors.mensagem = "A mensagem não pode ficar vazia.";
  if (!intervaloSeg) errors.intervalo_seg = "Intervalo inválido (3-60s).";

  let agendadoPara: Date | null = null;
  if (enviarAgora) {
    agendadoPara = new Date();
  } else if (!agendadoParaRaw) {
    errors.agendado_para = "Escolha uma data/hora ou marque 'Enviar agora'.";
  } else {
    // `<input type="datetime-local">` sends a bare "YYYY-MM-DDTHH:mm"
    // with no timezone. Node on Vercel runs in UTC, so `new Date(str)`
    // would interpret the value as UTC — a BRT user picking 15:30
    // would be scheduled for 12:30 BRT (3h in the past). Append the
    // BRT offset explicitly so the wall-clock time the user typed
    // is what actually gets scheduled.
    const withTz = /[zZ]|[+-]\d{2}:?\d{2}$/.test(agendadoParaRaw)
      ? agendadoParaRaw
      : `${agendadoParaRaw}-03:00`;
    const parsed = new Date(withTz);
    if (Number.isNaN(parsed.getTime())) {
      errors.agendado_para = "Data/hora inválida.";
    } else if (parsed.getTime() < Date.now() - 60_000) {
      errors.agendado_para = "A data/hora deve estar no futuro.";
    } else {
      agendadoPara = parsed;
    }
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors: fieldErrors(errors) };

  return {
    ok: true,
    inputs: {
      nome: nome!,
      mensagem: mensagem!,
      agendadoPara: agendadoPara!,
      intervaloSeg: intervaloSeg!,
      weekendsAllowed,
      // Fixed business-hour window matches the cron schedule. Not
      // user-editable in the form to keep the compose UX simple; we
      // can loosen this if a legitimate use case appears.
      janelaInicioH: 8,
      janelaFimH: 19,
    },
  };
}

/* ─────────────────────────────────────────────────────────────
   Leads
   ───────────────────────────────────────────────────────────── */

function parseLeadsFilter(fd: FormData): LeadsFilter {
  return {
    q: readString(fd, "filter_q") ?? undefined,
    status: readString(fd, "filter_status") ?? undefined,
    qualif: (readString(fd, "filter_qualif") ?? undefined) as LeadsFilter["qualif"],
    incluir_sem_verificacao: readBool(fd, "incluir_sem_verificacao"),
  };
}

export async function createLeadsBroadcast(
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const me = await requireGestor();
  const parsed = parseScheduleInputs(fd);
  if (!parsed.ok) return parsed.errors;
  const { inputs } = parsed;
  const filter = parseLeadsFilter(fd);

  const supabase = await createSupabaseServerClient();
  const recipients = await pickLeadsRecipients(supabase, filter);
  if (recipients.length === 0) {
    return { error: "Nenhum lead corresponde aos filtros escolhidos." };
  }

  const slots = buildSlots({
    recipientCount: recipients.length,
    startAt: inputs.agendadoPara,
    intervalSeconds: inputs.intervaloSeg,
    janelaInicioH: inputs.janelaInicioH,
    janelaFimH: inputs.janelaFimH,
    weekendsAllowed: inputs.weekendsAllowed,
  });

  const { data: broadcast, error: insErr } = await supabase
    .from("broadcasts")
    .insert({
      nome: inputs.nome,
      target_type: "leads",
      filter,
      mensagem: inputs.mensagem,
      agendado_para: inputs.agendadoPara.toISOString(),
      intervalo_seg: inputs.intervaloSeg,
      respeitar_fim_de_semana: inputs.weekendsAllowed,
      janela_inicio_h: inputs.janelaInicioH,
      janela_fim_h: inputs.janelaFimH,
      status: "agendado",
      criado_por: me.userId,
      total_recipients: recipients.length,
    })
    .select("id")
    .single();
  if (insErr || !broadcast)
    return { error: `Falha ao criar broadcast: ${insErr?.message}` };

  const rows = recipients.map((r, i) => ({
    broadcast_id: broadcast.id,
    lead_id: r.id,
    telefone: r.telefone,
    agendado_para: slots[i].toISOString(),
  }));

  const { error: recErr } = await supabase
    .from("broadcast_recipients")
    .insert(rows);
  if (recErr) {
    // Rollback the parent so we don't leave a broadcast pointing at no
    // recipients. Cascade takes care of any partial recipient inserts.
    await supabase.from("broadcasts").delete().eq("id", broadcast.id);
    return { error: `Falha ao criar destinatários: ${recErr.message}` };
  }

  await audit("broadcast.create", {
    broadcast_id: broadcast.id,
    target_type: "leads",
    total_recipients: recipients.length,
    filter,
  });
  revalidatePath("/admin/broadcasts/leads");
  redirect(`/admin/broadcasts/${broadcast.id}`);
}

/* ─────────────────────────────────────────────────────────────
   Alunos
   ───────────────────────────────────────────────────────────── */

function parseAlunosFilter(fd: FormData): AlunosFilter {
  const turmaIdsRaw = fd.getAll("filter_turma_ids");
  const turma_ids = turmaIdsRaw
    .filter((v): v is string => typeof v === "string" && !!v);
  return {
    q: readString(fd, "filter_q") ?? undefined,
    turma_ids: turma_ids.length > 0 ? turma_ids : undefined,
    status: (readString(fd, "filter_status") ?? undefined) as AlunosFilter["status"],
    curso_nome: readString(fd, "filter_curso_nome") ?? undefined,
    incluir_bolsistas: readBool(fd, "incluir_bolsistas") || undefined,
  };
}

export async function createAlunosBroadcast(
  _prev: FormState,
  fd: FormData
): Promise<FormState> {
  const me = await requireGestor();
  const parsed = parseScheduleInputs(fd);
  if (!parsed.ok) return parsed.errors;
  const { inputs } = parsed;
  const filter = parseAlunosFilter(fd);

  const supabase = await createSupabaseServerClient();
  const recipients = await pickAlunosRecipients(supabase, filter);
  if (recipients.length === 0) {
    return { error: "Nenhum aluno corresponde aos filtros escolhidos." };
  }

  const slots = buildSlots({
    recipientCount: recipients.length,
    startAt: inputs.agendadoPara,
    intervalSeconds: inputs.intervaloSeg,
    janelaInicioH: inputs.janelaInicioH,
    janelaFimH: inputs.janelaFimH,
    weekendsAllowed: inputs.weekendsAllowed,
  });

  const { data: broadcast, error: insErr } = await supabase
    .from("broadcasts")
    .insert({
      nome: inputs.nome,
      target_type: "alunos",
      filter,
      mensagem: inputs.mensagem,
      agendado_para: inputs.agendadoPara.toISOString(),
      intervalo_seg: inputs.intervaloSeg,
      respeitar_fim_de_semana: inputs.weekendsAllowed,
      janela_inicio_h: inputs.janelaInicioH,
      janela_fim_h: inputs.janelaFimH,
      status: "agendado",
      criado_por: me.userId,
      total_recipients: recipients.length,
    })
    .select("id")
    .single();
  if (insErr || !broadcast)
    return { error: `Falha ao criar broadcast: ${insErr?.message}` };

  const rows = recipients.map((r, i) => ({
    broadcast_id: broadcast.id,
    aluno_id: r.id,
    telefone: r.telefone,
    agendado_para: slots[i].toISOString(),
  }));

  const { error: recErr } = await supabase
    .from("broadcast_recipients")
    .insert(rows);
  if (recErr) {
    await supabase.from("broadcasts").delete().eq("id", broadcast.id);
    return { error: `Falha ao criar destinatários: ${recErr.message}` };
  }

  await audit("broadcast.create", {
    broadcast_id: broadcast.id,
    target_type: "alunos",
    total_recipients: recipients.length,
    filter,
  });
  revalidatePath("/admin/broadcasts/alunos");
  redirect(`/admin/broadcasts/${broadcast.id}`);
}

/* ─────────────────────────────────────────────────────────────
   Test send — sends the message to a single nominated phone RIGHT
   NOW, no scheduling, no broadcast row. Used from the compose form
   so David can eyeball a preview before firing at hundreds.
   ───────────────────────────────────────────────────────────── */

export type TestSendState = FormState & { ok?: boolean; sentTo?: string };

export async function testSendBroadcast(
  _prev: TestSendState,
  fd: FormData
): Promise<TestSendState> {
  await requireGestor();
  const errors: Record<string, string> = {};
  const telefoneRaw = readString(fd, "test_telefone");
  const mensagem = readString(fd, "test_mensagem");

  if (!mensagem) errors.test_mensagem = "Mensagem vazia.";
  const e164 = telefoneRaw ? normalizePhoneOrNull(telefoneRaw) : null;
  if (!e164) errors.test_telefone = "Telefone inválido.";

  if (Object.keys(errors).length > 0) return fieldErrors(errors);

  try {
    await sendWhatsapp({ telefone: e164!, mensagem: mensagem! });
    await audit("broadcast.test_send", { telefone: e164, chars: mensagem!.length });
    return { ok: true, sentTo: e164! };
  } catch (err) {
    return {
      error: `Falha ao enviar teste: ${err instanceof Error ? err.message : "erro"}`,
    };
  }
}

/* ─────────────────────────────────────────────────────────────
   Cancel — stops any pending recipients on the parent broadcast.
   The dispatcher checks the parent status on every tick, so we don't
   need to bulk-update the recipients here — but we DO set the parent
   status to 'cancelado' so already-in-flight ticks bail.
   ───────────────────────────────────────────────────────────── */

export async function cancelBroadcast(fd: FormData) {
  await requireGestor();
  const id = readString(fd, "id");
  if (!id) return;
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("broadcasts")
    .update({ status: "cancelado" })
    .eq("id", id)
    .in("status", ["agendado", "em_envio"]);
  await audit("broadcast.cancel", { broadcast_id: id });
  revalidatePath(`/admin/broadcasts/${id}`);
  revalidatePath("/admin/broadcasts/leads");
  revalidatePath("/admin/broadcasts/alunos");
}

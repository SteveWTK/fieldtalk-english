/**
 * Convert a filter spec into a list of eligible recipients (id + phone)
 * for a given broadcast target type. Used by both the compose-time
 * preview ("this will reach 137 leads") AND the fan-out step that
 * writes the broadcast_recipients rows.
 *
 * Same normalizeBrazilianPhone the Z-API sender uses — filters out
 * any recipient with an unparseable phone at picker time so we don't
 * waste a broadcast_recipients row on someone we could never send to.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { leadMatchesQuery } from "@/app/(staff)/atendente/leads/filter-options";
import { LEAD_TERMINAL } from "@/lib/leads/status";
import type { Database } from "@/lib/supabase/types";
import { normalizePhoneOrNull } from "@/lib/utils/phone";

export type LeadsFilter = {
  q?: string;
  status?: string; // pipeline status OR "abertos" OR "todos"
  qualif?: "quente" | "morno" | "frio" | "sem" | "todos";
  incluir_sem_verificacao?: boolean; // default false (skip unverified leads)
};

export type AlunosFilter = {
  q?: string;
  turma_ids?: string[]; // empty = all
  status?: "ativo" | "pre" | "trancado" | "cancelado" | "todos";
  /**
   * The "level" a family thinks in (Tots / Kids / Teens / etc.) lives
   * on cursos.nome, not on the legacy turmas.nivel column (0036 note).
   * Match resolves turma → modulo → curso → nome.
   */
  curso_nome?: string;
  incluir_bolsistas?: boolean; // default true
};

export type PickedRecipient = {
  id: string;                    // lead.id or aluno.id
  nome: string;                  // for the preview
  telefone: string;              // E.164 (55DDDNNNNNNNNN)
};

type Supa = SupabaseClient<Database>;

/* ─────────────────────────────────────────────────────────────
   LEADS PICKER
   ───────────────────────────────────────────────────────────── */

export async function pickLeadsRecipients(
  supabase: Supa,
  filter: LeadsFilter
): Promise<PickedRecipient[]> {
  const { data: leads } = await supabase
    .from("leads")
    .select(
      "id, nome, telefone, email, responsavel_nome, status, lead_qualificado, verificado"
    )
    .order("created_at", { ascending: false });

  const rows = leads ?? [];
  const wantVerifiedOnly = !filter.incluir_sem_verificacao;

  return rows
    .filter((l) => {
      // Verified gate: default excludes leads still in the multi-choice
      // menu, since blasting them a broadcast before they've even
      // identified themselves is bad UX.
      if (wantVerifiedOnly && !l.verificado) return false;

      // Status.
      const status = filter.status ?? "todos";
      if (status !== "todos") {
        if (status === "abertos") {
          if (LEAD_TERMINAL.has(l.status)) return false;
        } else if (l.status !== status) {
          return false;
        }
      }

      // Qualif.
      const q = filter.qualif ?? "todos";
      if (q !== "todos") {
        if (q === "sem") {
          if (l.lead_qualificado) return false;
        } else if ((l.lead_qualificado ?? "").toLowerCase() !== q) {
          return false;
        }
      }

      // Text search (reuses the same helper the leads list uses).
      if (filter.q && !leadMatchesQuery(l, filter.q)) return false;

      return true;
    })
    .map((l) => {
      const e164 = normalizePhoneOrNull(l.telefone);
      return e164
        ? {
            id: l.id,
            nome: l.nome,
            telefone: e164,
          }
        : null;
    })
    .filter((r): r is PickedRecipient => r !== null);
}

/* ─────────────────────────────────────────────────────────────
   ALUNOS PICKER
   ───────────────────────────────────────────────────────────── */

export async function pickAlunosRecipients(
  supabase: Supa,
  filter: AlunosFilter
): Promise<PickedRecipient[]> {
  const { data: alunos } = await supabase
    .from("alunos")
    .select(
      "id, nome, status, turma_id, responsavel_id, is_bolsista"
    );

  // Fetch responsaveis phones + turmas (for curso lookup via modulos).
  const respIds = Array.from(
    new Set((alunos ?? []).map((a) => a.responsavel_id))
  );
  const turmaIds = Array.from(
    new Set(
      (alunos ?? [])
        .map((a) => a.turma_id)
        .filter((id): id is string => !!id)
    )
  );
  const [{ data: responsaveis }, { data: turmas }] = await Promise.all([
    respIds.length
      ? supabase
          .from("responsaveis")
          .select("id, nome, telefone")
          .in("id", respIds)
      : Promise.resolve({ data: [] as { id: string; nome: string; telefone: string | null }[] }),
    turmaIds.length
      ? supabase
          .from("turmas")
          .select("id, nome, modulo_id")
          .in("id", turmaIds)
      : Promise.resolve({ data: [] as { id: string; nome: string; modulo_id: string | null }[] }),
  ]);

  // Resolve turma → modulo → curso.nome so we can match on the level
  // families actually think in (Tots / Kids / Teens / …).
  const moduloIds = Array.from(
    new Set(
      (turmas ?? [])
        .map((t) => t.modulo_id)
        .filter((id): id is string => !!id)
    )
  );
  const { data: modulos } = moduloIds.length
    ? await supabase
        .from("modulos")
        .select("id, curso_id")
        .in("id", moduloIds)
    : { data: [] as { id: string; curso_id: string }[] };
  const cursoIds = Array.from(
    new Set((modulos ?? []).map((m) => m.curso_id))
  );
  const { data: cursos } = cursoIds.length
    ? await supabase.from("cursos").select("id, nome").in("id", cursoIds)
    : { data: [] as { id: string; nome: string }[] };
  const cursoNomeByModulo = new Map(
    (modulos ?? []).map((m) => [
      m.id,
      (cursos ?? []).find((c) => c.id === m.curso_id)?.nome ?? null,
    ])
  );

  const respById = new Map(
    (responsaveis ?? []).map((r) => [r.id, r])
  );
  const turmaById = new Map(
    (turmas ?? []).map((t) => [t.id, t])
  );

  const rows = alunos ?? [];
  const turmaWhitelist =
    filter.turma_ids && filter.turma_ids.length > 0
      ? new Set(filter.turma_ids)
      : null;
  const includeBolsistas = filter.incluir_bolsistas ?? true;

  return rows
    .filter((a) => {
      const status = filter.status ?? "todos";
      if (status !== "todos" && a.status !== status) return false;

      if (turmaWhitelist) {
        if (!a.turma_id || !turmaWhitelist.has(a.turma_id)) return false;
      }

      if (filter.curso_nome && filter.curso_nome !== "todos") {
        const turma = a.turma_id ? turmaById.get(a.turma_id) : null;
        const cursoNome = turma?.modulo_id
          ? cursoNomeByModulo.get(turma.modulo_id) ?? null
          : null;
        if (cursoNome !== filter.curso_nome) return false;
      }

      if (!includeBolsistas && a.is_bolsista) return false;

      if (filter.q) {
        const needle = filter.q.toLowerCase().trim();
        if (!needle) return true;
        const respNome = respById.get(a.responsavel_id)?.nome ?? "";
        const hit =
          a.nome.toLowerCase().includes(needle) ||
          respNome.toLowerCase().includes(needle);
        if (!hit) return false;
      }

      return true;
    })
    .map((a) => {
      const resp = respById.get(a.responsavel_id);
      const telefone = resp?.telefone;
      if (!telefone) return null;
      const e164 = normalizePhoneOrNull(telefone);
      if (!e164) return null;
      return {
        id: a.id,
        nome: a.nome,
        telefone: e164,
      };
    })
    .filter((r): r is PickedRecipient => r !== null);
}

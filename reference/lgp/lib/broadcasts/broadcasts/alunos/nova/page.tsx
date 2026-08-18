import Link from "next/link";

import { Button } from "@/components/ui";
import { PageHeader } from "@/components/admin/page-header";
import { requireGestor } from "@/lib/auth";
import { pickAlunosRecipients } from "@/lib/broadcasts/recipients";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import { AlunosComposeForm } from "./compose-form";

export const dynamic = "force-dynamic";

export default async function NovaAlunosBroadcastPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter_q?: string;
    filter_status?: string;
    filter_curso_nome?: string;
    filter_turma_ids?: string | string[];
    incluir_bolsistas?: string;
  }>;
}) {
  await requireGestor();
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();

  const rawTurma = sp?.filter_turma_ids;
  const turma_ids = Array.isArray(rawTurma)
    ? rawTurma.filter((v) => !!v)
    : rawTurma
      ? [rawTurma]
      : [];

  const filter = {
    q: sp?.filter_q ?? "",
    status: (sp?.filter_status ?? "todos") as
      | "todos"
      | "ativo"
      | "pre"
      | "trancado"
      | "cancelado",
    curso_nome: sp?.filter_curso_nome ?? "todos",
    turma_ids,
    incluir_bolsistas:
      sp?.incluir_bolsistas === undefined || sp?.incluir_bolsistas === "on",
  };

  const [{ data: turmas }, { data: cursos }, recipients] = await Promise.all([
    supabase
      .from("turmas")
      .select("id, nome, horario")
      .eq("ativo", true)
      .order("nome"),
    supabase.from("cursos").select("id, nome").order("nome"),
    pickAlunosRecipients(supabase, {
      q: filter.q || undefined,
      status: filter.status,
      curso_nome: filter.curso_nome === "todos" ? undefined : filter.curso_nome,
      turma_ids: filter.turma_ids.length > 0 ? filter.turma_ids : undefined,
      incluir_bolsistas: filter.incluir_bolsistas,
    }),
  ]);

  const cursoNomes = (cursos ?? []).map((c) => c.nome);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Novo broadcast para alunos"
        subtitle="Compõe a mensagem, filtra o público, e agenda o envio escalonado. Faça um teste antes de disparar."
        actions={
          <Link href="/admin/broadcasts/alunos">
            <Button variant="outline">← Voltar</Button>
          </Link>
        }
      />

      <AlunosComposeForm
        filter={filter}
        turmas={(turmas ?? []).map((t) => ({
          id: t.id,
          nome: t.nome,
          horario: t.horario,
        }))}
        cursoNomes={cursoNomes}
        previewCount={recipients.length}
        previewFirst={recipients[0]?.nome ?? null}
        previewLast={recipients[recipients.length - 1]?.nome ?? null}
      />
    </div>
  );
}

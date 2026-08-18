import Link from "next/link";

import { Badge, Button, Card } from "@/components/ui";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { requireGestor } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_META: Record<
  string,
  { label: string; tone: "muted" | "info" | "warning" | "success" | "danger" }
> = {
  rascunho: { label: "Rascunho", tone: "muted" },
  agendado: { label: "Agendado", tone: "info" },
  em_envio: { label: "Em envio", tone: "warning" },
  concluido: { label: "Concluído", tone: "success" },
  cancelado: { label: "Cancelado", tone: "danger" },
};

export default async function BroadcastsAlunosList() {
  await requireGestor();
  const supabase = await createSupabaseServerClient();

  const { data: broadcasts } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("target_type", "alunos")
    .order("agendado_para", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Broadcasts para alunos"
        subtitle="Mensagens em massa via WhatsApp para famílias dos alunos. Ideal para avisos de calendário, reuniões e lembretes."
        actions={
          <Link href="/admin/broadcasts/alunos/nova">
            <Button>+ Novo broadcast</Button>
          </Link>
        }
      />

      {!broadcasts || broadcasts.length === 0 ? (
        <EmptyState
          icon="📣"
          title="Nenhum broadcast ainda"
          hint="Crie o primeiro para mandar uma mensagem em massa às famílias."
          action={
            <Link href="/admin/broadcasts/alunos/nova">
              <Button>+ Novo broadcast</Button>
            </Link>
          }
        />
      ) : (
        <Card padding="none">
          <ul className="divide-y divide-line-soft">
            {broadcasts.map((b) => {
              const meta = STATUS_META[b.status] ?? {
                label: b.status,
                tone: "muted" as const,
              };
              const total = b.total_recipients;
              const done = b.enviados + b.falhou + b.skipped;
              return (
                <li key={b.id}>
                  <Link
                    href={`/admin/broadcasts/${b.id}`}
                    className="flex items-start gap-3 px-4 py-3 hover:bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-ink">
                          {b.nome}
                        </span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted">
                        {done}/{total} processados
                        {b.enviados > 0 ? ` · ${b.enviados} enviadas` : ""}
                        {b.falhou > 0 ? ` · ${b.falhou} falharam` : ""}
                        {b.skipped > 0 ? ` · ${b.skipped} puladas` : ""}
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-[11px] text-subtle">
                        {b.mensagem}
                      </div>
                    </div>
                    <div className="shrink-0 text-right text-[11px] text-muted">
                      <div>
                        {new Date(b.agendado_para).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </div>
                      <div className="mt-0.5">{b.intervalo_seg}s de intervalo</div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}

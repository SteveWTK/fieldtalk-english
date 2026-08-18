import Link from "next/link";
import { notFound } from "next/navigation";

import { Badge, Button, Card, CardHeader } from "@/components/ui";
import { PageHeader } from "@/components/admin/page-header";
import { requireGestor } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fmtDate } from "@/lib/utils/format";

import { CancelBroadcastButton } from "./cancel-button";

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

const RECIPIENT_STATUS_META: Record<
  string,
  { label: string; tone: "muted" | "success" | "danger" | "warning" }
> = {
  agendado: { label: "Aguardando", tone: "muted" },
  enviada: { label: "Enviada", tone: "success" },
  falhou: { label: "Falhou", tone: "danger" },
  skipped: { label: "Pulada", tone: "warning" },
};

export default async function BroadcastDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireGestor();
  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: broadcast } = await supabase
    .from("broadcasts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!broadcast) notFound();

  const { data: recipients } = await supabase
    .from("broadcast_recipients")
    .select(
      "id, lead_id, aluno_id, telefone, agendado_para, status, error, skip_reason, sent_at"
    )
    .eq("broadcast_id", id)
    .order("agendado_para", { ascending: true })
    .limit(500);

  const rows = recipients ?? [];
  const leadIds = rows.map((r) => r.lead_id).filter((x): x is string => !!x);
  const alunoIds = rows.map((r) => r.aluno_id).filter((x): x is string => !!x);
  const [{ data: leads }, { data: alunos }] = await Promise.all([
    leadIds.length
      ? supabase.from("leads").select("id, nome").in("id", leadIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
    alunoIds.length
      ? supabase.from("alunos").select("id, nome").in("id", alunoIds)
      : Promise.resolve({ data: [] as { id: string; nome: string }[] }),
  ]);
  const leadNomeById = new Map((leads ?? []).map((l) => [l.id, l.nome]));
  const alunoNomeById = new Map((alunos ?? []).map((a) => [a.id, a.nome]));

  const meta = STATUS_META[broadcast.status] ?? {
    label: broadcast.status,
    tone: "muted" as const,
  };
  const done = broadcast.enviados + broadcast.falhou + broadcast.skipped;
  const pct =
    broadcast.total_recipients > 0
      ? Math.round((done / broadcast.total_recipients) * 100)
      : 0;
  const canCancel =
    broadcast.status === "agendado" || broadcast.status === "em_envio";
  const backHref =
    broadcast.target_type === "leads"
      ? "/admin/broadcasts/leads"
      : "/admin/broadcasts/alunos";

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title={broadcast.nome}
        subtitle={
          <span className="inline-flex items-center gap-2">
            <Badge tone={meta.tone}>{meta.label}</Badge>
            <span className="text-[11px] text-muted">
              Broadcast para {broadcast.target_type === "leads" ? "leads" : "alunos"} · agendado{" "}
              {fmtDate(broadcast.agendado_para)}
            </span>
          </span>
        }
        actions={
          <>
            <Link href={backHref}>
              <Button variant="outline">← Voltar</Button>
            </Link>
            {canCancel ? <CancelBroadcastButton id={broadcast.id} /> : null}
          </>
        }
      />

      <Card>
        <CardHeader title="Progresso" />
        <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-line-soft">
          <div
            className={`h-full ${
              broadcast.status === "cancelado" ? "bg-muted" : "bg-emerald-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="grid gap-3 text-sm sm:grid-cols-4">
          <Metric label="Total" value={broadcast.total_recipients} tone="text-ink" />
          <Metric label="Enviadas" value={broadcast.enviados} tone="text-emerald-600" />
          <Metric
            label="Falharam"
            value={broadcast.falhou}
            tone={broadcast.falhou > 0 ? "text-danger" : "text-muted"}
          />
          <Metric
            label="Puladas"
            value={broadcast.skipped}
            tone={broadcast.skipped > 0 ? "text-warning" : "text-muted"}
          />
        </div>
      </Card>

      <Card>
        <CardHeader title="Mensagem" />
        <div className="whitespace-pre-wrap rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-ink">
          {broadcast.mensagem}
        </div>
        <div className="mt-2 text-[11px] text-muted">
          Intervalo entre envios: {broadcast.intervalo_seg}s · Janela {broadcast.janela_inicio_h}h–{broadcast.janela_fim_h}h · {broadcast.respeitar_fim_de_semana ? "Sábados permitidos" : "Só dias úteis"}
        </div>
      </Card>

      <Card padding="none" className="overflow-hidden">
        <div className="border-b border-line-soft px-4 py-3">
          <CardHeader
            title={`Destinatários (${rows.length})`}
            subtitle="Ordenado pelo horário agendado. Falhas e pulos aparecem primeiro com o motivo."
          />
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted">
            Nenhum destinatário.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-140 text-sm">
              <thead className="border-b border-line-soft text-left text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2 font-bold">Destinatário</th>
                  <th className="px-4 py-2 font-bold">Telefone</th>
                  <th className="px-4 py-2 font-bold">Agendado</th>
                  <th className="px-4 py-2 font-bold">Status</th>
                  <th className="px-4 py-2 font-bold">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line-soft">
                {rows.map((r) => {
                  const nome = r.lead_id
                    ? leadNomeById.get(r.lead_id) ?? "(lead removido)"
                    : r.aluno_id
                      ? alunoNomeById.get(r.aluno_id) ?? "(aluno removido)"
                      : "?";
                  const rMeta =
                    RECIPIENT_STATUS_META[r.status] ?? {
                      label: r.status,
                      tone: "muted" as const,
                    };
                  return (
                    <tr key={r.id}>
                      <td className="px-4 py-2 text-ink">{nome}</td>
                      <td className="px-4 py-2 font-mono text-[11px] text-subtle">
                        {r.telefone}
                      </td>
                      <td className="px-4 py-2 text-[11px] text-muted">
                        {new Date(r.agendado_para).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-2">
                        <Badge tone={rMeta.tone}>{rMeta.label}</Badge>
                      </td>
                      <td className="px-4 py-2 text-xs text-subtle">
                        {r.status === "falhou" && r.error ? (
                          <span className="text-danger" title={r.error}>
                            {r.error}
                          </span>
                        ) : r.status === "skipped" ? (
                          <span className="text-warning">
                            {r.skip_reason ?? "pulada"}
                          </span>
                        ) : r.sent_at ? (
                          new Date(r.sent_at).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
        {label}
      </div>
      <div className={`text-2xl font-extrabold ${tone}`}>{value}</div>
    </div>
  );
}

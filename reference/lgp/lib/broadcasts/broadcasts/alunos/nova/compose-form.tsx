"use client";

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState, useTransition } from "react";

import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { FormError } from "@/components/admin/form-error";
import { EMPTY_FORM_STATE } from "@/lib/forms";
import { previewFinishTime } from "@/lib/broadcasts/scheduler";

import { createAlunosBroadcast, testSendBroadcast } from "../../actions";

const DEFAULT_INTERVALO_SEG = 8;

type Props = {
  filter: {
    q: string;
    status: "todos" | "ativo" | "pre" | "trancado" | "cancelado";
    curso_nome: string;
    turma_ids: string[];
    incluir_bolsistas: boolean;
  };
  turmas: { id: string; nome: string; horario: string }[];
  cursoNomes: string[];
  previewCount: number;
  previewFirst: string | null;
  previewLast: string | null;
};

export function AlunosComposeForm({
  filter,
  turmas,
  cursoNomes,
  previewCount,
  previewFirst,
  previewLast,
}: Props) {
  const router = useRouter();

  const [enviarAgora, setEnviarAgora] = useState(true);
  const [agendadoPara, setAgendadoPara] = useState("");
  const [intervaloSeg, setIntervaloSeg] = useState(DEFAULT_INTERVALO_SEG);
  const [weekendsAllowed, setWeekendsAllowed] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [state, action, pending] = useActionState(
    createAlunosBroadcast,
    EMPTY_FORM_STATE
  );
  const fe = state.fieldErrors ?? {};

  function submitFilter(patch: Partial<Props["filter"]>) {
    const merged = { ...filter, ...patch };
    const params = new URLSearchParams();
    if (merged.q) params.set("filter_q", merged.q);
    if (merged.status !== "todos") params.set("filter_status", merged.status);
    if (merged.curso_nome !== "todos") params.set("filter_curso_nome", merged.curso_nome);
    for (const t of merged.turma_ids) params.append("filter_turma_ids", t);
    if (!merged.incluir_bolsistas) params.set("incluir_bolsistas", "");
    // ^ opt-out (default is include). Only set explicitly when unchecked.
    const qs = params.toString();
    router.push(qs ? `?${qs}` : "?");
  }

  const startAt = useMemo(() => {
    if (enviarAgora) return new Date();
    if (!agendadoPara) return null;
    const d = new Date(agendadoPara);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [enviarAgora, agendadoPara]);

  const timing = useMemo(() => {
    if (!startAt || previewCount === 0) return null;
    return previewFinishTime({
      recipientCount: previewCount,
      startAt,
      intervalSeconds: intervaloSeg,
      janelaInicioH: 8,
      janelaFimH: 19,
      weekendsAllowed,
    });
  }, [startAt, previewCount, intervaloSeg, weekendsAllowed]);

  const canSubmit = previewCount > 0 && mensagem.trim().length > 0;

  return (
    <>
      <Card>
        <CardHeader
          title="1. Filtrar público"
          subtitle="Aplique os filtros para escolher quais famílias receberão."
        />
        <form
          method="GET"
          className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        >
          <Field label="Buscar (nome do aluno ou responsável)">
            <Input name="filter_q" defaultValue={filter.q} placeholder="Ex: Maria..." />
          </Field>
          <Field label="Status do aluno">
            <Select
              name="filter_status"
              defaultValue={filter.status}
              onChange={(e) => submitFilter({ status: e.target.value as Props["filter"]["status"] })}
            >
              <option value="todos">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="pre">Pré-cadastro</option>
              <option value="trancado">Trancado</option>
              <option value="cancelado">Cancelado</option>
            </Select>
          </Field>
          <Field label="Nível (curso)">
            <Select
              name="filter_curso_nome"
              defaultValue={filter.curso_nome}
              onChange={(e) => submitFilter({ curso_nome: e.target.value })}
            >
              <option value="todos">Todos os níveis</option>
              {cursoNomes.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit">Aplicar</Button>

          <Field label="Turmas (selecione uma ou mais)" className="sm:col-span-3">
            <select
              name="filter_turma_ids"
              multiple
              defaultValue={filter.turma_ids}
              onChange={(e) =>
                submitFilter({
                  turma_ids: Array.from(e.target.selectedOptions).map(
                    (o) => o.value
                  ),
                })
              }
              className="min-h-24 w-full rounded-lg border border-line bg-white px-2 py-1 text-xs"
            >
              {turmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} — {t.horario}
                </option>
              ))}
            </select>
          </Field>
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
          <label className="inline-flex items-center gap-2 text-xs text-subtle">
            <input
              type="checkbox"
              defaultChecked={filter.incluir_bolsistas}
              onChange={(e) =>
                submitFilter({ incluir_bolsistas: e.target.checked })
              }
              className="h-4 w-4 rounded border-line accent-nav"
            />
            Incluir bolsistas (vouchers Bolsa Família / Permuta)
          </label>
          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
              Destinatários
            </div>
            <div className="text-2xl font-extrabold text-ink">{previewCount}</div>
            {previewCount > 0 ? (
              <div className="text-[11px] text-muted">
                de <strong>{previewFirst}</strong>
                {previewLast !== previewFirst ? (
                  <>
                    {" "}até <strong>{previewLast}</strong>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </Card>

      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="filter_q" value={filter.q} />
        <input type="hidden" name="filter_status" value={filter.status} />
        <input type="hidden" name="filter_curso_nome" value={filter.curso_nome} />
        {filter.turma_ids.map((t) => (
          <input key={t} type="hidden" name="filter_turma_ids" value={t} />
        ))}
        {filter.incluir_bolsistas ? (
          <input type="hidden" name="incluir_bolsistas" value="on" />
        ) : null}

        <Card>
          <CardHeader
            title="2. Compor mensagem"
            subtitle="A mensagem vai como está para cada família. Use quebras de linha para clareza."
          />
          <Field label="Nome interno do broadcast" error={fe.nome}>
            <Input
              name="nome"
              placeholder="Ex: Aviso reunião de pais 2026/2"
              invalid={!!fe.nome}
              required
            />
          </Field>
          <Field
            label="Mensagem"
            error={fe.mensagem}
            hint={`${mensagem.length} caracteres`}
          >
            <Textarea
              name="mensagem"
              rows={6}
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              placeholder="Olá! Um recado rápido..."
              invalid={!!fe.mensagem}
              required
            />
          </Field>

          <TestSendBox mensagem={mensagem} />
        </Card>

        <Card>
          <CardHeader
            title="3. Agendar envio"
            subtitle="Escolha quando começar. O sistema envia em ritmo escalonado dentro do horário comercial."
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  name="enviar_agora"
                  checked={enviarAgora}
                  onChange={(e) => setEnviarAgora(e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-nav"
                />
                Enviar agora
              </label>
              <Field label="Ou agendar para" error={fe.agendado_para}>
                <Input
                  name="agendado_para"
                  type="datetime-local"
                  value={agendadoPara}
                  onChange={(e) => setAgendadoPara(e.target.value)}
                  disabled={enviarAgora}
                  invalid={!!fe.agendado_para}
                />
              </Field>
            </div>

            <div className="flex flex-col gap-2">
              <Field
                label="Intervalo entre envios (segundos)"
                error={fe.intervalo_seg}
                hint="Padrão: 8s (~7 msgs/min)."
              >
                <Input
                  name="intervalo_seg"
                  type="number"
                  min={3}
                  max={60}
                  value={intervaloSeg}
                  onChange={(e) => setIntervaloSeg(Number(e.target.value) || DEFAULT_INTERVALO_SEG)}
                  invalid={!!fe.intervalo_seg}
                />
              </Field>
              <label className="inline-flex items-center gap-2 text-xs text-subtle">
                <input
                  type="checkbox"
                  name="respeitar_fim_de_semana"
                  checked={weekendsAllowed}
                  onChange={(e) => setWeekendsAllowed(e.target.checked)}
                  className="h-4 w-4 rounded border-line accent-nav"
                />
                Permitir envios aos sábados (domingo nunca)
              </label>
              <div className="text-[11px] text-muted">
                Horário comercial fixo: 08:00 – 19:00 (BRT).
              </div>
            </div>
          </div>

          {timing && timing.firstAt && timing.lastAt ? (
            <div className="mt-4 rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-sm">
              <div className="font-extrabold text-ink">📅 Previsão</div>
              <div className="text-xs text-subtle">
                Primeiro envio: {timing.firstAt.toLocaleString("pt-BR")}
              </div>
              <div className="text-xs text-subtle">
                Último envio: {timing.lastAt.toLocaleString("pt-BR")}
                {timing.spansMultipleDays ? (
                  <span className="ml-1 text-warning">
                    (o envio se estende para o próximo dia útil)
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
        </Card>

        <FormError message={state.error} />

        <div className="flex justify-end gap-2">
          <Button type="submit" loading={pending} disabled={!canSubmit || pending}>
            🚀 {enviarAgora ? "Enviar agora" : "Agendar"} para {previewCount} família(s)
          </Button>
        </div>
      </form>
    </>
  );
}

function TestSendBox({ mensagem }: { mensagem: string }) {
  // Deliberately NOT a nested <form> — see the leads compose form for
  // the diagnosis (HTML forbids form-in-form, inner submit is silently
  // swallowed). useTransition + a plain button does the same job.
  const [telefone, setTelefone] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    | { kind: "ok"; sentTo: string }
    | { kind: "err"; msg: string }
    | { kind: "field"; fieldError: string }
    | null
  >(null);

  function trigger() {
    setResult(null);
    const fd = new FormData();
    fd.set("test_mensagem", mensagem);
    fd.set("test_telefone", telefone);
    startTransition(async () => {
      const res = await testSendBroadcast(
        { error: undefined, fieldErrors: undefined },
        fd
      );
      if (res.ok && res.sentTo) {
        setResult({ kind: "ok", sentTo: res.sentTo });
      } else if (res.fieldErrors?.test_telefone) {
        setResult({ kind: "field", fieldError: res.fieldErrors.test_telefone });
      } else if (res.error) {
        setResult({ kind: "err", msg: res.error });
      }
    });
  }

  return (
    <div className="mt-3 border-t border-line-soft pt-3">
      <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted">
        Teste de envio
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end">
        <Field
          label="WhatsApp para receber o teste"
          error={result?.kind === "field" ? result.fieldError : undefined}
        >
          <Input
            type="tel"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(86) 99999-0000 — seu próprio número para eyeball"
            invalid={result?.kind === "field"}
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          loading={pending}
          disabled={pending || mensagem.trim().length === 0 || !telefone}
          onClick={trigger}
        >
          Enviar teste
        </Button>
        {result?.kind === "ok" ? (
          <div className="text-xs text-emerald sm:col-span-2">
            ✓ Teste enviado para {result.sentTo}
          </div>
        ) : null}
        {result?.kind === "err" ? (
          <div className="text-xs text-danger sm:col-span-2">{result.msg}</div>
        ) : null}
      </div>
    </div>
  );
}

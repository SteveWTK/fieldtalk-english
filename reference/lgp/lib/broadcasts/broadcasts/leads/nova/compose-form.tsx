"use client";

import { useRouter } from "next/navigation";
import { useActionState, useMemo, useState, useTransition } from "react";

import { Button, Card, CardHeader, Field, Input, Select, Textarea } from "@/components/ui";
import { FormError } from "@/components/admin/form-error";
import { EMPTY_FORM_STATE } from "@/lib/forms";
import { previewFinishTime } from "@/lib/broadcasts/scheduler";

import { createLeadsBroadcast, testSendBroadcast } from "../../actions";

const DEFAULT_INTERVALO_SEG = 8;

type Props = {
  filter: {
    q: string;
    status: string;
    qualif: string;
    incluir_sem_verificacao: boolean;
  };
  statusOptions: { v: string; label: string }[];
  previewCount: number;
  previewFirst: string | null;
  previewLast: string | null;
};

export function LeadsComposeForm({
  filter,
  statusOptions,
  previewCount,
  previewFirst,
  previewLast,
}: Props) {
  const router = useRouter();

  // Local state for the schedule pieces so the "when will it finish?"
  // preview updates live as the user types.
  const [enviarAgora, setEnviarAgora] = useState(true);
  const [agendadoPara, setAgendadoPara] = useState("");
  const [intervaloSeg, setIntervaloSeg] = useState(DEFAULT_INTERVALO_SEG);
  const [weekendsAllowed, setWeekendsAllowed] = useState(false);
  const [mensagem, setMensagem] = useState("");

  const [state, action, pending] = useActionState(
    createLeadsBroadcast,
    EMPTY_FORM_STATE
  );
  const fe = state.fieldErrors ?? {};

  // Debounced router.push for filter changes so the recipient count
  // updates as the user tweaks the filter. Each filter field submits
  // a plain GET form so we can rely on server-side re-picking.
  function submitFilter(next: {
    filter_q?: string;
    filter_status?: string;
    filter_qualif?: string;
    incluir_sem_verificacao?: boolean;
  }) {
    const params = new URLSearchParams();
    if (next.filter_q ?? filter.q) params.set("filter_q", next.filter_q ?? filter.q);
    if ((next.filter_status ?? filter.status) !== "todos")
      params.set("filter_status", next.filter_status ?? filter.status);
    if ((next.filter_qualif ?? filter.qualif) !== "todos")
      params.set("filter_qualif", next.filter_qualif ?? filter.qualif);
    if (next.incluir_sem_verificacao ?? filter.incluir_sem_verificacao)
      params.set("incluir_sem_verificacao", "on");
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
      {/* Filter card — a plain GET form; each control re-submits so the
          server re-picks recipients and updates the count. */}
      <Card>
        <CardHeader
          title="1. Filtrar público"
          subtitle="Aplique os filtros para escolher quais leads receberão. A contagem à direita atualiza automaticamente."
        />
        <form
          method="GET"
          className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_auto] sm:items-end"
        >
          <Field label="Buscar (nome, telefone, e-mail)">
            <Input
              name="filter_q"
              defaultValue={filter.q}
              placeholder="Ex: Maria, 98765..."
            />
          </Field>
          <Field label="Status do funil">
            <Select
              name="filter_status"
              defaultValue={filter.status}
              onChange={(e) => submitFilter({ filter_status: e.target.value })}
            >
              {statusOptions.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Qualificação">
            <Select
              name="filter_qualif"
              defaultValue={filter.qualif}
              onChange={(e) => submitFilter({ filter_qualif: e.target.value })}
            >
              <option value="todos">Todas qualificações</option>
              <option value="quente">🔥 Quente</option>
              <option value="morno">☀ Morno</option>
              <option value="frio">❄ Frio</option>
              <option value="sem">Sem qualificação</option>
            </Select>
          </Field>
          <Button type="submit">Aplicar</Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line-soft pt-3">
          <label className="inline-flex items-center gap-2 text-xs text-subtle">
            <input
              type="checkbox"
              defaultChecked={filter.incluir_sem_verificacao}
              onChange={(e) =>
                submitFilter({ incluir_sem_verificacao: e.target.checked })
              }
              className="h-4 w-4 rounded border-line accent-nav"
            />
            Incluir leads que ainda não confirmaram o menu de verificação
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

      {/* Message + schedule + submit. This is the action-driven form. */}
      <form action={action} className="flex flex-col gap-4">
        {/* Hidden mirrors of filter so the submitted broadcast records
            the exact filter that produced the count above. */}
        <input type="hidden" name="filter_q" value={filter.q} />
        <input type="hidden" name="filter_status" value={filter.status} />
        <input type="hidden" name="filter_qualif" value={filter.qualif} />
        {filter.incluir_sem_verificacao ? (
          <input type="hidden" name="incluir_sem_verificacao" value="on" />
        ) : null}

        <Card>
          <CardHeader
            title="2. Compor mensagem"
            subtitle="Vai como está para cada destinatário. Use quebras de linha para clareza."
          />
          <Field label="Nome interno do broadcast" error={fe.nome}>
            <Input
              name="nome"
              placeholder="Ex: Aviso início 2026/2 — leads quentes"
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
                hint="Padrão: 8s (~7 msgs/min). Mais lento = mais seguro para o WhatsApp."
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
              <div className="font-extrabold text-ink">
                📅 Previsão
              </div>
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
            🚀 {enviarAgora ? "Enviar agora" : "Agendar"} para {previewCount} lead(s)
          </Button>
        </div>
      </form>
    </>
  );
}

function TestSendBox({ mensagem }: { mensagem: string }) {
  // Deliberately NOT a nested <form> — the outer compose form already
  // wraps this box, and HTML doesn't allow form-in-form (the inner
  // submit gets silently swallowed). useTransition + a plain button
  // does the same job.
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

// src/app/(site)/admin/leads/targets/page.js
//
// Targets CRUD — list + inline editor. Team goals and per-owner
// goals live in the same list. Achieved targets get a distinct lime
// border + trophy.
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  Pencil,
  Trophy,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";
import { TARGET_KINDS } from "@/lib/leads/targets";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const KIND_LABELS = {
  wins_in_range: { pt: "Ganhos no período", en: "Wins in range" },
  leads_created_in_range: {
    pt: "Leads criados no período",
    en: "Leads created in range",
  },
  conversion_rate_at: {
    pt: "Taxa de conversão até a data",
    en: "Conversion rate by date",
  },
  pipeline_value_at: {
    pt: "Valor de pipeline até a data",
    en: "Pipeline value by date",
  },
  closed_value_in_range: {
    pt: "Valor fechado no período",
    en: "Closed value in range",
  },
};

const KIND_HINTS = {
  wins_in_range: {
    pt: "Meta: N leads ganhos entre a data de início e a data alvo.",
    en: "Goal: N leads won between range start and target date.",
  },
  leads_created_in_range: {
    pt: "Meta: N leads criados no período.",
    en: "Goal: N leads created in range.",
  },
  conversion_rate_at: {
    pt: "Meta: taxa de conversão ≥ X% até a data alvo (informe 0.15 para 15%).",
    en: "Goal: conversion rate ≥ X% by target date (enter 0.15 for 15%).",
  },
  pipeline_value_at: {
    pt: "Meta: valor de pipeline ativo ≥ R$ X até a data alvo (em centavos: 1500000 = R$15k). Indicador líder — mostra o que está no funil.",
    en: "Goal: active pipeline value ≥ R$ X by target date (in cents: 1500000 = R$15k). Leading indicator — what's in the funnel.",
  },
  closed_value_in_range: {
    pt: "Meta: valor fechado (leads ganhos) ≥ R$ X entre início e data alvo (em centavos). Indicador de resultado — dinheiro efetivamente conquistado.",
    en: "Goal: closed value (won leads) ≥ R$ X between start and target (in cents). Lagging indicator — money actually booked.",
  },
};

const EMPTY = () => ({
  kind: "wins_in_range",
  title: "",
  description: "",
  target_value: "",
  target_date: "",
  range_start: "",
  owner_id: "",
  active: true,
});

export default function TargetsAdminPage() {
  const { lang } = useLanguage();
  const isPt = lang === "pt";
  const [targets, setTargets] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [tRes, oRes] = await Promise.all([
        fetch("/api/admin/targets"),
        fetch("/api/admin/leads/owners"),
      ]);
      const tJson = await tRes.json();
      const oJson = await oRes.json();
      if (tRes.ok) setTargets(tJson.targets || []);
      if (oRes.ok) setOwners(oJson.owners || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const active = useMemo(() => targets.filter((t) => t.active), [targets]);
  const archived = useMemo(() => targets.filter((t) => !t.active), [targets]);

  function handleSaved() {
    load();
    setEditingId(null);
    setCreating(false);
  }
  function handleDeleted() {
    load();
    setEditingId(null);
  }

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LeadsAdminHeader
          currentView="detail"
          showNewLeadCta={false}
          showViewSwitcher={false}
          backHref="/admin/leads/dashboard"
        />

        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">
              {isPt ? "Metas" : "Targets"}
            </h2>
            <p className="text-xs text-primary-400 mt-1">
              {isPt
                ? "Objetivos de time e individuais. Aparecem no painel para acompanhamento contínuo."
                : "Team and individual goals. Show in the dashboard for continuous tracking."}
            </p>
          </div>
          {!creating && (
            <Button
              variant="primary"
              size="sm"
              Icon={Plus}
              onClick={() => {
                setCreating(true);
                setEditingId(null);
              }}
            >
              {isPt ? "Nova meta" : "New target"}
            </Button>
          )}
        </div>

        {creating && (
          <div className="mb-4 rounded-card border border-accent-400/30 bg-accent-400/[0.03] p-4">
            <TargetForm
              initial={EMPTY()}
              mode="create"
              owners={owners}
              lang={lang}
              onSaved={handleSaved}
              onCancel={() => setCreating(false)}
            />
          </div>
        )}

        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-primary-300" />
        ) : (
          <>
            <div className="space-y-2">
              {active.map((t) => (
                <TargetRow
                  key={t.id}
                  target={t}
                  owners={owners}
                  lang={lang}
                  isEditing={editingId === t.id}
                  onEdit={() =>
                    setEditingId(editingId === t.id ? null : t.id)
                  }
                  onSaved={handleSaved}
                  onDeleted={handleDeleted}
                />
              ))}
              {active.length === 0 && !creating && (
                <p className="text-sm text-primary-500">
                  {isPt
                    ? "Nenhuma meta ativa. Crie uma acima para começar."
                    : "No active targets. Create one above to get started."}
                </p>
              )}
            </div>

            {archived.length > 0 && (
              <details className="mt-6">
                <summary className="cursor-pointer text-xs uppercase tracking-wider text-primary-500 font-semibold">
                  {isPt ? "Arquivadas" : "Archived"} ({archived.length})
                </summary>
                <div className="mt-2 space-y-2">
                  {archived.map((t) => (
                    <TargetRow
                      key={t.id}
                      target={t}
                      owners={owners}
                      lang={lang}
                      isEditing={editingId === t.id}
                      onEdit={() =>
                        setEditingId(editingId === t.id ? null : t.id)
                      }
                      onSaved={handleSaved}
                      onDeleted={handleDeleted}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TargetRow({ target, owners, lang, isEditing, onEdit, onSaved, onDeleted }) {
  const isPt = lang === "pt";
  const kindLabel = KIND_LABELS[target.kind]?.[lang] || target.kind;
  const ownerName = target.owner?.full_name;

  return (
    <div className="rounded-card border border-primary-700 bg-primary-800 overflow-hidden">
      <button
        type="button"
        onClick={onEdit}
        className="w-full text-left flex items-center gap-3 p-3 hover:bg-primary-panel"
      >
        <div className="shrink-0 w-8 h-8 rounded-lg bg-accent-400/15 text-accent-300 flex items-center justify-center">
          <Trophy className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{target.title}</h3>
          <p className="text-[11px] text-primary-400">
            {kindLabel} · {target.target_value} · {target.target_date}
            {ownerName && (
              <span className="text-signal-english"> · {ownerName}</span>
            )}
            {!ownerName && (
              <span className="text-primary-500">
                {" "}
                · {isPt ? "Time" : "Team"}
              </span>
            )}
          </p>
        </div>
        <Pencil className="w-4 h-4 text-primary-500" />
      </button>
      {isEditing && (
        <div className="border-t border-primary-700 p-4 bg-primary-900">
          <TargetForm
            initial={{
              kind: target.kind,
              title: target.title,
              description: target.description || "",
              target_value: target.target_value,
              target_date: target.target_date,
              range_start: target.range_start || "",
              owner_id: target.owner_id || "",
              active: target.active,
            }}
            mode="edit"
            targetId={target.id}
            owners={owners}
            lang={lang}
            onSaved={onSaved}
            onDeleted={onDeleted}
            onCancel={onEdit}
          />
        </div>
      )}
    </div>
  );
}

function TargetForm({
  initial,
  mode,
  targetId,
  owners,
  lang,
  onSaved,
  onDeleted,
  onCancel,
}) {
  const isPt = lang === "pt";
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        kind: form.kind,
        title: form.title,
        description: form.description || null,
        target_value: Number(form.target_value),
        target_date: form.target_date,
        range_start: form.range_start || null,
        owner_id: form.owner_id || null,
        active: form.active,
      };
      const res = await fetch(
        mode === "create"
          ? "/api/admin/targets"
          : `/api/admin/targets/${targetId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setMsg({
          tone: "err",
          text:
            (Array.isArray(json.details) && json.details.join(" · ")) ||
            json.message || json.error,
        });
      } else {
        onSaved(json.target);
      }
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (
      !confirm(
        isPt
          ? "Excluir esta meta? Progresso histórico será perdido."
          : "Delete this target? Historical progress will be lost.",
      )
    )
      return;
    const res = await fetch(`/api/admin/targets/${targetId}`, {
      method: "DELETE",
    });
    if (res.ok) onDeleted();
  }

  const kindOptions = TARGET_KINDS.map((k) => ({
    value: k,
    label: KIND_LABELS[k]?.[lang] || k,
  }));

  const ownerOptions = [
    { value: "", label: isPt ? "Meta do time" : "Team target" },
    ...owners.map((o) => ({ value: o.id, label: o.full_name })),
  ];

  return (
    <div className="space-y-3">
      <Select
        label={isPt ? "Tipo de meta" : "Target kind"}
        value={form.kind}
        onChange={(e) => set("kind", e.target.value)}
        options={kindOptions}
        hint={KIND_HINTS[form.kind]?.[lang]}
      />

      <Input
        label={isPt ? "Título" : "Title"}
        type="text"
        value={form.title}
        onChange={(e) => set("title", e.target.value)}
        placeholder={
          isPt
            ? "Ex: 10 ganhos até 31 de outubro"
            : "e.g. 10 wins by Oct 31"
        }
      />

      <div className="grid grid-cols-2 gap-2">
        <Input
          label={isPt ? "Valor alvo" : "Target value"}
          type="number"
          step="0.01"
          value={form.target_value}
          onChange={(e) => set("target_value", e.target.value)}
        />
        <Input
          label={isPt ? "Data alvo" : "Target date"}
          type="date"
          value={form.target_date}
          onChange={(e) => set("target_date", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Input
          label={isPt ? "Início do período (opcional)" : "Range start (optional)"}
          type="date"
          value={form.range_start}
          onChange={(e) => set("range_start", e.target.value)}
          hint={
            isPt
              ? "Se vazio, usa a data de criação da meta."
              : "If empty, uses the target's creation date."
          }
        />
        <Select
          label={isPt ? "Responsável (opcional)" : "Owner (optional)"}
          value={form.owner_id}
          onChange={(e) => set("owner_id", e.target.value)}
          options={ownerOptions}
        />
      </div>

      <Input
        label={isPt ? "Descrição (opcional)" : "Description (optional)"}
        type="text"
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
      />

      <label className="inline-flex items-center gap-2 text-sm text-primary-300 cursor-pointer">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set("active", e.target.checked)}
          className="accent-accent-400"
        />
        {isPt ? "Ativa (visível no painel)" : "Active (shown on dashboard)"}
      </label>

      <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-primary-700">
        <Button
          variant="primary"
          size="md"
          Icon={Save}
          loading={saving}
          onClick={save}
        >
          {isPt ? "Salvar" : "Save"}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary-800 hover:bg-primary-700 text-primary-300 border border-primary-700 text-sm disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          {isPt ? "Cancelar" : "Cancel"}
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={del}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary-800 hover:bg-signal-alert/15 text-primary-400 hover:text-signal-alert border border-primary-700 hover:border-signal-alert/40 text-sm ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            {isPt ? "Excluir" : "Delete"}
          </button>
        )}
        {msg && (
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              msg.tone === "err" ? "text-signal-alert" : "text-accent-300"
            }`}
          >
            {msg.tone === "err" ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}

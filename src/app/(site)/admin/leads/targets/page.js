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
    pt: "Meta: valor de pipeline ≥ R$ X até a data alvo (em centavos: 1500000 = R$15k).",
    en: "Goal: pipeline value ≥ R$ X by target date (in cents: 1500000 = R$15k).",
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
    <div className="min-h-screen bg-[#070707] text-white">
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
            <p className="text-xs text-white/50 mt-1">
              {isPt
                ? "Objetivos de time e individuais. Aparecem no painel para acompanhamento contínuo."
                : "Team and individual goals. Show in the dashboard for continuous tracking."}
            </p>
          </div>
          {!creating && (
            <button
              type="button"
              onClick={() => {
                setCreating(true);
                setEditingId(null);
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {isPt ? "Nova meta" : "New target"}
            </button>
          )}
        </div>

        {creating && (
          <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.03] p-4">
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
          <Loader2 className="w-4 h-4 animate-spin text-white/60" />
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
                <p className="text-sm text-white/40">
                  {isPt
                    ? "Nenhuma meta ativa. Crie uma acima para começar."
                    : "No active targets. Create one above to get started."}
                </p>
              )}
            </div>

            {archived.length > 0 && (
              <details className="mt-6">
                <summary className="cursor-pointer text-xs uppercase tracking-wider text-white/40 font-semibold">
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
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={onEdit}
        className="w-full text-left flex items-center gap-3 p-3 hover:bg-white/[0.02]"
      >
        <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-300 flex items-center justify-center">
          <Trophy className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{target.title}</h3>
          <p className="text-[11px] text-white/50">
            {kindLabel} · {target.target_value} · {target.target_date}
            {ownerName && (
              <span className="text-cyan-300"> · {ownerName}</span>
            )}
            {!ownerName && (
              <span className="text-white/40">
                {" "}
                · {isPt ? "Time" : "Team"}
              </span>
            )}
          </p>
        </div>
        <Pencil className="w-4 h-4 text-white/40" />
      </button>
      {isEditing && (
        <div className="border-t border-white/10 p-4 bg-black/25">
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

  return (
    <div className="space-y-3">
      <Field label={isPt ? "Tipo de meta" : "Target kind"}>
        <select
          value={form.kind}
          onChange={(e) => set("kind", e.target.value)}
          className={inputClass}
        >
          {TARGET_KINDS.map((k) => (
            <option key={k} value={k} className="bg-[#0e0e0e]">
              {KIND_LABELS[k]?.[lang] || k}
            </option>
          ))}
        </select>
        <p className="text-[11px] text-white/40 mt-1">
          {KIND_HINTS[form.kind]?.[lang]}
        </p>
      </Field>

      <Field label={isPt ? "Título" : "Title"}>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder={
            isPt
              ? "Ex: 10 ganhos até 31 de outubro"
              : "e.g. 10 wins by Oct 31"
          }
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label={isPt ? "Valor alvo" : "Target value"}>
          <input
            type="number"
            step="0.01"
            value={form.target_value}
            onChange={(e) => set("target_value", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={isPt ? "Data alvo" : "Target date"}>
          <input
            type="date"
            value={form.target_date}
            onChange={(e) => set("target_date", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field
          label={isPt ? "Início do período (opcional)" : "Range start (optional)"}
          hint={
            isPt
              ? "Se vazio, usa a data de criação da meta."
              : "If empty, uses the target's creation date."
          }
        >
          <input
            type="date"
            value={form.range_start}
            onChange={(e) => set("range_start", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={isPt ? "Responsável (opcional)" : "Owner (optional)"}>
          <select
            value={form.owner_id}
            onChange={(e) => set("owner_id", e.target.value)}
            className={inputClass}
          >
            <option value="">
              {isPt ? "Meta do time" : "Team target"}
            </option>
            {owners.map((o) => (
              <option key={o.id} value={o.id} className="bg-[#0e0e0e]">
                {o.full_name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label={isPt ? "Descrição (opcional)" : "Description (optional)"}>
        <input
          type="text"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          className={inputClass}
        />
      </Field>

      <label className="inline-flex items-center gap-2 text-sm text-white/70 cursor-pointer">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => set("active", e.target.checked)}
          className="accent-emerald-400"
        />
        {isPt ? "Ativa (visível no painel)" : "Active (shown on dashboard)"}
      </label>

      <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {isPt ? "Salvar" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/70 border border-white/10 text-sm disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          {isPt ? "Cancelar" : "Cancel"}
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={del}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.05] hover:bg-red-500/15 text-white/50 hover:text-red-300 border border-white/10 hover:border-red-500/40 text-sm ml-auto"
          >
            <Trash2 className="w-4 h-4" />
            {isPt ? "Excluir" : "Delete"}
          </button>
        )}
        {msg && (
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              msg.tone === "err" ? "text-red-300" : "text-emerald-300"
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

const inputClass =
  "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-emerald-400/50 focus:outline-none";

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-white/60 font-semibold mb-1">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-white/40 mt-1">{hint}</p>}
    </div>
  );
}

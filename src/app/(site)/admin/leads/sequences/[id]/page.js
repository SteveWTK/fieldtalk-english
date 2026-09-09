// src/app/(site)/admin/leads/sequences/[id]/page.js
//
// Sequence editor — edit sequence settings + steps + review current
// enrollments. Steps are ordered by position; drag to reorder is not
// wired in v1 but each step has a "move up/down" pair.

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Save,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  AlertCircle,
  CheckCircle2,
  Play,
  Pause,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";

export default function SequenceEditorPage() {
  const { lang } = useLanguage();
  const isPt = lang === "pt";
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [sequence, setSequence] = useState(null);
  const [steps, setSteps] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [seqRes, tplRes] = await Promise.all([
        fetch(`/api/admin/lead-sequences/${id}`),
        fetch(`/api/admin/lead-templates`),
      ]);
      const seqJson = await seqRes.json();
      const tplJson = await tplRes.json();
      if (seqRes.ok) {
        setSequence(seqJson.sequence);
        setSteps(seqJson.steps || []);
        setEnrollments(seqJson.enrollments || []);
      }
      if (tplRes.ok) setTemplates(tplJson.templates || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (id) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function saveSequence(patch) {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/lead-sequences/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (res.ok) {
        setSequence(json.sequence);
        setMsg({ tone: "ok", text: isPt ? "Salvo." : "Saved." });
        setTimeout(() => setMsg(null), 2500);
      } else {
        setMsg({
          tone: "err",
          text: (Array.isArray(json.details) && json.details.join(" · ")) || json.message || json.error,
        });
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteSequence() {
    if (
      !confirm(
        isPt
          ? "Excluir esta sequência? Enrollments ativos serão perdidos."
          : "Delete this sequence? Active enrollments will be lost.",
      )
    )
      return;
    const res = await fetch(`/api/admin/lead-sequences/${id}`, {
      method: "DELETE",
    });
    if (res.ok) router.push("/admin/leads/sequences");
  }

  async function addStep() {
    // Default: 3 days after previous step (or day 0 for first), 10am BRT.
    const dayOffset =
      steps.length === 0
        ? 0
        : Math.min(365, (steps[steps.length - 1]?.day_offset || 0) + 3);
    const res = await fetch(`/api/admin/lead-sequences/${id}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        day_offset: dayOffset,
        time_of_day_brt: 10,
        // Placeholder body — user overrides in the editor. Ensures
        // the "template_id OR body" content requirement is met.
        body: { pt: "", en: "" },
      }),
    });
    const json = await res.json();
    if (res.ok) setSteps((prev) => [...prev, json.step]);
  }

  async function updateStep(stepId, patch) {
    const res = await fetch(
      `/api/admin/lead-sequences/${id}/steps/${stepId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );
    const json = await res.json();
    if (res.ok) {
      setSteps((prev) => prev.map((s) => (s.id === stepId ? json.step : s)));
    }
  }

  async function deleteStep(stepId) {
    const res = await fetch(
      `/api/admin/lead-sequences/${id}/steps/${stepId}`,
      { method: "DELETE" },
    );
    if (res.ok) setSteps((prev) => prev.filter((s) => s.id !== stepId));
  }

  async function moveStep(stepId, dir) {
    // Simple position swap. Small N — one PATCH per row moved.
    const idx = steps.findIndex((s) => s.id === stepId);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= steps.length) return;
    const a = steps[idx];
    const b = steps[targetIdx];
    await Promise.all([
      fetch(`/api/admin/lead-sequences/${id}/steps/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: b.position }),
      }),
      fetch(`/api/admin/lead-sequences/${id}/steps/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: a.position }),
      }),
    ]);
    load();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
      </div>
    );
  }
  if (!sequence) {
    return (
      <div className="min-h-screen bg-[#070707] text-white p-6">
        <p className="text-red-300">Not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LeadsAdminHeader
          currentView="detail"
          showNewLeadCta={false}
          showViewSwitcher={false}
          backHref="/admin/leads/sequences"
        />

        <SequenceHeader
          sequence={sequence}
          onSave={saveSequence}
          onDelete={deleteSequence}
          saving={saving}
          msg={msg}
          lang={lang}
        />

        <div className="mt-6">
          <div className="flex items-baseline justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white/70">
              {isPt ? "Passos" : "Steps"}
            </h3>
            <button
              type="button"
              onClick={addStep}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              {isPt ? "Adicionar passo" : "Add step"}
            </button>
          </div>
          {steps.length === 0 ? (
            <p className="text-sm text-white/40">
              {isPt
                ? "Nenhum passo ainda. Adicione o primeiro acima."
                : "No steps yet. Add the first one above."}
            </p>
          ) : (
            <div className="space-y-2">
              {steps.map((step, i) => (
                <StepEditor
                  key={step.id}
                  step={step}
                  index={i}
                  isFirst={i === 0}
                  isLast={i === steps.length - 1}
                  templates={templates}
                  onUpdate={(patch) => updateStep(step.id, patch)}
                  onDelete={() => deleteStep(step.id)}
                  onMoveUp={() => moveStep(step.id, -1)}
                  onMoveDown={() => moveStep(step.id, 1)}
                  lang={lang}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <h3 className="text-sm font-black uppercase tracking-wider text-white/70 mb-3">
            {isPt ? "Enrollments recentes" : "Recent enrollments"} ({enrollments.length})
          </h3>
          {enrollments.length === 0 ? (
            <p className="text-sm text-white/40">
              {isPt
                ? "Nenhum lead inscrito ainda."
                : "No leads enrolled yet."}
            </p>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <ul className="divide-y divide-white/[0.06] max-h-80 overflow-y-auto">
                {enrollments.map((en) => (
                  <li key={en.id} className="p-3 flex items-center gap-3">
                    <StatusDot status={en.status} />
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/admin/leads/${en.lead?.id}`}
                        className="text-sm font-semibold hover:text-emerald-300 truncate block"
                      >
                        {en.lead?.full_name || "—"}
                      </Link>
                      <p className="text-[11px] text-white/50">
                        {isPt ? "Passo" : "Step"} {en.current_step} ·{" "}
                        {en.status}
                        {en.stop_reason ? ` (${en.stop_reason})` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function SequenceHeader({ sequence, onSave, onDelete, saving, msg, lang }) {
  const isPt = lang === "pt";
  const [name, setName] = useState(sequence.name);
  const [description, setDescription] = useState(sequence.description || "");
  const dirty =
    name !== sequence.name || description !== (sequence.description || "");

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex items-start gap-3 mb-3">
        <button
          type="button"
          onClick={() => onSave({ active: !sequence.active })}
          className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
            sequence.active
              ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
              : "bg-white/[0.06] text-white/40 hover:bg-white/[0.1]"
          } transition-colors`}
          title={
            sequence.active
              ? isPt ? "Pausar" : "Pause"
              : isPt ? "Ativar" : "Activate"
          }
        >
          {sequence.active ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0 space-y-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-b border-white/10 focus:border-emerald-400/50 text-xl font-black tracking-tight text-white focus:outline-none pb-1"
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={
              isPt
                ? "Descrição curta (interna)…"
                : "Short description (internal)…"
            }
            className="w-full bg-transparent border-b border-white/[0.06] focus:border-white/25 text-sm text-white/70 focus:outline-none pb-1"
          />
        </div>
        {dirty && (
          <button
            type="button"
            onClick={() => onSave({ name, description })}
            disabled={saving}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {isPt ? "Salvar" : "Save"}
          </button>
        )}
      </div>

      {/* Stop conditions */}
      <div className="flex flex-wrap gap-3 text-xs">
        <StopToggle
          checked={sequence.stop_on_reply}
          onChange={(v) => onSave({ stop_on_reply: v })}
          label={isPt ? "Parar ao receber resposta" : "Stop on reply"}
        />
        <StopToggle
          checked={sequence.stop_on_stage_change}
          onChange={(v) => onSave({ stop_on_stage_change: v })}
          label={isPt ? "Parar ao mudar estágio" : "Stop on stage change"}
        />
        <StopToggle
          checked={sequence.stop_on_dnc}
          onChange={(v) => onSave({ stop_on_dnc: v })}
          label={isPt ? "Parar em não-contatar" : "Stop on do-not-contact"}
        />
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
        <div>
          {msg && (
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                msg.tone === "err" ? "text-red-300" : "text-emerald-300"
              }`}
            >
              {msg.tone === "err" ? (
                <AlertCircle className="w-3.5 h-3.5" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {msg.text}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-white/50 hover:text-red-300 hover:bg-red-500/15 text-xs"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {isPt ? "Excluir" : "Delete"}
        </button>
      </div>
    </div>
  );
}

function StopToggle({ checked, onChange, label }) {
  return (
    <label className="inline-flex items-center gap-1.5 cursor-pointer text-white/70">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-emerald-400"
      />
      {label}
    </label>
  );
}

function StepEditor({
  step,
  index,
  isFirst,
  isLast,
  templates,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
  lang,
}) {
  const isPt = lang === "pt";
  const inlineBodyPresent =
    step.body && (step.body.pt || step.body.en);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-400/20 text-emerald-200 text-xs font-black flex items-center justify-center">
          {index + 1}
        </span>
        <div className="flex-1 flex items-center flex-wrap gap-2 text-xs">
          <label className="inline-flex items-center gap-1 text-white/60">
            {isPt ? "Dia" : "Day"}
            <input
              type="number"
              min={0}
              max={365}
              value={step.day_offset}
              onChange={(e) =>
                onUpdate({ day_offset: Number(e.target.value) })
              }
              className="w-14 bg-white/[0.05] border border-white/10 rounded-lg px-2 py-0.5 text-white text-center focus:outline-none focus:border-emerald-400/50"
            />
          </label>
          <label className="inline-flex items-center gap-1 text-white/60">
            {isPt ? "às" : "at"}
            <input
              type="number"
              min={0}
              max={23}
              value={step.time_of_day_brt}
              onChange={(e) =>
                onUpdate({ time_of_day_brt: Number(e.target.value) })
              }
              className="w-14 bg-white/[0.05] border border-white/10 rounded-lg px-2 py-0.5 text-white text-center focus:outline-none focus:border-emerald-400/50"
            />
            <span className="text-white/40">BRT</span>
          </label>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.06] disabled:opacity-20"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 rounded text-white/40 hover:text-white hover:bg-white/[0.06] disabled:opacity-20"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1 rounded text-white/40 hover:text-red-300 hover:bg-red-500/15"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Template picker */}
      <label className="block mb-2">
        <span className="text-[10px] uppercase tracking-wider text-white/50 font-semibold">
          {isPt ? "Modelo (opcional)" : "Template (optional)"}
        </span>
        <select
          value={step.template_id || ""}
          onChange={(e) => onUpdate({ template_id: e.target.value || null })}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 mt-1 text-sm text-white focus:outline-none focus:border-emerald-400/50"
        >
          <option value="">
            {isPt ? "Sem modelo — usar corpo inline" : "No template — use inline body"}
          </option>
          {templates.map((t) => (
            <option key={t.id} value={t.id} className="bg-[#0e0e0e]">
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {/* Inline body override */}
      <details open={inlineBodyPresent}>
        <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-white/50 font-semibold py-1">
          {isPt ? "Corpo inline (sobrescreve modelo)" : "Inline body (overrides template)"}
        </summary>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          {["pt", "en"].map((l) => (
            <div key={l}>
              <span className="text-[10px] uppercase tracking-wider text-white/45 font-bold">
                {l.toUpperCase()}
              </span>
              <textarea
                value={step.body?.[l] || ""}
                onChange={(e) => {
                  const next = { ...(step.body || {}), [l]: e.target.value };
                  // Empty both → set to null (schema requires at least
                  // template or body; null here signals "template only").
                  const isAllEmpty = !next.pt?.trim() && !next.en?.trim();
                  onUpdate({ body: isAllEmpty ? null : next });
                }}
                rows={3}
                className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 mt-1 text-sm text-white resize-y focus:outline-none focus:border-emerald-400/50"
              />
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function StatusDot({ status }) {
  const tone =
    status === "active"
      ? "bg-emerald-400"
      : status === "completed"
        ? "bg-lime-300"
        : "bg-white/30";
  return <span className={`shrink-0 w-2 h-2 rounded-full ${tone}`} />;
}

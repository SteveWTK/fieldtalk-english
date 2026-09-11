// src/app/(site)/admin/mental/page.js
//
// Admin CRUD for mental_activities + unit-slot assignments. Two
// tabs: Activities (list + inline editor) and Assignments (one row
// per pillar with a dropdown to pick which activity fills the 7th
// slot).
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  ChevronLeft,
  Plus,
  Save,
  Trash2,
  Pencil,
  X,
  AlertCircle,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import {
  ACTIVITY_TYPES,
  ACTIVITY_TONES,
  MOODS,
  SILENT_TIMER_LENGTHS,
  SILENT_TIMER_BELL_INTERVALS,
  pickLang,
} from "@/lib/mental/constants";

export default function MentalAdminPage() {
  return (
    <ProtectedRoute>
      <MentalAdminContent />
    </ProtectedRoute>
  );
}

function MentalAdminContent() {
  const { lang } = useLanguage();
  const isPt = lang === "pt";
  const [tab, setTab] = useState("activities");
  const [activities, setActivities] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [aRes, sRes] = await Promise.all([
        fetch("/api/admin/mental/activities"),
        fetch("/api/admin/mental/unit-slots"),
      ]);
      const aJson = await aRes.json();
      const sJson = await sRes.json();
      if (aRes.ok) setActivities(aJson.activities || []);
      if (sRes.ok) setSlots(sJson.rows || []);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {isPt ? "Admin" : "Admin"}
        </Link>

        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-teal-300/80 font-semibold mb-1">
            FieldTalk · CMS
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isPt ? "Treino Mental" : "Mental Training"}
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-xl leading-relaxed">
            {isPt
              ? "Gerencie atividades, moods e atribuições por unidade."
              : "Manage activities, moods, and per-unit assignments."}
          </p>
        </header>

        <div className="mb-4 inline-flex rounded-full bg-white/[0.05] border border-white/10 p-0.5">
          <button
            type="button"
            onClick={() => setTab("activities")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              tab === "activities"
                ? "bg-white text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            {isPt ? "Atividades" : "Activities"}
          </button>
          <button
            type="button"
            onClick={() => setTab("assignments")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              tab === "assignments"
                ? "bg-white text-black"
                : "text-white/60 hover:text-white"
            }`}
          >
            {isPt ? "Atribuições por unidade" : "Unit assignments"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-white/60 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            {isPt ? "Carregando…" : "Loading…"}
          </div>
        ) : tab === "activities" ? (
          <ActivitiesTab
            activities={activities}
            creating={creating}
            editingId={editingId}
            onStartCreate={() => {
              setCreating(true);
              setEditingId(null);
            }}
            onCancelCreate={() => setCreating(false)}
            onExpand={(id) =>
              setEditingId(editingId === id ? null : id)
            }
            onSaved={() => {
              setCreating(false);
              setEditingId(null);
              load();
            }}
            onDeleted={() => {
              setEditingId(null);
              load();
            }}
            lang={lang}
          />
        ) : (
          <AssignmentsTab
            slots={slots}
            activities={activities}
            onChanged={load}
            lang={lang}
          />
        )}
      </main>
    </div>
  );
}

/* ─── Activities tab ──────────────────────────────────────────── */

function ActivitiesTab({
  activities,
  creating,
  editingId,
  onStartCreate,
  onCancelCreate,
  onExpand,
  onSaved,
  onDeleted,
  lang,
}) {
  const isPt = lang === "pt";
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-black uppercase tracking-wider text-white/70">
          {isPt ? "Atividades" : "Activities"} ({activities.length})
        </h2>
        {!creating && (
          <button
            type="button"
            onClick={onStartCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {isPt ? "Nova atividade" : "New activity"}
          </button>
        )}
      </div>

      {creating && (
        <div className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.03] p-4">
          <ActivityEditor
            mode="create"
            initial={EMPTY_ACTIVITY()}
            lang={lang}
            onSaved={onSaved}
            onCancel={onCancelCreate}
          />
        </div>
      )}

      {activities.length === 0 && !creating ? (
        <p className="text-sm text-white/40 py-6 text-center">
          {isPt
            ? "Nenhuma atividade ainda. Crie a primeira acima."
            : "No activities yet. Create the first one above."}
        </p>
      ) : (
        <div className="space-y-2">
          {activities.map((a) => (
            <ActivityRow
              key={a.id}
              activity={a}
              isEditing={editingId === a.id}
              onExpand={() => onExpand(a.id)}
              onSaved={onSaved}
              onDeleted={onDeleted}
              lang={lang}
            />
          ))}
        </div>
      )}
    </>
  );
}

function ActivityRow({ activity, isEditing, onExpand, onSaved, onDeleted, lang }) {
  const tone = ACTIVITY_TONES[activity.activity_type] || ACTIVITY_TONES.meditation;
  return (
    <div className={`rounded-2xl border ${tone.border} bg-white/[0.02] overflow-hidden`}>
      <button
        type="button"
        onClick={onExpand}
        className="w-full flex items-center gap-3 p-3 hover:bg-white/[0.02] text-left"
      >
        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${tone.chip}`}>
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">
            {pickLang(tone.label, lang)}
          </p>
          <h3 className="font-semibold text-sm truncate">
            {pickLang(activity.title, lang) || "(sem título)"}
          </h3>
        </div>
        <div className="text-[10px] text-white/40">
          {activity.active ? (lang === "pt" ? "ativa" : "active") : (lang === "pt" ? "inativa" : "inactive")}
        </div>
        <Pencil className="w-4 h-4 text-white/40 ml-2" />
      </button>
      {isEditing && (
        <div className="border-t border-white/10 p-4 bg-black/25">
          <ActivityEditor
            mode="edit"
            activityId={activity.id}
            initial={activity}
            lang={lang}
            onSaved={onSaved}
            onDeleted={onDeleted}
            onCancel={onExpand}
          />
        </div>
      )}
    </div>
  );
}

function ActivityEditor({
  mode,
  activityId,
  initial,
  lang,
  onSaved,
  onDeleted,
  onCancel,
}) {
  const isPt = lang === "pt";
  const [form, setForm] = useState(normalizeInitial(initial));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const set = (k, v) => setForm((prev) => ({ ...prev, [k]: v }));

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        activity_type: form.activity_type,
        title: { pt: form.title_pt, en: form.title_en },
        subtitle: { pt: form.subtitle_pt, en: form.subtitle_en },
        duration_seconds: form.duration_seconds || null,
        content: buildContent(form),
        moods: form.moods,
        audio_url_pt: form.audio_url_pt || null,
        audio_url_en: form.audio_url_en || null,
        cover_image_url: form.cover_image_url || null,
        featured: form.featured,
        active: form.active,
        sort_order: Number(form.sort_order) || 0,
      };
      const res = await fetch(
        mode === "create"
          ? "/api/admin/mental/activities"
          : `/api/admin/mental/activities/${activityId}`,
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
        onSaved(json.activity);
      }
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (
      !confirm(
        isPt ? "Excluir esta atividade?" : "Delete this activity?",
      )
    )
      return;
    const res = await fetch(
      `/api/admin/mental/activities/${activityId}`,
      { method: "DELETE" },
    );
    if (res.ok) onDeleted?.();
  }

  const showContentEditor = form.activity_type === "meditation" || form.activity_type === "silent_timer";

  return (
    <div className="space-y-3">
      <Field label={isPt ? "Tipo" : "Type"}>
        <select
          value={form.activity_type}
          onChange={(e) => set("activity_type", e.target.value)}
          className={inputClass}
        >
          {ACTIVITY_TYPES.map((tCode) => (
            <option key={tCode} value={tCode} className="bg-[#0e0e0e]">
              {pickLang(ACTIVITY_TONES[tCode].label, lang)}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label={`${isPt ? "Título" : "Title"} PT`}>
          <input
            type="text"
            value={form.title_pt}
            onChange={(e) => set("title_pt", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={`${isPt ? "Título" : "Title"} EN`}>
          <input
            type="text"
            value={form.title_en}
            onChange={(e) => set("title_en", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label={`${isPt ? "Subtítulo" : "Subtitle"} PT`}>
          <input
            type="text"
            value={form.subtitle_pt}
            onChange={(e) => set("subtitle_pt", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={`${isPt ? "Subtítulo" : "Subtitle"} EN`}>
          <input
            type="text"
            value={form.subtitle_en}
            onChange={(e) => set("subtitle_en", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label={isPt ? "Duração (seg)" : "Duration (sec)"}>
          <input
            type="number"
            min={0}
            value={form.duration_seconds}
            onChange={(e) => set("duration_seconds", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={isPt ? "Ordem" : "Sort order"}>
          <input
            type="number"
            value={form.sort_order}
            onChange={(e) => set("sort_order", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label={`${isPt ? "URL áudio" : "Audio URL"} PT`}>
          <input
            type="url"
            value={form.audio_url_pt}
            onChange={(e) => set("audio_url_pt", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={`${isPt ? "URL áudio" : "Audio URL"} EN`}>
          <input
            type="url"
            value={form.audio_url_en}
            onChange={(e) => set("audio_url_en", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={isPt ? "URL da imagem de capa" : "Cover image URL"}>
        <input
          type="url"
          value={form.cover_image_url}
          onChange={(e) => set("cover_image_url", e.target.value)}
          className={inputClass}
        />
      </Field>

      <Field label={isPt ? "Moods" : "Moods"}>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((m) => {
            const active = form.moods.includes(m.key);
            return (
              <button
                key={m.key}
                type="button"
                onClick={() =>
                  set(
                    "moods",
                    active
                      ? form.moods.filter((x) => x !== m.key)
                      : [...form.moods, m.key],
                  )
                }
                className={`px-2 py-1 rounded-full text-[11px] font-semibold border ${
                  active
                    ? "border-white/40 bg-white/15 text-white"
                    : "border-white/10 bg-white/[0.02] text-white/60"
                }`}
              >
                {m.emoji} {lang === "pt" ? m.pt : m.en}
              </button>
            );
          })}
        </div>
      </Field>

      {showContentEditor && form.activity_type === "silent_timer" && (
        <SilentTimerContentEditor form={form} set={set} lang={lang} />
      )}

      {showContentEditor && form.activity_type === "meditation" && (
        <MeditationContentEditor form={form} set={set} lang={lang} />
      )}

      <div className="flex items-center gap-4">
        <label className="inline-flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
            className="accent-emerald-400"
          />
          {isPt ? "Ativa" : "Active"}
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-white/70 cursor-pointer">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => set("featured", e.target.checked)}
            className="accent-amber-400"
          />
          {isPt ? "Destacar" : "Featured"}
        </label>
      </div>

      <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
            {msg.tone === "err" ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
            {msg.text}
          </div>
        )}
      </div>
    </div>
  );
}

function SilentTimerContentEditor({ form, set, lang }) {
  const isPt = lang === "pt";
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-white/50 font-bold">
        {isPt ? "Configuração do timer silencioso" : "Silent timer settings"}
      </p>
      <Field label={isPt ? "Presets de duração (min, vírgula)" : "Length presets (min, comma)"}>
        <input
          type="text"
          value={form.silent_presets}
          onChange={(e) => set("silent_presets", e.target.value)}
          placeholder={SILENT_TIMER_LENGTHS.join(", ")}
          className={inputClass}
        />
      </Field>
      <Field label={isPt ? "Duração padrão (min)" : "Default length (min)"}>
        <input
          type="number"
          min={1}
          value={form.silent_default}
          onChange={(e) => set("silent_default", e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label={isPt ? "Intervalos de sinos (min, vírgula, 0 = sem)" : "Bell intervals (min, comma, 0 = none)"}>
        <input
          type="text"
          value={form.silent_bells}
          onChange={(e) => set("silent_bells", e.target.value)}
          placeholder={SILENT_TIMER_BELL_INTERVALS.join(", ")}
          className={inputClass}
        />
      </Field>
      <Field label={isPt ? "URL do sino (opcional)" : "Bell sound URL (optional)"}>
        <input
          type="url"
          value={form.silent_bell_url}
          onChange={(e) => set("silent_bell_url", e.target.value)}
          className={inputClass}
        />
      </Field>
    </div>
  );
}

function MeditationContentEditor({ form, set, lang }) {
  const isPt = lang === "pt";
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-white/50 font-bold">
        {isPt ? "Pergunta de compreensão (opcional)" : "Comprehension question (optional)"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label="Prompt PT">
          <input
            type="text"
            value={form.q_prompt_pt}
            onChange={(e) => set("q_prompt_pt", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Prompt EN">
          <input
            type="text"
            value={form.q_prompt_en}
            onChange={(e) => set("q_prompt_en", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <p className="text-[10px] text-white/45 mt-1">
        {isPt
          ? "Marque a opção correta com o rádio à direita."
          : "Mark the correct option with the radio on the right."}
      </p>
      {form.q_options.map((opt, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
          <input
            type="text"
            value={opt.pt}
            onChange={(e) => {
              const next = [...form.q_options];
              next[i] = { ...next[i], pt: e.target.value };
              set("q_options", next);
            }}
            placeholder={`Opção ${i + 1} PT`}
            className={inputClass}
          />
          <input
            type="text"
            value={opt.en}
            onChange={(e) => {
              const next = [...form.q_options];
              next[i] = { ...next[i], en: e.target.value };
              set("q_options", next);
            }}
            placeholder={`Option ${i + 1} EN`}
            className={inputClass}
          />
          <label className="inline-flex items-center gap-1 text-[11px] text-white/60">
            <input
              type="radio"
              checked={form.q_correct_idx === i}
              onChange={() => set("q_correct_idx", i)}
              className="accent-emerald-400"
            />
            {isPt ? "Correta" : "Correct"}
          </label>
        </div>
      ))}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Field label={isPt ? "Explicação PT" : "Explanation PT"}>
          <input
            type="text"
            value={form.q_explain_pt}
            onChange={(e) => set("q_explain_pt", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label={isPt ? "Explicação EN" : "Explanation EN"}>
          <input
            type="text"
            value={form.q_explain_en}
            onChange={(e) => set("q_explain_en", e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
    </div>
  );
}

/* ─── Assignments tab ─────────────────────────────────────────── */

function AssignmentsTab({ slots, activities, onChanged, lang }) {
  const isPt = lang === "pt";
  const activeActivities = useMemo(
    () => activities.filter((a) => a.active),
    [activities],
  );

  async function assign(unitId, activityId) {
    await fetch("/api/admin/mental/unit-slots", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        unit_id: unitId,
        mental_activity_id: activityId || null,
      }),
    });
    onChanged();
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-white/50 mb-3">
        {isPt
          ? "Para cada unidade, escolha qual atividade aparece como 7ª carta após a Lição 6."
          : "For each unit, pick which activity appears as the 7th card after Lesson 6."}
      </p>
      {slots.map((row) => (
        <div
          key={row.unit_id}
          className="rounded-2xl border border-white/10 bg-white/[0.02] p-3 flex items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white/45">{row.edition}</p>
            <h3 className="font-semibold text-sm truncate">{row.unit_name}</h3>
          </div>
          <select
            value={row.slot?.mental_activity_id || ""}
            onChange={(e) => assign(row.unit_id, e.target.value || null)}
            className="bg-white/[0.05] border border-white/10 text-white text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-400/50 min-w-[220px]"
          >
            <option value="" className="bg-[#0e0e0e]">
              {isPt ? "Nenhuma" : "None"}
            </option>
            {activeActivities.map((a) => (
              <option key={a.id} value={a.id} className="bg-[#0e0e0e]">
                {pickLang(a.title, lang) || "(sem título)"} —{" "}
                {pickLang(ACTIVITY_TONES[a.activity_type]?.label, lang)}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────── */

const inputClass =
  "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-emerald-400/50 focus:outline-none";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

function EMPTY_ACTIVITY() {
  return {
    activity_type: "meditation",
    title: { pt: "", en: "" },
    subtitle: { pt: "", en: "" },
    duration_seconds: 300,
    content: {},
    moods: ["general"],
    audio_url_pt: null,
    audio_url_en: null,
    cover_image_url: null,
    featured: false,
    active: true,
    sort_order: 0,
  };
}

function normalizeInitial(a) {
  const q = a?.content?.comprehension_question || {};
  const options = Array.isArray(q.options) ? q.options : [];
  // Pad options up to 4 slots so the editor always has 4 rows.
  const padded = [0, 1, 2, 3].map((i) => {
    const o = options[i];
    return {
      pt: o?.label?.pt || "",
      en: o?.label?.en || "",
      correct: o?.correct === true,
    };
  });
  const correctIdx = padded.findIndex((o) => o.correct);

  const silent = a?.content || {};
  return {
    activity_type: a?.activity_type || "meditation",
    title_pt: a?.title?.pt || "",
    title_en: a?.title?.en || "",
    subtitle_pt: a?.subtitle?.pt || "",
    subtitle_en: a?.subtitle?.en || "",
    duration_seconds: a?.duration_seconds ?? "",
    audio_url_pt: a?.audio_url_pt || "",
    audio_url_en: a?.audio_url_en || "",
    cover_image_url: a?.cover_image_url || "",
    moods: Array.isArray(a?.moods) ? a.moods : [],
    featured: a?.featured === true,
    active: a?.active !== false,
    sort_order: a?.sort_order ?? 0,
    // Meditation question fields
    q_prompt_pt: q.prompt?.pt || "",
    q_prompt_en: q.prompt?.en || "",
    q_options: padded,
    q_correct_idx: correctIdx >= 0 ? correctIdx : 0,
    q_explain_pt: q.explanation?.pt || "",
    q_explain_en: q.explanation?.en || "",
    // Silent timer fields
    silent_presets:
      Array.isArray(silent.presets) && silent.presets.length > 0
        ? silent.presets.join(", ")
        : SILENT_TIMER_LENGTHS.join(", "),
    silent_default: silent.default_length_minutes ?? 10,
    silent_bells:
      Array.isArray(silent.bell_intervals) && silent.bell_intervals.length > 0
        ? silent.bell_intervals.join(", ")
        : SILENT_TIMER_BELL_INTERVALS.join(", "),
    silent_bell_url: silent.bell_sound_url || "",
  };
}

function buildContent(form) {
  if (form.activity_type === "meditation") {
    const hasQuestion = form.q_prompt_pt.trim() || form.q_prompt_en.trim();
    if (!hasQuestion) return {};
    return {
      comprehension_question: {
        prompt: { pt: form.q_prompt_pt, en: form.q_prompt_en },
        options: form.q_options.map((o, i) => ({
          label: { pt: o.pt, en: o.en },
          correct: i === form.q_correct_idx,
        })),
        explanation: { pt: form.q_explain_pt, en: form.q_explain_en },
      },
    };
  }
  if (form.activity_type === "silent_timer") {
    const parseList = (s) =>
      String(s || "")
        .split(",")
        .map((n) => Number(String(n).trim()))
        .filter((n) => Number.isFinite(n) && n >= 0);
    return {
      presets: parseList(form.silent_presets),
      default_length_minutes: Number(form.silent_default) || 10,
      bell_intervals: parseList(form.silent_bells),
      bell_sound_url: form.silent_bell_url || null,
    };
  }
  return {};
}

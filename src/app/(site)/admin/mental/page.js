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
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Button from "@/components/ui/button";
import Switch from "@/components/ui/switch";
import Chip from "@/components/ui/chip";

// The accents supported by LivingOrb — keep in sync with
// ACCENT_PALETTES there. Extending the palette is a two-file change:
// add here + in LivingOrb.js. Values are DS signal names (mental =
// violet, english = sky, performance = amber-orange, slate = neutral).
// Legacy accent names on existing rows (teal/violet/emerald/amber)
// still render via the alias map in LivingOrb — no migration needed.
const ORB_ACCENTS = ["mental", "english", "performance", "slate"];

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
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-primary-300 hover:text-primary-50 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          {isPt ? "Admin" : "Admin"}
        </Link>

        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-400 font-semibold mb-1">
            Global Player · CMS
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isPt ? "Treino Mental" : "Mental Training"}
          </h1>
          <p className="text-sm text-primary-400 mt-2 max-w-xl leading-relaxed">
            {isPt
              ? "Gerencie atividades, moods e atribuições por unidade."
              : "Manage activities, moods, and per-unit assignments."}
          </p>
        </header>

        <div className="mb-4 inline-flex rounded-full bg-primary-800 border border-primary-700 p-0.5">
          <button
            type="button"
            onClick={() => setTab("activities")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              tab === "activities"
                ? "bg-accent-400 text-primary-900"
                : "text-primary-400 hover:text-primary-100"
            }`}
          >
            {isPt ? "Atividades" : "Activities"}
          </button>
          <button
            type="button"
            onClick={() => setTab("assignments")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              tab === "assignments"
                ? "bg-accent-400 text-primary-900"
                : "text-primary-400 hover:text-primary-100"
            }`}
          >
            {isPt ? "Atribuições por unidade" : "Unit assignments"}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-primary-300 py-8">
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
        <h2 className="text-sm font-black uppercase tracking-wider text-primary-300">
          {isPt ? "Atividades" : "Activities"} ({activities.length})
        </h2>
        {!creating && (
          <Button
            variant="primary"
            size="sm"
            Icon={Plus}
            onClick={onStartCreate}
          >
            {isPt ? "Nova atividade" : "New activity"}
          </Button>
        )}
      </div>

      {creating && (
        <div className="mb-4 rounded-card border border-accent-400/30 bg-accent-400/[0.03] p-4">
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
        <p className="text-sm text-primary-500 py-6 text-center">
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
    <div className={`rounded-card border ${tone.border} bg-primary-panel overflow-hidden`}>
      <button
        type="button"
        onClick={onExpand}
        className="w-full flex items-center gap-3 p-3 hover:bg-primary-800 text-left"
      >
        <div className={`shrink-0 w-8 h-8 rounded-control flex items-center justify-center ${tone.chip}`}>
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-wider text-primary-400 font-semibold">
            {pickLang(tone.label, lang)}
          </p>
          <h3 className="font-semibold text-sm truncate">
            {pickLang(activity.title, lang) || "(sem título)"}
          </h3>
        </div>
        <div className="text-[10px] text-primary-500">
          {activity.active ? (lang === "pt" ? "ativa" : "active") : (lang === "pt" ? "inativa" : "inactive")}
        </div>
        <Pencil className="w-4 h-4 text-primary-500 ml-2" />
      </button>
      {isEditing && (
        <div className="border-t border-primary-700 p-4 bg-primary-900">
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

  const showContentEditor =
    form.activity_type === "meditation" ||
    form.activity_type === "silent_timer" ||
    form.activity_type === "champion_scenario" ||
    form.activity_type === "match_prep" ||
    form.activity_type === "voice_of_champion";

  const typeOptions = ACTIVITY_TYPES.map((tCode) => ({
    value: tCode,
    label: pickLang(ACTIVITY_TONES[tCode].label, lang),
  }));

  return (
    <div className="space-y-3">
      <Select
        label={isPt ? "Tipo" : "Type"}
        value={form.activity_type}
        onChange={(e) => set("activity_type", e.target.value)}
        options={typeOptions}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label={`${isPt ? "Título" : "Title"} PT`}
          type="text"
          value={form.title_pt}
          onChange={(e) => set("title_pt", e.target.value)}
        />
        <Input
          label={`${isPt ? "Título" : "Title"} EN`}
          type="text"
          value={form.title_en}
          onChange={(e) => set("title_en", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label={`${isPt ? "Subtítulo" : "Subtitle"} PT`}
          type="text"
          value={form.subtitle_pt}
          onChange={(e) => set("subtitle_pt", e.target.value)}
        />
        <Input
          label={`${isPt ? "Subtítulo" : "Subtitle"} EN`}
          type="text"
          value={form.subtitle_en}
          onChange={(e) => set("subtitle_en", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label={isPt ? "Duração (seg)" : "Duration (sec)"}
          type="number"
          min={0}
          value={form.duration_seconds}
          onChange={(e) => set("duration_seconds", e.target.value)}
        />
        <Input
          label={isPt ? "Ordem" : "Sort order"}
          type="number"
          value={form.sort_order}
          onChange={(e) => set("sort_order", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label={`${isPt ? "URL áudio" : "Audio URL"} PT`}
          type="url"
          value={form.audio_url_pt}
          onChange={(e) => set("audio_url_pt", e.target.value)}
        />
        <Input
          label={`${isPt ? "URL áudio" : "Audio URL"} EN`}
          type="url"
          value={form.audio_url_en}
          onChange={(e) => set("audio_url_en", e.target.value)}
        />
      </div>

      <Input
        label={isPt ? "URL da imagem de capa" : "Cover image URL"}
        type="url"
        value={form.cover_image_url}
        onChange={(e) => set("cover_image_url", e.target.value)}
      />

      <Field label={isPt ? "Moods" : "Moods"}>
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((m) => {
            const active = form.moods.includes(m.key);
            return (
              <Chip
                key={m.key}
                as="button"
                size="sm"
                Icon={m.Icon}
                selected={active}
                onClick={() =>
                  set(
                    "moods",
                    active
                      ? form.moods.filter((x) => x !== m.key)
                      : [...form.moods, m.key],
                  )
                }
              >
                {lang === "pt" ? m.pt : m.en}
              </Chip>
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

      {showContentEditor && form.activity_type === "champion_scenario" && (
        <ChampionScenarioContentEditor form={form} set={set} lang={lang} />
      )}

      {showContentEditor && form.activity_type === "match_prep" && (
        <MatchPrepContentEditor form={form} set={set} lang={lang} />
      )}

      {showContentEditor && form.activity_type === "voice_of_champion" && (
        <VoiceOfChampionContentEditor form={form} set={set} lang={lang} />
      )}

      <div className="flex items-center gap-4">
        <Switch
          checked={form.active}
          onChange={(v) => set("active", v)}
          label={isPt ? "Ativa" : "Active"}
        />
        <Switch
          checked={form.featured}
          onChange={(v) => set("featured", v)}
          label={isPt ? "Destacar" : "Featured"}
        />
      </div>

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
        <Button
          variant="secondary"
          size="md"
          Icon={X}
          onClick={onCancel}
          disabled={saving}
        >
          {isPt ? "Cancelar" : "Cancel"}
        </Button>
        {mode === "edit" && (
          <div className="ml-auto">
            <Button
              variant="danger"
              size="sm"
              Icon={Trash2}
              onClick={del}
            >
              {isPt ? "Excluir" : "Delete"}
            </Button>
          </div>
        )}
        {msg && (
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              msg.tone === "err" ? "text-signal-alert" : "text-accent-400"
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
    <div className="rounded-card border border-primary-700 bg-primary-900 p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-primary-400 font-bold">
        {isPt ? "Configuração do timer silencioso" : "Silent timer settings"}
      </p>
      <Input
        label={isPt ? "Presets de duração (min, vírgula)" : "Length presets (min, comma)"}
        type="text"
        value={form.silent_presets}
        onChange={(e) => set("silent_presets", e.target.value)}
        placeholder={SILENT_TIMER_LENGTHS.join(", ")}
      />
      <Input
        label={isPt ? "Duração padrão (min)" : "Default length (min)"}
        type="number"
        min={1}
        value={form.silent_default}
        onChange={(e) => set("silent_default", e.target.value)}
      />
      <Input
        label={isPt ? "Intervalos de sinos (min, vírgula, 0 = sem)" : "Bell intervals (min, comma, 0 = none)"}
        type="text"
        value={form.silent_bells}
        onChange={(e) => set("silent_bells", e.target.value)}
        placeholder={SILENT_TIMER_BELL_INTERVALS.join(", ")}
      />
      <Input
        label={isPt ? "URL do sino (opcional)" : "Bell sound URL (optional)"}
        type="url"
        value={form.silent_bell_url}
        onChange={(e) => set("silent_bell_url", e.target.value)}
      />
    </div>
  );
}

function MeditationContentEditor({ form, set, lang }) {
  return (
    <>
      <OrbConfigEditor form={form} set={set} lang={lang} />
      <ComprehensionQuestionEditor form={form} set={set} lang={lang} />
    </>
  );
}

/**
 * Standalone comprehension-question editor — shared between meditation
 * and voice_of_champion. Same JSONB shape, same UI, so we render one
 * component in both cases.
 */
function ComprehensionQuestionEditor({ form, set, lang }) {
  const isPt = lang === "pt";
  return (
    <div className="rounded-card border border-primary-700 bg-primary-900 p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-primary-400 font-bold">
        {isPt ? "Pergunta de compreensão (opcional)" : "Comprehension question (optional)"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label="Prompt PT"
          type="text"
          value={form.q_prompt_pt}
          onChange={(e) => set("q_prompt_pt", e.target.value)}
        />
        <Input
          label="Prompt EN"
          type="text"
          value={form.q_prompt_en}
          onChange={(e) => set("q_prompt_en", e.target.value)}
        />
      </div>
      <p className="text-[10px] text-primary-500 mt-1">
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
          <label className="inline-flex items-center gap-1 text-[11px] text-primary-300">
            <input
              type="radio"
              checked={form.q_correct_idx === i}
              onChange={() => set("q_correct_idx", i)}
              className="accent-accent-400"
            />
            {isPt ? "Correta" : "Correct"}
          </label>
        </div>
      ))}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label={isPt ? "Explicação PT" : "Explanation PT"}
          type="text"
          value={form.q_explain_pt}
          onChange={(e) => set("q_explain_pt", e.target.value)}
        />
        <Input
          label={isPt ? "Explicação EN" : "Explanation EN"}
          type="text"
          value={form.q_explain_en}
          onChange={(e) => set("q_explain_en", e.target.value)}
        />
      </div>
    </div>
  );
}

/**
 * Per-meditation orb config — accent palette + breathe cycle. Bounces
 * through `content.orb.{accent,breathe_in,breathe_hold,breathe_out}`.
 * Presets cover the common rhythms; custom values are accepted too.
 */
function OrbConfigEditor({ form, set, lang }) {
  const isPt = lang === "pt";
  return (
    <div className="rounded-card border border-primary-700 bg-primary-900 p-3 space-y-2 mb-2">
      <p className="text-[11px] uppercase tracking-wider text-primary-400 font-bold">
        {isPt ? "Aparência do orbe" : "Orb appearance"}
      </p>
      <Field label={isPt ? "Cor do orbe" : "Orb accent"}>
        <div className="flex flex-wrap gap-1.5">
          {ORB_ACCENTS.map((a) => {
            const active = form.orb_accent === a;
            return (
              <button
                key={a}
                type="button"
                onClick={() => set("orb_accent", a)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${
                  active
                    ? "border-primary-600 bg-primary-600 text-primary-50"
                    : "border-primary-700 bg-primary-panel text-primary-300 hover:text-primary-100"
                }`}
              >
                <span className={`inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle ${ORB_SWATCH[a]}`} />
                {a}
              </button>
            );
          })}
        </div>
      </Field>
      <p className="text-[11px] uppercase tracking-wider text-primary-400 font-bold mt-3">
        {isPt ? "Ciclo respiratório (segundos)" : "Breathe cycle (seconds)"}
      </p>
      <p className="text-[10px] text-primary-500">
        {isPt
          ? "Padrão é 4-7-8. Presets abaixo cobrem as variações comuns."
          : "Default is 4-7-8. Presets below cover the common variations."}
      </p>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {BREATHE_PRESETS.map((p) => {
          const active =
            Number(form.breathe_in) === p.in &&
            Number(form.breathe_hold) === p.hold &&
            Number(form.breathe_out) === p.out;
          return (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                set("breathe_in", p.in);
                set("breathe_hold", p.hold);
                set("breathe_out", p.out);
              }}
              className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                active
                  ? "border-primary-600 bg-primary-600 text-primary-50"
                  : "border-primary-700 bg-primary-panel text-primary-300 hover:text-primary-100"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Input
          label={isPt ? "Inspira" : "Inhale"}
          type="number"
          min={0}
          max={30}
          value={form.breathe_in}
          onChange={(e) => set("breathe_in", e.target.value)}
        />
        <Input
          label={isPt ? "Segura" : "Hold"}
          type="number"
          min={0}
          max={30}
          value={form.breathe_hold}
          onChange={(e) => set("breathe_hold", e.target.value)}
        />
        <Input
          label={isPt ? "Expira" : "Exhale"}
          type="number"
          min={0}
          max={30}
          value={form.breathe_out}
          onChange={(e) => set("breathe_out", e.target.value)}
        />
      </div>
    </div>
  );
}

// Swatches shown next to each accent name in the admin picker. Uses
// the DS signal Tailwind tokens so what admin sees matches what
// LivingOrb actually renders in the player.
const ORB_SWATCH = {
  mental: "bg-signal-mental",
  english: "bg-signal-english",
  performance: "bg-signal-performance",
  slate: "bg-primary-300",
};

const BREATHE_PRESETS = [
  { label: "4-7-8", in: 4, hold: 7, out: 8 },
  { label: "4-4-4 (box)", in: 4, hold: 4, out: 4 },
  { label: "6-0-6", in: 6, hold: 0, out: 6 },
  { label: "5-2-7", in: 5, hold: 2, out: 7 },
];

/* ─── Champion Scenario editor ────────────────────────────────── */

function ChampionScenarioContentEditor({ form, set, lang }) {
  const isPt = lang === "pt";
  return (
    <div className="rounded-card border border-primary-700 bg-primary-900 p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-primary-400 font-bold">
        {isPt ? "Cenário + opções" : "Scenario + options"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label={isPt ? "Cenário PT" : "Scenario PT"}
          multiline
          rows={3}
          value={form.scenario_pt}
          onChange={(e) => set("scenario_pt", e.target.value)}
        />
        <Input
          label={isPt ? "Cenário EN" : "Scenario EN"}
          multiline
          rows={3}
          value={form.scenario_en}
          onChange={(e) => set("scenario_en", e.target.value)}
        />
      </div>
      <p className="text-[10px] text-primary-500 mt-1">
        {isPt
          ? "Marque a opção correta com o rádio à direita. Cada opção pode ter uma explicação separada."
          : "Mark the correct option with the radio on the right. Each option can have its own explanation."}
      </p>
      {form.scenario_options.map((opt, i) => (
        <div key={i} className="rounded-control border border-primary-700 bg-primary-panel p-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider text-primary-500 font-bold w-6">
              {String.fromCharCode(65 + i)}
            </span>
            <label className="ml-auto inline-flex items-center gap-1 text-[11px] text-primary-300">
              <input
                type="radio"
                checked={form.scenario_correct_idx === i}
                onChange={() => set("scenario_correct_idx", i)}
                className="accent-accent-400"
              />
              {isPt ? "Correta" : "Correct"}
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={opt.label_pt}
              onChange={(e) => updateScenarioOption(form, set, i, "label_pt", e.target.value)}
              placeholder={`Opção ${i + 1} PT`}
              className={inputClass}
            />
            <input
              type="text"
              value={opt.label_en}
              onChange={(e) => updateScenarioOption(form, set, i, "label_en", e.target.value)}
              placeholder={`Option ${i + 1} EN`}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={opt.explain_pt}
              onChange={(e) => updateScenarioOption(form, set, i, "explain_pt", e.target.value)}
              placeholder={isPt ? `Explicação PT` : "Explanation PT"}
              className={inputClass}
            />
            <input
              type="text"
              value={opt.explain_en}
              onChange={(e) => updateScenarioOption(form, set, i, "explain_en", e.target.value)}
              placeholder={isPt ? `Explicação EN` : "Explanation EN"}
              className={inputClass}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function updateScenarioOption(form, set, idx, field, value) {
  const next = form.scenario_options.slice();
  next[idx] = { ...next[idx], [field]: value };
  set("scenario_options", next);
}

/* ─── Match Prep editor ───────────────────────────────────────── */

function MatchPrepContentEditor({ form, set, lang }) {
  const isPt = lang === "pt";
  return (
    <div className="rounded-card border border-primary-700 bg-primary-900 p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-primary-400 font-bold">
        {isPt ? "Técnica + frases" : "Technique + phrases"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label={isPt ? "Técnica PT" : "Technique PT"}
          multiline
          rows={3}
          value={form.technique_pt}
          onChange={(e) => set("technique_pt", e.target.value)}
        />
        <Input
          label={isPt ? "Técnica EN" : "Technique EN"}
          multiline
          rows={3}
          value={form.technique_en}
          onChange={(e) => set("technique_en", e.target.value)}
        />
      </div>

      <p className="text-[10px] uppercase tracking-wider text-primary-400 font-bold mt-3">
        {isPt ? "Frases de auto-fala" : "Self-talk phrases"}
      </p>
      {form.prep_phrases.map((p, i) => (
        <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-start">
          <input
            type="text"
            value={p.text_en}
            onChange={(e) => updatePhrase(form, set, i, "text_en", e.target.value)}
            placeholder="EN phrase"
            className={inputClass}
          />
          <input
            type="text"
            value={p.text_pt}
            onChange={(e) => updatePhrase(form, set, i, "text_pt", e.target.value)}
            placeholder="PT tradução"
            className={inputClass}
          />
          <input
            type="text"
            value={p.note}
            onChange={(e) => updatePhrase(form, set, i, "note", e.target.value)}
            placeholder={isPt ? "Nota (opcional)" : "Note (optional)"}
            className={inputClass}
          />
          <button
            type="button"
            onClick={() =>
              set(
                "prep_phrases",
                form.prep_phrases.filter((_, j) => j !== i),
              )
            }
            className="p-1 rounded text-primary-500 hover:text-signal-alert hover:bg-signal-alert/15"
          >
            ×
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          set("prep_phrases", [
            ...form.prep_phrases,
            { text_en: "", text_pt: "", note: "" },
          ])
        }
        className="text-xs text-accent-400 hover:text-accent-300 mt-1"
      >
        + {isPt ? "Adicionar frase" : "Add phrase"}
      </button>
    </div>
  );
}

function updatePhrase(form, set, idx, field, value) {
  const next = form.prep_phrases.slice();
  next[idx] = { ...next[idx], [field]: value };
  set("prep_phrases", next);
}

/* ─── Voice of Champions editor ───────────────────────────────── */

function VoiceOfChampionContentEditor({ form, set, lang }) {
  const isPt = lang === "pt";
  return (
    <div className="rounded-card border border-primary-700 bg-primary-900 p-3 space-y-2">
      <p className="text-[11px] uppercase tracking-wider text-primary-400 font-bold">
        {isPt ? "Atleta + citação" : "Athlete + quote"}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label={isPt ? "Nome do atleta" : "Athlete name"}
          type="text"
          value={form.athlete_name}
          onChange={(e) => set("athlete_name", e.target.value)}
        />
        <Input
          label={isPt ? "Subtítulo (posição/clube)" : "Subtitle (position/club)"}
          type="text"
          value={form.athlete_subtitle}
          onChange={(e) => set("athlete_subtitle", e.target.value)}
        />
      </div>
      <Input
        label={isPt ? "URL da foto" : "Photo URL"}
        type="url"
        value={form.athlete_photo_url}
        onChange={(e) => set("athlete_photo_url", e.target.value)}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label={isPt ? "Citação PT" : "Quote PT"}
          multiline
          rows={3}
          value={form.quote_pt}
          onChange={(e) => set("quote_pt", e.target.value)}
        />
        <Input
          label={isPt ? "Citação EN" : "Quote EN"}
          multiline
          rows={3}
          value={form.quote_en}
          onChange={(e) => set("quote_en", e.target.value)}
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <Input
          label={isPt ? "Contexto PT" : "Background PT"}
          multiline
          rows={2}
          value={form.voice_background_pt}
          onChange={(e) => set("voice_background_pt", e.target.value)}
        />
        <Input
          label={isPt ? "Contexto EN" : "Background EN"}
          multiline
          rows={2}
          value={form.voice_background_en}
          onChange={(e) => set("voice_background_en", e.target.value)}
        />
      </div>
      <p className="text-[10px] text-primary-500 mt-1">
        {isPt
          ? "Pergunta de compreensão opcional — reutiliza os campos abaixo do bloco de meditação."
          : "Optional comprehension question — reuses the meditation editor's Q/A fields below."}
      </p>
      {/* Reuse the Q&A editor — same shape as meditation but WITHOUT
          the orb config which is meditation-only. */}
      <ComprehensionQuestionEditor form={form} set={set} lang={lang} />
    </div>
  );
}

/* ─── Assignments tab ─────────────────────────────────────────── */

function AssignmentsTab({ slots, activities, onChanged, lang }) {
  const isPt = lang === "pt";
  const [assignError, setAssignError] = useState(null);
  const activeActivities = useMemo(
    () => activities.filter((a) => a.active),
    [activities],
  );

  async function assign(unitId, activityId) {
    setAssignError(null);
    try {
      const res = await fetch("/api/admin/mental/unit-slots", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unit_id: unitId,
          mental_activity_id: activityId || null,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setAssignError(json.message || json.error || "assign_failed");
        return;
      }
    } catch (err) {
      setAssignError(err?.message || "network_error");
      return;
    }
    onChanged();
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-primary-400 mb-3">
        {isPt
          ? "Para cada unidade, escolha qual atividade aparece como 7ª carta após a Lição 6."
          : "For each unit, pick which activity appears as the 7th card after Lesson 6."}
      </p>
      {assignError && (
        <div className="rounded-control border border-signal-alert/40 bg-signal-alert/10 p-2 text-xs text-signal-alert">
          {isPt ? "Falha ao salvar:" : "Save failed:"} {assignError}
        </div>
      )}
      {slots.map((row) => (
        <div
          key={row.unit_id}
          className="rounded-card border border-primary-700 bg-primary-panel p-3 flex items-center gap-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-primary-500">{row.edition}</p>
            <h3 className="font-semibold text-sm truncate">{row.unit_name}</h3>
          </div>
          <select
            value={row.slot?.mental_activity_id || ""}
            onChange={(e) => assign(row.unit_id, e.target.value || null)}
            className="bg-primary-800 border border-primary-700 text-primary-50 text-xs rounded-control px-2 py-1.5 focus:outline-none focus:border-accent-400 min-w-[220px]"
          >
            <option value="" className="bg-primary-800">
              {isPt ? "Nenhuma" : "None"}
            </option>
            {activeActivities.map((a) => (
              <option key={a.id} value={a.id} className="bg-primary-800">
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
  "w-full bg-primary-900 border border-primary-700 rounded-control px-3 py-2 text-sm text-primary-50 placeholder:text-primary-500 focus:border-accent-400 focus:outline-none";

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-primary-400 font-semibold mb-1">
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
  const orb = a?.content?.orb || {};
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
    // Orb config — defaults match LivingOrb's own defaults, so an
    // activity saved without touching these fields still renders as
    // teal 4-7-8.
    orb_accent: orb.accent || "teal",
    breathe_in: Number.isFinite(Number(orb.breathe_in)) ? orb.breathe_in : 4,
    breathe_hold: Number.isFinite(Number(orb.breathe_hold)) ? orb.breathe_hold : 7,
    breathe_out: Number.isFinite(Number(orb.breathe_out)) ? orb.breathe_out : 8,
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
    // Champion scenario fields — 4 option slots regardless of how
    // many the stored content has, so the editor always renders as
    // a clean 4-option quiz.
    scenario_pt: a?.content?.scenario?.pt || "",
    scenario_en: a?.content?.scenario?.en || "",
    scenario_options: padScenarioOptions(a?.content?.options || []),
    scenario_correct_idx: (() => {
      const opts = a?.content?.options || [];
      const i = opts.findIndex((o) => o?.correct === true);
      return i >= 0 ? i : 0;
    })(),
    // Match prep fields
    technique_pt: a?.content?.technique?.pt || "",
    technique_en: a?.content?.technique?.en || "",
    prep_phrases: Array.isArray(a?.content?.phrases)
      ? a.content.phrases.map((p) => ({
          text_en: p.text_en || "",
          text_pt: p.text_pt || "",
          note: p.note || "",
        }))
      : [],
    // Voice of champion fields
    athlete_name: a?.content?.athlete?.name || "",
    athlete_subtitle: a?.content?.athlete?.subtitle || "",
    athlete_photo_url: a?.content?.athlete?.photo_url || "",
    quote_pt: a?.content?.quote?.pt || "",
    quote_en: a?.content?.quote?.en || "",
    voice_background_pt: a?.content?.background?.pt || "",
    voice_background_en: a?.content?.background?.en || "",
  };
}

function padScenarioOptions(options) {
  return [0, 1, 2, 3].map((i) => {
    const o = options[i];
    return {
      label_pt: o?.label?.pt || "",
      label_en: o?.label?.en || "",
      correct: o?.correct === true,
      explain_pt: o?.explanation?.pt || "",
      explain_en: o?.explanation?.en || "",
    };
  });
}

function buildContent(form) {
  if (form.activity_type === "meditation") {
    const content = {};
    // Orb config — always saved so a per-activity change sticks even
    // if the admin never fills in a comprehension question.
    content.orb = {
      accent: form.orb_accent || "teal",
      breathe_in: Number(form.breathe_in) || 4,
      breathe_hold: Number(form.breathe_hold) || 0,
      breathe_out: Number(form.breathe_out) || 8,
    };
    const hasQuestion = form.q_prompt_pt.trim() || form.q_prompt_en.trim();
    if (hasQuestion) {
      content.comprehension_question = {
        prompt: { pt: form.q_prompt_pt, en: form.q_prompt_en },
        options: form.q_options.map((o, i) => ({
          label: { pt: o.pt, en: o.en },
          correct: i === form.q_correct_idx,
        })),
        explanation: { pt: form.q_explain_pt, en: form.q_explain_en },
      };
    }
    return content;
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
  if (form.activity_type === "champion_scenario") {
    // Only keep options with at least one language filled in — an
    // empty slot from the padded 4 shouldn't render as a phantom
    // 4th button on the player.
    const options = form.scenario_options
      .map((o, i) => ({
        idx: i,
        label: { pt: o.label_pt, en: o.label_en },
        correct: i === form.scenario_correct_idx,
        explanation: { pt: o.explain_pt, en: o.explain_en },
        _empty: !o.label_pt && !o.label_en,
      }))
      .filter((o) => !o._empty)
      .map(({ _empty, idx, ...rest }) => {
        void _empty;
        void idx;
        return rest;
      });
    return {
      scenario: { pt: form.scenario_pt, en: form.scenario_en },
      options,
    };
  }
  if (form.activity_type === "match_prep") {
    return {
      technique: { pt: form.technique_pt, en: form.technique_en },
      phrases: form.prep_phrases
        .filter((p) => p.text_en || p.text_pt)
        .map((p) => ({
          text_en: p.text_en || "",
          text_pt: p.text_pt || "",
          note: p.note || "",
        })),
    };
  }
  if (form.activity_type === "voice_of_champion") {
    const content = {
      athlete: {
        name: form.athlete_name || "",
        subtitle: form.athlete_subtitle || "",
        photo_url: form.athlete_photo_url || "",
      },
      quote: { pt: form.quote_pt, en: form.quote_en },
      background: {
        pt: form.voice_background_pt,
        en: form.voice_background_en,
      },
    };
    // Optional comprehension question — same fields as meditation.
    if (form.q_prompt_pt.trim() || form.q_prompt_en.trim()) {
      content.comprehension_question = {
        prompt: { pt: form.q_prompt_pt, en: form.q_prompt_en },
        options: form.q_options.map((o, i) => ({
          label: { pt: o.pt, en: o.en },
          correct: i === form.q_correct_idx,
        })),
        explanation: { pt: form.q_explain_pt, en: form.q_explain_en },
      };
    }
    return content;
  }
  return {};
}

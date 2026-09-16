// src/app/(site)/admin/levels/page.js
//
// Admin UI for the Levels layer.
//
// Two panels:
//   1. Levels editor — table of every level with inline edit fields
//      for display names, description, CEFR target, signal tone,
//      Lucide icon name, is_active / is_specialised. A "New level"
//      row lives at the bottom for adding levels beyond the seeded 8.
//   2. Pillar assignments — matrix of pillars × levels. Each pillar
//      picks its level_id from a dropdown. Save is batched.
//
// Access: platform_admin only (ProtectedRoute + server gate on the
// underlying admin API routes).
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  Loader2,
  Plus,
  Save,
  Trash2,
  Layers,
  Award,
  AlertCircle,
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import Eyebrow from "@/components/ui/eyebrow";
import Panel from "@/components/ui/panel";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Switch from "@/components/ui/switch";

const SIGNAL_TONE_OPTIONS = [
  { value: "english", label: "signal-english (sky)" },
  { value: "mental", label: "signal-mental (violet)" },
  { value: "performance", label: "signal-performance (orange)" },
  { value: "alert", label: "signal-alert (red)" },
  { value: "accent", label: "accent-400 (lime)" },
];

// Common Lucide icons the content team is likely to reach for.
// Free-form typing is allowed — the field is just a text input so
// any valid Lucide component name works.
const ICON_HINTS = [
  "Sprout",
  "Milestone",
  "MapPin",
  "Users",
  "Zap",
  "Radio",
  "Flame",
  "Trophy",
  "Award",
  "Target",
  "Compass",
  "Globe",
  "GraduationCap",
];

export default function LevelsAdminPage() {
  return (
    <ProtectedRoute allowedRoles={["platform_admin"]}>
      <LevelsAdminContent />
    </ProtectedRoute>
  );
}

function LevelsAdminContent() {
  const [levels, setLevels] = useState([]);
  const [pillars, setPillars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(null);

  async function loadAll() {
    setLoading(true);
    setError(null);
    try {
      const [lvlRes, pillarsRes] = await Promise.all([
        fetch("/api/admin/levels"),
        fetch("/api/admin/pillars-level-assignment"),
      ]);
      const lvlJson = await lvlRes.json();
      const pillarsJson = await pillarsRes.json();
      if (!lvlRes.ok) throw new Error(lvlJson.error || "levels_failed");
      if (!pillarsRes.ok) throw new Error(pillarsJson.error || "pillars_failed");
      setLevels(lvlJson.levels || []);
      setPillars(pillarsJson.pillars || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const flashSaved = (msg) => {
    setSavedToast(msg);
    setTimeout(() => setSavedToast(null), 2500);
  };

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-100 transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to admin
        </Link>

        <header className="mb-6">
          <Eyebrow className="mb-1">Global Player · Content admin</Eyebrow>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-primary-50">
            Levels
          </h1>
          <p className="text-sm text-primary-400 mt-2 max-w-2xl leading-relaxed">
            The top-level content hierarchy. Each Level contains N Units
            (4 in the current UI); completing all Units in a Level awards
            a Certificate. Display names, descriptions, tones and icons
            are all editable here.
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-primary-400 py-8">
            <Loader2 className="w-5 h-5 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-card border border-signal-alert/40 bg-signal-alert/10 p-4 text-sm text-signal-alert inline-flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="space-y-6">
            <LevelsEditorPanel
              levels={levels}
              onChange={loadAll}
              saving={saving}
              setSaving={setSaving}
              flashSaved={flashSaved}
            />
            <PillarAssignmentsPanel
              levels={levels}
              pillars={pillars}
              onChange={loadAll}
              saving={saving}
              setSaving={setSaving}
              flashSaved={flashSaved}
            />
          </div>
        )}

        {savedToast && (
          <div className="fixed bottom-6 right-6 px-4 py-2 rounded-full bg-accent-400 text-primary-900 text-sm font-semibold shadow">
            {savedToast}
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Levels editor ────────────────────────────────────────── */

function LevelsEditorPanel({ levels, onChange, saving, setSaving, flashSaved }) {
  const [draft, setDraft] = useState(null); // { id | 'new', ...fields }

  const openEditor = (level) => {
    setDraft({ ...level });
  };
  const openNew = () => {
    setDraft({
      id: "new",
      name: "",
      display_name_pt: "",
      display_name_en: "",
      description_pt: "",
      description_en: "",
      cefr_target: "",
      signal_tone: "accent",
      icon_name: "Trophy",
      is_active: true,
      is_specialised: false,
    });
  };
  const close = () => setDraft(null);

  const save = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.display_name_pt.trim() || !draft.display_name_en.trim()) {
      alert("Name and both display names are required.");
      return;
    }
    setSaving(true);
    try {
      const url =
        draft.id === "new"
          ? "/api/admin/levels"
          : `/api/admin/levels/${draft.id}`;
      const method = draft.id === "new" ? "POST" : "PATCH";
      const body = { ...draft };
      delete body.id;
      delete body.pillar_count;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "save_failed");
      close();
      await onChange();
      flashSaved("Level saved");
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!draft || draft.id === "new") return;
    if (!confirm(`Delete level "${draft.display_name_en}"? This can't be undone.`)) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/levels/${draft.id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "delete_failed");
      close();
      await onChange();
      flashSaved("Level deleted");
    } catch (err) {
      alert(`Delete failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      eyebrow={<span className="inline-flex items-center gap-1.5"><Layers className="w-3 h-3" /> Levels editor</span>}
      title="Level catalogue"
      headerAction={
        <Button variant="primary" size="sm" Icon={Plus} onClick={openNew}>
          New level
        </Button>
      }
    >
      {/* Table — one row per level. Sort_order left-most so the
          progression order is scannable. */}
      <div className="rounded-card border border-primary-700 bg-primary-900 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary-800 border-b border-primary-700">
            <tr>
              <Th className="w-10">#</Th>
              <Th>Name</Th>
              <Th className="hidden md:table-cell">CEFR</Th>
              <Th className="hidden md:table-cell">Tone</Th>
              <Th className="hidden lg:table-cell">Units</Th>
              <Th className="hidden lg:table-cell">Status</Th>
              <Th className="text-right">&nbsp;</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-primary-700">
            {levels.map((lvl) => (
              <tr key={lvl.id} className="hover:bg-primary-800 transition-colors">
                <td className="px-3 py-2 text-primary-500 tabular-nums">{lvl.sort_order}</td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-primary-50">{lvl.display_name_en}</div>
                  <div className="text-[11px] text-primary-400">{lvl.display_name_pt}</div>
                </td>
                <td className="px-3 py-2 hidden md:table-cell text-primary-300 text-xs">
                  {lvl.cefr_target || "—"}
                </td>
                <td className="px-3 py-2 hidden md:table-cell text-primary-300 text-xs">
                  {lvl.signal_tone}
                </td>
                <td className="px-3 py-2 hidden lg:table-cell text-primary-300 text-xs tabular-nums">
                  {lvl.pillar_count}
                </td>
                <td className="px-3 py-2 hidden lg:table-cell text-primary-300 text-xs">
                  {lvl.is_active ? (
                    <span className="text-accent-400">Active</span>
                  ) : (
                    <span className="text-primary-500">Inactive</span>
                  )}
                  {lvl.is_specialised && (
                    <span className="ml-2 text-signal-mental">· Specialised</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => openEditor(lvl)}
                    className="text-xs font-semibold text-accent-400 hover:text-accent-300 transition-colors"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Editor modal — mounts inline when `draft` is set. */}
      {draft && (
        <div className="fixed inset-0 bg-primary-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-primary-panel border border-primary-700 rounded-panel p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-3">
            <h2 className="text-lg font-display font-bold text-primary-50 mb-1">
              {draft.id === "new" ? "New level" : "Edit level"}
            </h2>
            <Input
              label="Name (slug)"
              hint="Lowercase snake_case — used in URLs / internal refs."
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              required
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Display name (PT)"
                value={draft.display_name_pt}
                onChange={(e) => setDraft({ ...draft, display_name_pt: e.target.value })}
                required
              />
              <Input
                label="Display name (EN)"
                value={draft.display_name_en}
                onChange={(e) => setDraft({ ...draft, display_name_en: e.target.value })}
                required
              />
            </div>
            <Input
              label="Description (PT)"
              multiline
              rows={2}
              value={draft.description_pt || ""}
              onChange={(e) => setDraft({ ...draft, description_pt: e.target.value })}
            />
            <Input
              label="Description (EN)"
              multiline
              rows={2}
              value={draft.description_en || ""}
              onChange={(e) => setDraft({ ...draft, description_en: e.target.value })}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="CEFR target"
                hint="e.g. A1, A2+, B1"
                value={draft.cefr_target || ""}
                onChange={(e) => setDraft({ ...draft, cefr_target: e.target.value })}
              />
              <Input
                label="Sort order"
                type="number"
                value={draft.sort_order ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })
                }
              />
            </div>
            <Select
              label="Signal tone"
              options={SIGNAL_TONE_OPTIONS}
              value={draft.signal_tone}
              onChange={(e) => setDraft({ ...draft, signal_tone: e.target.value })}
            />
            <Input
              label="Lucide icon name"
              hint={`Common choices: ${ICON_HINTS.join(", ")}`}
              value={draft.icon_name}
              onChange={(e) => setDraft({ ...draft, icon_name: e.target.value })}
            />
            <Switch
              checked={draft.is_active !== false}
              onChange={(v) => setDraft({ ...draft, is_active: v })}
              label="Active"
              sublabel="Uncheck to hide from the player-facing surface while drafting."
            />
            <Switch
              checked={!!draft.is_specialised}
              onChange={(v) => setDraft({ ...draft, is_specialised: v })}
              label="Specialised"
              sublabel="Reserve for future parallel pathway levels (e.g. post-retirement)."
            />
            <div className="flex items-center gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                Icon={Save}
                loading={saving}
                disabled={saving}
                onClick={save}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={close}
                disabled={saving}
              >
                Cancel
              </Button>
              {draft.id !== "new" && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={saving}
                  className="ml-auto inline-flex items-center gap-1 px-3 py-2 text-xs text-primary-400 hover:text-signal-alert transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Panel>
  );
}

/* ─── Pillar assignments ───────────────────────────────────── */

function PillarAssignmentsPanel({ levels, pillars, onChange, saving, setSaving, flashSaved }) {
  // Local draft map: pillar_id → level_id (or empty string for unassigned).
  const [draft, setDraft] = useState(() => {
    const d = {};
    for (const p of pillars) d[p.id] = p.level_id ?? "";
    return d;
  });
  const [dirty, setDirty] = useState(false);

  // Reset draft when the parent reloads pillars (e.g. after a save).
  useEffect(() => {
    const d = {};
    for (const p of pillars) d[p.id] = p.level_id ?? "";
    setDraft(d);
    setDirty(false);
  }, [pillars]);

  const setAssignment = (pillarId, value) => {
    setDraft((prev) => ({ ...prev, [pillarId]: value }));
    setDirty(true);
  };

  const levelOptions = useMemo(
    () => [
      { value: "", label: "— unassigned —" },
      ...levels.map((l) => ({
        value: String(l.id),
        label: `${l.sort_order}. ${l.display_name_en}`,
      })),
    ],
    [levels],
  );

  const saveAll = async () => {
    setSaving(true);
    try {
      const assignments = Object.entries(draft).map(([pillar_id, level_id]) => ({
        pillar_id,
        level_id: level_id === "" ? null : Number(level_id),
      }));
      const res = await fetch("/api/admin/pillars-level-assignment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignments }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "save_failed");
      if (json.errors && json.errors.length > 0) {
        console.warn("[admin/pillars-level-assignment] partial errors:", json.errors);
      }
      await onChange();
      flashSaved("Assignments saved");
    } catch (err) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Group pillars by edition so an admin managing WC + Pro Path
  // side-by-side sees them separated at a glance.
  const byEdition = useMemo(() => {
    const m = new Map();
    for (const p of pillars) {
      const key = p.edition || "—";
      if (!m.has(key)) m.set(key, []);
      m.get(key).push(p);
    }
    return Array.from(m.entries());
  }, [pillars]);

  return (
    <Panel
      eyebrow={<span className="inline-flex items-center gap-1.5"><Award className="w-3 h-3" /> Unit assignments</span>}
      title="Which Level does each Unit belong to?"
      headerAction={
        <Button
          variant="primary"
          size="sm"
          Icon={Save}
          loading={saving}
          disabled={saving || !dirty}
          onClick={saveAll}
        >
          Save changes
        </Button>
      }
    >
      <p className="text-xs text-primary-400 leading-relaxed">
        Assign each existing Unit to a Level, or leave it unassigned to hide it
        from the player-facing /lesson page. Unassigned Units still show up in
        the admin lesson editor.
      </p>
      <div className="space-y-4">
        {byEdition.map(([edition, pillarsForEdition]) => (
          <div key={edition}>
            <p className="text-[11px] uppercase tracking-label text-primary-400 font-semibold mb-2">
              Edition: {edition}
            </p>
            <div className="rounded-card border border-primary-700 bg-primary-900 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-primary-800 border-b border-primary-700">
                  <tr>
                    <Th>Unit</Th>
                    <Th className="hidden sm:table-cell">Slug</Th>
                    <Th>Level</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary-700">
                  {pillarsForEdition.map((p) => (
                    <tr key={p.id} className="hover:bg-primary-800 transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-semibold text-primary-50 text-sm">
                          {p.display_name || p.name}
                        </div>
                      </td>
                      <td className="px-3 py-2 hidden sm:table-cell text-primary-400 text-xs">
                        {p.name}
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={draft[p.id] ?? ""}
                          onChange={(e) => setAssignment(p.id, e.target.value)}
                          className="bg-primary-900 border border-primary-600 text-primary-100 text-xs rounded-control px-2 py-1.5 focus:border-accent-400 focus:outline-none transition-colors"
                        >
                          {levelOptions.map((o) => (
                            <option
                              key={o.value}
                              value={o.value}
                              className="bg-primary-800 text-primary-50"
                            >
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`text-left text-[10px] uppercase tracking-label text-primary-400 font-semibold px-3 py-2.5 ${className}`}
    >
      {children}
    </th>
  );
}

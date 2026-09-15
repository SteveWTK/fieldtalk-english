// src/app/(site)/admin/leads/templates/page.js
//
// Manage reusable WhatsApp opener templates. Each template has a
// bilingual body ({pt, en}), an optional lead_type scope, and tags
// for organising. Templates surface in the picker on the lead detail
// send bar and in the broadcast-to-leads composer.
//
// Simple list + inline editor pattern (same shape as review-questions
// admin) so a non-technical author can create/edit without leaving
// the page.
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Plus,
  Save,
  Trash2,
  X,
  Pencil,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { t, LEAD_TYPES } from "@/lib/leads/constants";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";

const REQUIRED_LANGS = ["pt", "en"];

const EMPTY_TEMPLATE = () => ({
  name: "",
  body: { pt: "", en: "" },
  lead_type: "",
  active: true,
  tags: "",
});

export default function TemplatesAdminPage() {
  const { lang } = useLanguage();
  const isPt = lang === "pt";
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [filterType, setFilterType] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/lead-templates?include_inactive=true`,
      );
      const json = await res.json();
      if (!res.ok) setError(json.error || "load_failed");
      else setTemplates(json.templates || []);
    } catch {
      setError("network");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!filterType) return templates;
    return templates.filter(
      (t) => !t.lead_type || t.lead_type === filterType,
    );
  }, [templates, filterType]);

  function handleSaved(saved) {
    setTemplates((prev) => {
      const i = prev.findIndex((t) => t.id === saved.id);
      if (i < 0) return [saved, ...prev];
      const copy = prev.slice();
      copy[i] = saved;
      return copy;
    });
    setExpandedId(null);
  }
  function handleDeleted(id) {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    setExpandedId(null);
  }
  function handleCreated(saved) {
    setTemplates((prev) => [saved, ...prev]);
    setCreating(false);
  }

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LeadsAdminHeader
          currentView="detail"
          showNewLeadCta={false}
          showViewSwitcher={false}
          backHref="/admin/leads"
        />

        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black tracking-tight">
              {isPt ? "Modelos de mensagem" : "Message templates"}
            </h2>
            <p className="text-xs text-primary-400 mt-1">
              {isPt
                ? "Openers reutilizáveis para WhatsApp. Use {name}, {org}, {city} como placeholders."
                : "Reusable WhatsApp openers. Use {name}, {org}, {city} as placeholders."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-primary-800 border border-primary-700 text-primary-50 text-xs rounded-full px-3 py-1.5 focus:outline-none"
            >
              <option value="" className="bg-primary-800">
                {t("filters.all", lang)}
              </option>
              {LEAD_TYPES.map((tCode) => (
                <option key={tCode} value={tCode} className="bg-primary-800">
                  {t(`types.${tCode}`, lang)}
                </option>
              ))}
            </select>
            {!creating && (
              <Button
                variant="primary"
                size="sm"
                Icon={Plus}
                onClick={() => {
                  setCreating(true);
                  setExpandedId(null);
                }}
              >
                {isPt ? "Novo modelo" : "New template"}
              </Button>
            )}
          </div>
        </div>

        {creating && (
          <div className="mb-4 rounded-card border border-accent-400/30 bg-accent-400/10 p-4">
            <TemplateEditor
              initial={EMPTY_TEMPLATE()}
              mode="create"
              lang={lang}
              onSaved={handleCreated}
              onCancel={() => setCreating(false)}
            />
          </div>
        )}

        {loading ? (
          <div className="inline-flex items-center gap-2 text-sm text-primary-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            {isPt ? "Carregando…" : "Loading…"}
          </div>
        ) : error ? (
          <div className="rounded-card border border-signal-alert/40 bg-signal-alert/10 p-3 text-sm text-signal-alert">
            {t("errors.loadFailed", lang)}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-primary-500">
            {isPt ? "Nenhum modelo ainda." : "No templates yet."}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((tpl) => (
              <TemplateRow
                key={tpl.id}
                template={tpl}
                lang={lang}
                isExpanded={expandedId === tpl.id}
                onToggle={() =>
                  setExpandedId(expandedId === tpl.id ? null : tpl.id)
                }
                onSaved={handleSaved}
                onDeleted={handleDeleted}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function TemplateRow({ template, lang, isExpanded, onToggle, onSaved, onDeleted }) {
  const isPt = lang === "pt";
  return (
    <div className="rounded-card border border-primary-700 bg-primary-800 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3 hover:bg-primary-panel transition-colors text-left"
      >
        <div
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
            template.active
              ? "bg-accent-400/15 text-accent-400"
              : "bg-primary-900 text-primary-500"
          }`}
        >
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{template.name}</h3>
          <p className="text-[11px] text-primary-400 mt-0.5">
            {template.lead_type ? (
              t(`types.${template.lead_type}`, lang)
            ) : (
              <span className="text-primary-500">
                {isPt ? "Todos os tipos" : "All types"}
              </span>
            )}
            {template.tags && template.tags.length > 0 && (
              <>
                {" · "}
                {template.tags.map((tag) => `#${tag}`).join(" ")}
              </>
            )}
            {!template.active && (
              <>
                {" · "}
                <span className="text-primary-500">
                  {isPt ? "inativo" : "inactive"}
                </span>
              </>
            )}
          </p>
        </div>
        <Pencil className="w-4 h-4 text-primary-500" />
      </button>
      {isExpanded && (
        <div className="border-t border-primary-700 p-4 bg-black/25">
          <TemplateEditor
            initial={{
              name: template.name,
              body: template.body || { pt: "", en: "" },
              lead_type: template.lead_type || "",
              active: template.active !== false,
              tags: Array.isArray(template.tags)
                ? template.tags.join(", ")
                : "",
            }}
            templateId={template.id}
            mode="edit"
            lang={lang}
            onSaved={onSaved}
            onDeleted={onDeleted}
            onCancel={onToggle}
          />
        </div>
      )}
    </div>
  );
}

function TemplateEditor({
  initial,
  templateId,
  mode,
  lang,
  onSaved,
  onDeleted,
  onCancel,
}) {
  const isPt = lang === "pt";
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState(null);

  function set(k, v) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        name: form.name,
        body: form.body,
        lead_type: form.lead_type || null,
        active: form.active,
        tags: form.tags,
      };
      const res = await fetch(
        mode === "create"
          ? `/api/admin/lead-templates`
          : `/api/admin/lead-templates/${templateId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setMsg({
          tone: "error",
          text:
            (Array.isArray(json.details) && json.details.join(" · ")) ||
            json.message ||
            json.error ||
            "Save failed",
        });
      } else {
        setMsg({
          tone: "success",
          text: isPt ? "Salvo." : "Saved.",
        });
        onSaved(json.template);
      }
    } catch {
      setMsg({
        tone: "error",
        text: isPt ? "Erro de rede" : "Network error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function del() {
    if (
      !confirm(
        isPt
          ? "Excluir este modelo? Envios feitos com ele continuam registrados."
          : "Delete this template? Previous sends stay in the audit trail.",
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/lead-templates/${templateId}`, {
        method: "DELETE",
      });
      if (res.ok) onDeleted(templateId);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-3">
      <Input
        label={isPt ? "Nome interno" : "Internal name"}
        type="text"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder={
          isPt
            ? "Ex: Diretor de academia — intro morna"
            : "e.g. Academy director — warm intro"
        }
      />
      <Select
        label={isPt ? "Tipo de lead (opcional)" : "Lead type (optional)"}
        hint={
          isPt
            ? "Deixe vazio para aplicar a todos os tipos."
            : "Leave empty to apply to all lead types."
        }
        value={form.lead_type}
        onChange={(e) => set("lead_type", e.target.value)}
      >
        <option value="" className="bg-primary-800">
          {isPt ? "Todos" : "All types"}
        </option>
        {LEAD_TYPES.map((tCode) => (
          <option key={tCode} value={tCode} className="bg-primary-800">
            {t(`types.${tCode}`, lang)}
          </option>
        ))}
      </Select>

      <EditorField
        label={isPt ? "Corpo (bilíngue)" : "Body (bilingual)"}
        hint={
          isPt
            ? "Placeholders: {name} = primeiro nome · {org} = organização · {city} = cidade"
            : "Placeholders: {name} = first name · {org} = organisation · {city} = city"
        }
      >
        {REQUIRED_LANGS.map((l) => (
          <BodyArea
            key={l}
            langLabel={l.toUpperCase()}
            value={form.body?.[l] ?? ""}
            onChange={(v) =>
              set("body", { ...form.body, [l]: v })
            }
          />
        ))}
      </EditorField>

      <Input
        label="Tags"
        type="text"
        value={form.tags}
        onChange={(e) => set("tags", e.target.value)}
        placeholder="warm, event-carioca, hot"
      />

      <label className="inline-flex items-center gap-2 text-sm text-primary-300 cursor-pointer">
        <input
          type="checkbox"
          checked={form.active !== false}
          onChange={(e) => set("active", e.target.checked)}
          className="accent-accent-400"
        />
        {isPt ? "Ativo (visível nos seletores)" : "Active (shown in pickers)"}
      </label>

      <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-primary-700">
        <Button
          variant="primary"
          size="md"
          Icon={Save}
          loading={saving}
          disabled={saving || deleting}
          onClick={save}
        >
          {isPt ? "Salvar" : "Save"}
        </Button>
        <Button
          variant="secondary"
          size="md"
          Icon={X}
          disabled={saving || deleting}
          onClick={onCancel}
        >
          {isPt ? "Cancelar" : "Cancel"}
        </Button>
        {mode === "edit" && (
          <div className="ml-auto">
            <Button
              variant="danger"
              size="sm"
              Icon={Trash2}
              loading={deleting}
              disabled={saving || deleting}
              onClick={del}
            >
              {isPt ? "Excluir" : "Delete"}
            </Button>
          </div>
        )}
        {msg && (
          <div
            className={`inline-flex items-center gap-1.5 text-xs font-medium ${
              msg.tone === "error" ? "text-signal-alert" : "text-accent-400"
            }`}
          >
            {msg.tone === "error" ? (
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

function EditorField({ label, hint, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-primary-300 font-semibold mb-1">
        {label}
      </label>
      {hint && <p className="text-[11px] text-primary-500 mb-1.5">{hint}</p>}
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function BodyArea({ langLabel, value, onChange }) {
  return (
    <div>
      <span className="text-[10px] uppercase tracking-wider text-primary-400 font-bold">
        {langLabel}
      </span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full bg-primary-900 border border-primary-700 rounded-control px-3 py-2 text-sm text-primary-50 placeholder:text-primary-500 focus:border-accent-400 focus:outline-none resize-y mt-1"
      />
    </div>
  );
}

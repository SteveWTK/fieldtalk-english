// src/app/(site)/admin/leads/broadcast/new/page.js
//
// Compose + send-now for a lead-targeted WhatsApp broadcast. Reached
// via the "Broadcast filtered leads" button on /admin/leads. The
// current filter comes in as a query string — we mirror it to the
// count endpoint so the admin sees a live "will send to N leads"
// preview before sending.
//
// One-shot flow: compose → send. No save-draft. The dispatcher cron
// picks up the resulting whatsapp_broadcast_recipients rows at
// ~7/minute and works through them at the standard 8s stagger.

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Send,
  AlertCircle,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { t } from "@/lib/leads/constants";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import Chip from "@/components/ui/chip";

export default function LeadBroadcastComposePage() {
  const { lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPt = lang === "pt";

  // Filter mirrored from the URL. We display it read-only — admins
  // adjust filters on /admin/leads first, then come here to compose.
  const filter = useMemo(() => filterFromSearch(searchParams), [searchParams]);

  const [name, setName] = useState("");
  const [bodyPt, setBodyPt] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [language, setLanguage] = useState("pt");
  const [templates, setTemplates] = useState([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [count, setCount] = useState(null);
  const [countLoading, setCountLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Live count preview — refetch whenever the filter changes (it
  // doesn't change on this page, but the effect is stable + honest).
  useEffect(() => {
    setCountLoading(true);
    (async () => {
      try {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries(filter)) {
          if (v != null && v !== "" && v.length !== 0) {
            params.set(k, Array.isArray(v) ? v.join(",") : String(v));
          }
        }
        const res = await fetch(
          `/api/admin/leads/broadcast?${params.toString()}`,
        );
        const json = await res.json();
        if (res.ok) setCount(json.count ?? 0);
      } finally {
        setCountLoading(false);
      }
    })();
  }, [filter]);

  // Load templates (any lead_type) once — we don't type-filter here
  // because the broadcast may span multiple lead types, so all
  // templates are relevant.
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/lead-templates");
        const json = await res.json();
        if (res.ok) setTemplates(json.templates || []);
      } catch {
        /* silent */
      }
    })();
  }, []);

  function applyTemplate(tpl) {
    // For broadcast we don't have a specific lead context; render
    // with an empty lead object so placeholders stay as-is (no
    // {name} substitution — the raw templated text lands in both
    // language boxes so the admin can review the placeholders
    // before send).
    if (tpl.body?.pt) setBodyPt(tpl.body.pt);
    if (tpl.body?.en) setBodyEn(tpl.body.en);
    setTemplatesOpen(false);
  }

  async function handleSend() {
    setError(null);
    if (name.trim().length < 3) {
      setError(isPt ? "Nome do broadcast obrigatório" : "Broadcast name required");
      return;
    }
    const body = {};
    if (bodyPt.trim()) body.pt = bodyPt.trim();
    if (bodyEn.trim()) body.en = bodyEn.trim();
    if (!body[language]) {
      setError(
        isPt
          ? `Corpo em ${language.toUpperCase()} vazio.`
          : `${language.toUpperCase()} body is empty.`,
      );
      return;
    }
    if (
      !confirm(
        isPt
          ? `Enviar para ${count} lead(s) filtrados?`
          : `Send to ${count} filtered lead(s)?`,
      )
    ) {
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/admin/leads/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          body,
          filter,
          language,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "Send failed");
        setSending(false);
        return;
      }
      // Success — return to the leads list. The dispatcher cron will
      // work through recipients over the next few minutes.
      router.push("/admin/leads?broadcast_ok=1");
    } catch {
      setError(isPt ? "Erro de rede" : "Network error");
      setSending(false);
    }
  }

  const filterEntries = describeFilter(filter, lang);

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LeadsAdminHeader
          currentView="detail"
          showNewLeadCta={false}
          showViewSwitcher={false}
          backHref="/admin/leads"
        />

        <div className="mb-6">
          <h2 className="text-xl font-black tracking-tight">
            {isPt
              ? "Broadcast para leads filtrados"
              : "Broadcast to filtered leads"}
          </h2>
          <p className="text-xs text-primary-400 mt-1">
            {isPt
              ? "Compõe + envia agora. O dispatcher trabalha os envios com intervalo de 8s dentro da janela 8h–21h BRT."
              : "Composes + sends now. Dispatcher works through recipients at 8s intervals inside the 8am–9pm BRT window."}
          </p>
        </div>

        {/* Recipient preview */}
        <div className="mb-4 rounded-card border border-accent-400/30 bg-accent-400/[0.04] p-4">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="text-sm text-primary-300">
              {isPt ? "Filtros aplicados:" : "Filter applied:"}
            </p>
            <p className="text-2xl font-black text-accent-400 tabular-nums">
              {countLoading ? (
                <Loader2 className="w-5 h-5 animate-spin inline-block" />
              ) : (
                <>
                  {count}{" "}
                  <span className="text-xs text-primary-400 font-normal">
                    {isPt ? "lead(s)" : "lead(s)"}
                  </span>
                </>
              )}
            </p>
          </div>
          {filterEntries.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {filterEntries.map((e, i) => (
                <span
                  key={i}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium bg-primary-800 text-primary-300 border border-primary-700"
                >
                  {e}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-primary-500 mt-2">
              {isPt
                ? "Nenhum filtro — todos os leads com telefone e sem opt-out."
                : "No filter — every lead with a phone and no opt-out."}
            </p>
          )}
        </div>

        {/* Compose */}
        <div className="space-y-4">
          <Input
            label={isPt ? "Nome interno" : "Internal name"}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              isPt
                ? "Ex: Convite academias — setembro"
                : "e.g. Academies invite — September"
            }
            maxLength={120}
          />

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs uppercase tracking-wider text-primary-300 font-semibold">
                {isPt ? "Idioma de envio" : "Send language"}
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setTemplatesOpen((v) => !v)}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-800 hover:bg-primary-700 text-primary-100 border border-primary-700 text-xs font-semibold"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isPt ? "Aplicar modelo" : "Apply template"}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {templatesOpen && (
                  <TemplatePickerPopover
                    templates={templates}
                    lang={lang}
                    onPick={applyTemplate}
                    onClose={() => setTemplatesOpen(false)}
                  />
                )}
              </div>
            </div>
            <div className="inline-flex gap-1 mb-2">
              {["pt", "en"].map((code) => (
                <Chip
                  key={code}
                  as="button"
                  size="sm"
                  selected={language === code}
                  onClick={() => setLanguage(code)}
                  className="uppercase"
                >
                  {code}
                </Chip>
              ))}
            </div>
            <p className="text-[11px] text-primary-400 mb-2">
              {isPt
                ? "Todos os leads recebem no idioma selecionado. (Leads não têm preferência de idioma.)"
                : "All leads receive the selected language. (Leads have no language preference set.)"}
            </p>
          </div>

          <BodyEditor
            label="PT"
            value={bodyPt}
            onChange={setBodyPt}
            active={language === "pt"}
          />
          <BodyEditor
            label="EN"
            value={bodyEn}
            onChange={setBodyEn}
            active={language === "en"}
          />

          {error && (
            <div className="rounded-card border border-signal-alert/40 bg-signal-alert/10 p-3 text-sm text-signal-alert inline-flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2 border-t border-primary-700">
            <Button
              variant="primary"
              size="md"
              Icon={Send}
              loading={sending}
              disabled={countLoading || (count ?? 0) === 0}
              onClick={handleSend}
            >
              {isPt
                ? `Enviar para ${count ?? "…"} lead(s)`
                : `Send to ${count ?? "…"} lead(s)`}
            </Button>
            <Button
              variant="secondary"
              size="md"
              as="a"
              href="/admin/leads"
            >
              {t("form.cancel", lang)}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function BodyEditor({ label, value, onChange, active }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] uppercase tracking-wider text-primary-400 font-bold">
          {label}
        </span>
        {active && (
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold bg-accent-400/20 text-accent-300 uppercase tracking-wider">
            Send
          </span>
        )}
      </div>
      <Input
        multiline
        rows={6}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="{name}, ..."
        className={active ? "" : "opacity-70"}
      />
    </div>
  );
}

function TemplatePickerPopover({ templates, lang, onPick, onClose }) {
  const isPt = lang === "pt";
  return (
    <>
      <div
        className="fixed inset-0 z-[40]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="absolute right-0 top-full mt-1 w-80 max-h-80 overflow-y-auto rounded-xl bg-primary-800 border border-primary-600 shadow-2xl z-[41] p-1.5"
        role="menu"
      >
        {templates.length === 0 ? (
          <div className="p-3 text-xs text-primary-400">
            {isPt ? (
              <>
                Nenhum modelo ativo.{" "}
                <Link
                  href="/admin/leads/templates"
                  className="underline hover:text-primary-50"
                >
                  Criar
                </Link>
              </>
            ) : (
              <>
                No active templates.{" "}
                <Link
                  href="/admin/leads/templates"
                  className="underline hover:text-primary-50"
                >
                  Create
                </Link>
              </>
            )}
          </div>
        ) : (
          templates.map((tpl) => (
            <button
              key={tpl.id}
              type="button"
              onClick={() => onPick(tpl)}
              className="w-full text-left px-3 py-2 rounded-control hover:bg-primary-700 transition-colors"
            >
              <div className="font-semibold text-xs text-primary-50 truncate">
                {tpl.name}
              </div>
              <div className="text-[10px] text-primary-500 mt-0.5 line-clamp-2">
                {tpl.body?.[lang] || tpl.body?.pt || tpl.body?.en || ""}
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}

/* ─── helpers ─────────────────────────────────────────────────── */

function filterFromSearch(sp) {
  return {
    stages: sp.get("stage")?.split(",").filter(Boolean) || null,
    types: sp.get("type")?.split(",").filter(Boolean) || null,
    sources: sp.get("source")?.split(",").filter(Boolean) || null,
    owner: sp.get("owner") || null,
    tag: sp.get("tag") || null,
    has_email:
      sp.get("has_email") === "true"
        ? true
        : sp.get("has_email") === "false"
          ? false
          : null,
  };
}

function describeFilter(filter, lang) {
  const parts = [];
  if (filter.stages && filter.stages.length > 0) {
    parts.push(
      `${t("filters.stage", lang)}: ${filter.stages
        .map((s) => t(`stages.${s}`, lang))
        .join(", ")}`,
    );
  }
  if (filter.types && filter.types.length > 0) {
    parts.push(
      `${t("filters.type", lang)}: ${filter.types
        .map((s) => t(`types.${s}`, lang))
        .join(", ")}`,
    );
  }
  if (filter.sources && filter.sources.length > 0) {
    parts.push(
      `${t("filters.source", lang)}: ${filter.sources
        .map((s) => t(`sources.${s}`, lang))
        .join(", ")}`,
    );
  }
  if (filter.owner) {
    parts.push(`${t("filters.owner", lang)}: ${filter.owner === "unassigned" ? t("detail.notAssigned", lang) : filter.owner.slice(0, 8)}…`);
  }
  if (filter.tag) parts.push(`${t("filters.tag", lang)}: #${filter.tag}`);
  if (filter.has_email === true)
    parts.push(t("filters.hasEmail", lang));
  return parts;
}

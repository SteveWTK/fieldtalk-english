// src/app/(site)/admin/leads/import/page.js
//
// Bulk CSV import for leads. Three-step flow:
//   1. Upload CSV → preview
//   2. Review parsed rows + duplicate counts, adjust column mapping
//      + duplicate strategy
//   3. Commit → redirected back to /admin/leads with a banner
//
// Kept single-page (no wizard steps as separate routes) so the admin
// can jump back and forth freely.
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Upload,
  AlertCircle,
  CheckCircle2,
  FileText,
  X,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";
import Panel from "@/components/ui/panel";
import Button from "@/components/ui/button";

export default function LeadsImportPage() {
  const { lang } = useLanguage();
  const isPt = lang === "pt";
  const router = useRouter();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [strategy, setStrategy] = useState("skip");
  const [error, setError] = useState(null);

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/leads/import/preview", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "preview_failed");
        setPreview(null);
      } else {
        setPreview(json);
      }
    } catch {
      setError("network");
    } finally {
      setLoading(false);
    }
  }

  async function handleCommit() {
    if (!preview) return;
    if (
      !confirm(
        isPt
          ? `Confirmar importação? Serão criados/atualizados até ${preview.summary.new + (strategy === "update" ? preview.summary.duplicates : strategy === "create" ? preview.summary.duplicates : 0)} leads.`
          : `Confirm import? Up to ${preview.summary.new + (strategy === "update" ? preview.summary.duplicates : strategy === "create" ? preview.summary.duplicates : 0)} leads will be created/updated.`,
      )
    )
      return;
    setCommitting(true);
    try {
      const res = await fetch("/api/admin/leads/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: preview.rows,
          duplicate_strategy: strategy,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "commit_failed");
      } else {
        const total = (json.results.inserted || 0) + (json.results.updated || 0);
        router.push(`/admin/leads?imported=${total}`);
      }
    } catch {
      setError("network");
    } finally {
      setCommitting(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
  }

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LeadsAdminHeader
          currentView="new"
          showNewLeadCta={false}
          showViewSwitcher={false}
          backHref="/admin/leads"
        />

        <div className="mb-6">
          <h2 className="text-xl font-black tracking-tight">
            {isPt ? "Importar leads (CSV)" : "Import leads (CSV)"}
          </h2>
          <p className="text-xs text-primary-400 mt-1">
            {isPt
              ? "Suba uma planilha com headers na primeira linha. Colunas comuns são reconhecidas automaticamente. Até 2.000 linhas por importação."
              : "Upload a spreadsheet with headers on the first row. Common columns are auto-detected. Up to 2,000 rows per import."}
          </p>
          <p className="text-[11px] text-primary-500 mt-1">
            {isPt
              ? "Colunas reconhecidas: name, email, phone, type, source, organization, role, city, state, country, tags, positions, age, english_level, summary."
              : "Recognised columns: name, email, phone, type, source, organization, role, city, state, country, tags, positions, age, english_level, summary."}
          </p>
        </div>

        {!preview && (
          <form onSubmit={handleUpload} className="space-y-3">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-primary-300 font-semibold mb-2 block">
                {isPt ? "Arquivo CSV" : "CSV file"}
              </span>
              <div className="flex items-center gap-2">
                <label className="flex-1 inline-flex items-center gap-2 px-3 py-2 rounded-control bg-primary-900 border border-primary-700 cursor-pointer hover:bg-primary-800 transition-colors">
                  <FileText className="w-4 h-4 text-primary-400" />
                  <span className="text-sm text-primary-100 truncate">
                    {file
                      ? file.name
                      : isPt
                        ? "Escolher arquivo…"
                        : "Choose file…"}
                  </span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
            </label>
            <Button
              type="submit"
              variant="primary"
              size="md"
              Icon={Upload}
              loading={loading}
              disabled={!file || loading}
            >
              {isPt ? "Pré-visualizar" : "Preview"}
            </Button>
          </form>
        )}

        {error && (
          <div className="mt-4 rounded-card border border-signal-alert/40 bg-signal-alert/10 p-3 text-sm text-signal-alert inline-flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {preview && (
          <PreviewPane
            preview={preview}
            strategy={strategy}
            onStrategyChange={setStrategy}
            onCommit={handleCommit}
            onReset={reset}
            committing={committing}
            lang={lang}
          />
        )}
      </main>
    </div>
  );
}

function PreviewPane({
  preview,
  strategy,
  onStrategyChange,
  onCommit,
  onReset,
  committing,
  lang,
}) {
  const isPt = lang === "pt";
  const summary = preview.summary;
  const rows = preview.rows;
  // Show max 100 rows in the preview table — the count summary
  // covers the rest.
  const displayRows = useMemo(() => rows.slice(0, 100), [rows]);
  const hasMore = rows.length > displayRows.length;

  return (
    <div className="mt-4 space-y-4">
      {/* Summary chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryChip
          label={isPt ? "Total" : "Total"}
          value={summary.total}
          tone="neutral"
        />
        <SummaryChip
          label={isPt ? "Novos" : "New"}
          value={summary.new}
          tone="emerald"
        />
        <SummaryChip
          label={isPt ? "Duplicados" : "Duplicates"}
          value={summary.duplicates}
          tone="amber"
        />
        <SummaryChip
          label={isPt ? "Com erros" : "With errors"}
          value={summary.errors}
          tone="red"
        />
      </div>

      {/* Duplicate strategy */}
      {summary.duplicates > 0 && (
        <Panel
          title={isPt ? "Estratégia para duplicados" : "Duplicate strategy"}
          padding="p-4"
          gap="space-y-3"
        >
          <div className="space-y-2 text-sm">
            <StrategyOption
              value="skip"
              current={strategy}
              onChange={onStrategyChange}
              title={isPt ? "Ignorar duplicados" : "Skip duplicates"}
              body={
                isPt
                  ? "Mantém o lead existente intocado. Padrão seguro."
                  : "Leaves the existing lead untouched. Safe default."
              }
            />
            <StrategyOption
              value="update"
              current={strategy}
              onChange={onStrategyChange}
              title={isPt ? "Atualizar duplicados" : "Update duplicates"}
              body={
                isPt
                  ? "Sobrescreve os campos do lead existente com os valores do CSV."
                  : "Overwrites existing lead fields with CSV values."
              }
            />
            <StrategyOption
              value="create"
              current={strategy}
              onChange={onStrategyChange}
              title={isPt ? "Criar mesmo assim" : "Create anyway"}
              body={
                isPt
                  ? "Insere uma nova linha (limpa o identificador em conflito)."
                  : "Inserts a new row (clears the conflicting identifier)."
              }
            />
          </div>
        </Panel>
      )}

      {/* Preview table */}
      <div className="rounded-card border border-primary-700 bg-primary-panel overflow-hidden">
        <div className="border-b border-primary-700 px-3 py-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-primary-400 font-semibold">
            {isPt ? "Pré-visualização das linhas" : "Row preview"}
          </p>
          {hasMore && (
            <p className="text-[11px] text-primary-500">
              {isPt
                ? `Mostrando 100 de ${rows.length}`
                : `Showing 100 of ${rows.length}`}
            </p>
          )}
        </div>
        <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-primary-700 sticky top-0 bg-primary-800/95 backdrop-blur">
              <tr>
                <th className="text-left text-[10px] uppercase tracking-wider text-primary-400 font-semibold px-3 py-2">
                  #
                </th>
                <th className="text-left text-[10px] uppercase tracking-wider text-primary-400 font-semibold px-3 py-2">
                  {isPt ? "Nome" : "Name"}
                </th>
                <th className="text-left text-[10px] uppercase tracking-wider text-primary-400 font-semibold px-3 py-2">
                  {isPt ? "Contato" : "Contact"}
                </th>
                <th className="text-left text-[10px] uppercase tracking-wider text-primary-400 font-semibold px-3 py-2">
                  {isPt ? "Tipo" : "Type"}
                </th>
                <th className="text-left text-[10px] uppercase tracking-wider text-primary-400 font-semibold px-3 py-2">
                  {isPt ? "Organização" : "Organization"}
                </th>
                <th className="text-left text-[10px] uppercase tracking-wider text-primary-400 font-semibold px-3 py-2">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary-700">
              {displayRows.map((row, i) => (
                <tr
                  key={i}
                  className={
                    row._errors?.length > 0
                      ? "bg-signal-alert/[0.04]"
                      : row._duplicate
                        ? "bg-signal-performance/[0.03]"
                        : ""
                  }
                >
                  <td className="px-3 py-1.5 text-primary-500 tabular-nums text-xs">
                    {row.line}
                  </td>
                  <td className="px-3 py-1.5 text-primary-100 truncate max-w-[200px]">
                    {row.full_name || (
                      <span className="text-signal-alert italic">—</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-primary-300">
                    {row.phone_e164 && <div>{row.phone_e164}</div>}
                    {row.email && <div className="truncate">{row.email}</div>}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-primary-300">
                    {row.lead_type}
                  </td>
                  <td className="px-3 py-1.5 text-xs text-primary-300 truncate max-w-[180px]">
                    {row.organization_name || "—"}
                  </td>
                  <td className="px-3 py-1.5 text-xs">
                    {row._errors?.length > 0 ? (
                      <span
                        className="inline-flex items-center gap-1 text-signal-alert"
                        title={row._errors.join(" · ")}
                      >
                        <AlertCircle className="w-3 h-3" />
                        {isPt ? "Erro" : "Error"}
                      </span>
                    ) : row._duplicate ? (
                      <span className="inline-flex items-center gap-1 text-signal-performance">
                        {isPt ? "Duplicado" : "Duplicate"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-accent-400">
                        <CheckCircle2 className="w-3 h-3" />
                        {isPt ? "Novo" : "New"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="primary"
          size="md"
          Icon={CheckCircle2}
          loading={committing}
          onClick={onCommit}
          disabled={
            committing ||
            summary.new + (strategy === "skip" ? 0 : summary.duplicates) === 0
          }
        >
          {isPt ? "Confirmar importação" : "Confirm import"}
        </Button>
        <Button
          variant="secondary"
          size="md"
          Icon={X}
          onClick={onReset}
          disabled={committing}
        >
          {isPt ? "Recomeçar" : "Start over"}
        </Button>
        <Link
          href="/admin/leads"
          className="px-3 py-2 text-primary-300 hover:text-primary-50 text-sm"
        >
          {isPt ? "Cancelar" : "Cancel"}
        </Link>
      </div>
    </div>
  );
}

function SummaryChip({ label, value, tone }) {
  const toneClass =
    tone === "emerald"
      ? "border-accent-400/30 bg-accent-400/[0.05] text-accent-300"
      : tone === "amber"
        ? "border-signal-performance/30 bg-signal-performance/[0.05] text-signal-performance"
        : tone === "red"
          ? "border-signal-alert/40 bg-signal-alert/[0.05] text-signal-alert"
          : "border-primary-700 bg-primary-panel text-primary-300";
  return (
    <div className={`rounded-card border p-3 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-70 font-semibold">
        {label}
      </p>
      <p className="text-2xl font-black tabular-nums mt-1">{value}</p>
    </div>
  );
}

function StrategyOption({ value, current, onChange, title, body }) {
  return (
    <label className="flex items-start gap-2 cursor-pointer">
      <input
        type="radio"
        name="dup-strategy"
        value={value}
        checked={current === value}
        onChange={() => onChange(value)}
        className="accent-accent-400 mt-0.5"
      />
      <div>
        <p className="text-sm font-semibold text-primary-50">{title}</p>
        <p className="text-[11px] text-primary-400">{body}</p>
      </div>
    </label>
  );
}

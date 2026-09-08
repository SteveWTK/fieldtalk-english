// src/app/(site)/admin/leads/page.js
//
// Leads list view — the primary work surface for Paul + the sales
// team. One row per lead, filterable by stage/type/source/owner/tag
// /next-action-window/has-phone, searchable across name/org/phone/
// email. Top strip shows pipeline metrics (by stage + this week).
//
// Rows are clickable → open the detail page. Quick stage-move
// dropdown lives on each row so Paul can advance a lead without
// opening detail. WhatsApp icon opens the detail with a shortcut
// to focus the send box.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Search,
  X,
  Phone,
  Mail,
  MessageCircle,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  t,
  LEAD_STAGES,
  LEAD_TYPES,
  LEAD_SOURCES,
  STAGE_TONES,
} from "@/lib/leads/constants";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";
import {
  TypeBadge,
  TagPill,
  RelativeTime,
} from "@/components/admin/leads/LeadBadges";

export default function LeadsListPage() {
  const { lang } = useLanguage();

  const [leads, setLeads] = useState([]);
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state — plain object so bulk-reset is trivial. Each is
  // encoded to the query string when fetching.
  const [filters, setFilters] = useState({
    q: "",
    stage: "",       // comma-separated for multi
    type: "",
    source: "",
    owner: "",
    tag: "",
    has_phone: "",
    next_action: "",
  });
  const [debouncedQ, setDebouncedQ] = useState("");

  // Debounce the search box so we don't fire a network round on every
  // keystroke. 250ms feels responsive without being wasteful.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(filters.q), 250);
    return () => clearTimeout(id);
  }, [filters.q]);

  // Load owners once — dropdown is stable across filter changes.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/leads/owners");
        const json = await res.json();
        if (!cancelled && res.ok) setOwners(json.owners || []);
      } catch {
        // Owners are UX-nice-to-have; missing owners just means the
        // dropdown shows only "unassigned" + the current filter value.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch leads when filters or debounced search change.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const params = new URLSearchParams();
        for (const [k, v] of Object.entries({
          ...filters,
          q: debouncedQ,
        })) {
          if (v) params.set(k, v);
        }
        const res = await fetch(`/api/admin/leads?${params.toString()}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "load_failed");
        } else {
          setLeads(json.leads || []);
        }
      } catch {
        if (!cancelled) setError("network");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // We intentionally depend on individual filter FIELDS rather than
    // the whole `filters` object — depending on the object would refetch
    // on every keystroke because `q` changes before the debounced value
    // does.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    debouncedQ,
    filters.stage,
    filters.type,
    filters.source,
    filters.owner,
    filters.tag,
    filters.has_phone,
    filters.next_action,
  ]);

  const metrics = useMemo(() => computeMetrics(leads), [leads]);

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }
  function clearFilters() {
    setFilters({
      q: "",
      stage: "",
      type: "",
      source: "",
      owner: "",
      tag: "",
      has_phone: "",
      next_action: "",
    });
  }
  const hasActiveFilters =
    filters.stage ||
    filters.type ||
    filters.source ||
    filters.owner ||
    filters.tag ||
    filters.has_phone ||
    filters.next_action ||
    filters.q;

  // Handle quick stage change from a row — patch server + reflect
  // optimistically in state.
  async function handleStageChange(leadId, newStage) {
    const prev = leads;
    setLeads((cur) =>
      cur.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l)),
    );
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: newStage }),
      });
      if (!res.ok) {
        // Roll back.
        setLeads(prev);
      }
    } catch {
      setLeads(prev);
    }
  }

  async function handleDelete(leadId) {
    if (!confirm(t("detail.deleteConfirm", lang))) return;
    const prev = leads;
    setLeads((cur) => cur.filter((l) => l.id !== leadId));
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "DELETE",
      });
      if (!res.ok) setLeads(prev);
    } catch {
      setLeads(prev);
    }
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LeadsAdminHeader currentView="list" />

        {/* Metrics strip */}
        <MetricsStrip metrics={metrics} lang={lang} />

        {/* Filters */}
        <div className="mt-6 mb-4 rounded-2xl border border-white/10 bg-white/[0.02] p-3 space-y-3">
          {/* Search + clear */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder={t("filters.search", lang)}
                value={filters.q}
                onChange={(e) => setFilter("q", e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/50 focus:outline-none"
              />
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs text-white/60 hover:text-white rounded-lg hover:bg-white/[0.05] transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                {t("filters.clearFilters", lang)}
              </button>
            )}
          </div>

          {/* Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <FilterSelect
              label={t("filters.stage", lang)}
              value={filters.stage}
              onChange={(v) => setFilter("stage", v)}
              options={[
                { value: "", label: t("filters.all", lang) },
                ...LEAD_STAGES.map((s) => ({
                  value: s,
                  label: t(`stages.${s}`, lang),
                })),
              ]}
            />
            <FilterSelect
              label={t("filters.type", lang)}
              value={filters.type}
              onChange={(v) => setFilter("type", v)}
              options={[
                { value: "", label: t("filters.all", lang) },
                ...LEAD_TYPES.map((s) => ({
                  value: s,
                  label: t(`types.${s}`, lang),
                })),
              ]}
            />
            <FilterSelect
              label={t("filters.source", lang)}
              value={filters.source}
              onChange={(v) => setFilter("source", v)}
              options={[
                { value: "", label: t("filters.all", lang) },
                ...LEAD_SOURCES.map((s) => ({
                  value: s,
                  label: t(`sources.${s}`, lang),
                })),
              ]}
            />
            <FilterSelect
              label={t("filters.owner", lang)}
              value={filters.owner}
              onChange={(v) => setFilter("owner", v)}
              options={[
                { value: "", label: t("filters.all", lang) },
                { value: "unassigned", label: t("detail.notAssigned", lang) },
                ...owners.map((o) => ({
                  value: o.id,
                  label: o.full_name || "—",
                })),
              ]}
            />
            <FilterSelect
              label={t("filters.hasPhone", lang)}
              value={filters.has_phone}
              onChange={(v) => setFilter("has_phone", v)}
              options={[
                { value: "", label: t("filters.all", lang) },
                { value: "true", label: lang === "pt" ? "Sim" : "Yes" },
                { value: "false", label: lang === "pt" ? "Não" : "No" },
              ]}
            />
            <FilterSelect
              label={t("filters.nextAction", lang)}
              value={filters.next_action}
              onChange={(v) => setFilter("next_action", v)}
              options={[
                { value: "", label: t("filters.all", lang) },
                { value: "overdue", label: t("filters.overdue", lang) },
                { value: "today", label: t("filters.today", lang) },
                { value: "week", label: t("filters.thisWeek", lang) },
              ]}
            />
            <input
              type="text"
              placeholder={t("filters.tag", lang)}
              value={filters.tag}
              onChange={(e) => setFilter("tag", e.target.value.trim())}
              className="w-24 px-2 py-1 rounded-full bg-white/[0.05] border border-white/10 text-xs text-white placeholder:text-white/30 focus:border-emerald-400/40 focus:outline-none"
            />
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center gap-2 text-white/60 py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            {lang === "pt" ? "Carregando…" : "Loading…"}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {t(`errors.loadFailed`, lang)}
          </div>
        ) : leads.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center">
            <p className="text-sm text-white/50">
              {lang === "pt"
                ? "Nenhum lead encontrado com esses filtros."
                : "No leads match those filters."}
            </p>
          </div>
        ) : (
          <LeadTable
            leads={leads}
            owners={owners}
            lang={lang}
            onStageChange={handleStageChange}
            onDelete={handleDelete}
          />
        )}
      </main>
    </div>
  );
}

/* ─── UI subcomponents ───────────────────────────────────────── */

function MetricsStrip({ metrics, lang }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <MetricCard label={t("metrics.total", lang)} value={metrics.total} />
      <MetricCard
        label={t("metrics.newLeads", lang) + " · " + t("metrics.thisWeek", lang)}
        value={metrics.newThisWeek}
      />
      <MetricCard
        label={t("stages.contacted", lang) + " · " + t("metrics.thisWeek", lang)}
        value={metrics.contactedThisWeek}
      />
      <MetricCard
        label={t("stages.won", lang) + " · " + t("metrics.thisWeek", lang)}
        value={metrics.wonThisWeek}
      />
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/10 p-3">
      <p className="text-[10px] uppercase tracking-wider text-white/45 font-semibold">
        {label}
      </p>
      <p className="text-2xl font-black tracking-tight mt-1 tabular-nums">
        {value}
      </p>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-white/50">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/[0.05] border border-white/10 text-white text-xs rounded-full px-2 py-1.5 focus:border-emerald-400/40 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0e0e0e]">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function LeadTable({ leads, lang, onStageChange, onDelete }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
      <table className="w-full text-sm">
        <thead className="border-b border-white/10 bg-white/[0.03]">
          <tr>
            <Th>{t("columns.name", lang)}</Th>
            <Th>{t("columns.type", lang)}</Th>
            <Th>{t("columns.stage", lang)}</Th>
            <Th className="hidden md:table-cell">{t("columns.source", lang)}</Th>
            <Th className="hidden md:table-cell">{t("columns.owner", lang)}</Th>
            <Th className="hidden lg:table-cell">
              {t("columns.lastActivity", lang)}
            </Th>
            <Th className="hidden lg:table-cell">
              {t("columns.nextAction", lang)}
            </Th>
            <Th className="text-right">{t("columns.actions", lang)}</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.06]">
          {leads.map((lead) => (
            <LeadRow
              key={lead.id}
              lead={lead}
              lang={lang}
              onStageChange={onStageChange}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={`text-left text-[10px] uppercase tracking-wider text-white/45 font-semibold px-3 py-2.5 ${className}`}
    >
      {children}
    </th>
  );
}

function LeadRow({ lead, lang, onStageChange, onDelete }) {
  const orgOrEmpty = lead.organization_name || null;
  const ownerName = lead.assigned?.full_name;

  return (
    <tr className="hover:bg-white/[0.02] transition-colors">
      <td className="px-3 py-3">
        <Link href={`/admin/leads/${lead.id}`} className="block group">
          <div className="font-semibold text-white group-hover:text-emerald-300 transition-colors truncate max-w-[220px]">
            {lead.full_name}
          </div>
          <div className="text-[11px] text-white/45 mt-0.5 flex items-center gap-1.5 flex-wrap">
            {orgOrEmpty && <span className="truncate">{orgOrEmpty}</span>}
            {lead.phone_e164 && (
              <span className="inline-flex items-center gap-0.5">
                <Phone className="w-3 h-3" />
                {lead.phone_e164}
              </span>
            )}
            {lead.email && (
              <span className="inline-flex items-center gap-0.5">
                <Mail className="w-3 h-3" />
                {lead.email}
              </span>
            )}
          </div>
          {lead.tags && lead.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {lead.tags.slice(0, 3).map((tag) => (
                <TagPill key={tag} tag={tag} />
              ))}
              {lead.tags.length > 3 && (
                <span className="text-[10px] text-white/40">
                  +{lead.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </Link>
      </td>
      <td className="px-3 py-3">
        <TypeBadge type={lead.lead_type} lang={lang} />
      </td>
      <td className="px-3 py-3">
        <StageDropdown
          stage={lead.stage}
          lang={lang}
          onChange={(v) => onStageChange(lead.id, v)}
        />
      </td>
      <td className="px-3 py-3 hidden md:table-cell text-white/60 text-xs">
        {t(`sources.${lead.source}`, lang)}
      </td>
      <td className="px-3 py-3 hidden md:table-cell text-white/60 text-xs">
        {ownerName || (
          <span className="text-white/30">{t("detail.notAssigned", lang)}</span>
        )}
      </td>
      <td className="px-3 py-3 hidden lg:table-cell text-white/60 text-xs">
        <RelativeTime iso={lead.updated_at} lang={lang} />
      </td>
      <td className="px-3 py-3 hidden lg:table-cell text-white/60 text-xs">
        {lead.next_action_at ? (
          <div>
            <RelativeTime iso={lead.next_action_at} lang={lang} />
            {lead.next_action_note && (
              <div className="text-[10px] text-white/40 truncate max-w-[160px]">
                {lead.next_action_note}
              </div>
            )}
          </div>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </td>
      <td className="px-3 py-3 text-right">
        <div className="inline-flex items-center gap-1">
          {lead.phone_e164 && !lead.do_not_contact && (
            <Link
              href={`/admin/leads/${lead.id}#send`}
              title={t("detail.sendWhatsapp", lang)}
              className="p-1.5 rounded-full text-emerald-300 hover:bg-emerald-500/15 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
            </Link>
          )}
          <button
            type="button"
            onClick={() => onDelete(lead.id)}
            title={t("detail.delete", lang)}
            className="p-1.5 rounded-full text-white/40 hover:text-red-300 hover:bg-red-500/15 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function StageDropdown({ stage, lang, onChange }) {
  const tone = STAGE_TONES[stage] || "bg-white/10 text-white/80";
  return (
    <div className="relative inline-block">
      <select
        value={stage}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pr-6 pl-2.5 py-0.5 text-[11px] font-semibold rounded-full border border-white/10 focus:outline-none focus:border-emerald-400/40 cursor-pointer ${tone}`}
      >
        {LEAD_STAGES.map((s) => (
          <option key={s} value={s} className="bg-[#0e0e0e] text-white">
            {t(`stages.${s}`, lang)}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-current pointer-events-none opacity-60" />
    </div>
  );
}

/* ─── metric computation ─────────────────────────────────────── */

function computeMetrics(leads) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const byStage = {};
  for (const s of LEAD_STAGES) byStage[s] = 0;
  let newThisWeek = 0;
  let contactedThisWeek = 0;
  let wonThisWeek = 0;
  for (const l of leads) {
    if (byStage[l.stage] != null) byStage[l.stage]++;
    const createdMs = new Date(l.created_at).getTime();
    if (createdMs >= weekAgo) newThisWeek++;
    const updatedMs = new Date(l.updated_at).getTime();
    if (updatedMs >= weekAgo && l.stage === "contacted") contactedThisWeek++;
    if (updatedMs >= weekAgo && l.stage === "won") wonThisWeek++;
  }
  // Suppress unused-var warning — kept for future dashboard use.
  return {
    total: leads.length,
    byStage,
    newThisWeek,
    contactedThisWeek,
    wonThisWeek,
  };
}

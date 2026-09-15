// src/app/(site)/admin/leads/kanban/page.js
//
// Kanban view — one column per stage, cards represent leads. Drag a
// card into a different column to change its stage; the server PATCHes
// and the timeline picks up a stage_change activity.
//
// Uses native HTML5 drag-and-drop for simplicity (no react-dnd). Works
// well for the pipeline scale we expect (dozens, not thousands of
// cards per column). Falls back to a keyboard-accessible stage
// dropdown on each card so touch/keyboard users aren't stranded.

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Phone,
  MessageCircle,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  t,
  LEAD_STAGES,
  KANBAN_STAGES,
  STAGE_TONES,
} from "@/lib/leads/constants";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";
import { TypeBadge, TagPill } from "@/components/admin/leads/LeadBadges";

export default function LeadsKanbanPage() {
  const { lang } = useLanguage();
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/leads");
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) setError(json.error || "load_failed");
        else setLeads(json.leads || []);
      } catch {
        if (!cancelled) setError("network");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Bucket leads by stage. We only render KANBAN_STAGES columns (no
  // `dormant` — that's a filter-view state, not a pipeline column).
  // Any lead whose stage isn't in KANBAN_STAGES stays out of view.
  const columns = useMemo(() => {
    const map = {};
    for (const s of KANBAN_STAGES) map[s] = [];
    for (const l of leads) {
      if (map[l.stage]) map[l.stage].push(l);
    }
    return map;
  }, [leads]);

  async function moveLead(leadId, toStage) {
    const prev = leads;
    // Optimistic — flip the card immediately so the drop feels
    // instant, roll back if the server rejects.
    setLeads((cur) =>
      cur.map((l) => (l.id === leadId ? { ...l, stage: toStage } : l)),
    );
    try {
      const res = await fetch(`/api/admin/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: toStage }),
      });
      if (!res.ok) setLeads(prev);
    } catch {
      setLeads(prev);
    }
  }

  function onDragStart(e, leadId) {
    e.dataTransfer.setData("text/plain", leadId);
    e.dataTransfer.effectAllowed = "move";
  }
  function onDragOver(e, stage) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStage(stage);
  }
  function onDragLeave() {
    setDragOverStage(null);
  }
  async function onDrop(e, stage) {
    e.preventDefault();
    setDragOverStage(null);
    const leadId = e.dataTransfer.getData("text/plain");
    if (!leadId) return;
    const currentStage = leads.find((l) => l.id === leadId)?.stage;
    if (currentStage === stage) return;
    await moveLead(leadId, stage);
  }

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-full mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LeadsAdminHeader currentView="kanban" />

        {loading ? (
          <div className="flex items-center gap-2 text-primary-300 py-8">
            <Loader2 className="w-4 h-4 animate-spin" />
            {lang === "pt" ? "Carregando…" : "Loading…"}
          </div>
        ) : error ? (
          <div className="rounded-card border border-signal-alert/40 bg-signal-alert/10 p-4 text-sm text-signal-alert">
            {t("errors.loadFailed", lang)}
          </div>
        ) : (
          <div className="overflow-x-auto pb-4">
            <div className="flex gap-3 min-w-max">
              {KANBAN_STAGES.map((stage) => (
                <Column
                  key={stage}
                  stage={stage}
                  lang={lang}
                  leads={columns[stage]}
                  isDropTarget={dragOverStage === stage}
                  onDragOver={(e) => onDragOver(e, stage)}
                  onDragLeave={onDragLeave}
                  onDrop={(e) => onDrop(e, stage)}
                  onDragStart={onDragStart}
                  onStageChange={moveLead}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Column({
  stage,
  lang,
  leads,
  isDropTarget,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragStart,
  onStageChange,
}) {
  const tone = STAGE_TONES[stage] || "bg-primary-700 text-primary-100";
  return (
    <div
      className={`w-72 shrink-0 rounded-card border p-3 transition-colors ${
        isDropTarget
          ? "border-accent-400/60 bg-accent-400/10"
          : "border-primary-700 bg-primary-panel"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
            {t(`stages.${stage}`, lang)}
          </span>
          <span className="text-[11px] text-primary-500 tabular-nums">
            {leads.length}
          </span>
        </div>
      </div>
      <div className="space-y-2">
        {leads.length === 0 ? (
          <p className="text-xs text-primary-500 text-center py-4">
            {lang === "pt" ? "Vazio" : "Empty"}
          </p>
        ) : (
          leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              lang={lang}
              onDragStart={onDragStart}
              onStageChange={onStageChange}
            />
          ))
        )}
      </div>
    </div>
  );
}

function KanbanCard({ lead, lang, onDragStart, onStageChange }) {
  return (
    <article
      draggable
      onDragStart={(e) => onDragStart(e, lead.id)}
      className="rounded-xl bg-primary-900 border border-primary-700 hover:border-primary-600 p-3 cursor-grab active:cursor-grabbing transition-colors"
    >
      <Link href={`/admin/leads/${lead.id}`} className="block">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sm text-primary-50 truncate">
              {lead.full_name}
            </p>
            {lead.organization_name && (
              <p className="text-[11px] text-primary-400 truncate">
                {lead.organization_name}
              </p>
            )}
          </div>
          <TypeBadge type={lead.lead_type} lang={lang} />
        </div>
        {lead.summary && (
          <p className="text-[11px] text-primary-400 mt-1 line-clamp-2">
            {lead.summary}
          </p>
        )}
        <div className="mt-2 flex items-center gap-2 flex-wrap">
          {lead.phone_e164 && (
            <span className="inline-flex items-center gap-0.5 text-[10px] text-primary-400">
              <Phone className="w-3 h-3" />
              WhatsApp
            </span>
          )}
          {lead.assigned?.full_name && (
            <span className="text-[10px] text-primary-400 truncate max-w-[100px]">
              👤 {lead.assigned.full_name}
            </span>
          )}
        </div>
        {lead.tags && lead.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {lead.tags.slice(0, 3).map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
            {lead.tags.length > 3 && (
              <span className="text-[10px] text-primary-500">
                +{lead.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </Link>

      {/* Keyboard-accessible fallback for touch users where HTML5
          drag-and-drop is finicky. Native <select> for max mobile
          compatibility. */}
      <div className="mt-2 pt-2 border-t border-primary-700 flex items-center justify-between">
        <StageSelect
          stage={lead.stage}
          lang={lang}
          onChange={(v) => onStageChange(lead.id, v)}
        />
        {lead.phone_e164 && !lead.do_not_contact && (
          <Link
            href={`/admin/leads/${lead.id}#send`}
            className="p-1 rounded-full text-accent-400 hover:bg-accent-400/15"
            title={t("detail.sendWhatsapp", lang)}
          >
            <MessageCircle className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </article>
  );
}

function StageSelect({ stage, lang, onChange }) {
  return (
    <div className="relative">
      <select
        value={stage}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pr-5 pl-2 py-0.5 text-[10px] font-semibold rounded-full bg-primary-800 border border-primary-700 text-primary-300 focus:outline-none cursor-pointer"
      >
        {LEAD_STAGES.map((s) => (
          <option key={s} value={s} className="bg-primary-800">
            {t(`stages.${s}`, lang)}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-1 top-1/2 -translate-y-1/2 opacity-50 pointer-events-none" />
    </div>
  );
}

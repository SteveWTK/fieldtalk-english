// src/components/admin/leads/LeadsAdminHeader.js
//
// Shared header for every /admin/leads/* page. Renders:
//   - Back-to-admin link
//   - Bilingual title + subtitle
//   - View switcher (list ↔ kanban) — highlighted per current path
//   - "New lead" primary CTA (hidden on the new-lead form itself
//     since the user is already there)
//   - PT/EN language toggle
//
// A shared component rather than a Next layout so each page can
// omit / rearrange bits (the detail page hides the view switcher
// because it doesn't apply to the detail context).
"use client";

import Link from "next/link";
import {
  ChevronLeft,
  List,
  LayoutGrid,
  Plus,
  Sparkles,
  LineChart,
  Upload,
  Zap,
  Target,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { t } from "@/lib/leads/constants";

/**
 * @param {{
 *   currentView?: 'list' | 'kanban' | 'detail' | 'new',
 *   showNewLeadCta?: boolean,
 *   showViewSwitcher?: boolean,
 *   backHref?: string,
 * }} props
 */
export default function LeadsAdminHeader({
  currentView = "list",
  showNewLeadCta = true,
  showViewSwitcher = true,
  backHref = "/admin",
}) {
  const { lang, setLang } = useLanguage();
  const isPt = lang === "pt";

  return (
    <div className="mb-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href={backHref}
          className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white"
        >
          <ChevronLeft className="w-4 h-4" />
          {backHref === "/admin"
            ? t("page.backToAdmin", lang)
            : t("page.backToLeads", lang)}
        </Link>
        <LangToggle lang={lang} setLang={setLang} />
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-1">
            FieldTalk · CRM
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t("page.title", lang)}
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
            {t("page.subtitle", lang)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {showViewSwitcher && (
            <div className="inline-flex rounded-full bg-white/[0.05] border border-white/10 p-0.5">
              <ViewTab
                href="/admin/leads"
                active={currentView === "list"}
                Icon={List}
                label={t("page.listView", lang)}
              />
              <ViewTab
                href="/admin/leads/kanban"
                active={currentView === "kanban"}
                Icon={LayoutGrid}
                label={t("page.kanbanView", lang)}
              />
              <ViewTab
                href="/admin/leads/dashboard"
                active={currentView === "dashboard"}
                Icon={LineChart}
                label={isPt ? "Painel" : "Dashboard"}
              />
            </div>
          )}
          {showNewLeadCta && (
            <>
              <Link
                href="/admin/leads/import"
                title={isPt ? "Importar CSV" : "Import CSV"}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/10 text-xs font-semibold transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                {isPt ? "Importar" : "Import"}
              </Link>
              <Link
                href="/admin/leads/templates"
                title={isPt ? "Modelos de mensagem" : "Message templates"}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/10 text-xs font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isPt ? "Modelos" : "Templates"}
              </Link>
              <Link
                href="/admin/leads/sequences"
                title={isPt ? "Sequências" : "Sequences"}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/10 text-xs font-semibold transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                {isPt ? "Sequências" : "Sequences"}
              </Link>
              <Link
                href="/admin/leads/targets"
                title={isPt ? "Metas" : "Targets"}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/10 text-xs font-semibold transition-colors"
              >
                <Target className="w-3.5 h-3.5" />
                {isPt ? "Metas" : "Targets"}
              </Link>
              <Link
                href="/admin/leads/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t("page.newLead", lang)}
              </Link>
            </>
          )}
        </div>
      </div>
      {/* Currency + short "isPt" hint stays out of layout — screen
          readers etc. shouldn't get an unused element. Suppress
          lint on unused vars. */}
      {isPt ? null : null}
    </div>
  );
}

function ViewTab({ href, active, Icon, label }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
        active
          ? "bg-emerald-400 text-black"
          : "text-white/60 hover:text-white"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

function LangToggle({ lang, setLang }) {
  return (
    <div className="inline-flex rounded-full bg-white/[0.05] border border-white/10 p-0.5">
      {["pt", "en"].map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-full transition-colors ${
            lang === code
              ? "bg-white/15 text-white"
              : "text-white/50 hover:text-white"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

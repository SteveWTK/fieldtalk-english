// src/components/admin/leads/LeadsAdminHeader.js
//
// Shared header for every /admin/leads/* page. Renders:
//   - Back-to-admin link
//   - Bilingual title + subtitle
//   - View switcher (list ↔ kanban ↔ dashboard) — highlighted per
//     current path
//   - Quick-action row (import, templates, sequences, targets)
//   - "New lead" primary CTA (hidden on the new-lead form itself
//     since the user is already there)
//   - PT/EN language toggle
//
// A shared component rather than a Next layout so each page can
// omit / rearrange bits (the detail page hides the view switcher
// because it doesn't apply to the detail context).
//
// Migrated to DS: view tabs + lang toggle now sit on the primary
// slate ramp instead of the neutral white/opacity mix, and the
// active state uses accent-400 with a primary-900 label for the
// mandated DS treatment of "one selected pill per group".
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
  Send,
} from "lucide-react";
import Button from "@/components/ui/button";
import Eyebrow from "@/components/ui/eyebrow";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { t } from "@/lib/leads/constants";

/**
 * @param {{
 *   currentView?: 'list' | 'kanban' | 'detail' | 'new' | 'dashboard',
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
          className="inline-flex items-center gap-1 text-sm text-primary-400 hover:text-primary-100 transition-colors"
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
          <Eyebrow className="mb-1">Global Player · CRM</Eyebrow>
          <h1 className="text-2xl sm:text-3xl font-display font-black tracking-tight text-primary-50">
            {t("page.title", lang)}
          </h1>
          <p className="text-sm text-primary-400 mt-2 max-w-2xl leading-relaxed">
            {t("page.subtitle", lang)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {showViewSwitcher && (
            <div className="inline-flex rounded-full bg-primary-panel border border-primary-700 p-0.5">
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
              <QuickAction
                href="/admin/leads/import"
                title={isPt ? "Importar CSV" : "Import CSV"}
                Icon={Upload}
                label={isPt ? "Importar" : "Import"}
              />
              <QuickAction
                href="/admin/leads/templates"
                title={isPt ? "Modelos de mensagem" : "Message templates"}
                Icon={Sparkles}
                label={isPt ? "Modelos" : "Templates"}
              />
              <QuickAction
                href="/admin/leads/sequences"
                title={isPt ? "Sequências" : "Sequences"}
                Icon={Zap}
                label={isPt ? "Sequências" : "Sequences"}
              />
              <QuickAction
                href="/admin/leads/targets"
                title={isPt ? "Metas" : "Targets"}
                Icon={Target}
                label={isPt ? "Metas" : "Targets"}
              />
              <QuickAction
                href="/admin/leads/outreach"
                title={isPt ? "Funil WhatsApp" : "WhatsApp funnel"}
                Icon={Send}
                label={isPt ? "Funil" : "Funnel"}
              />
              {/* The "New lead" CTA — the single lime action per this
                  screen (see DS: one accent button per view). */}
              <Button
                as="a"
                href="/admin/leads/new"
                variant="primary"
                size="sm"
                Icon={Plus}
              >
                {t("page.newLead", lang)}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ViewTab({ href, active, Icon, label }) {
  // Active pill: accent-400 lime + primary-900 label (DS "one
  // selected chip per group" rule). Inactive: transparent + muted
  // text, lightens on hover per DS "hover lightens, never darkens".
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-sans font-semibold rounded-full transition-colors ${
        active
          ? "bg-accent-400 text-primary-900"
          : "text-primary-400 hover:text-primary-100"
      }`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

function QuickAction({ href, title, Icon, label }) {
  // Quick-action pills — neutral slate chips, not brand-lime.
  // The single accent CTA per screen is the "New lead" button; these
  // are frequently used utilities that shouldn't compete for the eye.
  return (
    <Link
      href={href}
      title={title}
      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary-panel hover:bg-primary-800 text-primary-200 border border-primary-700 text-xs font-semibold transition-colors"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

function LangToggle({ lang, setLang }) {
  return (
    <div className="inline-flex rounded-full bg-primary-panel border border-primary-700 p-0.5">
      {["pt", "en"].map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          className={`px-2.5 py-1 text-[11px] font-bold uppercase rounded-full transition-colors ${
            lang === code
              ? "bg-primary-800 text-primary-50"
              : "text-primary-500 hover:text-primary-100"
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

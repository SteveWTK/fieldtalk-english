// src/app/(site)/admin/leads/new/page.js
//
// New-lead form. Single URL, single code path, progressive disclosure:
//   - Everyone sees: name, contact, lead_type, source, tags, notes.
//   - Selecting "Individual player" reveals age_group, positions,
//     english_level.
//   - Selecting an org type (academy/school/club/partner_other) reveals
//     organization_name, role_at_org, staff_count.
//   - Owner assignment is always visible.
//
// On save → POST /api/admin/leads → redirect to the new lead's detail.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, AlertCircle, Users2, Building2 } from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  t,
  LEAD_TYPES,
  LEAD_STAGES,
  LEAD_SOURCES,
  AGE_GROUPS,
  ENGLISH_LEVELS,
} from "@/lib/leads/constants";
import { isOrgLeadType } from "@/lib/leads/normalize";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";

const INITIAL = {
  full_name: "",
  email: "",
  phone_e164: "",
  lead_type: "individual_player",
  age_group: "",
  positions: "",           // stored as CSV in the form, server accepts string CSV
  english_level: "",
  organization_name: "",
  role_at_org: "",
  staff_count: "",
  stage: "new",
  source: "manual",
  source_detail: "",
  assigned_to: "",
  tags: "",                // CSV
  country: "Brasil",
  state: "",
  city: "",
  summary: "",
  next_action_at: "",
  next_action_note: "",
  do_not_contact: false,
  initial_note: "",        // optional initial note (creates a lead_note after insert)
};

export default function NewLeadPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [owners, setOwners] = useState([]);
  const [form, setForm] = useState(INITIAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin/leads/owners");
        const json = await res.json();
        if (res.ok) setOwners(json.owners || []);
      } catch {
        // Non-fatal — the owner dropdown just shows "Unassigned" only.
      }
    })();
  }, []);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    // Client validation — the server re-validates, this is just to
    // catch obvious problems before the round-trip.
    if (!form.full_name.trim()) {
      setError(t("errors.nameRequired", lang));
      return;
    }
    if (!LEAD_TYPES.includes(form.lead_type)) {
      setError(t("errors.typeRequired", lang));
      return;
    }

    setSaving(true);

    // Assemble payload — server accepts CSV strings for tags/positions
    // per normalize.js.
    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim() || null,
      phone_e164: form.phone_e164.trim() || null,
      lead_type: form.lead_type,
      stage: form.stage,
      source: form.source,
      source_detail: form.source_detail.trim() || null,
      assigned_to: form.assigned_to || null,
      tags: form.tags,
      country: form.country.trim() || null,
      state: form.state.trim() || null,
      city: form.city.trim() || null,
      summary: form.summary.trim() || null,
      next_action_at: form.next_action_at || null,
      next_action_note: form.next_action_note.trim() || null,
      do_not_contact: form.do_not_contact,
    };

    if (isOrgLeadType(form.lead_type)) {
      payload.organization_name = form.organization_name.trim() || null;
      payload.role_at_org = form.role_at_org.trim() || null;
      payload.staff_count = form.staff_count ? Number(form.staff_count) : null;
    } else {
      payload.age_group = form.age_group || null;
      payload.english_level = form.english_level || null;
      payload.positions = form.positions
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }

    try {
      const res = await fetch("/api/admin/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(
          Array.isArray(json.details) ? json.details.join(" · ") :
          json.message || json.error || t("errors.saveFailed", lang),
        );
        setSaving(false);
        return;
      }
      const newLead = json.lead;

      // Optional initial note — one extra round-trip AFTER the insert
      // so a validation error on the note doesn't block lead creation.
      const noteText = form.initial_note.trim();
      if (noteText && newLead?.id) {
        await fetch(`/api/admin/leads/${newLead.id}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body: noteText }),
        }).catch(() => {
          /* silent — the lead is saved, note failed. */
        });
      }

      router.push(`/admin/leads/${newLead.id}`);
    } catch {
      setError(t("errors.network", lang));
      setSaving(false);
    }
  }

  const isOrg = isOrgLeadType(form.lead_type);

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LeadsAdminHeader
          currentView="new"
          showNewLeadCta={false}
          showViewSwitcher={false}
          backHref="/admin/leads"
        />

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lead type picker — first + most prominent, drives which
              type-specific section renders below. */}
          <Section title={t("form.section.basics", lang)}>
            <TypePicker
              value={form.lead_type}
              onChange={(v) => set("lead_type", v)}
              lang={lang}
            />
            <Field label={t("form.field.fullName", lang)} required>
              <input
                type="text"
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                maxLength={120}
                className={inputClass}
              />
            </Field>
            <Field label={t("form.field.summary", lang)}
              hint={t("form.field.summaryHint", lang)}
            >
              <input
                type="text"
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
                maxLength={500}
                className={inputClass}
              />
            </Field>
          </Section>

          <Section title={t("form.section.contact", lang)}>
            <Field label={t("form.field.phone", lang)}
              hint={t("form.field.phoneHint", lang)}
            >
              <input
                type="tel"
                value={form.phone_e164}
                onChange={(e) => set("phone_e164", e.target.value)}
                placeholder="+55 11 91234-5678"
                className={inputClass}
              />
            </Field>
            <Field label={t("form.field.email", lang)}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className={inputClass}
              />
            </Field>
          </Section>

          {/* Type-specific — progressive disclosure. */}
          {isOrg ? (
            <Section title={t("form.section.orgDetails", lang)}>
              <Field label={t("form.field.organizationName", lang)}>
                <input
                  type="text"
                  value={form.organization_name}
                  onChange={(e) => set("organization_name", e.target.value)}
                  maxLength={160}
                  className={inputClass}
                />
              </Field>
              <Field label={t("form.field.roleAtOrg", lang)}
                hint={t("form.field.roleAtOrgHint", lang)}
              >
                <input
                  type="text"
                  value={form.role_at_org}
                  onChange={(e) => set("role_at_org", e.target.value)}
                  maxLength={80}
                  className={inputClass}
                />
              </Field>
              <Field label={t("form.field.staffCount", lang)}>
                <input
                  type="number"
                  min={0}
                  value={form.staff_count}
                  onChange={(e) => set("staff_count", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </Section>
          ) : (
            <Section title={t("form.section.playerDetails", lang)}>
              <Field label={t("form.field.ageGroup", lang)}>
                <select
                  value={form.age_group}
                  onChange={(e) => set("age_group", e.target.value)}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {AGE_GROUPS.map((g) => (
                    <option key={g} value={g} className="bg-[#0e0e0e]">
                      {t(`ageGroups.${g}`, lang)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("form.field.englishLevel", lang)}>
                <select
                  value={form.english_level}
                  onChange={(e) => set("english_level", e.target.value)}
                  className={inputClass}
                >
                  <option value="">—</option>
                  {ENGLISH_LEVELS.map((l) => (
                    <option key={l} value={l} className="bg-[#0e0e0e]">
                      {t(`englishLevels.${l}`, lang)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("form.field.positions", lang)}
                hint="GK, RB, CB, DM, CAM, LW…"
              >
                <input
                  type="text"
                  value={form.positions}
                  onChange={(e) => set("positions", e.target.value)}
                  placeholder="GK, CB"
                  className={inputClass}
                />
              </Field>
            </Section>
          )}

          <Section title={t("form.section.classification", lang)}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("form.field.stage", lang)}>
                <select
                  value={form.stage}
                  onChange={(e) => set("stage", e.target.value)}
                  className={inputClass}
                >
                  {LEAD_STAGES.map((s) => (
                    <option key={s} value={s} className="bg-[#0e0e0e]">
                      {t(`stages.${s}`, lang)}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t("form.field.source", lang)}>
                <select
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                  className={inputClass}
                >
                  {LEAD_SOURCES.map((s) => (
                    <option key={s} value={s} className="bg-[#0e0e0e]">
                      {t(`sources.${s}`, lang)}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={t("form.field.sourceDetail", lang)}
              hint={t("form.field.sourceDetailHint", lang)}
            >
              <input
                type="text"
                value={form.source_detail}
                onChange={(e) => set("source_detail", e.target.value)}
                maxLength={200}
                className={inputClass}
              />
            </Field>
            <Field label={t("form.field.tags", lang)}
              hint={t("form.field.tagsHint", lang)}
            >
              <input
                type="text"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
                placeholder="warm, event-carioca"
                className={inputClass}
              />
            </Field>
          </Section>

          <Section title={t("form.section.location", lang)}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label={t("form.field.country", lang)}>
                <input
                  type="text"
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("form.field.state", lang)}>
                <input
                  type="text"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                  placeholder="SP"
                  className={inputClass}
                />
              </Field>
              <Field label={t("form.field.city", lang)}>
                <input
                  type="text"
                  value={form.city}
                  onChange={(e) => set("city", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
          </Section>

          <Section title={t("form.section.assignment", lang)}>
            <Field label={t("form.field.owner", lang)}>
              <select
                value={form.assigned_to}
                onChange={(e) => set("assigned_to", e.target.value)}
                className={inputClass}
              >
                <option value="">
                  {t("detail.notAssigned", lang)}
                </option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id} className="bg-[#0e0e0e]">
                    {o.full_name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t("form.field.nextActionAt", lang)}>
                <input
                  type="datetime-local"
                  value={form.next_action_at}
                  onChange={(e) => set("next_action_at", e.target.value)}
                  className={inputClass}
                />
              </Field>
              <Field label={t("form.field.nextActionNote", lang)}>
                <input
                  type="text"
                  value={form.next_action_note}
                  onChange={(e) => set("next_action_note", e.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <label className="inline-flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={form.do_not_contact}
                onChange={(e) => set("do_not_contact", e.target.checked)}
                className="accent-red-500"
              />
              {t("form.field.doNotContact", lang)}
            </label>
          </Section>

          <Section title={t("form.section.notes", lang)}>
            <Field label={t("form.field.notes", lang)}>
              <textarea
                value={form.initial_note}
                onChange={(e) => set("initial_note", e.target.value)}
                rows={4}
                maxLength={5000}
                className={`${inputClass} resize-y`}
                placeholder={t("detail.notePlaceholder", lang)}
              />
            </Field>
          </Section>

          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200 inline-flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saving ? t("form.saving", lang) : t("form.save", lang)}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/leads")}
              disabled={saving}
              className="px-4 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white border border-white/10 text-sm disabled:opacity-50 transition-colors"
            >
              {t("form.cancel", lang)}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

/* ─── UI subcomponents ───────────────────────────────────────── */

const inputClass =
  "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-emerald-400/50 focus:outline-none";

function Section({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-5">
      <h2 className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-3">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, hint, required, children }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-white/60 font-semibold mb-1">
        {label}
        {required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-white/40 mt-1">{hint}</p>}
    </div>
  );
}

function TypePicker({ value, onChange, lang }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-white/60 font-semibold mb-2">
        {t("form.field.leadType", lang)}
        <span className="text-red-400 ml-1">*</span>
      </label>
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        {LEAD_TYPES.map((typeCode) => {
          const active = value === typeCode;
          const Icon =
            typeCode === "individual_player" ? Users2 : Building2;
          return (
            <button
              key={typeCode}
              type="button"
              onClick={() => onChange(typeCode)}
              className={`inline-flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-semibold transition-colors ${
                active
                  ? "border-emerald-400/60 bg-emerald-500/10 text-emerald-200"
                  : "border-white/10 bg-white/[0.02] text-white/60 hover:border-white/25 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-center leading-tight">
                {t(`types.${typeCode}`, lang)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

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
//
// DS migration — this is the flagship consumer of the round-3 form
// primitives. Every field is <Input>/<Select>/<Switch>, sections use
// <Panel>, the primary CTA is <Button variant="primary">. The local
// Section/Field/inputClass helpers were retired; only the type-picker
// stays hand-rolled because it's a bespoke 5-tile grid, not a chip
// row.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, AlertCircle, Users2, Building2 } from "lucide-react";
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
import Button from "@/components/ui/button";
import Panel from "@/components/ui/panel";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import Switch from "@/components/ui/switch";

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

  // Options for the Select primitives — each option is
  // `{value, label}` so labels can be bilingual + reordered without
  // touching the codepoints stored in state.
  const ageGroupOptions = [
    { value: "", label: "—" },
    ...AGE_GROUPS.map((g) => ({ value: g, label: t(`ageGroups.${g}`, lang) })),
  ];
  const englishLevelOptions = [
    { value: "", label: "—" },
    ...ENGLISH_LEVELS.map((l) => ({
      value: l,
      label: t(`englishLevels.${l}`, lang),
    })),
  ];
  const stageOptions = LEAD_STAGES.map((s) => ({
    value: s,
    label: t(`stages.${s}`, lang),
  }));
  const sourceOptions = LEAD_SOURCES.map((s) => ({
    value: s,
    label: t(`sources.${s}`, lang),
  }));
  const ownerOptions = [
    { value: "", label: t("detail.notAssigned", lang) },
    ...owners.map((o) => ({ value: o.id, label: o.full_name })),
  ];

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
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
          <Panel title={t("form.section.basics", lang)}>
            <div className="space-y-3">
              <TypePicker
                value={form.lead_type}
                onChange={(v) => set("lead_type", v)}
                lang={lang}
              />
              <Input
                label={t("form.field.fullName", lang)}
                required
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                maxLength={120}
              />
              <Input
                label={t("form.field.summary", lang)}
                hint={t("form.field.summaryHint", lang)}
                value={form.summary}
                onChange={(e) => set("summary", e.target.value)}
                maxLength={500}
              />
            </div>
          </Panel>

          <Panel title={t("form.section.contact", lang)}>
            <div className="space-y-3">
              <Input
                type="tel"
                label={t("form.field.phone", lang)}
                hint={t("form.field.phoneHint", lang)}
                placeholder="+55 11 91234-5678"
                value={form.phone_e164}
                onChange={(e) => set("phone_e164", e.target.value)}
              />
              <Input
                type="email"
                label={t("form.field.email", lang)}
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
              />
            </div>
          </Panel>

          {/* Type-specific — progressive disclosure. */}
          {isOrg ? (
            <Panel title={t("form.section.orgDetails", lang)}>
              <div className="space-y-3">
                <Input
                  label={t("form.field.organizationName", lang)}
                  value={form.organization_name}
                  onChange={(e) => set("organization_name", e.target.value)}
                  maxLength={160}
                />
                <Input
                  label={t("form.field.roleAtOrg", lang)}
                  hint={t("form.field.roleAtOrgHint", lang)}
                  value={form.role_at_org}
                  onChange={(e) => set("role_at_org", e.target.value)}
                  maxLength={80}
                />
                <Input
                  type="number"
                  label={t("form.field.staffCount", lang)}
                  min={0}
                  value={form.staff_count}
                  onChange={(e) => set("staff_count", e.target.value)}
                />
              </div>
            </Panel>
          ) : (
            <Panel title={t("form.section.playerDetails", lang)}>
              <div className="space-y-3">
                <Select
                  label={t("form.field.ageGroup", lang)}
                  options={ageGroupOptions}
                  value={form.age_group}
                  onChange={(e) => set("age_group", e.target.value)}
                />
                <Select
                  label={t("form.field.englishLevel", lang)}
                  options={englishLevelOptions}
                  value={form.english_level}
                  onChange={(e) => set("english_level", e.target.value)}
                />
                <Input
                  label={t("form.field.positions", lang)}
                  hint="GK, RB, CB, DM, CAM, LW…"
                  placeholder="GK, CB"
                  value={form.positions}
                  onChange={(e) => set("positions", e.target.value)}
                />
              </div>
            </Panel>
          )}

          <Panel title={t("form.section.classification", lang)}>
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label={t("form.field.stage", lang)}
                  options={stageOptions}
                  value={form.stage}
                  onChange={(e) => set("stage", e.target.value)}
                />
                <Select
                  label={t("form.field.source", lang)}
                  options={sourceOptions}
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                />
              </div>
              <Input
                label={t("form.field.sourceDetail", lang)}
                hint={t("form.field.sourceDetailHint", lang)}
                value={form.source_detail}
                onChange={(e) => set("source_detail", e.target.value)}
                maxLength={200}
              />
              <Input
                label={t("form.field.tags", lang)}
                hint={t("form.field.tagsHint", lang)}
                placeholder="warm, event-carioca"
                value={form.tags}
                onChange={(e) => set("tags", e.target.value)}
              />
            </div>
          </Panel>

          <Panel title={t("form.section.location", lang)}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label={t("form.field.country", lang)}
                value={form.country}
                onChange={(e) => set("country", e.target.value)}
              />
              <Input
                label={t("form.field.state", lang)}
                placeholder="SP"
                value={form.state}
                onChange={(e) => set("state", e.target.value)}
              />
              <Input
                label={t("form.field.city", lang)}
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>
          </Panel>

          <Panel title={t("form.section.assignment", lang)}>
            <div className="space-y-3">
              <Select
                label={t("form.field.owner", lang)}
                options={ownerOptions}
                value={form.assigned_to}
                onChange={(e) => set("assigned_to", e.target.value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="datetime-local"
                  label={t("form.field.nextActionAt", lang)}
                  value={form.next_action_at}
                  onChange={(e) => set("next_action_at", e.target.value)}
                />
                <Input
                  label={t("form.field.nextActionNote", lang)}
                  value={form.next_action_note}
                  onChange={(e) => set("next_action_note", e.target.value)}
                />
              </div>
              <Switch
                checked={form.do_not_contact}
                onChange={(v) => set("do_not_contact", v)}
                label={t("form.field.doNotContact", lang)}
              />
            </div>
          </Panel>

          <Panel title={t("form.section.notes", lang)}>
            <Input
              multiline
              rows={4}
              maxLength={5000}
              label={t("form.field.notes", lang)}
              placeholder={t("detail.notePlaceholder", lang)}
              value={form.initial_note}
              onChange={(e) => set("initial_note", e.target.value)}
              className="resize-y"
            />
          </Panel>

          {error && (
            <div className="rounded-card border border-signal-alert/40 bg-signal-alert/10 p-3 text-sm text-signal-alert inline-flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              Icon={Save}
              loading={saving}
              disabled={saving}
            >
              {saving ? t("form.saving", lang) : t("form.save", lang)}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => router.push("/admin/leads")}
              disabled={saving}
            >
              {t("form.cancel", lang)}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

/* ─── UI subcomponents ───────────────────────────────────────── */

function TypePicker({ value, onChange, lang }) {
  // The type picker is a bespoke 5-tile grid, not a horizontal chip
  // row — icons + centred labels + a two-line label at small widths.
  // Kept hand-rolled but re-tokenized: selected state uses accent
  // (the lime "one selected item" convention) and unselected uses
  // the slate ramp with a hover-lightens transition.
  return (
    <div>
      <label className="block text-[11px] font-sans font-normal uppercase tracking-label text-primary-400 mb-2">
        {t("form.field.leadType", lang)}
        <span className="text-signal-alert ml-1">*</span>
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
              className={`inline-flex flex-col items-center gap-1 px-2 py-3 rounded-control border text-xs font-semibold transition-colors ${
                active
                  ? "border-accent-400/60 bg-accent-400/10 text-accent-300"
                  : "border-primary-700 bg-primary-panel text-primary-400 hover:border-primary-500 hover:text-primary-100"
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

// src/app/(site)/admin/leads/[id]/page.js
//
// Lead detail — the "work this lead" surface.
//
// Layout:
//   [Header] name, stage badge, owner picker, tags, quick actions
//   [Left column] fields (contact, type-specific, classification,
//                 location, next-action). Inline-editable.
//   [Right column] tabbed panel: Timeline (activities) | Notes.
//   [Sticky footer] direct WhatsApp send input.
//
// State model: one canonical `lead` state from the API. Edits are
// held in a `draft` object and PATCHed on Save. Timeline + notes
// are lists that append on-the-fly as the user interacts.

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Save,
  AlertCircle,
  Phone,
  Mail,
  MessageCircle,
  Send,
  Pencil,
  X,
  Trash2,
  PhoneCall,
  Mail as MailIcon,
  StickyNote,
  Clock,
  UserCheck,
  Tag as TagIcon,
  ChevronDown,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  t,
  LEAD_STAGES,
  LEAD_SOURCES,
  LEAD_TYPES,
  AGE_GROUPS,
  ENGLISH_LEVELS,
  STAGE_TONES,
} from "@/lib/leads/constants";
import { isOrgLeadType } from "@/lib/leads/normalize";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";
import { TagPill, RelativeTime } from "@/components/admin/leads/LeadBadges";

export default function LeadDetailPage() {
  const { lang } = useLanguage();
  const params = useParams();
  const id = params?.id;

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState([]);
  const [owners, setOwners] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);

  const [tab, setTab] = useState("timeline");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [detailRes, ownersRes] = await Promise.all([
          fetch(`/api/admin/leads/${id}`),
          fetch(`/api/admin/leads/owners`),
        ]);
        const detailJson = await detailRes.json();
        const ownersJson = await ownersRes.json();
        if (cancelled) return;
        if (!detailRes.ok) {
          setError(detailJson.error || "load_failed");
        } else {
          setLead(detailJson.lead);
          setActivities(detailJson.activities || []);
          setNotes(detailJson.notes || []);
        }
        if (ownersRes.ok) setOwners(ownersJson.owners || []);
      } catch {
        if (!cancelled) setError("network");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  function beginEdit() {
    setDraft(pickEditableFields(lead));
    setEditing(true);
  }
  function cancelEdit() {
    setEditing(false);
    setDraft({});
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json();
      if (res.ok) {
        setLead(json.lead);
        setEditing(false);
        // Reload activities — the PATCH may have inserted stage_change /
        // assigned / tag_change rows we want to see immediately.
        await refreshActivities();
      } else {
        alert(
          Array.isArray(json.details) ? json.details.join(" · ") :
          json.message || json.error || "Save failed",
        );
      }
    } finally {
      setSaving(false);
    }
  }

  async function refreshActivities() {
    try {
      const res = await fetch(`/api/admin/leads/${id}`);
      const json = await res.json();
      if (res.ok) setActivities(json.activities || []);
    } catch {
      // non-fatal — the user can refresh the page if needed.
    }
  }

  // Quick-inline stage / owner change (bypasses the edit mode for
  // the two most-used pipeline actions).
  async function quickPatch(patch) {
    try {
      const res = await fetch(`/api/admin/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (res.ok) {
        setLead(json.lead);
        await refreshActivities();
      }
    } catch {
      /* silent */
    }
  }

  async function addNote(body) {
    const res = await fetch(`/api/admin/leads/${id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const json = await res.json();
    if (res.ok) {
      setNotes((prev) => [json.note, ...prev]);
      await refreshActivities();
      return true;
    }
    return false;
  }

  async function sendWhatsapp(message) {
    const res = await fetch(`/api/admin/leads/${id}/whatsapp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const json = await res.json();
    if (!res.ok) return { ok: false, error: json.error || "send_failed" };
    // Refresh activities + the lead itself (stage may have bumped
    // 'new' → 'contacted').
    const detailRes = await fetch(`/api/admin/leads/${id}`);
    const detailJson = await detailRes.json();
    if (detailRes.ok) {
      setLead(detailJson.lead);
      setActivities(detailJson.activities || []);
    }
    return { ok: true };
  }

  async function logActivity(type, summary) {
    const res = await fetch(`/api/admin/leads/${id}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, summary }),
    });
    const json = await res.json();
    if (res.ok) {
      setActivities((prev) => [json.activity, ...prev]);
      return true;
    }
    return false;
  }

  async function handleDelete() {
    if (!confirm(t("detail.deleteConfirm", lang))) return;
    const res = await fetch(`/api/admin/leads/${id}`, { method: "DELETE" });
    if (res.ok) window.location.assign("/admin/leads");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070707]">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
      </div>
    );
  }
  if (error || !lead) {
    return (
      <div className="min-h-screen bg-[#070707] text-white">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <LeadsAdminHeader
            currentView="detail"
            showNewLeadCta={false}
            showViewSwitcher={false}
            backHref="/admin/leads"
          />
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {t("errors.loadFailed", lang)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white pb-32">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <LeadsAdminHeader
          currentView="detail"
          showNewLeadCta={false}
          showViewSwitcher={false}
          backHref="/admin/leads"
        />

        {/* Header row: name, stage, owner, quick actions */}
        <HeaderCard
          lead={lead}
          lang={lang}
          owners={owners}
          onQuickPatch={quickPatch}
          onEdit={beginEdit}
          onDelete={handleDelete}
        />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Left: fields */}
          <section className="lg:col-span-2 space-y-4">
            {editing ? (
              <EditForm
                draft={draft}
                setDraft={setDraft}
                owners={owners}
                lang={lang}
                onSave={saveEdit}
                onCancel={cancelEdit}
                saving={saving}
              />
            ) : (
              <FieldsCard lead={lead} lang={lang} />
            )}
          </section>

          {/* Right: tabbed panel */}
          <section className="lg:col-span-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden">
              <div className="border-b border-white/10 flex">
                <TabButton
                  active={tab === "timeline"}
                  onClick={() => setTab("timeline")}
                  label={t("detail.tabTimeline", lang)}
                />
                <TabButton
                  active={tab === "notes"}
                  onClick={() => setTab("notes")}
                  label={t("detail.tabNotes", lang)}
                />
              </div>
              <div className="p-4">
                {tab === "timeline" ? (
                  <Timeline
                    activities={activities}
                    lang={lang}
                    onLogActivity={logActivity}
                  />
                ) : (
                  <NotesPanel
                    notes={notes}
                    lang={lang}
                    onAddNote={addNote}
                  />
                )}
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Sticky footer — WhatsApp send */}
      <WhatsappSendBar lead={lead} lang={lang} onSend={sendWhatsapp} />
    </div>
  );
}

/* ─── header + fields ────────────────────────────────────────── */

function HeaderCard({ lead, lang, owners, onQuickPatch, onEdit, onDelete }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight truncate">
            {lead.full_name}
          </h2>
          {lead.organization_name && (
            <p className="text-sm text-white/60 truncate">
              {lead.organization_name}
              {lead.role_at_org ? ` · ${lead.role_at_org}` : ""}
            </p>
          )}
          {lead.summary && (
            <p className="text-xs text-white/50 mt-1">{lead.summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/80 border border-white/10 text-xs font-semibold"
          >
            <Pencil className="w-3.5 h-3.5" />
            {t("detail.editFields", lang)}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-full text-white/40 hover:text-red-300 hover:bg-red-500/15 transition-colors"
            title={t("detail.delete", lang)}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <QuickStagePicker
          stage={lead.stage}
          lang={lang}
          onChange={(v) => onQuickPatch({ stage: v })}
        />
        <QuickOwnerPicker
          value={lead.assigned_to || ""}
          owners={owners}
          lang={lang}
          onChange={(v) => onQuickPatch({ assigned_to: v || null })}
        />
        {lead.do_not_contact && (
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-red-500/20 text-red-300 border border-red-500/40">
            {lang === "pt" ? "Não contatar" : "Do not contact"}
          </span>
        )}
        {lead.tags && lead.tags.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {lead.tags.map((tag) => (
              <TagPill key={tag} tag={tag} />
            ))}
          </div>
        )}
      </div>

      {lead.converted_player_id && (
        <div className="mt-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-xs text-emerald-200 inline-flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          {t("detail.convertedTo", lang)}{" "}
          <Link
            href={`/admin/users?player=${lead.converted_player_id}`}
            className="underline hover:text-emerald-100"
          >
            {lead.converted?.full_name || lead.converted_player_id}
          </Link>
        </div>
      )}
    </div>
  );
}

function QuickStagePicker({ stage, lang, onChange }) {
  const tone = STAGE_TONES[stage] || "bg-white/10 text-white/80";
  return (
    <div className="relative">
      <select
        value={stage}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pr-6 pl-3 py-1 text-xs font-semibold rounded-full border border-white/10 focus:outline-none cursor-pointer ${tone}`}
      >
        {LEAD_STAGES.map((s) => (
          <option key={s} value={s} className="bg-[#0e0e0e] text-white">
            {t(`stages.${s}`, lang)}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-current opacity-60 pointer-events-none" />
    </div>
  );
}

function QuickOwnerPicker({ value, owners, lang, onChange }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none pr-6 pl-3 py-1 text-xs font-semibold rounded-full border border-white/10 bg-white/[0.05] text-white/80 focus:outline-none cursor-pointer"
      >
        <option value="" className="bg-[#0e0e0e]">
          {t("detail.notAssigned", lang)}
        </option>
        {owners.map((o) => (
          <option key={o.id} value={o.id} className="bg-[#0e0e0e]">
            {o.full_name}
          </option>
        ))}
      </select>
      <ChevronDown className="w-3 h-3 absolute right-1.5 top-1/2 -translate-y-1/2 opacity-60 pointer-events-none" />
    </div>
  );
}

function FieldsCard({ lead, lang }) {
  const isOrg = isOrgLeadType(lead.lead_type);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3 text-sm">
      <Row label={t("form.field.leadType", lang)}>
        {t(`types.${lead.lead_type}`, lang)}
      </Row>
      <Row label={t("form.field.phone", lang)}>
        {lead.phone_e164 ? (
          <span className="inline-flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-white/50" />
            {lead.phone_e164}
          </span>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </Row>
      <Row label={t("form.field.email", lang)}>
        {lead.email ? (
          <span className="inline-flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-white/50" />
            {lead.email}
          </span>
        ) : (
          <span className="text-white/30">—</span>
        )}
      </Row>
      <Row label={t("form.field.source", lang)}>
        {t(`sources.${lead.source}`, lang)}
        {lead.source_detail && (
          <span className="text-white/40 text-xs ml-1">
            · {lead.source_detail}
          </span>
        )}
      </Row>
      {isOrg ? (
        <>
          <Row label={t("form.field.organizationName", lang)}>
            {lead.organization_name || <span className="text-white/30">—</span>}
          </Row>
          <Row label={t("form.field.roleAtOrg", lang)}>
            {lead.role_at_org || <span className="text-white/30">—</span>}
          </Row>
          <Row label={t("form.field.staffCount", lang)}>
            {lead.staff_count ?? <span className="text-white/30">—</span>}
          </Row>
        </>
      ) : (
        <>
          <Row label={t("form.field.ageGroup", lang)}>
            {lead.age_group ? (
              t(`ageGroups.${lead.age_group}`, lang)
            ) : (
              <span className="text-white/30">—</span>
            )}
          </Row>
          <Row label={t("form.field.englishLevel", lang)}>
            {lead.english_level ? (
              t(`englishLevels.${lead.english_level}`, lang)
            ) : (
              <span className="text-white/30">—</span>
            )}
          </Row>
          <Row label={t("form.field.positions", lang)}>
            {lead.positions && lead.positions.length > 0 ? (
              lead.positions.join(", ")
            ) : (
              <span className="text-white/30">—</span>
            )}
          </Row>
        </>
      )}
      <Row label={t("form.field.country", lang)}>
        {[lead.city, lead.state, lead.country].filter(Boolean).join(", ") || (
          <span className="text-white/30">—</span>
        )}
      </Row>
      {lead.next_action_at && (
        <Row label={t("form.field.nextActionAt", lang)}>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-white/50" />
            <RelativeTime iso={lead.next_action_at} lang={lang} />
            {lead.next_action_note && (
              <span className="text-white/50 text-xs">
                · {lead.next_action_note}
              </span>
            )}
          </span>
        </Row>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-[10px] uppercase tracking-wider text-white/45 font-semibold w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-white/80 flex-1 min-w-0">{children}</span>
    </div>
  );
}

function EditForm({ draft, setDraft, owners, lang, onSave, onCancel, saving }) {
  const isOrg = isOrgLeadType(draft.lead_type);
  const set = (k, v) => setDraft((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 space-y-3 text-sm">
      <EditField label={t("form.field.fullName", lang)}>
        <input
          type="text"
          value={draft.full_name || ""}
          onChange={(e) => set("full_name", e.target.value)}
          className={editInputClass}
        />
      </EditField>
      <EditField label={t("form.field.summary", lang)}>
        <input
          type="text"
          value={draft.summary || ""}
          onChange={(e) => set("summary", e.target.value)}
          className={editInputClass}
        />
      </EditField>
      <EditField label={t("form.field.leadType", lang)}>
        <select
          value={draft.lead_type || ""}
          onChange={(e) => set("lead_type", e.target.value)}
          className={editInputClass}
        >
          {LEAD_TYPES.map((v) => (
            <option key={v} value={v} className="bg-[#0e0e0e]">
              {t(`types.${v}`, lang)}
            </option>
          ))}
        </select>
      </EditField>
      <EditField label={t("form.field.phone", lang)}>
        <input
          type="tel"
          value={draft.phone_e164 || ""}
          onChange={(e) => set("phone_e164", e.target.value)}
          className={editInputClass}
        />
      </EditField>
      <EditField label={t("form.field.email", lang)}>
        <input
          type="email"
          value={draft.email || ""}
          onChange={(e) => set("email", e.target.value)}
          className={editInputClass}
        />
      </EditField>
      {isOrg ? (
        <>
          <EditField label={t("form.field.organizationName", lang)}>
            <input
              type="text"
              value={draft.organization_name || ""}
              onChange={(e) => set("organization_name", e.target.value)}
              className={editInputClass}
            />
          </EditField>
          <EditField label={t("form.field.roleAtOrg", lang)}>
            <input
              type="text"
              value={draft.role_at_org || ""}
              onChange={(e) => set("role_at_org", e.target.value)}
              className={editInputClass}
            />
          </EditField>
          <EditField label={t("form.field.staffCount", lang)}>
            <input
              type="number"
              value={draft.staff_count ?? ""}
              onChange={(e) => set("staff_count", e.target.value)}
              className={editInputClass}
            />
          </EditField>
        </>
      ) : (
        <>
          <EditField label={t("form.field.ageGroup", lang)}>
            <select
              value={draft.age_group || ""}
              onChange={(e) => set("age_group", e.target.value)}
              className={editInputClass}
            >
              <option value="">—</option>
              {AGE_GROUPS.map((g) => (
                <option key={g} value={g} className="bg-[#0e0e0e]">
                  {t(`ageGroups.${g}`, lang)}
                </option>
              ))}
            </select>
          </EditField>
          <EditField label={t("form.field.englishLevel", lang)}>
            <select
              value={draft.english_level || ""}
              onChange={(e) => set("english_level", e.target.value)}
              className={editInputClass}
            >
              <option value="">—</option>
              {ENGLISH_LEVELS.map((v) => (
                <option key={v} value={v} className="bg-[#0e0e0e]">
                  {t(`englishLevels.${v}`, lang)}
                </option>
              ))}
            </select>
          </EditField>
          <EditField label={t("form.field.positions", lang)}>
            <input
              type="text"
              value={
                Array.isArray(draft.positions)
                  ? draft.positions.join(", ")
                  : (draft.positions || "")
              }
              onChange={(e) =>
                set(
                  "positions",
                  e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                )
              }
              className={editInputClass}
            />
          </EditField>
        </>
      )}
      <EditField label={t("form.field.source", lang)}>
        <select
          value={draft.source || "manual"}
          onChange={(e) => set("source", e.target.value)}
          className={editInputClass}
        >
          {LEAD_SOURCES.map((v) => (
            <option key={v} value={v} className="bg-[#0e0e0e]">
              {t(`sources.${v}`, lang)}
            </option>
          ))}
        </select>
      </EditField>
      <EditField label={t("form.field.sourceDetail", lang)}>
        <input
          type="text"
          value={draft.source_detail || ""}
          onChange={(e) => set("source_detail", e.target.value)}
          className={editInputClass}
        />
      </EditField>
      <EditField label={t("form.field.tags", lang)}>
        <input
          type="text"
          value={
            Array.isArray(draft.tags) ? draft.tags.join(", ") : draft.tags || ""
          }
          onChange={(e) => set("tags", e.target.value)}
          className={editInputClass}
        />
      </EditField>
      <EditField label={t("form.field.owner", lang)}>
        <select
          value={draft.assigned_to || ""}
          onChange={(e) => set("assigned_to", e.target.value)}
          className={editInputClass}
        >
          <option value="">{t("detail.notAssigned", lang)}</option>
          {owners.map((o) => (
            <option key={o.id} value={o.id} className="bg-[#0e0e0e]">
              {o.full_name}
            </option>
          ))}
        </select>
      </EditField>
      <EditField label={t("form.field.country", lang)}>
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={draft.city || ""}
            onChange={(e) => set("city", e.target.value)}
            placeholder={t("form.field.city", lang)}
            className={editInputClass}
          />
          <input
            type="text"
            value={draft.state || ""}
            onChange={(e) => set("state", e.target.value)}
            placeholder={t("form.field.state", lang)}
            className={editInputClass}
          />
          <input
            type="text"
            value={draft.country || ""}
            onChange={(e) => set("country", e.target.value)}
            placeholder={t("form.field.country", lang)}
            className={editInputClass}
          />
        </div>
      </EditField>
      <EditField label={t("form.field.nextActionAt", lang)}>
        <input
          type="datetime-local"
          value={
            draft.next_action_at
              ? new Date(draft.next_action_at).toISOString().slice(0, 16)
              : ""
          }
          onChange={(e) => set("next_action_at", e.target.value)}
          className={editInputClass}
        />
      </EditField>
      <EditField label={t("form.field.nextActionNote", lang)}>
        <input
          type="text"
          value={draft.next_action_note || ""}
          onChange={(e) => set("next_action_note", e.target.value)}
          className={editInputClass}
        />
      </EditField>
      <label className="inline-flex items-center gap-2 text-sm text-white/70 cursor-pointer">
        <input
          type="checkbox"
          checked={draft.do_not_contact === true}
          onChange={(e) => set("do_not_contact", e.target.checked)}
          className="accent-red-500"
        />
        {t("form.field.doNotContact", lang)}
      </label>

      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={onSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {t("detail.saveChanges", lang)}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/70 border border-white/10 text-sm disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          {t("detail.cancelEdit", lang)}
        </button>
      </div>
    </div>
  );
}

const editInputClass =
  "w-full bg-white/[0.04] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white placeholder:text-white/25 focus:border-emerald-400/50 focus:outline-none";

function EditField({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-white/50 font-semibold mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ─── timeline + notes ───────────────────────────────────────── */

function TabButton({ active, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 ${
        active
          ? "text-white border-emerald-400"
          : "text-white/50 hover:text-white border-transparent"
      }`}
    >
      {label}
    </button>
  );
}

function Timeline({ activities, lang, onLogActivity }) {
  return (
    <div className="space-y-3">
      <QuickLogRow lang={lang} onLog={onLogActivity} />
      {activities.length === 0 ? (
        <p className="text-sm text-white/40">{t("detail.empty.timeline", lang)}</p>
      ) : (
        <ol className="space-y-2">
          {activities.map((a) => (
            <ActivityRow key={a.id} activity={a} lang={lang} />
          ))}
        </ol>
      )}
    </div>
  );
}

function QuickLogRow({ lang, onLog }) {
  const [input, setInput] = useState("");
  const [type, setType] = useState("call_logged");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!input.trim()) return;
    setBusy(true);
    const ok = await onLog(type, input.trim());
    if (ok) setInput("");
    setBusy(false);
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.03] border border-white/10 p-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="bg-white/[0.05] border border-white/10 text-white text-xs rounded-full px-2 py-1 focus:outline-none"
      >
        <option value="call_logged" className="bg-[#0e0e0e]">
          {t("detail.logCall", lang)}
        </option>
        <option value="email_logged" className="bg-[#0e0e0e]">
          {t("detail.logEmail", lang)}
        </option>
      </select>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={
          type === "call_logged"
            ? lang === "pt"
              ? "Resumo da ligação…"
              : "Call summary…"
            : lang === "pt"
              ? "Resumo do email…"
              : "Email summary…"
        }
        onKeyDown={(e) => e.key === "Enter" && submit()}
        className="flex-1 bg-transparent border-none text-sm text-white placeholder:text-white/30 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || !input.trim()}
        className="p-1.5 rounded-full text-emerald-300 hover:bg-emerald-500/15 disabled:opacity-40"
      >
        {busy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Send className="w-4 h-4" />
        )}
      </button>
    </div>
  );
}

function ActivityRow({ activity, lang }) {
  const Icon = activityIcon(activity.activity_type);
  const iconTone = activityTone(activity.activity_type);
  const label = t(`activities.${activity.activity_type}`, lang);
  return (
    <li className="flex items-start gap-3">
      <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${iconTone}`}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2">
          <p className="text-xs font-semibold text-white">{label}</p>
          <span className="text-[10px] text-white/40 tabular-nums shrink-0">
            <RelativeTime iso={activity.created_at} lang={lang} />
          </span>
        </div>
        {activity.summary && (
          <p className="text-xs text-white/60 mt-0.5 whitespace-pre-wrap">
            {activity.summary}
          </p>
        )}
        {!activity.summary && renderActivityDefault(activity, lang)}
        {activity.actor?.full_name && (
          <p className="text-[10px] text-white/35 mt-0.5">
            {activity.actor.full_name}
          </p>
        )}
      </div>
    </li>
  );
}

function activityIcon(type) {
  if (type === "whatsapp_outbound") return MessageCircle;
  if (type === "whatsapp_inbound") return MessageCircle;
  if (type === "note_added") return StickyNote;
  if (type === "call_logged") return PhoneCall;
  if (type === "email_logged") return MailIcon;
  if (type === "assigned") return UserCheck;
  if (type === "tag_change") return TagIcon;
  return Clock;
}
function activityTone(type) {
  if (type === "whatsapp_outbound" || type === "whatsapp_inbound")
    return "bg-emerald-500/15 text-emerald-300";
  if (type === "note_added") return "bg-amber-500/15 text-amber-300";
  if (type === "call_logged") return "bg-blue-500/15 text-blue-300";
  if (type === "email_logged") return "bg-cyan-500/15 text-cyan-300";
  return "bg-white/10 text-white/60";
}

function renderActivityDefault(activity, lang) {
  const p = activity.payload || {};
  if (activity.activity_type === "stage_change") {
    return (
      <p className="text-xs text-white/60 mt-0.5">
        {t(`stages.${p.from}`, lang) || p.from || "—"} →{" "}
        <span className="text-white/90 font-semibold">
          {t(`stages.${p.to}`, lang) || p.to}
        </span>
      </p>
    );
  }
  if (activity.activity_type === "tag_change") {
    return (
      <p className="text-xs text-white/60 mt-0.5">
        {(p.to || []).map((tag) => `#${tag}`).join(" ")}
      </p>
    );
  }
  return null;
}

function NotesPanel({ notes, lang, onAddNote }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!text.trim()) return;
    setBusy(true);
    const ok = await onAddNote(text.trim());
    if (ok) setText("");
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder={t("detail.notePlaceholder", lang)}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-emerald-400/50 focus:outline-none resize-y"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={busy || !text.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-xs disabled:opacity-50"
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <StickyNote className="w-3.5 h-3.5" />
            )}
            {t("detail.addNote", lang)}
          </button>
        </div>
      </div>
      {notes.length === 0 ? (
        <p className="text-sm text-white/40">{t("detail.empty.notes", lang)}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-xl bg-white/[0.03] border border-white/10 p-3"
            >
              <p className="text-sm text-white/85 whitespace-pre-wrap">{n.body}</p>
              <p className="text-[10px] text-white/40 mt-2 tabular-nums">
                {n.author?.full_name ? `${n.author.full_name} · ` : ""}
                <RelativeTime iso={n.created_at} lang={lang} />
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── WhatsApp send bar ──────────────────────────────────────── */

function WhatsappSendBar({ lead, lang, onSend }) {
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);

  const disabled =
    lead.do_not_contact || !lead.phone_e164 || sending || !msg.trim();

  async function submit() {
    setSending(true);
    setToast(null);
    const res = await onSend(msg.trim());
    setSending(false);
    if (res.ok) {
      setMsg("");
      setToast({ tone: "ok", text: t("detail.sendWhatsappSent", lang) });
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast({
        tone: "err",
        text: res.error || t("errors.saveFailed", lang),
      });
    }
  }

  return (
    <div id="send" className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#0b0b0b]/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        {lead.do_not_contact ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-red-300">
            <AlertCircle className="w-4 h-4" />
            {t("detail.doNotContactWarning", lang)}
          </div>
        ) : !lead.phone_e164 ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-white/50">
            <AlertCircle className="w-4 h-4" />
            {t("detail.noPhoneWarning", lang)}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-emerald-300 shrink-0" />
            <input
              type="text"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder={t("detail.sendWhatsappPlaceholder", lang)}
              onKeyDown={(e) => e.key === "Enter" && !disabled && submit()}
              className="flex-1 bg-white/[0.04] border border-white/10 rounded-full px-4 py-2 text-sm text-white placeholder:text-white/30 focus:border-emerald-400/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={submit}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm disabled:opacity-40 transition-colors"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {t("detail.sendWhatsapp", lang)}
            </button>
          </div>
        )}
        {toast && (
          <div
            className={`mt-2 text-xs ${
              toast.tone === "ok" ? "text-emerald-300" : "text-red-300"
            }`}
          >
            {toast.text}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────── */

/**
 * Pick only the columns the API accepts for edit into a plain draft
 * shape. Keeps the PATCH body clean and predictable.
 */
function pickEditableFields(lead) {
  return {
    full_name: lead.full_name ?? "",
    email: lead.email ?? "",
    phone_e164: lead.phone_e164 ?? "",
    lead_type: lead.lead_type ?? "individual_player",
    age_group: lead.age_group ?? "",
    english_level: lead.english_level ?? "",
    positions: Array.isArray(lead.positions) ? lead.positions : [],
    organization_name: lead.organization_name ?? "",
    role_at_org: lead.role_at_org ?? "",
    staff_count: lead.staff_count ?? "",
    source: lead.source ?? "manual",
    source_detail: lead.source_detail ?? "",
    tags: Array.isArray(lead.tags) ? lead.tags.join(", ") : "",
    assigned_to: lead.assigned_to ?? "",
    country: lead.country ?? "",
    state: lead.state ?? "",
    city: lead.city ?? "",
    summary: lead.summary ?? "",
    next_action_at: lead.next_action_at ?? "",
    next_action_note: lead.next_action_note ?? "",
    do_not_contact: lead.do_not_contact === true,
  };
}

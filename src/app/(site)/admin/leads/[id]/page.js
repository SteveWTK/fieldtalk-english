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
  Sparkles,
  Zap,
  Play,
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
import { renderTemplate } from "@/lib/leads/templates";
import LeadsAdminHeader from "@/components/admin/leads/LeadsAdminHeader";
import { TagPill, RelativeTime } from "@/components/admin/leads/LeadBadges";
import Button from "@/components/ui/button";
import Switch from "@/components/ui/switch";

export default function LeadDetailPage() {
  const { lang } = useLanguage();
  const params = useParams();
  const id = params?.id;

  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [notes, setNotes] = useState([]);
  const [owners, setOwners] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [sequences, setSequences] = useState([]);

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
        const [detailRes, ownersRes, enrollRes, seqRes] = await Promise.all([
          fetch(`/api/admin/leads/${id}`),
          fetch(`/api/admin/leads/owners`),
          fetch(`/api/admin/leads/${id}/enrollments`),
          fetch(`/api/admin/lead-sequences`),
        ]);
        const detailJson = await detailRes.json();
        const ownersJson = await ownersRes.json();
        const enrollJson = await enrollRes.json();
        const seqJson = await seqRes.json();
        if (cancelled) return;
        if (!detailRes.ok) {
          setError(detailJson.error || "load_failed");
        } else {
          setLead(detailJson.lead);
          setActivities(detailJson.activities || []);
          setNotes(detailJson.notes || []);
        }
        if (ownersRes.ok) setOwners(ownersJson.owners || []);
        if (enrollRes.ok) setEnrollments(enrollJson.enrollments || []);
        if (seqRes.ok) {
          // Only active sequences with at least one step are enrollable.
          setSequences(
            (seqJson.sequences || []).filter(
              (s) => s.active && s.step_count > 0,
            ),
          );
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
  }, [id]);

  async function handleEnroll(sequenceId) {
    const res = await fetch(`/api/admin/leads/${id}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sequence_id: sequenceId }),
    });
    if (res.ok) {
      // Refresh enrollments + activities.
      const [enrollRes] = await Promise.all([
        fetch(`/api/admin/leads/${id}/enrollments`),
        refreshActivities(),
      ]);
      const enrollJson = await enrollRes.json();
      if (enrollRes.ok) setEnrollments(enrollJson.enrollments || []);
    } else {
      const json = await res.json();
      alert(json.error || "Enroll failed");
    }
  }

  async function handleUnenroll(enrollmentId) {
    if (!confirm("Stop this sequence for this lead?")) return;
    const res = await fetch(
      `/api/admin/leads/${id}/enrollments/${enrollmentId}`,
      { method: "DELETE" },
    );
    if (res.ok) {
      const enrollRes = await fetch(`/api/admin/leads/${id}/enrollments`);
      const enrollJson = await enrollRes.json();
      if (enrollRes.ok) setEnrollments(enrollJson.enrollments || []);
    }
  }

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
      <div className="min-h-screen flex items-center justify-center bg-primary-900">
        <Loader2 className="w-6 h-6 animate-spin text-accent-400" />
      </div>
    );
  }
  if (error || !lead) {
    return (
      <div className="min-h-screen bg-primary-900 text-primary-50">
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <LeadsAdminHeader
            currentView="detail"
            showNewLeadCta={false}
            showViewSwitcher={false}
            backHref="/admin/leads"
          />
          <div className="rounded-card border border-signal-alert/40 bg-signal-alert/10 p-4 text-sm text-signal-alert">
            {t("errors.loadFailed", lang)}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50 pb-32">
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

        {/* Sequences panel — active enrollments + enroll dropdown */}
        <SequencesRow
          lang={lang}
          enrollments={enrollments}
          sequences={sequences}
          onEnroll={handleEnroll}
          onUnenroll={handleUnenroll}
          leadDnc={lead.do_not_contact}
          leadHasPhone={!!lead.phone_e164}
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
            <div className="rounded-card border border-primary-700 bg-primary-panel overflow-hidden">
              <div className="border-b border-primary-700 flex">
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
    <div className="rounded-card border border-primary-700 bg-primary-800 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-primary-50 text-xl sm:text-2xl font-black tracking-tight truncate">
            {lead.full_name}
          </h2>
          {lead.organization_name && (
            <p className="text-sm text-primary-300 truncate">
              {lead.organization_name}
              {lead.role_at_org ? ` · ${lead.role_at_org}` : ""}
            </p>
          )}
          {lead.summary && (
            <p className="text-xs text-primary-400 mt-1">{lead.summary}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-800 hover:bg-primary-700 text-primary-100 border border-primary-700 text-xs font-semibold"
          >
            <Pencil className="w-3.5 h-3.5" />
            {t("detail.editFields", lang)}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-full text-primary-500 hover:text-signal-alert hover:bg-signal-alert/15 transition-colors"
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
          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold bg-signal-alert/20 text-signal-alert border border-signal-alert/40">
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
        <div className="mt-3 rounded-control bg-accent-400/10 border border-accent-400/30 p-2.5 text-xs text-accent-300 inline-flex items-center gap-2">
          <UserCheck className="w-4 h-4" />
          {t("detail.convertedTo", lang)}{" "}
          <Link
            href={`/admin/users?player=${lead.converted_player_id}`}
            className="underline hover:text-accent-400"
          >
            {lead.converted?.full_name || lead.converted_player_id}
          </Link>
        </div>
      )}
    </div>
  );
}

function QuickStagePicker({ stage, lang, onChange }) {
  const tone = STAGE_TONES[stage] || "bg-primary-700 text-primary-100";
  return (
    <div className="relative">
      <select
        value={stage}
        onChange={(e) => onChange(e.target.value)}
        className={`appearance-none pr-6 pl-3 py-1 text-xs font-semibold rounded-full border border-primary-700 focus:outline-none cursor-pointer ${tone}`}
      >
        {LEAD_STAGES.map((s) => (
          <option key={s} value={s} className="bg-primary-800 text-primary-50">
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
        className="appearance-none pr-6 pl-3 py-1 text-xs font-semibold rounded-full border border-primary-700 bg-primary-800 text-primary-100 focus:outline-none cursor-pointer"
      >
        <option value="" className="bg-primary-800">
          {t("detail.notAssigned", lang)}
        </option>
        {owners.map((o) => (
          <option key={o.id} value={o.id} className="bg-primary-800">
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
    <div className="rounded-card border border-primary-700 bg-primary-panel p-4 space-y-3 text-sm">
      <Row label={t("form.field.leadType", lang)}>
        {t(`types.${lead.lead_type}`, lang)}
      </Row>
      <Row label={t("form.field.phone", lang)}>
        {lead.phone_e164 ? (
          <span className="inline-flex items-center gap-1">
            <Phone className="w-3.5 h-3.5 text-primary-400" />
            {lead.phone_e164}
          </span>
        ) : (
          <span className="text-primary-500">—</span>
        )}
      </Row>
      <Row label={t("form.field.email", lang)}>
        {lead.email ? (
          <span className="inline-flex items-center gap-1">
            <Mail className="w-3.5 h-3.5 text-primary-400" />
            {lead.email}
          </span>
        ) : (
          <span className="text-primary-500">—</span>
        )}
      </Row>
      <Row label={t("form.field.source", lang)}>
        {t(`sources.${lead.source}`, lang)}
        {lead.source_detail && (
          <span className="text-primary-500 text-xs ml-1">
            · {lead.source_detail}
          </span>
        )}
      </Row>
      {isOrg ? (
        <>
          <Row label={t("form.field.organizationName", lang)}>
            {lead.organization_name || <span className="text-primary-500">—</span>}
          </Row>
          <Row label={t("form.field.roleAtOrg", lang)}>
            {lead.role_at_org || <span className="text-primary-500">—</span>}
          </Row>
          <Row label={t("form.field.staffCount", lang)}>
            {lead.staff_count ?? <span className="text-primary-500">—</span>}
          </Row>
        </>
      ) : (
        <>
          <Row label={t("form.field.ageGroup", lang)}>
            {lead.age_group ? (
              t(`ageGroups.${lead.age_group}`, lang)
            ) : (
              <span className="text-primary-500">—</span>
            )}
          </Row>
          <Row label={t("form.field.englishLevel", lang)}>
            {lead.english_level ? (
              t(`englishLevels.${lead.english_level}`, lang)
            ) : (
              <span className="text-primary-500">—</span>
            )}
          </Row>
          <Row label={t("form.field.positions", lang)}>
            {lead.positions && lead.positions.length > 0 ? (
              lead.positions.join(", ")
            ) : (
              <span className="text-primary-500">—</span>
            )}
          </Row>
        </>
      )}
      <Row label={t("form.field.country", lang)}>
        {[lead.city, lead.state, lead.country].filter(Boolean).join(", ") || (
          <span className="text-primary-500">—</span>
        )}
      </Row>
      {lead.next_action_at && (
        <Row label={t("form.field.nextActionAt", lang)}>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary-400" />
            <RelativeTime iso={lead.next_action_at} lang={lang} />
            {lead.next_action_note && (
              <span className="text-primary-400 text-xs">
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
      <span className="text-[10px] uppercase tracking-wider text-primary-400 font-semibold w-28 shrink-0 pt-0.5">
        {label}
      </span>
      <span className="text-primary-100 flex-1 min-w-0">{children}</span>
    </div>
  );
}

function EditForm({ draft, setDraft, owners, lang, onSave, onCancel, saving }) {
  const isOrg = isOrgLeadType(draft.lead_type);
  const set = (k, v) => setDraft((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="rounded-card border border-primary-700 bg-primary-panel p-4 space-y-3 text-sm">
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
            <option key={v} value={v} className="bg-primary-800">
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
                <option key={g} value={g} className="bg-primary-800">
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
                <option key={v} value={v} className="bg-primary-800">
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
            <option key={v} value={v} className="bg-primary-800">
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
            <option key={o.id} value={o.id} className="bg-primary-800">
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
      <Switch
        checked={draft.do_not_contact === true}
        onChange={(v) => set("do_not_contact", v)}
        label={t("form.field.doNotContact", lang)}
      />

      <div className="flex items-center gap-2 pt-2 border-t border-primary-700">
        <Button
          variant="primary"
          size="sm"
          Icon={Save}
          loading={saving}
          onClick={onSave}
          disabled={saving}
        >
          {t("detail.saveChanges", lang)}
        </Button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-primary-800 hover:bg-primary-700 text-primary-300 border border-primary-700 text-sm disabled:opacity-50"
        >
          <X className="w-4 h-4" />
          {t("detail.cancelEdit", lang)}
        </button>
      </div>
    </div>
  );
}

const editInputClass =
  "w-full bg-primary-900 border border-primary-700 rounded-control px-2 py-1.5 text-sm text-primary-50 placeholder:text-primary-500 focus:border-accent-400 focus:outline-none";

function EditField({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-primary-400 font-semibold mb-1">
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
          ? "text-primary-50 border-accent-400"
          : "text-primary-400 hover:text-primary-50 border-transparent"
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
        <p className="text-sm text-primary-500">{t("detail.empty.timeline", lang)}</p>
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
    <div className="flex items-center gap-2 rounded-xl bg-primary-800 border border-primary-700 p-2">
      <select
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="bg-primary-800 border border-primary-700 text-primary-50 text-xs rounded-full px-2 py-1 focus:outline-none"
      >
        <option value="call_logged" className="bg-primary-800">
          {t("detail.logCall", lang)}
        </option>
        <option value="email_logged" className="bg-primary-800">
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
        className="flex-1 bg-transparent border-none text-sm text-primary-50 placeholder:text-primary-500 focus:outline-none"
      />
      <button
        type="button"
        onClick={submit}
        disabled={busy || !input.trim()}
        className="p-1.5 rounded-full text-accent-400 hover:bg-accent-400/15 disabled:opacity-40"
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
          <p className="text-xs font-semibold text-primary-50">{label}</p>
          <span className="text-[10px] text-primary-500 tabular-nums shrink-0">
            <RelativeTime iso={activity.created_at} lang={lang} />
          </span>
        </div>
        {activity.summary && (
          <p className="text-xs text-primary-300 mt-0.5 whitespace-pre-wrap">
            {activity.summary}
          </p>
        )}
        {!activity.summary && renderActivityDefault(activity, lang)}
        {activity.actor?.full_name && (
          <p className="text-[10px] text-primary-500 mt-0.5">
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
    return "bg-accent-400/15 text-accent-400";
  if (type === "note_added") return "bg-amber-500/15 text-amber-300";
  if (type === "call_logged") return "bg-blue-500/15 text-blue-300";
  if (type === "email_logged") return "bg-cyan-500/15 text-cyan-300";
  return "bg-primary-700 text-primary-300";
}

function renderActivityDefault(activity, lang) {
  const p = activity.payload || {};
  if (activity.activity_type === "stage_change") {
    return (
      <p className="text-xs text-primary-300 mt-0.5">
        {t(`stages.${p.from}`, lang) || p.from || "—"} →{" "}
        <span className="text-primary-100 font-semibold">
          {t(`stages.${p.to}`, lang) || p.to}
        </span>
      </p>
    );
  }
  if (activity.activity_type === "tag_change") {
    return (
      <p className="text-xs text-primary-300 mt-0.5">
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
          className="w-full bg-primary-900 border border-primary-700 rounded-control px-3 py-2 text-sm text-primary-50 placeholder:text-primary-500 focus:border-accent-400 focus:outline-none resize-y"
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={submit}
            disabled={busy || !text.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 font-bold text-xs disabled:opacity-50"
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
        <p className="text-sm text-primary-500">{t("detail.empty.notes", lang)}</p>
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li
              key={n.id}
              className="rounded-xl bg-primary-800 border border-primary-700 p-3"
            >
              <p className="text-sm text-primary-100 whitespace-pre-wrap">{n.body}</p>
              <p className="text-[10px] text-primary-500 mt-2 tabular-nums">
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
  const [templates, setTemplates] = useState([]);
  const [templatesOpen, setTemplatesOpen] = useState(false);

  // Lazy-load templates the first time the picker opens — small
  // list (dozens), cheap to keep in memory once loaded.
  useEffect(() => {
    if (!templatesOpen || templates.length > 0) return;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/lead-templates?type=${encodeURIComponent(lead.lead_type)}`,
        );
        const json = await res.json();
        if (res.ok) setTemplates(json.templates || []);
      } catch {
        /* silent — picker just shows empty */
      }
    })();
  }, [templatesOpen, templates.length, lead.lead_type]);

  function applyTemplate(tpl) {
    const rendered = renderTemplate(tpl.body, lang, lead);
    setMsg(rendered);
    setTemplatesOpen(false);
  }

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
    <div id="send" className="fixed inset-x-0 bottom-0 z-30 border-t border-primary-700 bg-primary-900/95 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3">
        {lead.do_not_contact ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-signal-alert">
            <AlertCircle className="w-4 h-4" />
            {t("detail.doNotContactWarning", lang)}
          </div>
        ) : !lead.phone_e164 ? (
          <div className="inline-flex items-center gap-1.5 text-xs text-primary-400">
            <AlertCircle className="w-4 h-4" />
            {t("detail.noPhoneWarning", lang)}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-accent-400 shrink-0" />
            <div className="relative">
              <button
                type="button"
                onClick={() => setTemplatesOpen((v) => !v)}
                title={lang === "pt" ? "Modelos" : "Templates"}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-full bg-primary-800 hover:bg-primary-700 text-primary-300 hover:text-primary-50 border border-primary-700 text-xs font-semibold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
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
            <input
              type="text"
              value={msg}
              onChange={(e) => setMsg(e.target.value)}
              placeholder={t("detail.sendWhatsappPlaceholder", lang)}
              onKeyDown={(e) => e.key === "Enter" && !disabled && submit()}
              className="flex-1 bg-primary-900 border border-primary-700 rounded-full px-4 py-2 text-sm text-primary-50 placeholder:text-primary-500 focus:border-accent-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={submit}
              disabled={disabled}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 font-bold text-sm disabled:opacity-40 transition-colors"
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
              toast.tone === "ok" ? "text-accent-400" : "text-signal-alert"
            }`}
          >
            {toast.text}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Compact panel showing active sequence enrollments + a picker to
 * enroll in another one. Guards on lead.do_not_contact + no-phone.
 */
function SequencesRow({
  lang,
  enrollments,
  sequences,
  onEnroll,
  onUnenroll,
  leadDnc,
  leadHasPhone,
}) {
  const isPt = lang === "pt";
  const [pickerOpen, setPickerOpen] = useState(false);
  const activeEnrollments = enrollments.filter((e) => e.status === "active");
  const enrolledSeqIds = new Set(
    enrollments.map((e) => e.sequence?.id).filter(Boolean),
  );
  const available = sequences.filter((s) => !enrolledSeqIds.has(s.id));
  const canEnroll = !leadDnc && leadHasPhone && available.length > 0;

  return (
    <div className="mt-3 rounded-card border border-primary-700 bg-primary-panel p-3">
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-accent-400" />
        <span className="text-xs uppercase tracking-label text-primary-300 font-semibold">
          {isPt ? "Sequências" : "Sequences"}
        </span>
        <div className="relative ml-auto">
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            disabled={!canEnroll}
            title={
              leadDnc
                ? isPt ? "Lead marcado como não contatar" : "Lead marked do-not-contact"
                : !leadHasPhone
                  ? isPt ? "Sem telefone" : "No phone"
                  : available.length === 0
                    ? isPt ? "Nenhuma sequência disponível" : "No sequences available"
                    : undefined
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 font-bold text-xs disabled:opacity-40"
          >
            <Play className="w-3 h-3" />
            {isPt ? "Inscrever" : "Enroll"}
            <ChevronDown className="w-3 h-3" />
          </button>
          {pickerOpen && canEnroll && (
            <SequencePickerPopover
              sequences={available}
              onPick={(seqId) => {
                onEnroll(seqId);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
              lang={lang}
            />
          )}
        </div>
      </div>
      {activeEnrollments.length === 0 ? (
        <p className="mt-2 text-[11px] text-primary-500">
          {isPt
            ? "Nenhuma sequência ativa neste lead."
            : "No active sequences on this lead."}
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {activeEnrollments.map((en) => (
            <li
              key={en.id}
              className="flex items-center gap-2 text-xs"
            >
              <span className="w-2 h-2 rounded-full bg-accent-400 animate-pulse shrink-0" />
              <span className="font-semibold text-primary-50 truncate flex-1">
                {en.sequence?.name || "—"}
              </span>
              <span className="text-primary-500">
                {isPt ? "Passo" : "Step"} {en.current_step}
                {en.next_step_due_at && (
                  <> · {new Date(en.next_step_due_at).toLocaleString(isPt ? "pt-BR" : "en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</>
                )}
              </span>
              <button
                type="button"
                onClick={() => onUnenroll(en.id)}
                className="p-1 rounded text-primary-500 hover:text-signal-alert hover:bg-signal-alert/15"
                title={isPt ? "Parar" : "Stop"}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {/* Non-active enrollments (stopped/completed) — compact list */}
      {enrollments.filter((e) => e.status !== "active").length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-primary-500 font-semibold">
            {isPt ? "Histórico" : "History"}
          </summary>
          <ul className="mt-1 space-y-1">
            {enrollments
              .filter((e) => e.status !== "active")
              .map((en) => (
                <li key={en.id} className="text-[11px] text-primary-400">
                  {en.sequence?.name} · {en.status}
                  {en.stop_reason ? ` (${en.stop_reason})` : ""}
                </li>
              ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function SequencePickerPopover({ sequences, onPick, onClose, lang }) {
  const isPt = lang === "pt";
  return (
    <>
      <div
        className="fixed inset-0 z-[40]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute right-0 top-full mt-1 w-72 max-h-72 overflow-y-auto rounded-xl bg-primary-800 border border-primary-600 shadow-2xl z-[41] p-1.5">
        {sequences.length === 0 ? (
          <p className="p-3 text-xs text-primary-400">
            {isPt ? "Nenhuma disponível." : "None available."}
          </p>
        ) : (
          sequences.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onPick(s.id)}
              className="w-full text-left px-3 py-2 rounded-control hover:bg-primary-700 transition-colors"
            >
              <div className="font-semibold text-xs text-primary-50 truncate">
                {s.name}
              </div>
              <div className="text-[10px] text-primary-400 mt-0.5">
                {s.step_count} {isPt ? "passos" : "steps"} · {s.active_enrollments}{" "}
                {isPt ? "ativos" : "active"}
              </div>
            </button>
          ))
        )}
      </div>
    </>
  );
}

/**
 * Small popover that lists the templates fetched for this lead's
 * type. Click applies (renders + closes); the outer click / Escape
 * closes without applying.
 */
function TemplatePickerPopover({ templates, lang, onPick, onClose }) {
  const isPt = lang === "pt";
  return (
    <>
      {/* Full-viewport catcher for outside clicks. z-index below the
          popover so clicks on the popover itself don't propagate. */}
      <div
        className="fixed inset-0 z-[40]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="absolute bottom-full left-0 mb-2 w-80 max-h-80 overflow-y-auto rounded-xl bg-primary-800 border border-primary-600 shadow-2xl z-[41] p-1.5"
        role="menu"
      >
        {templates.length === 0 ? (
          <div className="p-3 text-xs text-primary-400">
            {isPt ? (
              <>
                Nenhum modelo ativo para este tipo.{" "}
                <Link
                  href="/admin/leads/templates"
                  className="underline hover:text-primary-50"
                >
                  Criar
                </Link>
              </>
            ) : (
              <>
                No active templates for this lead type.{" "}
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
          <>
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onPick(tpl)}
                className="w-full text-left px-3 py-2 rounded-control hover:bg-primary-700 transition-colors"
              >
                <div className="font-semibold text-xs text-primary-50 truncate">
                  {tpl.name}
                </div>
                <div className="text-[10px] text-primary-400 mt-0.5 line-clamp-2 whitespace-pre-wrap">
                  {tpl.body?.[lang] || tpl.body?.pt || tpl.body?.en || ""}
                </div>
              </button>
            ))}
            <div className="mt-1 border-t border-primary-700 pt-1">
              <Link
                href="/admin/leads/templates"
                onClick={onClose}
                className="block px-3 py-1.5 text-[11px] text-accent-400 hover:bg-accent-400/10 rounded-control"
              >
                {isPt ? "Gerenciar modelos →" : "Manage templates →"}
              </Link>
            </div>
          </>
        )}
      </div>
    </>
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

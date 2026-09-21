// src/app/(site)/admin/whatsapp/lead-funnel/page.js
//
// Author the two-slot WhatsApp lead-funnel questions (Q1 + Q2) sent to
// prospects immediately after their "Oi <token>" first contact.
//
// UI shape:
//   - Two "slot" sections stacked (Q1 first, Q2 below).
//   - Each slot lists all candidate questions. Exactly one is active.
//   - Inline expand-to-edit per card, matching the review-questions
//     pattern. "New question" spawns a fresh empty editor at the end.
//   - "Preview full flow" panel at the top renders BOTH slots' active
//     questions side-by-side so David can see the 3-message experience
//     end-to-end before flipping the switch.
//
// Reuses shared editor components from
// src/components/admin/QuestionEditor.js — same building blocks the
// review-questions page uses (still inline there for now, extracted
// here for cleanliness).

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Save,
  Trash2,
  Send,
  Plus,
  AlertCircle,
  Zap,
  MessageSquareQuote,
} from "lucide-react";
import Button from "@/components/ui/button";
import {
  Field,
  LangTextArea,
  ButtonEditor,
  PreviewCard,
  validateQuestion,
} from "@/components/admin/QuestionEditor";

const LANGS = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN", optional: true },
];

const MAX_LABEL_CHARS = 20;
const MAX_PROMPT_CHARS = 1024;
const MAX_EXPLANATION_CHARS = 1024;
const BUTTON_IDS = ["a", "b", "c"];

const emptyQuestion = () => ({
  __clientId: `new-${Math.random().toString(36).slice(2, 8)}`,
  slot: "q1",
  name: "",
  prompt: { pt: "", en: "" },
  buttons: BUTTON_IDS.map((id, i) => ({
    id,
    label: { pt: "", en: "" },
    correct: i === 0,
  })),
  explanation: { pt: "", en: "" },
  active: false,
});

export default function LeadFunnelAdminPage() {
  const [q1, setQ1] = useState([]);
  const [q2, setQ2] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [drafts, setDrafts] = useState({}); // unsaved-new: {slot, clientId} → local q

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/lead-funnel-questions");
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Failed to load");
        } else {
          setQ1(Array.isArray(json.q1) ? json.q1 : []);
          setQ2(Array.isArray(json.q2) ? json.q2 : []);
        }
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const active = useMemo(
    () => ({
      q1: q1.find((r) => r.active) || null,
      q2: q2.find((r) => r.active) || null,
    }),
    [q1, q2],
  );

  function handleSaved(slot, savedQuestion) {
    const setter = slot === "q1" ? setQ1 : setQ2;
    setter((prev) => {
      const idx = prev.findIndex((r) => r.id === savedQuestion.id);
      if (idx === -1) return [savedQuestion, ...prev];
      const next = prev.slice();
      next[idx] = savedQuestion;
      return next;
    });
  }

  function handleActivated(slot, savedQuestion) {
    // The PATCH endpoint deactivates prior active row in the same slot;
    // reflect that locally so the UI matches without a re-fetch.
    const setter = slot === "q1" ? setQ1 : setQ2;
    setter((prev) =>
      prev.map((r) =>
        r.id === savedQuestion.id
          ? savedQuestion
          : r.active
            ? { ...r, active: false }
            : r,
      ),
    );
  }

  function handleDeleted(slot, id) {
    const setter = slot === "q1" ? setQ1 : setQ2;
    setter((prev) => prev.filter((r) => r.id !== id));
  }

  function startNewDraft(slot) {
    const draft = { ...emptyQuestion(), slot };
    setDrafts((prev) => ({ ...prev, [draft.__clientId]: draft }));
    setExpandedId(draft.__clientId);
  }

  function discardDraft(clientId) {
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[clientId];
      return next;
    });
    if (expandedId === clientId) setExpandedId(null);
  }

  function handleDraftSaved(clientId, slot, savedQuestion) {
    discardDraft(clientId);
    handleSaved(slot, savedQuestion);
    setExpandedId(savedQuestion.id);
  }

  const draftsBySlot = useMemo(() => {
    const out = { q1: [], q2: [] };
    for (const d of Object.values(drafts)) {
      if (d.slot === "q1" || d.slot === "q2") out[d.slot].push(d);
    }
    return out;
  }, [drafts]);

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-primary-300 hover:text-primary-50"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to admin
          </Link>
        </div>

        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent-400/80 font-semibold mb-1">
            WhatsApp · Lead funnel
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Q1 &amp; Q2 questions
          </h1>
          <p className="text-sm text-primary-300 mt-2 max-w-2xl leading-relaxed">
            The two 3-button questions sent to a new lead right after they open
            WhatsApp with our business number. Author multiple candidates per
            slot; activate one at a time to test what converts.
          </p>
          <p className="text-[11px] text-primary-500 mt-2 leading-relaxed">
            Portuguese required. English optional (shown only if the lead&apos;s
            profile carries an English preference — for the funnel, PT is the
            default rendering).
          </p>
        </header>

        {loading ? (
          <div className="flex items-center gap-2 text-primary-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-card border border-signal-alert/40 bg-signal-alert/10 p-4 text-sm text-signal-alert">
            {error}
          </div>
        ) : (
          <div className="space-y-8">
            <FullFlowPreview active={active} />

            <SlotSection
              slot="q1"
              title="Q1 — the hook"
              hint="First question sent after the 'Oi <token>' inbound. Should feel intriguing enough to open the conversation."
              questions={q1}
              drafts={draftsBySlot.q1}
              expandedId={expandedId}
              onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
              onSaved={(qq) => handleSaved("q1", qq)}
              onActivated={(qq) => handleActivated("q1", qq)}
              onDeleted={(id) => handleDeleted("q1", id)}
              onDraftSaved={(clientId, qq) =>
                handleDraftSaved(clientId, "q1", qq)
              }
              onDraftDiscard={discardDraft}
              onNewDraft={() => startNewDraft("q1")}
            />

            <SlotSection
              slot="q2"
              title="Q2 — the flip"
              hint="Second question, sent after Q1 is answered. Try switching register — e.g. from vocabulary to interpretation — so the lead sees range."
              questions={q2}
              drafts={draftsBySlot.q2}
              expandedId={expandedId}
              onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
              onSaved={(qq) => handleSaved("q2", qq)}
              onActivated={(qq) => handleActivated("q2", qq)}
              onDeleted={(id) => handleDeleted("q2", id)}
              onDraftSaved={(clientId, qq) =>
                handleDraftSaved(clientId, "q2", qq)
              }
              onDraftDiscard={discardDraft}
              onNewDraft={() => startNewDraft("q2")}
            />
          </div>
        )}
      </main>
    </div>
  );
}

/* ─── Full-flow preview ────────────────────────────────────────── */

function FullFlowPreview({ active }) {
  if (!active.q1 && !active.q2) {
    return (
      <div className="rounded-card border border-primary-700 bg-primary-panel p-5">
        <div className="inline-flex items-center gap-2 text-xs text-primary-300 font-semibold mb-2">
          <MessageSquareQuote className="w-4 h-4" />
          Full-flow preview
        </div>
        <p className="text-sm text-primary-400">
          No active question yet. Activate one per slot to see the 3-message
          experience the lead will get.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-card border border-primary-700 bg-primary-panel p-5">
      <div className="inline-flex items-center gap-2 text-xs text-primary-300 font-semibold mb-4">
        <MessageSquareQuote className="w-4 h-4" />
        Full-flow preview (PT rendering)
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <FlowStep
          step="1"
          title="Q1 sent"
          question={active.q1}
          empty="No Q1 active"
        />
        <FlowStep
          step="2"
          title="Reply + Q2 sent"
          question={active.q2}
          empty="No Q2 active"
          leadIn={
            active.q1 && (
              <p className="text-[11px] text-primary-500 italic mb-2">
                (after Q1 explanation)
              </p>
            )
          }
        />
        <div className="rounded-card border border-accent-400/30 bg-accent-400/[0.04] p-3">
          <p className="text-[10px] uppercase tracking-wider text-accent-400 font-bold mb-1">
            Step 3 · CTA sent
          </p>
          <p className="text-sm text-primary-100 whitespace-pre-wrap">
            {'Adoramos ter você aqui. \n\nA gente ajuda jogadores a se comunicarem em inglês — dentro e fora de campo. Dá uma olhada rápida: '}
            <span className="text-accent-300 underline">
              globalplayerpro.com/demo/&lt;token&gt;
            </span>
          </p>
          <p className="text-[11px] text-primary-500 italic mt-2">
            (button label varies by lead funnel_role — see PR #3.)
          </p>
        </div>
      </div>
    </div>
  );
}

function FlowStep({ step, title, question, empty, leadIn }) {
  return (
    <div className="rounded-card border border-primary-700 bg-primary-800/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-primary-400 font-bold mb-2">
        Step {step} · {title}
      </p>
      {leadIn}
      {question ? (
        <>
          <div className="rounded-card bg-[#075E54]/15 border border-[#075E54]/30 p-2.5">
            <p className="text-[13px] text-primary-50 whitespace-pre-wrap">
              {question.prompt?.pt || "(empty)"}
            </p>
          </div>
          <div className="space-y-1 mt-2">
            {(question.buttons || []).map((b) => (
              <div
                key={b.id}
                className="rounded-control bg-primary-900 border border-primary-700 px-2.5 py-1.5 text-[12px] text-primary-100 text-center"
              >
                {b.label?.pt || "(empty)"}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-sm text-primary-500 italic">{empty}</p>
      )}
    </div>
  );
}

/* ─── SlotSection ──────────────────────────────────────────────── */

function SlotSection({
  slot,
  title,
  hint,
  questions,
  drafts,
  expandedId,
  onToggle,
  onSaved,
  onActivated,
  onDeleted,
  onDraftSaved,
  onDraftDiscard,
  onNewDraft,
}) {
  const activeCount = questions.filter((q) => q.active).length;
  return (
    <section>
      <div className="flex items-end justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <p className="text-xs text-primary-400 mt-1 max-w-2xl">{hint}</p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-primary-500">
          <span>
            {questions.length} candidate{questions.length === 1 ? "" : "s"}
          </span>
          <span>·</span>
          <span
            className={
              activeCount === 1 ? "text-accent-400 font-semibold" : "text-signal-alert"
            }
          >
            {activeCount === 1 ? "1 active" : "no active"}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {questions.map((q) => (
          <QuestionRow
            key={q.id}
            question={q}
            isExpanded={expandedId === q.id}
            onToggle={() => onToggle(q.id)}
            onSaved={onSaved}
            onActivated={onActivated}
            onDeleted={onDeleted}
          />
        ))}

        {drafts.map((d) => (
          <DraftRow
            key={d.__clientId}
            draft={d}
            isExpanded={expandedId === d.__clientId}
            onToggle={() => onToggle(d.__clientId)}
            onSaved={(qq) => onDraftSaved(d.__clientId, qq)}
            onDiscard={() => onDraftDiscard(d.__clientId)}
          />
        ))}

        <button
          type="button"
          onClick={onNewDraft}
          className="w-full flex items-center justify-center gap-2 rounded-card border border-dashed border-primary-700 bg-transparent hover:bg-primary-800/40 text-primary-300 hover:text-primary-50 text-sm py-3 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New candidate for {slot.toUpperCase()}
        </button>
      </div>
    </section>
  );
}

/* ─── Row for saved questions ──────────────────────────────────── */

function QuestionRow({
  question,
  isExpanded,
  onToggle,
  onSaved,
  onActivated,
  onDeleted,
}) {
  return (
    <div className="rounded-card border border-primary-700 bg-primary-panel overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-primary-800 transition-colors text-left"
      >
        <div
          className={`shrink-0 w-8 h-8 rounded-control flex items-center justify-center ${
            question.active
              ? "bg-accent-400/15 text-accent-400"
              : "bg-primary-800 text-primary-500"
          }`}
        >
          {question.active ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm truncate">
              {question.name || "(no name)"}
            </h3>
            {question.active && (
              <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-accent-400/15 text-accent-300 px-1.5 py-0.5 rounded-full font-bold">
                <Zap className="w-3 h-3" /> Active
              </span>
            )}
          </div>
          <p className="text-xs text-primary-400 truncate mt-0.5">
            {question.prompt?.pt || "(prompt empty)"}
          </p>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-primary-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-primary-500" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-primary-700 p-4 sm:p-6 bg-primary-900">
          <SavedEditor
            question={question}
            onSaved={onSaved}
            onActivated={onActivated}
            onDeleted={onDeleted}
          />
        </div>
      )}
    </div>
  );
}

/* ─── Row for unsaved drafts ───────────────────────────────────── */

function DraftRow({ draft, isExpanded, onToggle, onSaved, onDiscard }) {
  return (
    <div className="rounded-card border border-dashed border-accent-400/40 bg-accent-400/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-accent-400/[0.06] transition-colors text-left"
      >
        <div className="shrink-0 w-8 h-8 rounded-control flex items-center justify-center bg-accent-400/15 text-accent-400">
          <Plus className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">
            {draft.name || "New draft"}
          </h3>
          <p className="text-xs text-primary-400 truncate mt-0.5">
            Unsaved candidate for {draft.slot.toUpperCase()}
          </p>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-primary-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-primary-500" />
        )}
      </button>
      {isExpanded && (
        <div className="border-t border-accent-400/30 p-4 sm:p-6 bg-primary-900">
          <DraftEditor draft={draft} onSaved={onSaved} onDiscard={onDiscard} />
        </div>
      )}
    </div>
  );
}

/* ─── SavedEditor — editing an existing question ───────────────── */

function SavedEditor({ question, onSaved, onActivated, onDeleted }) {
  const [q, setQ] = useState(() => cloneQuestion(question));
  const [saving, setSaving] = useState(false);
  const [activating, setActivating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setQ(cloneQuestion(question));
    setMsg(null);
  }, [question]);

  const clientError = validateQuestion(q, {
    requiredLangs: ["pt"],
    optionalLangs: ["en"],
    maxPromptChars: MAX_PROMPT_CHARS,
    maxExplanationChars: MAX_EXPLANATION_CHARS,
    maxLabelChars: MAX_LABEL_CHARS,
  });

  const busy = saving || activating || deleting || testing;

  async function handleSave() {
    if (!q.name || !q.name.trim()) {
      setMsg({ tone: "error", text: "Name required" });
      return;
    }
    if (clientError) {
      setMsg({ tone: "error", text: clientError });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/lead-funnel-questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: question.id,
          name: q.name.trim(),
          prompt: q.prompt,
          buttons: q.buttons,
          explanation: q.explanation,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tone: "error", text: json.error || "Save failed" });
      } else {
        setMsg({ tone: "success", text: "Saved." });
        onSaved(json.question);
      }
    } catch {
      setMsg({ tone: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleActivate() {
    if (clientError) {
      setMsg({
        tone: "error",
        text: `Fix validation before activating: ${clientError}`,
      });
      return;
    }
    setActivating(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/lead-funnel-questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: question.id, active: true }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tone: "error", text: json.error || "Activate failed" });
      } else {
        setMsg({ tone: "success", text: "Now the active question." });
        onActivated(json.question);
      }
    } catch {
      setMsg({ tone: "error", text: "Network error" });
    } finally {
      setActivating(false);
    }
  }

  async function handleTestSend() {
    if (clientError) {
      setMsg({ tone: "error", text: clientError });
      return;
    }
    setTesting(true);
    setMsg(null);
    try {
      const res = await fetch(
        "/api/admin/lead-funnel-questions/test-send",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: { ...q, id: question.id } }),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tone: "error", text: json.error || "Test send failed" });
      } else {
        const zapiHint = json.zapi_response
          ? ` · Z-API: ${String(json.zapi_response).slice(0, 140)}`
          : "";
        setMsg({
          tone: "success",
          text: `Sent to ${json.phone}. Tap a button on your phone to check rendering.${zapiHint}`,
        });
      }
    } catch {
      setMsg({ tone: "error", text: "Network error" });
    } finally {
      setTesting(false);
    }
  }

  async function handleDelete() {
    if (question.active) {
      setMsg({
        tone: "error",
        text: "Can't delete the active question. Activate another candidate first.",
      });
      return;
    }
    if (
      !confirm(
        `Delete "${question.name}"? This can't be undone (past answers referencing snapshots are preserved on leads).`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/lead-funnel-questions?id=${encodeURIComponent(question.id)}`,
        { method: "DELETE" },
      );
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tone: "error", text: json.error || "Delete failed" });
      } else {
        onDeleted(question.id);
      }
    } catch {
      setMsg({ tone: "error", text: "Network error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <EditorBody
      q={q}
      setQ={setQ}
      showNameField
      actions={
        <>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={busy}
            loading={saving}
            Icon={saving ? undefined : Save}
          >
            Save
          </Button>
          {!question.active && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleActivate}
              disabled={busy}
              loading={activating}
              Icon={activating ? undefined : Zap}
            >
              Activate for {question.slot.toUpperCase()}
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleTestSend}
            disabled={busy}
            loading={testing}
            Icon={testing ? undefined : Send}
            title="Sends the current (saved or unsaved) version to your WhatsApp. Only rendering is tested — no lead session is created."
          >
            Send test to me
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={handleDelete}
            disabled={busy || question.active}
            loading={deleting}
            Icon={deleting ? undefined : Trash2}
            title={
              question.active
                ? "Active questions can't be deleted — activate another first."
                : "Delete this candidate."
            }
          >
            Delete
          </Button>
        </>
      }
      msg={msg}
    />
  );
}

/* ─── DraftEditor — creating a new question ────────────────────── */

function DraftEditor({ draft, onSaved, onDiscard }) {
  const [q, setQ] = useState(() => cloneQuestion(draft));
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const clientError = validateQuestion(q, {
    requiredLangs: ["pt"],
    optionalLangs: ["en"],
    maxPromptChars: MAX_PROMPT_CHARS,
    maxExplanationChars: MAX_EXPLANATION_CHARS,
    maxLabelChars: MAX_LABEL_CHARS,
  });

  async function handleCreate() {
    if (!q.name || !q.name.trim()) {
      setMsg({ tone: "error", text: "Name required" });
      return;
    }
    if (clientError) {
      setMsg({ tone: "error", text: clientError });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/lead-funnel-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot: draft.slot,
          name: q.name.trim(),
          prompt: q.prompt,
          buttons: q.buttons,
          explanation: q.explanation,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tone: "error", text: json.error || "Create failed" });
      } else {
        onSaved(json.question);
      }
    } catch {
      setMsg({ tone: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <EditorBody
      q={q}
      setQ={setQ}
      showNameField
      actions={
        <>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleCreate}
            disabled={saving}
            loading={saving}
            Icon={saving ? undefined : Save}
          >
            Create draft
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onDiscard}
            disabled={saving}
          >
            Discard
          </Button>
        </>
      }
      msg={msg}
    />
  );
}

/* ─── EditorBody — the shared editor surface ───────────────────── */

function EditorBody({ q, setQ, showNameField, actions, msg }) {
  function setName(v) {
    setQ((prev) => ({ ...prev, name: v }));
  }
  function setPromptLang(lang, value) {
    setQ((prev) => ({ ...prev, prompt: { ...prev.prompt, [lang]: value } }));
  }
  function setExplanationLang(lang, value) {
    setQ((prev) => ({
      ...prev,
      explanation: { ...prev.explanation, [lang]: value },
    }));
  }
  function setButtonLabel(idx, lang, value) {
    setQ((prev) => {
      const buttons = prev.buttons.slice();
      buttons[idx] = {
        ...buttons[idx],
        label: { ...buttons[idx].label, [lang]: value },
      };
      return { ...prev, buttons };
    });
  }
  function setCorrect(idx) {
    setQ((prev) => ({
      ...prev,
      buttons: prev.buttons.map((b, i) => ({ ...b, correct: i === idx })),
    }));
  }

  return (
    <div className="space-y-6">
      {showNameField && (
        <Field
          label="Internal name"
          hint="Short label for the team — not shown to leads. e.g. 'Park the bus — v1'."
        >
          <input
            type="text"
            value={q.name || ""}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-primary-800 border border-primary-700 rounded-control px-3 py-2 text-sm text-primary-50 focus:border-accent-400 focus:outline-none"
            placeholder="Park the bus v1"
          />
        </Field>
      )}

      <Field label="Question prompt" hint="Portuguese required. English optional.">
        {LANGS.map((l) => (
          <LangTextArea
            key={l.code}
            langLabel={l.label}
            value={q.prompt?.[l.code] || ""}
            max={MAX_PROMPT_CHARS}
            optional={l.optional}
            onChange={(v) => setPromptLang(l.code, v)}
          />
        ))}
      </Field>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-primary-300 font-semibold">
            Answer buttons
          </p>
          <p className="text-[11px] text-primary-500">
            Pick exactly one correct answer.
          </p>
        </div>
        <div className="space-y-3">
          {q.buttons.map((b, i) => (
            <ButtonEditor
              key={b.id}
              idx={i}
              button={b}
              langs={LANGS}
              maxLabelChars={MAX_LABEL_CHARS}
              onLabel={(lang, v) => setButtonLabel(i, lang, v)}
              onPickCorrect={() => setCorrect(i)}
            />
          ))}
        </div>
      </div>

      <Field
        label="Explanation"
        hint="Shown after any answer (right or wrong). 1–3 sentences, PT required."
      >
        {LANGS.map((l) => (
          <LangTextArea
            key={l.code}
            langLabel={l.label}
            value={q.explanation?.[l.code] || ""}
            max={MAX_EXPLANATION_CHARS}
            optional={l.optional}
            onChange={(v) => setExplanationLang(l.code, v)}
          />
        ))}
      </Field>

      <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-primary-700">
        {actions}
        {msg && (
          <div
            className={`ml-auto inline-flex items-center gap-1.5 text-xs font-medium ${
              msg.tone === "error" ? "text-signal-alert" : "text-accent-400"
            }`}
          >
            {msg.tone === "error" ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
            {msg.text}
          </div>
        )}
      </div>

      <PreviewCard question={q} langs={LANGS} />
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────── */

function cloneQuestion(source) {
  const cloned = JSON.parse(JSON.stringify(source));
  cloned.buttons = BUTTON_IDS.map((id, i) => {
    const existing = (cloned.buttons || []).find((b) => b.id === id);
    return (
      existing || {
        id,
        label: { pt: "", en: "" },
        correct: i === 0,
      }
    );
  });
  cloned.prompt = cloned.prompt || { pt: "", en: "" };
  cloned.explanation = cloned.explanation || { pt: "", en: "" };
  cloned.name = cloned.name || "";
  return cloned;
}

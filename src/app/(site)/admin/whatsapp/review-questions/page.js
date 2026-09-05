// src/app/(site)/admin/whatsapp/review-questions/page.js
//
// Admin CRUD for T+24h WhatsApp review-quiz questions. One row per
// lesson; inline expand-to-edit. Empty state per lesson makes it
// clear which are still awaiting authoring.
//
// Non-tech-team-facing: no JSON editing, every field is a labelled
// input with helper text + character counter. Validation echoes
// server-side rules so bad input fails fast in the UI.
//
// Save is per-question: click Save on a question card → PATCH to
// /api/admin/review-questions with the whole array. "Clear" removes
// the quiz for that lesson (sets column to null).

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
  MessageSquareQuote,
  AlertCircle,
  Send,
} from "lucide-react";

const REQUIRED_LANGS = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
];

const MAX_LABEL_CHARS = 20;
const MAX_PROMPT_CHARS = 1024;
const MAX_EXPLANATION_CHARS = 1024;
const BUTTON_IDS = ["a", "b", "c"];

const EMPTY_QUESTION = () => ({
  id: "q1",
  prompt: { pt: "", en: "" },
  buttons: BUTTON_IDS.map((id, i) => ({
    id,
    label: { pt: "", en: "" },
    correct: i === 0,
  })),
  explanation: { pt: "", en: "" },
});

export default function ReviewQuestionsAdminPage() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterEdition, setFilterEdition] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/admin/review-questions");
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setError(json.error || "Failed to load");
        } else {
          setLessons(json.lessons || []);
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

  const editions = useMemo(() => {
    const s = new Set();
    for (const l of lessons) {
      const e = l.pillars?.edition;
      if (e) s.add(e);
    }
    return Array.from(s).sort();
  }, [lessons]);

  const filtered = useMemo(() => {
    return lessons.filter((l) => {
      if (filterEdition !== "all" && l.pillars?.edition !== filterEdition) {
        return false;
      }
      const hasQuiz =
        Array.isArray(l.review_questions) && l.review_questions.length > 0;
      if (filterStatus === "with" && !hasQuiz) return false;
      if (filterStatus === "without" && hasQuiz) return false;
      return true;
    });
  }, [lessons, filterEdition, filterStatus]);

  const authored = lessons.filter(
    (l) => Array.isArray(l.review_questions) && l.review_questions.length > 0,
  ).length;

  function handleSaved(lessonId, review_questions) {
    setLessons((prev) =>
      prev.map((l) =>
        l.id === lessonId ? { ...l, review_questions } : l,
      ),
    );
  }

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-4">
          <Link
            href="/admin"
            className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to admin
          </Link>
        </div>

        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-1">
            WhatsApp
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Review quiz questions
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
            T+24h mini-quizzes sent via WhatsApp buttons. Author one 3-option
            question per lesson — sent 24 hours after the player completes it.
            Empty lessons are silently skipped.
          </p>
          <p className="text-xs text-white/40 mt-2">
            {authored} of {lessons.length} lessons authored.
          </p>
        </header>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <SelectPill
            label="Edition"
            value={filterEdition}
            onChange={setFilterEdition}
            options={[
              { value: "all", label: "All editions" },
              ...editions.map((e) => ({ value: e, label: e })),
            ]}
          />
          <SelectPill
            label="Status"
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: "all", label: "All lessons" },
              { value: "with", label: "With quiz" },
              { value: "without", label: "Without quiz" },
            ]}
          />
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-white/60">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-white/40">No lessons match the filter.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((lesson) => (
              <LessonRow
                key={lesson.id}
                lesson={lesson}
                isExpanded={expandedId === lesson.id}
                onToggle={() =>
                  setExpandedId(expandedId === lesson.id ? null : lesson.id)
                }
                onSaved={handleSaved}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function SelectPill({ label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 text-xs text-white/60">
      <span>{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/[0.05] border border-white/10 text-white text-xs rounded-full px-3 py-1.5 focus:border-emerald-400/40 focus:outline-none"
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

function LessonRow({ lesson, isExpanded, onToggle, onSaved }) {
  const hasQuiz =
    Array.isArray(lesson.review_questions) && lesson.review_questions.length > 0;
  const question = hasQuiz ? lesson.review_questions[0] : null;
  const edition = lesson.pillars?.edition ?? "—";
  const pillarName = lesson.pillars?.name ?? "—";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div
          className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
            hasQuiz
              ? "bg-emerald-500/15 text-emerald-300"
              : "bg-white/[0.05] text-white/40"
          }`}
        >
          {hasQuiz ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <Circle className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm truncate">{lesson.title}</h3>
          <p className="text-xs text-white/45">
            {edition} · {pillarName}
          </p>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white/40" />
        )}
      </button>

      {isExpanded && (
        <div className="border-t border-white/10 p-4 sm:p-6 bg-black/25">
          <QuestionEditor
            lessonId={lesson.id}
            initial={question}
            onSaved={(review_questions) => onSaved(lesson.id, review_questions)}
          />
        </div>
      )}
    </div>
  );
}

function QuestionEditor({ lessonId, initial, onSaved }) {
  // Track a working copy locally so the user can edit without touching
  // the parent state until save. Reset on `initial` change (row
  // collapsed + reopened after another lesson was saved).
  const [q, setQ] = useState(() => (initial ? cloneQuestion(initial) : EMPTY_QUESTION()));
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    setQ(initial ? cloneQuestion(initial) : EMPTY_QUESTION());
    setMsg(null);
  }, [initial]);

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

  const clientError = validateClient(q);

  async function handleSave() {
    if (clientError) {
      setMsg({ tone: "error", text: clientError });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/review-questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          review_questions: [q],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tone: "error", text: json.error || "Save failed" });
      } else {
        setMsg({ tone: "success", text: "Saved." });
        onSaved(json.lesson?.review_questions ?? [q]);
      }
    } catch {
      setMsg({ tone: "error", text: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSend() {
    // Sends the LOCAL editor state (not the DB) — lets us preview
    // unsaved edits on WhatsApp directly. Still validates client-side
    // first so we don't waste a Z-API call on obviously bad input.
    if (clientError) {
      setMsg({ tone: "error", text: clientError });
      return;
    }
    setTesting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/review-questions/test-send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          question: q,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tone: "error", text: json.error || "Test send failed" });
      } else {
        setMsg({
          tone: "success",
          text: `Sent to ${json.phone}. Reply with a button to test grading.`,
        });
      }
    } catch {
      setMsg({ tone: "error", text: "Network error" });
    } finally {
      setTesting(false);
    }
  }

  async function handleClear() {
    if (!confirm("Remove this lesson's review quiz? This can't be undone.")) {
      return;
    }
    setClearing(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/review-questions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lesson_id: lessonId,
          review_questions: null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg({ tone: "error", text: json.error || "Clear failed" });
      } else {
        setMsg({ tone: "success", text: "Quiz removed." });
        setQ(EMPTY_QUESTION());
        onSaved(null);
      }
    } catch {
      setMsg({ tone: "error", text: "Network error" });
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Prompt */}
      <Field label="Question prompt" hint="Both languages required.">
        {REQUIRED_LANGS.map((l) => (
          <TextArea
            key={l.code}
            langLabel={l.label}
            value={q.prompt[l.code] || ""}
            max={MAX_PROMPT_CHARS}
            onChange={(v) => setPromptLang(l.code, v)}
          />
        ))}
      </Field>

      {/* Buttons */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs uppercase tracking-wider text-white/60 font-semibold">
            Answer buttons
          </p>
          <p className="text-[11px] text-white/40">
            Pick exactly one correct answer.
          </p>
        </div>
        <div className="space-y-3">
          {q.buttons.map((b, i) => (
            <ButtonEditor
              key={b.id}
              idx={i}
              button={b}
              onLabel={(lang, v) => setButtonLabel(i, lang, v)}
              onPickCorrect={() => setCorrect(i)}
            />
          ))}
        </div>
      </div>

      {/* Explanation */}
      <Field
        label="Explanation"
        hint="Shown after any answer (right or wrong). Short and warm — 1-3 sentences."
      >
        {REQUIRED_LANGS.map((l) => (
          <TextArea
            key={l.code}
            langLabel={l.label}
            value={q.explanation[l.code] || ""}
            max={MAX_EXPLANATION_CHARS}
            onChange={(v) => setExplanationLang(l.code, v)}
          />
        ))}
      </Field>

      {/* Actions */}
      <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || clearing || testing}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-black font-bold text-sm disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save
        </button>
        <button
          type="button"
          onClick={handleTestSend}
          disabled={saving || clearing || testing}
          title="Sends the current (unsaved) version to your own WhatsApp, bypassing the 24h wait + all gates. Reply with a button to test the router."
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-white/80 hover:text-white border border-white/15 text-sm disabled:opacity-50 transition-colors"
        >
          {testing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send test to me
        </button>
        {initial && (
          <button
            type="button"
            onClick={handleClear}
            disabled={saving || clearing || testing}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/[0.05] hover:bg-red-500/15 text-white/60 hover:text-red-300 border border-white/10 hover:border-red-500/40 text-sm disabled:opacity-50 transition-colors"
          >
            {clearing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Remove quiz
          </button>
        )}
        {msg && (
          <div
            className={`ml-auto inline-flex items-center gap-1.5 text-xs font-medium ${
              msg.tone === "error" ? "text-red-300" : "text-emerald-300"
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

      {/* Preview */}
      <PreviewCard question={q} />
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-white/60 font-semibold mb-1">
        {label}
      </p>
      {hint && <p className="text-[11px] text-white/40 mb-2">{hint}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function TextArea({ langLabel, value, max, onChange }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider text-white/50 font-bold">
          {langLabel}
        </span>
        <span
          className={`text-[10px] tabular-nums ${
            value.length > max ? "text-red-400" : "text-white/35"
          }`}
        >
          {value.length}/{max}
        </span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/25 focus:border-emerald-400/50 focus:outline-none resize-y"
      />
    </div>
  );
}

function ButtonEditor({ idx, button, onLabel, onPickCorrect }) {
  return (
    <div
      className={`rounded-xl border p-3 ${
        button.correct
          ? "border-emerald-400/40 bg-emerald-500/[0.05]"
          : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-white/50 font-bold">
          Button {idx + 1} (id: {button.id})
        </span>
        <label className="inline-flex items-center gap-1.5 text-[11px] text-white/60 cursor-pointer">
          <input
            type="radio"
            name={`correct-${idx}-parent`}
            checked={button.correct}
            onChange={onPickCorrect}
            className="accent-emerald-400"
          />
          Correct answer
        </label>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {REQUIRED_LANGS.map((l) => (
          <div key={l.code}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-wider text-white/50 font-bold">
                {l.label} label
              </span>
              <span
                className={`text-[10px] tabular-nums ${
                  (button.label[l.code] || "").length > MAX_LABEL_CHARS
                    ? "text-red-400"
                    : "text-white/35"
                }`}
              >
                {(button.label[l.code] || "").length}/{MAX_LABEL_CHARS}
              </span>
            </div>
            <input
              type="text"
              value={button.label[l.code] || ""}
              onChange={(e) => onLabel(l.code, e.target.value)}
              className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:border-emerald-400/50 focus:outline-none"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function PreviewCard({ question }) {
  const [lang, setLang] = useState("pt");
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2 text-xs text-white/60">
          <MessageSquareQuote className="w-4 h-4" />
          <span className="font-semibold">Preview (what the user sees)</span>
        </div>
        <div className="inline-flex rounded-full bg-white/[0.05] border border-white/10 p-0.5">
          {REQUIRED_LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors ${
                lang === l.code
                  ? "bg-emerald-400 text-black"
                  : "text-white/60 hover:text-white"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-md">
        <div className="rounded-2xl bg-[#075E54]/15 border border-[#075E54]/30 p-3">
          <p className="text-sm text-white whitespace-pre-wrap">
            {question.prompt[lang] || (
              <span className="italic text-white/35">(prompt empty)</span>
            )}
          </p>
        </div>
        <div className="space-y-1 mt-2">
          {question.buttons.map((b) => (
            <div
              key={b.id}
              className="rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-white/80 text-center"
            >
              {b.label[lang] || (
                <span className="italic text-white/35">(empty)</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────── */

function cloneQuestion(q) {
  // Structured clone via JSON is safe here — JSONB values are plain.
  const cloned = JSON.parse(JSON.stringify(q));
  // Ensure the button shape matches BUTTON_IDS length + defaults if the
  // stored data drifted (e.g. an older 2-button question).
  cloned.buttons = BUTTON_IDS.map((id, i) => {
    const existing = cloned.buttons?.find((b) => b.id === id);
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
  cloned.id = cloned.id || "q1";
  return cloned;
}

function validateClient(q) {
  const requireLang = (bundle, fieldName) => {
    for (const l of REQUIRED_LANGS) {
      if (!bundle[l.code] || !bundle[l.code].trim()) {
        return `${fieldName}: ${l.label} required`;
      }
    }
    return null;
  };
  let e = requireLang(q.prompt, "Prompt");
  if (e) return e;
  e = requireLang(q.explanation, "Explanation");
  if (e) return e;
  for (let i = 0; i < q.buttons.length; i++) {
    const err = requireLang(q.buttons[i].label, `Button ${i + 1} label`);
    if (err) return err;
    if (q.buttons[i].label.pt.length > MAX_LABEL_CHARS) {
      return `Button ${i + 1} PT label too long`;
    }
    if (q.buttons[i].label.en.length > MAX_LABEL_CHARS) {
      return `Button ${i + 1} EN label too long`;
    }
  }
  const correctCount = q.buttons.filter((b) => b.correct).length;
  if (correctCount !== 1) return "Pick exactly one correct answer";
  return null;
}

// src/components/admin/QuestionEditor.js
//
// Shared building blocks for authoring WhatsApp button-quiz questions.
// Used by:
//   - /admin/whatsapp/review-questions  (T+24h post-lesson review quizzes)
//   - /admin/whatsapp/lead-funnel       (pre-signup lead-funnel Q1 + Q2)
//
// Each component is deliberately dumb: it takes a value + change handler
// and renders. The parent owns the source of truth and the save button.
// This keeps the shape reusable regardless of where the question comes
// from (lessons.review_questions column, whatsapp_lead_questions row,
// anywhere else that stores the same JSONB shape).
//
// The question shape (matches the Z-API dispatch payload) is:
//   {
//     id: string,
//     prompt:      { pt, en? },
//     buttons:     [{ id, label: {pt, en?}, correct }],
//     explanation: { pt, en? },
//   }
//
// The `optionalLangs` prop drives per-page relaxation. Lead-funnel is
// PT-only (EN is optional); review-quizzes still require PT + EN.

"use client";

import { useState } from "react";
import { MessageSquareQuote } from "lucide-react";

/* ─── Field (label + hint wrapper) ─────────────────────────────── */

export function Field({ label, hint, children }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-primary-300 font-semibold mb-1">
        {label}
      </p>
      {hint && <p className="text-[11px] text-primary-500 mb-2">{hint}</p>}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/* ─── LangTextArea ─────────────────────────────────────────────── */

/**
 * @param {{
 *   langLabel: string,
 *   value: string,
 *   max: number,
 *   optional?: boolean,
 *   onChange: (val: string) => void,
 * }} props
 */
export function LangTextArea({ langLabel, value, max, optional, onChange }) {
  const len = value ? value.length : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] uppercase tracking-wider text-primary-400 font-bold">
          {langLabel}
          {optional && (
            <span className="ml-1 text-[10px] normal-case text-primary-500 tracking-normal">
              (optional)
            </span>
          )}
        </span>
        <span
          className={`text-[10px] tabular-nums ${
            len > max ? "text-signal-alert" : "text-primary-500"
          }`}
        >
          {len}/{max}
        </span>
      </div>
      <textarea
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        className="w-full bg-primary-800 border border-primary-700 rounded-control px-3 py-2 text-sm text-primary-50 placeholder:text-primary-500 focus:border-accent-400 focus:outline-none resize-y"
      />
    </div>
  );
}

/* ─── ButtonEditor ─────────────────────────────────────────────── */

/**
 * @param {{
 *   idx: number,
 *   button: { id: string, label: {pt: string, en?: string}, correct: boolean },
 *   langs: Array<{ code: string, label: string, optional?: boolean }>,
 *   maxLabelChars: number,
 *   onLabel: (lang: string, value: string) => void,
 *   onPickCorrect: () => void,
 * }} props
 */
export function ButtonEditor({
  idx,
  button,
  langs,
  maxLabelChars,
  onLabel,
  onPickCorrect,
}) {
  return (
    <div
      className={`rounded-control border p-3 ${
        button.correct
          ? "border-accent-400/40 bg-accent-400/[0.05]"
          : "border-primary-700 bg-primary-800"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-wider text-primary-400 font-bold">
          Button {idx + 1} (id: {button.id})
        </span>
        <label className="inline-flex items-center gap-1.5 text-[11px] text-primary-300 cursor-pointer">
          <input
            type="radio"
            name={`correct-${idx}-parent`}
            checked={button.correct}
            onChange={onPickCorrect}
            className="accent-accent-400"
          />
          Correct answer
        </label>
      </div>
      <div
        className={`grid grid-cols-1 ${
          langs.length > 1 ? "sm:grid-cols-2" : ""
        } gap-2`}
      >
        {langs.map((l) => {
          const val = (button.label && button.label[l.code]) || "";
          return (
            <div key={l.code}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-wider text-primary-400 font-bold">
                  {l.label} label
                  {l.optional && (
                    <span className="ml-1 normal-case text-primary-500 tracking-normal">
                      (optional)
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] tabular-nums ${
                    val.length > maxLabelChars
                      ? "text-signal-alert"
                      : "text-primary-500"
                  }`}
                >
                  {val.length}/{maxLabelChars}
                </span>
              </div>
              <input
                type="text"
                value={val}
                onChange={(e) => onLabel(l.code, e.target.value)}
                className="w-full bg-primary-900 border border-primary-700 rounded-control px-3 py-1.5 text-sm text-primary-50 focus:border-accent-400 focus:outline-none"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── PreviewCard ──────────────────────────────────────────────── */

/**
 * WhatsApp-styled preview of the prompt + buttons + explanation. Toggles
 * between the supplied `langs`.
 *
 * @param {{
 *   question: { prompt: {pt: string, en?: string}, buttons: any[], explanation?: {pt: string, en?: string} },
 *   langs: Array<{ code: string, label: string }>,
 * }} props
 */
export function PreviewCard({ question, langs }) {
  const [lang, setLang] = useState(langs[0]?.code || "pt");
  return (
    <div className="rounded-card border border-primary-700 bg-primary-panel p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="inline-flex items-center gap-2 text-xs text-primary-300">
          <MessageSquareQuote className="w-4 h-4" />
          <span className="font-semibold">Preview (what the lead sees)</span>
        </div>
        {langs.length > 1 && (
          <div className="inline-flex rounded-full bg-primary-800 border border-primary-700 p-0.5">
            {langs.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => setLang(l.code)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-full transition-colors ${
                  lang === l.code
                    ? "bg-accent-400 text-primary-800"
                    : "text-primary-300 hover:text-primary-50"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="max-w-md">
        <div className="rounded-card bg-[#075E54]/15 border border-[#075E54]/30 p-3">
          <p className="text-sm text-primary-50 whitespace-pre-wrap">
            {question.prompt?.[lang] || (
              <span className="italic text-primary-500">(prompt empty)</span>
            )}
          </p>
        </div>
        <div className="space-y-1 mt-2">
          {question.buttons?.map((b) => (
            <div
              key={b.id}
              className="rounded-control bg-primary-800 border border-primary-700 px-3 py-2 text-sm text-primary-100 text-center"
            >
              {b.label?.[lang] || (
                <span className="italic text-primary-500">(empty)</span>
              )}
            </div>
          ))}
        </div>
        {question.explanation?.[lang] && (
          <div className="mt-3 rounded-card bg-primary-800/60 border border-primary-700 p-3">
            <p className="text-[11px] uppercase tracking-wider text-primary-400 font-bold mb-1">
              After any answer
            </p>
            <p className="text-sm text-primary-100 whitespace-pre-wrap">
              {question.explanation[lang]}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── validation helpers (shared client-side) ──────────────────── */

/**
 * Return the first validation error as a string, or null if OK.
 * `requiredLangs` and `optionalLangs` are both arrays of lang codes.
 */
export function validateQuestion(q, opts) {
  const {
    requiredLangs = ["pt"],
    optionalLangs = [],
    maxPromptChars = 1024,
    maxExplanationChars = 1024,
    maxLabelChars = 20,
  } = opts || {};

  const err1 = requireBundle(q.prompt, "Prompt", requiredLangs, maxPromptChars);
  if (err1) return err1;
  const err2 = requireBundle(
    q.explanation,
    "Explanation",
    requiredLangs,
    maxExplanationChars,
  );
  if (err2) return err2;

  if (!Array.isArray(q.buttons) || q.buttons.length === 0) {
    return "At least one button is required";
  }

  for (let i = 0; i < q.buttons.length; i++) {
    const b = q.buttons[i];
    const err = requireBundle(
      b.label,
      `Button ${i + 1} label`,
      requiredLangs,
      maxLabelChars,
    );
    if (err) return err;
    // Optional-lang overflow still enforced.
    for (const lang of optionalLangs) {
      const val = b.label?.[lang];
      if (typeof val === "string" && val.length > maxLabelChars) {
        return `Button ${i + 1} ${lang.toUpperCase()} label too long`;
      }
    }
  }

  const correctCount = q.buttons.filter((b) => b.correct === true).length;
  if (correctCount !== 1) return "Pick exactly one correct answer";
  return null;
}

function requireBundle(bundle, name, langs, maxChars) {
  if (!bundle || typeof bundle !== "object") return `${name} required`;
  for (const lang of langs) {
    const val = bundle[lang];
    if (typeof val !== "string" || !val.trim()) {
      return `${name}: ${lang.toUpperCase()} required`;
    }
    if (val.length > maxChars) {
      return `${name}: ${lang.toUpperCase()} too long`;
    }
  }
  return null;
}

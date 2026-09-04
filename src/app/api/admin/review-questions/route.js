// src/app/api/admin/review-questions/route.js
//
// GET  /api/admin/review-questions        — list all lessons with their
//                                            current review_questions (and
//                                            pillar/edition context for the
//                                            filter UI on the admin page).
// PATCH /api/admin/review-questions       — update review_questions for a
//                                            single lesson. Body: { lesson_id,
//                                            review_questions }. review_questions
//                                            = null | [] clears the quiz.
//
// Both routes are platform_admin-gated. Validation is strict:
// exactly-one `correct: true` per question, at least 1 (max 3)
// buttons, both languages present on every rendered field.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

const REQUIRED_LANGS = ["pt", "en"];
const MAX_BUTTONS = 3;
const MAX_LABEL_CHARS = 20;
const MAX_PROMPT_CHARS = 1024;
const MAX_EXPLANATION_CHARS = 1024;

export async function GET() {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = await getSupabaseAdmin();

  // Join through pillar → edition so the admin can group / filter on
  // the page. Keeps the /admin surface consistent with the other CMS
  // pages that read the same join shape.
  const { data, error } = await supabase
    .from("lessons")
    .select(
      `
      id,
      title,
      sort_order,
      review_questions,
      pillar_id,
      pillars (
        id,
        name,
        edition,
        sort_order
      )
      `,
    )
    .order("sort_order", { ascending: true })
    .limit(500);

  if (error) {
    console.error("[admin/review-questions] list failed:", error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  return NextResponse.json({ lessons: data ?? [] });
}

export async function PATCH(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const lessonId =
    typeof payload?.lesson_id === "string" ? payload.lesson_id.trim() : "";
  if (!lessonId) {
    return NextResponse.json({ error: "lesson_id required" }, { status: 400 });
  }

  const raw = payload?.review_questions;
  // null / [] both clear the quiz for this lesson. Normalise both
  // to null so the DB row is unambiguous.
  if (raw === null || (Array.isArray(raw) && raw.length === 0)) {
    return await writeReviewQuestions(lessonId, null);
  }

  if (!Array.isArray(raw)) {
    return NextResponse.json(
      { error: "review_questions must be an array or null" },
      { status: 400 },
    );
  }

  // Validate + normalise each question. Reject the whole request on
  // any error so the admin sees a clear message instead of silent
  // partial saves.
  const normalized = [];
  for (let i = 0; i < raw.length; i++) {
    const q = raw[i];
    const err = validateQuestion(q, i);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
    normalized.push(normalizeQuestion(q));
  }

  return await writeReviewQuestions(lessonId, normalized);
}

async function writeReviewQuestions(lessonId, value) {
  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("lessons")
    .update({ review_questions: value })
    .eq("id", lessonId)
    .select("id, review_questions")
    .single();

  if (error) {
    console.error("[admin/review-questions] update failed:", error);
    return NextResponse.json({ error: "update_failed" }, { status: 500 });
  }
  return NextResponse.json({ lesson: data });
}

/**
 * Return an error string if the question is invalid, or null if OK.
 */
function validateQuestion(q, idx) {
  const at = `question[${idx}]`;
  if (!q || typeof q !== "object") return `${at} must be an object`;
  if (typeof q.id !== "string" || !q.id.trim()) {
    return `${at}.id required`;
  }
  const promptErr = validateLangBundle(q.prompt, `${at}.prompt`, MAX_PROMPT_CHARS);
  if (promptErr) return promptErr;
  const explErr = validateLangBundle(
    q.explanation,
    `${at}.explanation`,
    MAX_EXPLANATION_CHARS,
  );
  if (explErr) return explErr;

  const buttons = Array.isArray(q.buttons) ? q.buttons : null;
  if (!buttons || buttons.length === 0) {
    return `${at}.buttons required (at least 1)`;
  }
  if (buttons.length > MAX_BUTTONS) {
    return `${at}.buttons max ${MAX_BUTTONS} items`;
  }
  const ids = new Set();
  let correctCount = 0;
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    const bAt = `${at}.buttons[${i}]`;
    if (!b || typeof b !== "object") return `${bAt} must be an object`;
    if (typeof b.id !== "string" || !b.id.trim()) return `${bAt}.id required`;
    if (ids.has(b.id)) return `${bAt}.id duplicate ('${b.id}')`;
    ids.add(b.id);
    const labelErr = validateLangBundle(b.label, `${bAt}.label`, MAX_LABEL_CHARS);
    if (labelErr) return labelErr;
    if (b.correct === true) correctCount++;
  }
  if (correctCount !== 1) {
    return `${at}.buttons must have exactly one 'correct: true' (found ${correctCount})`;
  }
  return null;
}

function validateLangBundle(bundle, path, maxChars) {
  if (!bundle || typeof bundle !== "object" || Array.isArray(bundle)) {
    return `${path} must be an object`;
  }
  for (const lang of REQUIRED_LANGS) {
    const val = bundle[lang];
    if (typeof val !== "string" || !val.trim()) {
      return `${path}.${lang} required (non-empty string)`;
    }
    if (val.length > maxChars) {
      return `${path}.${lang} too long (max ${maxChars} chars)`;
    }
  }
  return null;
}

/**
 * Return a cleaned-up copy of the question — trims strings, drops
 * unknown top-level keys so we don't accumulate junk in the JSONB.
 */
function normalizeQuestion(q) {
  return {
    id: q.id.trim(),
    prompt: normalizeLangBundle(q.prompt),
    buttons: q.buttons.map((b) => ({
      id: b.id.trim(),
      label: normalizeLangBundle(b.label),
      correct: b.correct === true,
    })),
    explanation: normalizeLangBundle(q.explanation),
  };
}

function normalizeLangBundle(bundle) {
  const out = {};
  for (const lang of REQUIRED_LANGS) {
    out[lang] = String(bundle[lang]).trim();
  }
  return out;
}

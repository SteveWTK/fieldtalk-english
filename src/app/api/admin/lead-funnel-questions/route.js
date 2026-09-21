// src/app/api/admin/lead-funnel-questions/route.js
//
// GET    /api/admin/lead-funnel-questions
//        List all lead-funnel questions grouped by slot.
//        Response: { q1: [...], q2: [...] }
//
// POST   /api/admin/lead-funnel-questions
//        Create a new question.
//        Body: { slot: 'q1'|'q2', name, prompt, buttons, explanation }
//        Response: { question }
//
// PATCH  /api/admin/lead-funnel-questions
//        Update an existing question by id (partial patch OK).
//        Body: { id, name?, prompt?, buttons?, explanation?, active? }
//        When toggling `active: true`, flips the previous active row
//        for the same slot to false in one transaction — the DB's
//        partial-unique index would otherwise reject the update.
//        Response: { question }
//
// DELETE /api/admin/lead-funnel-questions?id=<uuid>
//        Delete a question. Refuses to delete the currently-active
//        row — team must first activate another candidate.
//        Response: { ok: true }
//
// All routes platform_admin-gated. Validation mirrors the review-
// questions route but relaxes EN to optional.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";

const REQUIRED_LANGS = ["pt"];
const OPTIONAL_LANGS = ["en"];
const ALL_LANGS = [...REQUIRED_LANGS, ...OPTIONAL_LANGS];
const MAX_BUTTONS = 3;
const MAX_LABEL_CHARS = 20;
const MAX_PROMPT_CHARS = 1024;
const MAX_EXPLANATION_CHARS = 1024;
const MAX_NAME_CHARS = 80;

/* ─── GET ─────────────────────────────────────────────────────── */

export async function GET() {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const supabase = await getSupabaseAdmin();
  const { data, error } = await supabase
    .from("whatsapp_lead_questions")
    .select("*")
    .order("slot", { ascending: true })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[admin/lead-funnel-questions] list failed:", error);
    return NextResponse.json({ error: "list_failed" }, { status: 500 });
  }

  const grouped = { q1: [], q2: [] };
  for (const row of data || []) {
    if (row.slot === "q1" || row.slot === "q2") grouped[row.slot].push(row);
  }
  return NextResponse.json(grouped);
}

/* ─── POST ────────────────────────────────────────────────────── */

export async function POST(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;
  const { user } = gate;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const slot = String(payload?.slot || "").trim();
  if (slot !== "q1" && slot !== "q2") {
    return NextResponse.json(
      { error: "slot must be 'q1' or 'q2'" },
      { status: 400 },
    );
  }

  const name = String(payload?.name || "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  if (name.length > MAX_NAME_CHARS) {
    return NextResponse.json({ error: "name too long" }, { status: 400 });
  }

  const validationError = validateQuestionShape(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();
  const { data: question, error } = await supabase
    .from("whatsapp_lead_questions")
    .insert({
      slot,
      name,
      prompt: normalizeBundle(payload.prompt),
      buttons: normalizeButtons(payload.buttons),
      explanation: normalizeBundle(payload.explanation),
      active: false, // new rows start inactive — admin must activate explicitly
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[admin/lead-funnel-questions] insert failed:", error);
    return NextResponse.json(
      { error: "insert_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ question });
}

/* ─── PATCH ───────────────────────────────────────────────────── */

export async function PATCH(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const id = typeof payload?.id === "string" ? payload.id.trim() : "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await getSupabaseAdmin();

  // Load existing so we can validate the merged shape (partial patches
  // OK — but we still refuse to persist something that wouldn't be a
  // valid question after merge).
  const { data: existing, error: loadErr } = await supabase
    .from("whatsapp_lead_questions")
    .select("*")
    .eq("id", id)
    .single();
  if (loadErr || !existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const patch = {};
  if (typeof payload.name === "string") {
    const trimmed = payload.name.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "name cannot be empty" }, { status: 400 });
    }
    if (trimmed.length > MAX_NAME_CHARS) {
      return NextResponse.json({ error: "name too long" }, { status: 400 });
    }
    patch.name = trimmed;
  }
  if (payload.prompt !== undefined) patch.prompt = normalizeBundle(payload.prompt);
  if (payload.buttons !== undefined) patch.buttons = normalizeButtons(payload.buttons);
  if (payload.explanation !== undefined) {
    patch.explanation = normalizeBundle(payload.explanation);
  }

  // Validate the effective merged question shape.
  const merged = {
    prompt: patch.prompt ?? existing.prompt,
    buttons: patch.buttons ?? existing.buttons,
    explanation: patch.explanation ?? existing.explanation,
  };
  const shapeErr = validateQuestionShape(merged);
  if (shapeErr) {
    return NextResponse.json({ error: shapeErr }, { status: 400 });
  }

  // Handle active toggling. When activating, deactivate the previous
  // winner for the same slot in the same request so the partial-unique
  // index doesn't reject the update. When deactivating explicitly,
  // just clear it (leaves the slot with no active question — funnel
  // router will fail closed until admin activates another).
  const activateRequested =
    payload.active === true && existing.active !== true;
  const deactivateRequested =
    payload.active === false && existing.active === true;

  if (activateRequested) {
    const { error: clearErr } = await supabase
      .from("whatsapp_lead_questions")
      .update({ active: false })
      .eq("slot", existing.slot)
      .eq("active", true)
      .neq("id", id);
    if (clearErr) {
      console.error(
        "[admin/lead-funnel-questions] deactivate-previous failed:",
        clearErr,
      );
      return NextResponse.json(
        { error: "activate_failed", message: clearErr.message },
        { status: 500 },
      );
    }
    patch.active = true;
  } else if (deactivateRequested) {
    patch.active = false;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ question: existing });
  }

  const { data: question, error } = await supabase
    .from("whatsapp_lead_questions")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("[admin/lead-funnel-questions] update failed:", error);
    return NextResponse.json(
      { error: "update_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ question });
}

/* ─── DELETE ──────────────────────────────────────────────────── */

export async function DELETE(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const supabase = await getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("whatsapp_lead_questions")
    .select("id, active")
    .eq("id", id)
    .maybeSingle();
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (existing.active) {
    return NextResponse.json(
      {
        error:
          "cannot_delete_active — activate another question for this slot first",
      },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("whatsapp_lead_questions")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[admin/lead-funnel-questions] delete failed:", error);
    return NextResponse.json(
      { error: "delete_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}

/* ─── validation + normalization ──────────────────────────────── */

function validateQuestionShape(q) {
  if (!q || typeof q !== "object") return "question required";

  const promptErr = validateBundle(q.prompt, "prompt", MAX_PROMPT_CHARS);
  if (promptErr) return promptErr;
  const explErr = validateBundle(
    q.explanation,
    "explanation",
    MAX_EXPLANATION_CHARS,
  );
  if (explErr) return explErr;

  const buttons = Array.isArray(q.buttons) ? q.buttons : null;
  if (!buttons || buttons.length === 0) return "buttons required";
  if (buttons.length > MAX_BUTTONS) return `max ${MAX_BUTTONS} buttons`;

  const ids = new Set();
  let correct = 0;
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    if (!b || typeof b !== "object") return `button[${i}] invalid`;
    if (typeof b.id !== "string" || !b.id.trim()) return `button[${i}].id required`;
    if (ids.has(b.id)) return `button[${i}].id duplicate ('${b.id}')`;
    ids.add(b.id);
    const labelErr = validateBundle(
      b.label,
      `button[${i}].label`,
      MAX_LABEL_CHARS,
    );
    if (labelErr) return labelErr;
    if (b.correct === true) correct++;
  }
  if (correct !== 1) return "exactly one button must be correct";
  return null;
}

function validateBundle(bundle, name, maxChars) {
  if (!bundle || typeof bundle !== "object") return `${name} required`;
  for (const lang of REQUIRED_LANGS) {
    if (typeof bundle[lang] !== "string" || !bundle[lang].trim()) {
      return `${name}.${lang} required`;
    }
    if (bundle[lang].length > maxChars) {
      return `${name}.${lang} too long (max ${maxChars})`;
    }
  }
  // Optional langs — presence not required, but length capped.
  for (const lang of OPTIONAL_LANGS) {
    if (bundle[lang] !== undefined && bundle[lang] !== null) {
      if (typeof bundle[lang] !== "string") {
        return `${name}.${lang} must be a string`;
      }
      if (bundle[lang].length > maxChars) {
        return `${name}.${lang} too long (max ${maxChars})`;
      }
    }
  }
  return null;
}

function normalizeBundle(bundle) {
  const out = {};
  for (const lang of ALL_LANGS) {
    if (bundle && typeof bundle[lang] === "string" && bundle[lang].trim()) {
      out[lang] = bundle[lang].trim();
    }
  }
  return out;
}

function normalizeButtons(buttons) {
  return (Array.isArray(buttons) ? buttons : []).map((b) => ({
    id: String(b.id).trim(),
    label: normalizeBundle(b.label),
    correct: b.correct === true,
  }));
}

// src/app/api/admin/review-questions/test-send/route.js
//
// POST /api/admin/review-questions/test-send
//   Body: { lesson_id: string, question: object }
//
// Fires a T+24h-style review-quiz message IMMEDIATELY, bypassing every
// cron gate (24h delay, 30-min inactivity, 9am-8pm window, opt-in,
// paused, welcomed). Intended for admin dogfooding — send yourself
// a quiz on demand while iterating on question copy.
//
// The question is taken from the request body (NOT the DB), so the
// admin can preview unsaved edits directly on their phone before
// committing. The session it creates is a real row so the router
// will grade the admin's reply normally.
//
// Sends to the admin's own phone_e164. Refuses if the admin has no
// phone set — clearer error than a downstream Z-API 400.

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { sendWhatsappButtons } from "@/lib/integrations/zapi";

const REQUIRED_LANGS = ["pt", "en"];
const MAX_BUTTONS = 3;

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

  const lessonId =
    typeof payload?.lesson_id === "string" ? payload.lesson_id.trim() : "";
  if (!lessonId) {
    return NextResponse.json({ error: "lesson_id required" }, { status: 400 });
  }

  const question = payload?.question;
  const validationError = validateQuestion(question);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const supabase = await getSupabaseAdmin();

  // Load admin's full player row — need phone + preferred_language +
  // opted-in-status is bypassed, but we still snapshot it for the
  // session metadata so audit trails are clear.
  const { data: admin, error: adminErr } = await supabase
    .from("players")
    .select("id, phone_e164, preferred_language")
    .eq("id", user.id)
    .single();
  if (adminErr || !admin) {
    return NextResponse.json(
      { error: "admin_player_not_found" },
      { status: 500 },
    );
  }
  if (!admin.phone_e164) {
    return NextResponse.json(
      {
        error:
          "Your player row has no phone_e164 set. Add one in Supabase before running test-send.",
      },
      { status: 400 },
    );
  }

  // Verify the lesson exists (so an accidental wrong id fails fast
  // instead of writing an orphan session).
  const { data: lesson, error: lessonErr } = await supabase
    .from("lessons")
    .select("id, title")
    .eq("id", lessonId)
    .single();
  if (lessonErr || !lesson) {
    return NextResponse.json({ error: "lesson_not_found" }, { status: 404 });
  }

  // Render the message + button labels for the admin's language.
  const lang = normalizeLang(admin.preferred_language);
  const promptText = pickLangString(question.prompt, lang);
  const buttons = question.buttons.slice(0, MAX_BUTTONS).map((b) => ({
    id: String(b.id),
    label: pickLangString(b.label, lang).slice(0, 20),
  }));

  // Send via Z-API (or stub — see zapi.js).
  let providerMessageId = null;
  try {
    const sendResult = await sendWhatsappButtons({
      telefone: admin.phone_e164,
      message: promptText,
      buttons,
    });
    providerMessageId = sendResult.messageId;
  } catch (err) {
    return NextResponse.json(
      { error: `send_failed: ${err?.message ?? String(err)}` },
      { status: 500 },
    );
  }

  // Upsert session. Because UNIQUE (player_id, lesson_id, question_id)
  // will conflict on re-tests of the same question, we manually delete
  // any prior row first — simpler than juggling onConflict semantics
  // when we need to fully reset defer_count / answered_at / etc.
  const nowIso = new Date().toISOString();
  await supabase
    .from("whatsapp_review_sessions")
    .delete()
    .eq("player_id", admin.id)
    .eq("lesson_id", lessonId)
    .eq("question_id", question.id);

  const { data: session, error: sessErr } = await supabase
    .from("whatsapp_review_sessions")
    .insert({
      player_id: admin.id,
      lesson_id: lessonId,
      question_id: question.id,
      question_snapshot: question,
      status: "sent",
      provider_message_id: providerMessageId,
      queued_at: nowIso,
      sent_at: nowIso,
      metadata: { test_send: true, sent_by_admin: user.id },
    })
    .select("id")
    .single();

  if (sessErr) {
    console.error("[test-send] session insert failed:", sessErr);
    // Send already went out — surface the error but note the message
    // was delivered, so the admin doesn't re-send thinking it failed.
    return NextResponse.json(
      {
        error: `sent_ok_but_session_persist_failed: ${sessErr.message}`,
        provider_message_id: providerMessageId,
      },
      { status: 500 },
    );
  }

  // Log to whatsapp_messages so the admin can find their test in the
  // conversation view alongside cron-sent quizzes.
  await supabase.from("whatsapp_messages").insert({
    player_id: admin.id,
    phone_e164: admin.phone_e164,
    direction: "outbound",
    provider: "zapi",
    provider_message_id: providerMessageId,
    via: "review_quiz",
    body: renderQuizBody(promptText, buttons),
    metadata: {
      review_session_id: session.id,
      lesson_id: lessonId,
      question_id: question.id,
      test_send: true,
    },
  });

  // Bump activity so a real cron tick in the next 30 min doesn't
  // double-fire on this admin.
  await supabase
    .from("players")
    .update({
      whatsapp_last_outbound_at: nowIso,
      last_whatsapp_activity_at: nowIso,
    })
    .eq("id", admin.id);

  return NextResponse.json({
    ok: true,
    session_id: session.id,
    provider_message_id: providerMessageId,
    phone: admin.phone_e164,
  });
}

/* ─── validation + render helpers ─────────────────────────────── */

function validateQuestion(q) {
  if (!q || typeof q !== "object") return "question required";
  if (typeof q.id !== "string" || !q.id.trim()) return "question.id required";
  const promptErr = validateBundle(q.prompt, "prompt");
  if (promptErr) return promptErr;
  const explErr = validateBundle(q.explanation, "explanation");
  if (explErr) return explErr;
  const buttons = Array.isArray(q.buttons) ? q.buttons : null;
  if (!buttons || buttons.length === 0) return "buttons required";
  if (buttons.length > MAX_BUTTONS) {
    return `max ${MAX_BUTTONS} buttons`;
  }
  let correct = 0;
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    if (!b || typeof b !== "object") return `button[${i}] invalid`;
    if (typeof b.id !== "string" || !b.id.trim()) {
      return `button[${i}].id required`;
    }
    const labelErr = validateBundle(b.label, `button[${i}].label`);
    if (labelErr) return labelErr;
    if (b.correct === true) correct++;
  }
  if (correct !== 1) return "exactly one button must be correct";
  return null;
}

function validateBundle(bundle, name) {
  if (!bundle || typeof bundle !== "object") return `${name} required`;
  for (const lang of REQUIRED_LANGS) {
    if (typeof bundle[lang] !== "string" || !bundle[lang].trim()) {
      return `${name}.${lang} required`;
    }
  }
  return null;
}

function normalizeLang(lang) {
  return lang === "en" || lang === "pt" ? lang : "pt";
}

function pickLangString(bundle, lang) {
  if (typeof bundle === "string") return bundle;
  if (!bundle || typeof bundle !== "object") return "";
  return bundle[lang] || bundle.pt || bundle.en || "";
}

function renderQuizBody(promptText, buttons) {
  const opts = buttons.map((b, i) => `${i + 1}. ${b.label}`).join("\n");
  return `${promptText}\n\n${opts}`;
}

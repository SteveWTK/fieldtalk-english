// src/app/api/admin/lead-funnel-questions/test-send/route.js
//
// POST /api/admin/lead-funnel-questions/test-send
//   Body: { question: object }
//
// Fires the given question's button-message IMMEDIATELY to the admin's
// own WhatsApp — for previewing question copy on-device before flipping
// `active` on a candidate.
//
// Unlike the review-quiz test-send, this route does NOT create a
// funnel session, because:
//   1. Leads are not players — no session table would accept the row.
//   2. The lead-funnel router (PR #2) is what handles reply grading;
//      here we're purely visualising the outbound rendering.
//
// The admin taps a button, sees the buttons render correctly, done.
// (If they DO reply, the reply falls through to the AI agent as an
// unmatched inbound in PR #1 — no harm.)

import { NextResponse } from "next/server";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import { assertAdmin } from "@/lib/admin/gate";
import { sendWhatsappButtons } from "@/lib/integrations/zapi";

const REQUIRED_LANGS = ["pt"];
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

  const question = payload?.question;
  const err = validateQuestion(question);
  if (err) return NextResponse.json({ error: err }, { status: 400 });

  const supabase = await getSupabaseAdmin();
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

  const lang = normalizeLang(admin.preferred_language);
  const promptText = pickLangString(question.prompt, lang);
  const buttons = question.buttons.slice(0, MAX_BUTTONS).map((b) => ({
    id: String(b.id),
    label: pickLangString(b.label, lang).slice(0, 20),
  }));

  let providerMessageId = null;
  let zapiRawResponse = null;
  try {
    const sendResult = await sendWhatsappButtons({
      telefone: admin.phone_e164,
      message: promptText,
      buttons,
    });
    providerMessageId = sendResult.messageId;
    zapiRawResponse = sendResult.rawText ?? null;
  } catch (sendErr) {
    return NextResponse.json(
      { error: `send_failed: ${sendErr?.message ?? String(sendErr)}` },
      { status: 500 },
    );
  }

  // Log the outbound so it shows in the admin's own conversation view.
  await supabase.from("whatsapp_messages").insert({
    player_id: admin.id,
    phone_e164: admin.phone_e164,
    direction: "outbound",
    provider: "zapi",
    provider_message_id: providerMessageId,
    via: "lead_funnel_test",
    body: renderBody(promptText, buttons),
    metadata: {
      test_send: true,
      sent_by_admin: user.id,
      lead_funnel_preview: true,
    },
  });

  return NextResponse.json({
    ok: true,
    provider_message_id: providerMessageId,
    phone: admin.phone_e164,
    zapi_response: zapiRawResponse,
  });
}

/* ─── helpers ─────────────────────────────────────────────────── */

function validateQuestion(q) {
  if (!q || typeof q !== "object") return "question required";
  const promptErr = validateBundle(q.prompt, "prompt");
  if (promptErr) return promptErr;
  const buttons = Array.isArray(q.buttons) ? q.buttons : null;
  if (!buttons || buttons.length === 0) return "buttons required";
  if (buttons.length > MAX_BUTTONS) return `max ${MAX_BUTTONS} buttons`;
  for (let i = 0; i < buttons.length; i++) {
    const b = buttons[i];
    if (!b || typeof b !== "object") return `button[${i}] invalid`;
    if (typeof b.id !== "string" || !b.id.trim()) return `button[${i}].id required`;
    const labelErr = validateBundle(b.label, `button[${i}].label`);
    if (labelErr) return labelErr;
  }
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

function renderBody(promptText, buttons) {
  const opts = buttons.map((b, i) => `${i + 1}. ${b.label}`).join("\n");
  return `${promptText}\n\n${opts}`;
}

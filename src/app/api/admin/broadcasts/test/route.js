// src/app/api/admin/broadcasts/test/route.js
//
// POST /api/admin/broadcasts/test
//
// Body: { body: { pt?, en?, es? }, language: 'pt' | 'en' | 'es',
//         recipient_id: 'steve' | 'david' | 'paul' }
//
// Sends the specified language's body to one of the fixed test
// recipients — Steve, David, or Paul. Bypasses the DB entirely
// (no broadcast row, no recipient row, no messages log). Just a
// direct sendWhatsapp() so admin can verify the message renders as
// expected before firing it at real users.
//
// Rate-limit note: nothing enforces "one test per minute" here.
// If we start seeing test-send spam or accidental multi-clicks,
// add a client-side debounce in the compose form.

import { NextResponse } from "next/server";
import { assertAdmin } from "@/lib/admin/gate";
import { sendWhatsapp } from "@/lib/integrations/zapi";
import {
  getTestRecipient,
  VALID_BROADCAST_LANGUAGES,
} from "@/lib/broadcasts/config";

export async function POST(request) {
  const gate = await assertAdmin();
  if (gate instanceof NextResponse) return gate;

  let payload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const language = payload?.language;
  if (!VALID_BROADCAST_LANGUAGES.has(language)) {
    return NextResponse.json(
      { error: `language must be one of: ${[...VALID_BROADCAST_LANGUAGES].join(", ")}` },
      { status: 400 },
    );
  }

  const recipient = getTestRecipient(payload?.recipient_id);
  if (!recipient) {
    return NextResponse.json(
      { error: "unknown recipient_id" },
      { status: 400 },
    );
  }

  const bodyText =
    payload?.body && typeof payload.body === "object"
      ? payload.body[language]
      : null;
  if (typeof bodyText !== "string" || !bodyText.trim()) {
    return NextResponse.json(
      { error: `no body text for language '${language}'` },
      { status: 400 },
    );
  }

  try {
    const result = await sendWhatsapp({
      telefone: recipient.phoneRaw,
      mensagem: bodyText.trim(),
    });
    return NextResponse.json({
      ok: true,
      messageId: result.messageId,
      recipient: recipient.name,
    });
  } catch (err) {
    const msg = err?.message ?? String(err);
    console.error("[admin/broadcasts/test] send failed:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

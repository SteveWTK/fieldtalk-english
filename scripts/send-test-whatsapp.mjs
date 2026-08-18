#!/usr/bin/env node
/**
 * scripts/send-test-whatsapp.mjs
 *
 * Manual smoke test for the Z-API integration. Run:
 *
 *   node --env-file=.env.local scripts/send-test-whatsapp.mjs "+55 86 99999-8888" "olá do FieldTalk"
 *
 * If ZAPI_INSTANCE_ID / ZAPI_TOKEN aren't set, the sender runs in stub
 * mode and prints a fake messageId — proving the flow works end-to-end
 * without a real Z-API account. Once the FieldTalk Z-API instance is
 * provisioned, set the env vars and re-run to send an actual message.
 *
 * Requires Node 20.6+ for the built-in --env-file flag. This script
 * duplicates the send logic from src/lib/integrations/zapi.js so it
 * has zero dependency on the Next build (path aliases, etc.).
 */

function normalizeBrazilianPhone(input) {
  const raw = (input ?? "").replace(/\D/g, "");
  if (!raw) return { ok: false, reason: "empty" };
  const br = tryBrazilian(raw);
  if (br.ok) return br;
  if (raw.length >= 11 && raw.length <= 15 && !raw.startsWith("55")) {
    return { ok: true, e164: raw };
  }
  return br;
}

function tryBrazilian(raw) {
  let core = raw;
  if (raw.startsWith("55") && (raw.length === 12 || raw.length === 13)) {
    core = raw.slice(2);
  }
  if (core.length !== 10 && core.length !== 11) {
    return { ok: false, reason: `unexpected_length_${core.length}` };
  }
  const ddd = core.slice(0, 2);
  const dddNum = Number(ddd);
  if (!Number.isInteger(dddNum) || dddNum < 11 || dddNum > 99) {
    return { ok: false, reason: `invalid_ddd_${ddd}` };
  }
  const subscriber = core.slice(2);
  const firstDigit = subscriber[0];
  if (subscriber.length === 9) {
    if (firstDigit !== "9") {
      return { ok: false, reason: `mobile_missing_leading_9_${firstDigit}` };
    }
    return { ok: true, e164: `55${ddd}${subscriber}` };
  }
  if (firstDigit >= "2" && firstDigit <= "5") {
    return { ok: true, e164: `55${ddd}${subscriber}` };
  }
  if (firstDigit >= "6" && firstDigit <= "9") {
    return { ok: true, e164: `55${ddd}9${subscriber}` };
  }
  return { ok: false, reason: `invalid_subscriber_first_digit_${firstDigit}` };
}

async function sendWhatsapp({ telefone, mensagem }) {
  const id = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  const clientToken = process.env.ZAPI_CLIENT_TOKEN;

  const norm = normalizeBrazilianPhone(telefone);
  if (!norm.ok) {
    throw new Error(`Telefone inválido (${norm.reason}): ${telefone}`);
  }

  if (!id || !token) {
    return {
      messageId: `stub_msg_${Date.now()}`,
      status: "enviado",
      normalized: norm.e164,
    };
  }

  const url = `https://api.z-api.io/instances/${id}/token/${token}/send-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(clientToken ? { "Client-Token": clientToken } : {}),
    },
    body: JSON.stringify({ phone: norm.e164, message: mensagem }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Z-API send-text ${res.status}: ${errText}`);
  }
  const json = await res.json().catch(() => ({}));
  return {
    messageId: json.messageId ?? json.zaapId ?? json.id ?? `sent_${Date.now()}`,
    status: "enviado",
    normalized: norm.e164,
  };
}

const [, , phoneArg, ...messageParts] = process.argv;
if (!phoneArg) {
  console.error(
    'Usage: node --env-file=.env.local scripts/send-test-whatsapp.mjs "<phone>" "<message>"'
  );
  console.error(
    'Example: node --env-file=.env.local scripts/send-test-whatsapp.mjs "+55 86 99999-8888" "olá do FieldTalk"'
  );
  process.exit(1);
}

const message =
  messageParts.length > 0
    ? messageParts.join(" ")
    : "Teste do FieldTalk — se você recebeu isto, o Z-API está funcionando.";

const mode =
  process.env.ZAPI_INSTANCE_ID && process.env.ZAPI_TOKEN ? "REAL" : "STUB";

console.log(`[${mode}] Sending to "${phoneArg}"`);
console.log(`[${mode}] Message: ${message}`);

try {
  const result = await sendWhatsapp({ telefone: phoneArg, mensagem: message });
  console.log(`[${mode}] Success:`, result);
  if (mode === "STUB") {
    console.log(
      "\nStub mode — no real message was sent. Set ZAPI_INSTANCE_ID + ZAPI_TOKEN in .env.local (and ZAPI_CLIENT_TOKEN in production) to send for real."
    );
  }
  process.exit(0);
} catch (err) {
  console.error(`[${mode}] Failed:`, err.message);
  process.exit(1);
}

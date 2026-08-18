/**
 * Z-API (WhatsApp) integration.
 *
 * Two modes:
 *   - Stub (no env vars set): returns fake ids. Lets end-to-end flows
 *     be exercised without a real WhatsApp account. Used until the
 *     FieldTalk Z-API instance is provisioned.
 *   - Real (ZAPI_INSTANCE_ID + ZAPI_TOKEN set): POSTs to Z-API's REST API.
 *
 * All send/receive callers go through this file so the swap from stub
 * to real is one env-var flip. `ZAPI_CLIENT_TOKEN` is a Z-API-mandated
 * security header (added mid-2026); if unset we skip it (dev), if set
 * we include it (prod).
 */

import { normalizeBrazilianPhone } from "@/lib/utils/phone";

export function onlyDigits(s) {
  return String(s ?? "").replace(/\D/g, "");
}

function zapiBaseUrl() {
  const id = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  if (!id || !token) return null;
  return `https://api.z-api.io/instances/${id}/token/${token}`;
}

/**
 * Send a WhatsApp text message via Z-API.
 *
 * @param {{ telefone: string, mensagem: string }} input
 * @returns {Promise<{ messageId: string, status: 'enviado' }>}
 * @throws if the phone can't be normalised or Z-API returns non-2xx.
 */
export async function sendWhatsapp(input) {
  const base = zapiBaseUrl();

  // Z-API rejects anything but `55DDDNNNNNNNNN`. Refuse to send an
  // unnormalizable number rather than shipping garbage — callers (agent,
  // notifier, broadcast dispatcher) need a hard error so the bad row
  // surfaces instead of failing silently.
  const norm = normalizeBrazilianPhone(input.telefone);
  if (!norm.ok) {
    throw new Error(
      `Telefone inválido para Z-API (${norm.reason}): ${input.telefone}`
    );
  }
  const phone = norm.e164;

  if (!base) {
    return { messageId: `stub_msg_${Date.now()}`, status: "enviado" };
  }

  const url = `${base}/send-text`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.ZAPI_CLIENT_TOKEN
        ? { "Client-Token": process.env.ZAPI_CLIENT_TOKEN }
        : {}),
    },
    body: JSON.stringify({ phone, message: input.mensagem }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Z-API send-text ${res.status}: ${errText}`);
  }

  const json = await res.json().catch(() => ({}));
  const messageId =
    json.messageId ?? json.zaapId ?? json.id ?? `sent_${Date.now()}`;
  return { messageId, status: "enviado" };
}

/* ─────────────────────────────────────────────────────────────
   INBOUND WEBHOOK PAYLOAD
   ───────────────────────────────────────────────────────────── */

/**
 * Extract the useful fields from Z-API's raw webhook body.
 * Returns null if this isn't a text message we can handle (media, groups).
 *
 * fromMe=true events ARE returned — the processor uses them to capture
 * manual admin replies typed directly in WhatsApp Web on the shared
 * FieldTalk number. Dedupe against outbound messageIds (we log those
 * ourselves) so we don't double-count our own agent sends.
 *
 * @param {unknown} body
 * @returns {{ phone: string, fromMe: boolean, isGroup: boolean,
 *   senderName?: string, messageId: string, type: string, text: string } | null}
 */
export function parseZapiInbound(body) {
  if (!body || typeof body !== "object") return null;
  const raw = body;

  const phone = typeof raw.phone === "string" ? raw.phone : "";
  const messageId =
    (typeof raw.messageId === "string" && raw.messageId) ||
    (typeof raw.zaapId === "string" && raw.zaapId) ||
    "";
  const fromMe = raw.fromMe === true;
  const isGroup = raw.isGroup === true;
  const senderName =
    typeof raw.senderName === "string" ? raw.senderName : undefined;
  const type = typeof raw.type === "string" ? raw.type : "";

  // Text lives under `text.message` for chat messages, `body` for
  // legacy, `message` in some edge cases. Handle all three.
  let text;
  const textField = raw.text;
  if (
    textField &&
    typeof textField === "object" &&
    typeof textField.message === "string"
  ) {
    text = textField.message;
  } else if (typeof raw.body === "string") {
    text = raw.body;
  } else if (typeof raw.message === "string") {
    text = raw.message;
  }

  if (!phone || isGroup || !text) return null;
  return { phone, fromMe, isGroup, senderName, messageId, type, text };
}

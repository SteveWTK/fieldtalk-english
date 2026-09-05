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

/**
 * Send a WhatsApp interactive-button message (up to 3 quick-reply
 * buttons) via Z-API's send-button-list endpoint. Used by the T+24h
 * mini-review quiz flow — three-option MCQs.
 *
 * WhatsApp Cloud API caps quick-reply buttons at 3, and labels at
 * 20 chars. The caller must enforce those limits; Z-API rejects the
 * whole message if they're exceeded.
 *
 * @param {{
 *   telefone: string,
 *   message: string,
 *   buttons: Array<{ id: string, label: string }>
 * }} input
 * @returns {Promise<{ messageId: string, status: 'enviado' }>}
 */
export async function sendWhatsappButtons(input) {
  const base = zapiBaseUrl();

  const norm = normalizeBrazilianPhone(input.telefone);
  if (!norm.ok) {
    throw new Error(
      `Telefone inválido para Z-API (${norm.reason}): ${input.telefone}`
    );
  }
  const phone = norm.e164;

  const buttons = Array.isArray(input.buttons) ? input.buttons.slice(0, 3) : [];
  if (buttons.length === 0) {
    throw new Error("sendWhatsappButtons: buttons array is required");
  }

  if (!base) {
    return { messageId: `stub_btn_${Date.now()}`, status: "enviado" };
  }

  const url = `${base}/send-button-list`;
  const requestBody = {
    phone,
    message: input.message,
    buttonList: {
      buttons: buttons.map((b) => ({
        id: String(b.id),
        label: String(b.label).slice(0, 20),
      })),
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.ZAPI_CLIENT_TOKEN
        ? { "Client-Token": process.env.ZAPI_CLIENT_TOKEN }
        : {}),
    },
    body: JSON.stringify(requestBody),
  });

  // Read as text first — some Z-API error paths return 2xx with a
  // machine-readable warning in the body ("message not sent, invalid
  // format", etc.) which the JSON parse would then drop. Preserving
  // the raw string is essential for debugging silent-drop failures.
  const rawResponse = await res.text().catch(() => "");
  let json = {};
  try {
    json = rawResponse ? JSON.parse(rawResponse) : {};
  } catch {
    json = {};
  }

  if (!res.ok) {
    throw new Error(
      `Z-API send-button-list ${res.status}: ${rawResponse.slice(0, 500)}`,
    );
  }

  // Log the successful response body so we can see exactly what Z-API
  // says — the "sent but not delivered" symptom is invisible without
  // this. Also surfaces in Vercel logs for cron sends.
  console.log(
    "[zapi/send-button-list] request:",
    JSON.stringify(requestBody),
    "response:",
    rawResponse.slice(0, 500),
  );

  const messageId =
    json.messageId ?? json.zaapId ?? json.id ?? `sent_${Date.now()}`;
  return {
    messageId,
    status: "enviado",
    raw: json,
    rawText: rawResponse,
  };
}

/* ─────────────────────────────────────────────────────────────
   INBOUND WEBHOOK PAYLOAD
   ───────────────────────────────────────────────────────────── */

/**
 * Extract the useful fields from Z-API's raw webhook body.
 * Returns null if this isn't a message we can handle (media, groups).
 *
 * fromMe=true events ARE returned — the processor uses them to capture
 * manual admin replies typed directly in WhatsApp Web on the shared
 * FieldTalk number. Dedupe against outbound messageIds (we log those
 * ourselves) so we don't double-count our own agent sends.
 *
 * Button replies (interactive-message taps) come back as either
 * `buttonsResponseMessage` or `listResponseMessage`. When either is
 * present, `button` is populated with `{ id, label }` AND `text` is
 * set to the button's label so downstream code that only cares about
 * "what did they say" still works.
 *
 * @param {unknown} body
 * @returns {{
 *   phone: string, fromMe: boolean, isGroup: boolean,
 *   senderName?: string, messageId: string, type: string,
 *   text: string,
 *   button?: { id: string, label: string }
 * } | null}
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

  // Button-tap reply — Z-API sends the tap as either buttonsResponseMessage
  // (send-button-list echoes) or listResponseMessage (list-message echoes).
  // Both carry a stable button id (whatever we set at send time) plus the
  // human-readable label the user actually saw.
  let button;
  const btnResp = raw.buttonsResponseMessage;
  const listResp = raw.listResponseMessage;
  if (btnResp && typeof btnResp === "object") {
    const bid =
      (typeof btnResp.buttonId === "string" && btnResp.buttonId) ||
      (typeof btnResp.id === "string" && btnResp.id) ||
      "";
    const blabel =
      (typeof btnResp.message === "string" && btnResp.message) ||
      (typeof btnResp.title === "string" && btnResp.title) ||
      "";
    if (bid) button = { id: bid, label: blabel };
  } else if (listResp && typeof listResp === "object") {
    const bid =
      (typeof listResp.selectedRowId === "string" && listResp.selectedRowId) ||
      (typeof listResp.id === "string" && listResp.id) ||
      "";
    const blabel =
      (typeof listResp.title === "string" && listResp.title) ||
      (typeof listResp.message === "string" && listResp.message) ||
      "";
    if (bid) button = { id: bid, label: blabel };
  }

  // Text lives under `text.message` for chat messages, `body` for
  // legacy, `message` in some edge cases. Handle all three. Falls
  // back to the button label so the downstream "logged message body"
  // stays human-readable for button replies too.
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
  } else if (button) {
    text = button.label || button.id;
  }

  if (!phone || isGroup || !text) return null;
  return {
    phone,
    fromMe,
    isGroup,
    senderName,
    messageId,
    type,
    text,
    ...(button ? { button } : {}),
  };
}

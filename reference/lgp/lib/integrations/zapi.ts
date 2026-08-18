/**
 * Z-API (WhatsApp) integration.
 *
 * Two modes:
 *   - Stub (no env vars set): returns fake ids. Lets the whole app flow
 *     be exercised end-to-end without a real WhatsApp account. Used
 *     everywhere until Stephen wires the real Z-API instance.
 *   - Real (ZAPI_INSTANCE_ID + ZAPI_TOKEN set): POSTs to Z-API's REST API.
 *
 * All send/receive callers go through this file so the swap is one line.
 */

import { normalizeBrazilianPhone } from "@/lib/utils/phone";

export type WhatsappSendInput = {
  telefone: string;
  mensagem: string;
};

export type WhatsappSendResult = {
  messageId: string;
  status: "enviado";
};

/** Strip masks / non-digits so numbers reach Z-API in the expected shape. */
export function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function zapiBaseUrl(): string | null {
  const id = process.env.ZAPI_INSTANCE_ID;
  const token = process.env.ZAPI_TOKEN;
  if (!id || !token) return null;
  return `https://api.z-api.io/instances/${id}/token/${token}`;
}

export async function sendWhatsapp(
  input: WhatsappSendInput
): Promise<WhatsappSendResult> {
  const base = zapiBaseUrl();

  // Z-API rejects anything but `55DDDNNNNNNNNN`. Refuse to send an
  // unnormalizable number rather than shipping garbage — the caller
  // (agent, notifier, etc.) needs a hard error so the bad row surfaces
  // instead of failing silently against Z-API.
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
      // Z-API Client-Token header for extra security when configured.
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

  const json = (await res.json().catch(() => ({}))) as {
    messageId?: string;
    zaapId?: string;
    id?: string;
  };
  const messageId = json.messageId ?? json.zaapId ?? json.id ?? `sent_${Date.now()}`;
  return { messageId, status: "enviado" };
}

/* ─────────────────────────────────────────────────────────────
   INBOUND WEBHOOK PAYLOAD
   ───────────────────────────────────────────────────────────── */

/**
 * Common shape of a Z-API inbound message webhook.
 * Actual payloads vary by message type; we only extract the fields we need.
 */
export type ZapiInbound = {
  phone: string;
  fromMe: boolean;
  isGroup: boolean;
  senderName?: string;
  messageId: string;
  type: string;
  text: string;
};

/**
 * Extract the useful fields from Z-API's raw webhook body.
 * Returns null if this isn't a text message we can handle
 * (media, groups). fromMe=true events ARE returned so the processor
 * can capture manual atendente replies (typed directly in WhatsApp
 * Web/mobile on the shared school number). Callers dedupe against
 * their own agent sends by messageId.
 */
export function parseZapiInbound(body: unknown): ZapiInbound | null {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;

  const phone = typeof raw.phone === "string" ? raw.phone : "";
  const messageId =
    (typeof raw.messageId === "string" && raw.messageId) ||
    (typeof raw.zaapId === "string" && (raw.zaapId as string)) ||
    "";
  const fromMe = raw.fromMe === true;
  const isGroup = raw.isGroup === true;
  const senderName =
    typeof raw.senderName === "string" ? raw.senderName : undefined;
  const type = typeof raw.type === "string" ? raw.type : "";

  // Extract text — Z-API nests it under `text.message` for chat messages,
  // and sometimes `body` for legacy formats.
  let text: string | undefined;
  const textField = raw.text as Record<string, unknown> | undefined;
  if (textField && typeof textField === "object" && typeof textField.message === "string") {
    text = textField.message;
  } else if (typeof raw.body === "string") {
    text = raw.body;
  } else if (typeof raw.message === "string") {
    text = raw.message;
  }

  if (!phone || isGroup || !text) return null;
  return { phone, fromMe, isGroup, senderName, messageId, type, text };
}

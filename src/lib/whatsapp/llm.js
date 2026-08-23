// src/lib/whatsapp/llm.js
//
// Thin OpenAI adapter for the WhatsApp agent. Kept small + purpose-built
// so the swap to Anthropic (planned once Pro Path stabilises — see
// project memory) is a ~30-line change without touching agent.js /
// execute.js.
//
// Uses the OpenAI SDK's JSON response_format so the model is CONTRACT-
// bound to return valid JSON. No regex extraction, no markdown-fence
// stripping — the SDK handles it. Falls back gracefully with { ok: false }
// on parse errors so callers can escalate rather than crash the webhook.
//
// Cost:
//   - Router (gpt-4o-mini): ~$0.0001 per call. Negligible.
//   - Persona (gpt-4o):     ~$0.003 per call at typical context sizes.
// Both figures assume ~200 output tokens which matches WhatsApp reply
// length. Bumping to larger models is a one-line change if quality
// requires it.

import OpenAI from "openai";

const DEFAULT_ROUTER_MODEL = process.env.OPENAI_ROUTER_MODEL || "gpt-4o-mini";
const DEFAULT_PERSONA_MODEL = process.env.OPENAI_AGENT_MODEL || "gpt-4o";

let clientSingleton = null;
function getClient() {
  if (!clientSingleton) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not set");
    }
    clientSingleton = new OpenAI({ apiKey });
  }
  return clientSingleton;
}

/**
 * Run a JSON-mode chat completion. Returns parsed JSON on success or
 * { ok: false, error } — callers should treat failure as "escalate
 * silently" rather than surface an error to the user.
 *
 * @param {{
 *   system: string,
 *   user: string,
 *   model?: string,
 *   temperature?: number,
 * }} opts
 * @returns {Promise<{ ok: true, data: object, usage: object | null } | { ok: false, error: string }>}
 */
export async function completeJson({
  system,
  user,
  model = DEFAULT_PERSONA_MODEL,
  temperature = 0.6,
}) {
  try {
    const client = getClient();
    const resp = await client.chat.completions.create({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    const text = resp.choices?.[0]?.message?.content ?? "";
    if (!text) {
      return { ok: false, error: "empty_response" };
    }
    let data;
    try {
      data = JSON.parse(text);
    } catch (parseErr) {
      // JSON mode SHOULD guarantee valid JSON, but belt-and-braces —
      // return a structured failure rather than throwing.
      return {
        ok: false,
        error: `json_parse_failed: ${parseErr.message}`,
      };
    }
    return { ok: true, data, usage: resp.usage ?? null };
  } catch (err) {
    // Network error, rate limit, model unavailable, invalid API key,
    // etc. — one string surfaces to the escalation record so we can
    // see what actually broke.
    const msg =
      err?.error?.message ?? err?.message ?? String(err ?? "unknown");
    return { ok: false, error: `openai_call_failed: ${msg}` };
  }
}

// Named model constants exported so agent.js can pick the router vs
// persona model without knowing OpenAI specifics. If we swap providers,
// only this file changes.
export const ROUTER_MODEL = DEFAULT_ROUTER_MODEL;
export const PERSONA_MODEL = DEFAULT_PERSONA_MODEL;

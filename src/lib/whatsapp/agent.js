// src/lib/whatsapp/agent.js
//
// Decide-side of the WhatsApp agent — pure function, no side effects.
// Takes conversation context, calls the router LLM to classify intent,
// then calls the matching persona LLM to produce a reply + escalation
// decision. Returns a structured action for execute.js to apply.
//
// Split from execute.js so both halves can be tested in isolation:
// decideAgentAction() with a mocked context reveals what the LLM
// wanted to do, without any risk of real WhatsApp sends or DB writes.

import { loadPrompt } from "./prompts";
import { completeJson, PERSONA_MODEL, ROUTER_MODEL } from "./llm";
import { withProductFacts } from "./product-knowledge";

/**
 * @typedef {Object} AgentContext
 * @property {string} inboundText — the message the user just sent
 * @property {object | null} player — players row (id, edition,
 *   preferred_language, full_name, whatsapp_opted_in, ...) or null
 *   for unmatched inbounds
 * @property {string} phoneE164 — canonical phone number
 * @property {Array<{role: 'user' | 'agent', body: string}>} history —
 *   recent conversation, oldest-first. Cap at ~10 messages.
 * @property {object | null} subscriptionState — { tier, status, ... }
 *   or null if the user has no player_edition_access row
 * @property {object | null} progress — { total_xp, streak_days, ... }
 *   or null for unmatched / new users
 */

/**
 * @typedef {Object} AgentAction
 * @property {'COACH' | 'SUPPORT' | 'ERROR'} intent
 * @property {string} reply — text to send back (empty on ERROR)
 * @property {string} escalate — non-empty = hand off to human
 * @property {string} [error] — set when the whole flow failed
 * @property {object} [debug] — router reasoning + usage counts, kept
 *   for the escalations audit trail
 */

const MAX_HISTORY_MESSAGES = 8;

/**
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase — service role
 * @param {AgentContext} ctx
 * @returns {Promise<AgentAction>}
 */
export async function decideAgentAction(supabase, ctx) {
  // ── Step 1: classify intent via the router ─────────────────────
  let routerPrompt;
  try {
    routerPrompt = await loadPrompt(supabase, "router");
  } catch (err) {
    return errorAction(`prompt_load_failed_router: ${err.message}`);
  }

  const routerUserBlock = buildContextBlock(ctx);
  const routerResult = await completeJson({
    system: routerPrompt.content,
    user: routerUserBlock,
    model: ROUTER_MODEL,
    temperature: 0.1, // classification — deterministic
  });

  if (!routerResult.ok) {
    return errorAction(`router_failed: ${routerResult.error}`);
  }

  const rawIntent = String(routerResult.data?.intent || "").toUpperCase();
  const intent = rawIntent === "SUPPORT" ? "SUPPORT" : "COACH"; // safe default
  const routerReason =
    typeof routerResult.data?.reason === "string"
      ? routerResult.data.reason
      : "";

  // ── Step 2: run the persona ────────────────────────────────────
  const personaKind = intent === "SUPPORT" ? "support" : "coach";
  let personaPrompt;
  try {
    personaPrompt = await loadPrompt(supabase, personaKind);
  } catch (err) {
    return errorAction(`prompt_load_failed_${personaKind}: ${err.message}`);
  }

  // Product facts appended to the persona's system prompt so the agent
  // can answer factual questions (radar mechanics, certificates, XP
  // thresholds, refund policy) correctly instead of hallucinating.
  // Router intentionally does NOT get product facts — it only needs
  // to classify intent, adding facts would inflate cost with zero
  // classification gain.
  const personaResult = await completeJson({
    system: withProductFacts(personaPrompt.content),
    user: routerUserBlock,
    model: PERSONA_MODEL,
    temperature: 0.6,
  });

  if (!personaResult.ok) {
    return errorAction(`persona_failed_${personaKind}: ${personaResult.error}`);
  }

  const reply =
    typeof personaResult.data?.reply === "string"
      ? personaResult.data.reply.trim()
      : "";
  const escalate =
    typeof personaResult.data?.escalate === "string"
      ? personaResult.data.escalate.trim()
      : "";

  // Empty reply is a soft failure — we can't send nothing. Escalate.
  if (!reply) {
    return {
      intent,
      reply: "",
      escalate:
        `agent_empty_reply — router said ${intent} (${routerReason}); persona returned no text.`,
      debug: {
        routerReason,
        personaKind,
        personaSource: personaPrompt.source,
        routerSource: routerPrompt.source,
        usage: {
          router: routerResult.usage,
          persona: personaResult.usage,
        },
      },
    };
  }

  return {
    intent,
    reply,
    escalate,
    debug: {
      routerReason,
      personaKind,
      personaSource: personaPrompt.source,
      routerSource: routerPrompt.source,
      usage: {
        router: routerResult.usage,
        persona: personaResult.usage,
      },
    },
  };
}

function errorAction(reason) {
  return {
    intent: "ERROR",
    reply: "",
    escalate: reason,
    error: reason,
    debug: {},
  };
}

/**
 * Build the "user" turn we send to the LLM — combines the inbound
 * message with a compact profile block and recent conversation so
 * the model has everything it needs in one shot.
 */
function buildContextBlock(ctx) {
  const lines = [];

  // Profile — minimal, only fields the personas actually reference.
  lines.push("## Player context");
  if (ctx.player) {
    lines.push(`- Name: ${ctx.player.full_name || "(not provided)"}`);
    lines.push(`- Edition: ${ctx.player.edition || "(unknown)"}`);
    lines.push(
      `- Preferred language: ${ctx.player.preferred_language || "pt"}`
    );
    if (ctx.subscriptionState) {
      lines.push(
        `- Subscription: ${ctx.subscriptionState.tier || "(none)"} · status=${
          ctx.subscriptionState.status || "(unknown)"
        }`
      );
    } else {
      lines.push(`- Subscription: no active subscription record`);
    }
    if (ctx.progress) {
      lines.push(
        `- Total XP: ${ctx.progress.total_xp ?? 0}` +
          (ctx.progress.streak_days != null
            ? ` · streak: ${ctx.progress.streak_days} days`
            : "")
      );
    }
  } else {
    lines.push(
      "- UNMATCHED: this phone number is not linked to any player account."
    );
    lines.push(
      "- Treat carefully — user may be a lead who hasn't signed up yet."
    );
  }

  // Recent conversation — capped to keep prompt small + focused.
  const trimmedHistory = (ctx.history || []).slice(-MAX_HISTORY_MESSAGES);
  if (trimmedHistory.length > 0) {
    lines.push("");
    lines.push("## Recent conversation (oldest first)");
    for (const msg of trimmedHistory) {
      const speaker = msg.role === "agent" ? "You (agent)" : "User";
      lines.push(`- ${speaker}: ${truncate(msg.body, 400)}`);
    }
  }

  lines.push("");
  lines.push("## The user's current message");
  lines.push(ctx.inboundText || "(empty)");

  return lines.join("\n");
}

function truncate(s, n) {
  const str = String(s ?? "");
  return str.length > n ? `${str.slice(0, n - 1)}…` : str;
}

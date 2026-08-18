import Anthropic from "@anthropic-ai/sdk";

import { getTenant } from "@/lib/tenant/config";
import type { Lead, LeadMessage, NivelamentoEscrito } from "@/lib/supabase/types";

import { loadPromptOrDefault } from "../prompts-loader";

import { LEADS_AGENT_SYSTEM_PROMPT, buildContextBlock } from "./prompt";
import type { AgentAction, AgentDecision } from "./types";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 800;

/**
 * Ask Claude to decide the next reply + any side actions.
 *
 * Falls back to a friendly stub when ANTHROPIC_API_KEY isn't set — the same
 * pattern the rest of the codebase uses. Server-only; never import from
 * a client component.
 */
export async function decideAgentAction(input: {
  lead: Pick<
    Lead,
    | "nome"
    | "telefone"
    | "status"
    | "nivel_sugerido"
    | "faixa_etaria"
    | "responsavel_nome"
    | "notas"
  >;
  recentMessages: Pick<LeadMessage, "direction" | "content" | "created_at">[];
  activeNivelamento: Pick<NivelamentoEscrito, "id" | "respostas" | "score"> | null;
}): Promise<AgentDecision> {
  if (!process.env.ANTHROPIC_API_KEY) return stubDecision(input);

  const context = buildContextBlock(input);
  const systemPrompt = await loadPromptOrDefault("lead", LEADS_AGENT_SYSTEM_PROMPT);

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: [
        {
          type: "text",
          text: systemPrompt,
          // Cache the (large, stable) system prompt so repeated calls
          // are cheaper. Anthropic's ephemeral caching lives ~5min.
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: context },
      ],
      messages: [
        {
          role: "user",
          content:
            'Baseado no histórico acima, gere a próxima resposta no formato JSON descrito. Responda APENAS com o JSON, sem qualquer texto ao redor.',
        },
      ],
    });

    const text = res.content
      .filter((c) => c.type === "text")
      .map((c) => (c as { text: string }).text)
      .join("\n");
    const parsed = tryParseJson<AgentAction>(text);
    if (!parsed || typeof parsed.reply !== "string" || !parsed.reply.trim()) {
      console.error("Agent returned unparseable content:", text);
      return { ok: false, error: "Falha ao interpretar resposta do Claude." };
    }
    return { ok: true, action: parsed, source: "claude" };
  } catch (err) {
    console.error("decideAgentAction failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : "erro desconhecido" };
  }
}

/** Best-effort JSON extraction — Claude sometimes wraps output in markdown. */
function tryParseJson<T>(raw: string): T | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   STUB — used when ANTHROPIC_API_KEY isn't set.
   Keeps the webhook + agent loop testable end-to-end without a key.
   ───────────────────────────────────────────────────────────── */
function stubDecision(input: {
  lead: Pick<Lead, "nome" | "faixa_etaria">;
  recentMessages: Pick<LeadMessage, "direction" | "content">[];
}): AgentDecision {
  const firstName = (input.lead.nome ?? "").trim().split(/\s+/)[0] || "olá";
  const inboundCount = input.recentMessages.filter((m) => m.direction === "inbound").length;

  if (inboundCount <= 1) {
    return {
      ok: true,
      source: "stub",
      action: {
        reply: `Oi, ${firstName}! 👋 Sou a assistente virtual da ${getTenant().name}. Você tem interesse em estudar inglês, ou é para outra pessoa da família?`,
        leadUpdate: { status: "contatado" },
      },
    };
  }

  return {
    ok: true,
    source: "stub",
    action: {
      reply: `Perfeito! Uma nossa atendente vai continuar nossa conversa em instantes com informações sobre horários e turmas. 😊`,
      escalate: "Stub — agente de demonstração encerrou o primeiro turno.",
    },
  };
}

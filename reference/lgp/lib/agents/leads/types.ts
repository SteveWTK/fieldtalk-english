import type { LeadStatus } from "@/lib/supabase/types";

/**
 * The structured action Claude returns for a single conversation turn.
 * Only `reply` is required — everything else is optional and applied by
 * `executeAgentAction` only when present.
 */
export type AgentAction = {
  reply: string;
  leadUpdate?: {
    status?: LeadStatus;
    nivel_sugerido?: string;
    faixa_etaria?: string;
    /**
     * The aluno's (future student's) confirmed name. The lead row is
     * seeded with the WhatsApp senderName / phone at creation time —
     * often wrong or a display alias — so the agent overwrites it here
     * once the caller confirms who the course is for. When the caller
     * IS the aluno, this equals `responsavel_nome`.
     */
    nome?: string;
    responsavel_nome?: string;
    notas?: string;
  };
  nivelamento?:
    | { action: "start"; question: string }
    | {
        action: "answer";
        question?: string;   // next question after judging this one
        correct?: boolean;   // judgement of the just-answered turn
      }
    | { action: "conclude"; level: string; score: number };
  /** Non-empty string means "hand off to human atendente"; agent stops. */
  escalate?: string;
  /**
   * Trigger a handoff to the Student Agent for an already-enrolled family.
   * Set when the caller confirms they're a current client and provides
   * the aluno's name. The server searches the alunos table; on a single
   * match it links this phone as an extra number on the aluno's
   * responsavel and fires the Student Agent's greeting. Multi-match →
   * the agent asks to disambiguate on the next turn. No match → falls
   * back to escalating to a human atendente.
   */
  handoff_to_student?: {
    aluno_nome: string;
  };
  /**
   * Signals that this contact should not become a lead at all — the
   * person turned out to be an existing client, a teacher, or another
   * team member who reached the school WhatsApp. The reply still goes
   * out (usually a short "vou te conectar com nossa atendente"), then
   * the entire lead ficha (plus messages / visitas / nivelamentos via
   * FK cascade) is deleted. Use `escalate` instead when the person IS
   * a real lead but the agent can't answer (prices, complaints, etc).
   */
  discard_lead?: {
    reason: string;
  };
};

export type AgentDecision =
  | { ok: true; action: AgentAction; source: "claude" | "stub" }
  | { ok: false; error: string };

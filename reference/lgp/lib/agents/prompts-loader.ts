import { createSupabaseServiceClient } from "@/lib/supabase/server";
import type { PromptAgenteTipo } from "@/lib/supabase/types";

/**
 * Load the DB override for an agent's system prompt, falling back to the
 * TS-baked default when no override row exists.
 *
 * Introduced in SP-3 so gestor_geral can edit prompts from the settings
 * panel without a redeploy. Absence of a row = TS default wins (which is
 * the pre-SP-3 behaviour — safe by construction).
 *
 * Per-request DB hit is intentional: a single-row lookup is sub-10ms and
 * we get instant propagation of prompt edits. If Vercel telemetry ever
 * shows this in the hot path, wrap in `unstable_cache` with a tag that
 * the settings action revalidates.
 */
export async function loadPromptOrDefault(
  tipo: PromptAgenteTipo,
  fallback: string
): Promise<string> {
  try {
    const supabase = createSupabaseServiceClient();
    const { data } = await supabase
      .from("prompts_agentes")
      .select("conteudo")
      .eq("tipo", tipo)
      .maybeSingle();
    const override = data?.conteudo?.trim();
    return override && override.length > 0 ? override : fallback;
  } catch (err) {
    // DB unreachable / RLS misconfigured / etc. — never fail the agent.
    // Fall back to the shipped default so families still get replies.
    console.error(`prompts-loader: failed for ${tipo}, using default`, err);
    return fallback;
  }
}

// src/lib/whatsapp/system-messages.js
//
// System-triggered per-user WhatsApp messages — welcome and inactivity
// reminder. Distinct from broadcasts (admin-composed fan-outs) because
// they're triggered by user events (opt-in transition, N-day inactivity)
// and sent as one-off messages, not queued through the dispatcher.
//
// Two-tier resolution matches the AI-persona prompts pattern:
//   1. Look up in whatsapp_system_messages (kind = X, active = true).
//   2. Otherwise → fall back to the DEFAULTS below.
//
// Bodies are stored as { pt, en, es? }; caller passes the recipient's
// preferred_language, we pick the matching key with pt as the fallback
// for missing translations. Portuguese is the launch default per team
// decision on 2026-08-24; other languages can be added by extending
// the DEFAULTS constants below.
//
// Substitution: `{name}` in the body gets replaced with the recipient's
// first name (from full_name). Unknown placeholders are stripped
// silently rather than left as raw `{foo}` — safer than leaking curly
// braces to users if we ever rename a variable.
//
// Dashboard link is included verbatim in every message body. Kept as
// plain text so WhatsApp auto-links it — no rich preview needed.

import { sendWhatsapp } from "@/lib/integrations/zapi";

const DASHBOARD_URL = "www.fieldtalkenglish.com/dashboard";

const DEFAULTS = {
  welcome: {
    pt: `Oi {name}! ⚽ Aqui é seu Técnico Virtual do FieldTalk 👋

Estou aqui pra te ajudar com qualquer coisa da plataforma — como fazer uma aula, entender seu Radar de Habilidades, dúvidas sobre certificados — e também com o inglês em si: gramática, vocabulário, expressões de campo, o que precisar.

É só mandar mensagem quando quiser praticar ou tirar uma dúvida. Bora juntos!

Seu painel: ${DASHBOARD_URL}`,

    en: `Hey {name}! ⚽ FieldTalk virtual coach here 👋

I'm here to help with anything about the platform — how a lesson works, understanding your Skill Radar, questions about certificates — and with English itself: grammar, vocabulary, on-pitch expressions, whatever you need.

Just message me anytime you want to practice or ask a question. Let's go!

Your dashboard: ${DASHBOARD_URL}`,
  },

  inactivity_reminder: {
    pt: `E aí, {name}! 🔥 Faz uns dias que não te vejo por aqui…

Você sabe: assim como no futebol, o inglês é feito de repetição — uma aulinha de 10 minutos hoje vale mais do que uma hora daqui a duas semanas. Bora manter o ritmo?

Sua próxima aula está esperando: ${DASHBOARD_URL}

Se quiser praticar por aqui mesmo, é só me mandar uma mensagem 💪`,

    en: `Hey {name}! 🔥 Haven't seen you around for a few days…

You know the drill: just like football, English is about repetition — a quick 10-minute lesson today is worth more than an hour two weeks from now. Let's keep the rhythm going?

Your next lesson is waiting: ${DASHBOARD_URL}

Or if you want to practice right here, just send me a message 💪`,
  },
};

const VALID_KINDS = new Set(Object.keys(DEFAULTS));

/**
 * Resolve a message body for a kind + language, applying substitution.
 * Returns null when the kind is unknown OR no body/language matches
 * (never blocks the pipeline — caller can skip the send).
 *
 * @param {import("@supabase/supabase-js").SupabaseClient} supabase — service role
 * @param {'welcome' | 'inactivity_reminder'} kind
 * @param {string} lang — 'pt' | 'en' | 'es'
 * @param {Record<string, string>} vars — substitution vars ({ name })
 * @returns {Promise<string | null>}
 */
export async function resolveSystemMessage(supabase, kind, lang, vars = {}) {
  if (!VALID_KINDS.has(kind)) return null;

  // 1. DB override
  let bodies = null;
  try {
    const { data } = await supabase
      .from("whatsapp_system_messages")
      .select("body, active")
      .eq("kind", kind)
      .maybeSingle();
    if (data?.active === true && data.body && typeof data.body === "object") {
      bodies = data.body;
    }
  } catch (err) {
    console.warn(
      `[whatsapp/system-messages] DB read failed for '${kind}', using default:`,
      err?.message ?? err,
    );
  }

  // 2. Bundled default fallback
  if (!bodies) bodies = DEFAULTS[kind];

  // Pick the language: exact match → pt → first non-empty → null
  const langKey = lang || "pt";
  const raw =
    (typeof bodies[langKey] === "string" && bodies[langKey]) ||
    (typeof bodies.pt === "string" && bodies.pt) ||
    (typeof bodies.en === "string" && bodies.en) ||
    null;
  if (!raw) return null;

  return substitute(raw, vars);
}

/**
 * Send a resolved system message via Z-API + log to whatsapp_messages.
 * Wraps the send in a try/catch so a Z-API failure never breaks the
 * caller (welcome shouldn't block onboarding, reminder shouldn't
 * break cron drain).
 *
 * Returns { ok: true, messageId } | { ok: false, error }.
 */
export async function sendSystemMessage(supabase, params) {
  const { kind, playerId, phoneE164, lang, vars, via } = params;
  const body = await resolveSystemMessage(supabase, kind, lang, vars);
  if (!body) {
    return { ok: false, error: `no body for kind='${kind}' lang='${lang}'` };
  }

  try {
    const result = await sendWhatsapp({
      telefone: phoneE164,
      mensagem: body,
    });
    // Log to conversation. Duplicate provider_message_ids silently
    // ignored by the whatsapp_messages UNIQUE constraint.
    await supabase.from("whatsapp_messages").insert({
      player_id: playerId,
      phone_e164: phoneE164,
      direction: "outbound",
      provider: "zapi",
      provider_message_id: result.messageId,
      via: via || "system",
      body,
      metadata: { system_message_kind: kind, language: lang },
    });
    return { ok: true, messageId: result.messageId };
  } catch (err) {
    const msg = err?.message ?? String(err);
    console.error(
      `[whatsapp/system-messages] send failed (kind=${kind}, phone=${phoneE164}):`,
      msg,
    );
    return { ok: false, error: msg };
  }
}

/**
 * Extract a first name from a full_name string. Used for the {name}
 * substitution — a single first name reads warmer on WhatsApp than
 * the full "Steven Watkins" form. Falls back to a friendly generic
 * ("jogador" / "player") when the full name isn't available.
 */
export function firstName(fullName, lang) {
  const trimmed = typeof fullName === "string" ? fullName.trim() : "";
  if (trimmed) return trimmed.split(/\s+/)[0];
  return lang === "en" ? "player" : "jogador";
}

function substitute(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) =>
    typeof vars[key] === "string" ? vars[key] : "",
  );
}

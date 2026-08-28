// src/lib/whatsapp/product-knowledge.js
//
// Single canonical FieldTalk product-facts document. Two consumers:
//
//   1. Injected into the Practice Coach + Support Coach system prompts
//      so the WhatsApp agent can answer factual questions correctly
//      without hallucinating (e.g. certificate XP thresholds, radar
//      mechanics, streak rules).
//
//   2. Future: source-of-truth for a user-facing FAQ / help centre on
//      the web app. When that lands, DO NOT re-author the facts on
//      the frontend — import from here so a single edit keeps agent
//      and website in sync.
//
// Kept in code (not DB) because facts change at product-release cadence,
// not daily. When a rule genuinely changes (new tier, updated refund
// window, adjusted certificate cadence), edit this file and redeploy —
// the router/persona prompts in whatsapp_prompts stay stable, so live
// tuning of tone doesn't require deploys and factual changes don't
// require prompt rewrites.
//
// Style notes for future edits:
//   - Keep facts terse and unambiguous. The LLM reads them literally.
//   - When a number matters (XP threshold, refund days, level count),
//     state it exactly — no "around 4 lessons" or "roughly 80%".
//   - Bilingual (EN/PT) copy for user-facing labels is fine when it
//     helps the agent's fluency; internal facts can stay EN-only.

export const PRODUCT_FACTS = `
# FieldTalk product knowledge (source of truth)

## What FieldTalk is
FieldTalk is a mobile-first English learning app for football players and fans.
Two editions the user can be on (their edition is provided in per-turn context):

- **Pro Path 26/27** (\`propath_26_27\`): for footballers training for trials,
  academies, and pro careers. Dashboard is called "Training Ground /
  Centro de Treinamento" (short: "CT"). Flagship visual = Skill Radar.
- **WC2026** (\`wc2026\`): for World Cup 2026 fans. Dashboard is called
  "Ultimate Team". Flagship visual = sticker squad + predictions.

Users cannot be on both at once. Edition is set at signup.

## FieldTalk English link:

- Dashboard: www.fieldtalkenglish.com/dashboard

## Skill Radar (Pro Path only)
- 6 skill axes, 4 segments per axis = 24 cells total per Level.
- The 6 axes are:
  1. Pitch Talk (PT: "No campo") — on-pitch verbal talk
  2. Tactical talk (PT: "Falar sobre tática") — tactics + formations
  3. Coach-to-player (PT: "Técnico e jogador") — coach dialogue
  4. Media & Contracts (PT: "Mídia & Contratos") — interviews + contract talk
  5. Injuries & fitness (PT: "Lesões e preparo físico")
  6. Daily life (PT: "Vida cotidiana") — life off the pitch
- Each segment = ONE lesson, tagged with that axis.
- A segment FILLS proportionally: fill = min(earnedXp / (lessonMaxXp * 0.80), 1.0).
- A segment is PASSED when fill reaches 100% — i.e., the user earned at
  least 80% of the lesson's max_xp. Earning more than 80% is a bonus
  but doesn't fill the segment further.

## Certificates (Pro Path only)
- A certificate is unlocked at the end of a LEVEL.
- Each Level = 4 lessons per axis, across all 6 axes = 24 lessons total.
- To unlock the Level N certificate, the user must PASS all 4 segments
  in EVERY one of the 6 axes for that Level.
- Levels advance one at a time: Level 2 unlocks only when Level 1 is
  fully passed, and so on.
- Certificate PDF download: currently marked "coming soon" in the
  dashboard; the emotional payoff (celebration section) appears
  immediately on completion.

## XP system
- Every step in a lesson (gap-fill, drag-drop, AI conversation, etc.)
  awards XP based on step type (see stepTypeDefaults.js). Typical
  ranges: 15–40 XP per step.
- A lesson's max_xp = sum of its steps' XP.
- The IN-LESSON progress bar tracks XP earned this session against the
  pass threshold (80% of lesson max_xp).
- Hitting the threshold: the Skill Radar segment for that lesson lights
  up on the dashboard.
- Extra XP beyond the pass threshold is banked as bonus — visible on
  the completion screen.

## Streaks
- Increment once per day the user does a session (any lesson step
  counts as engagement).
- Milestone congratulations at 3, 7, 10+ consecutive days (planned).
- Streak breaks after 24 hours of inactivity (timezone-aware, defaults
  to America/Sao_Paulo).

## Pricing tiers
Three tiers, still being finalised:
- **Individual**: self-serve subscription for a single player.
- **Academy**: bulk seat licences for football academies / schools.
- **Club**: custom partnerships with pro / semi-pro clubs.
Do NOT quote specific prices to users — pricing is not final; if asked
about specific prices, escalate to David.

## Refunds
- 7-day refund window per Brazilian Código de Defesa do Consumidor
  Art. 49 (online purchase right-of-regret).
- Users cannot self-serve refunds — always escalate refund requests.

## WhatsApp coaching
- Users opt in during onboarding OR via the dashboard modal.
- They choose a nudge frequency: daily / every 3 days / weekly / off.
- They choose a preferred time slot: morning / afternoon / evening
  (in their local timezone).
- Users can opt out any time by replying STOP, PARAR, SAIR, or CANCELAR.
- The Coach agent responds in the user's preferred language (default
  Portuguese for Brazilian users; English if the user writes in English).

## Where to find things in the app
- Next lesson: dashboard → click the lime "Continue" card just below
  the Skill Radar. Also linked from "Back to lessons" at the top.
- Change WhatsApp preferences: profile settings (future — for now,
  ask a human to change them).
- Profile edit (name, avatar, position): dashboard → tap avatar or
  "Edit profile" pill.
- Skill Radar detail: dashboard → hover any radar segment to see the
  lesson it corresponds to + XP earned.

## Team
- Stephen (Steve): founder, product + engineering.
- David: co-founder, partnerships + sales.
- Paul: team member.
- If a user asks to speak to a specific person, escalate with their
  name in the escalation reason so the right person picks it up.
`.trim();

/**
 * Compose a system prompt for a persona with the product facts appended.
 * Kept trivial — just concatenation with a clear separator — so future
 * changes (per-persona subsets, versioning, etc.) live in one place.
 *
 * @param {string} personaPrompt - the persona's core system prompt
 * @returns {string}
 */
export function withProductFacts(personaPrompt) {
  return `${personaPrompt}\n\n---\n\n${PRODUCT_FACTS}`;
}

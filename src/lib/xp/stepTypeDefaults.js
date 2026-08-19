// src/lib/xp/stepTypeDefaults.js
//
// Central source of truth for the XP a step is worth.
//
// Resolution order (used everywhere via `getStepXp`):
//   1. step.xp_reward in the lesson JSON  (per-step override)
//   2. STEP_XP_DEFAULTS[step.type]        (centralised default per type)
//   3. 20                                 (last-ditch fallback)
//
// Adjusting these values in this file affects every step that doesn't
// explicitly set its own xp_reward — no need to chase the hardcoded
// `|| 25` / `|| 40` literals that used to live in each component.

export const STEP_XP_DEFAULTS = {
  // Pitch + drag-drop family
  interactive_pitch_formation: 25,
  interactive_game_formation: 40,
  drag_drop_formation: 30,
  drag_drop_groups: 30,
  drag_drop_vocab: 30,

  // Listening / comprehension
  audio_comprehension: 20,
  ai_listening_challenge: 30,

  // Memory / matching
  memory_match: 40,

  // AI-assisted
  ai_speech_practice: 30,
  ai_gap_fill: 30,
  ai_writing: 35,
  ai_conversation: 35,
  ai_multiple_choice_gap_fill: 30,

  // Reading / instructional
  scenario: 0,
  vocabulary: 15,
  pronunciation_drill: 20,
  timeline_drag: 30,
  conversation_vote: 20,

  // Sentinels — completion is the wrapper screen and shouldn't grant XP
  // on its own; the per-step totals are accumulated by the lesson page.
  completion: 0,
};

/**
 * Resolve the XP value a step should grant on completion.
 * Safe to call with undefined / partial step objects.
 */
export function getStepXp(step) {
  if (!step) return 0;
  if (typeof step.xp_reward === "number" && Number.isFinite(step.xp_reward)) {
    return Math.max(0, Math.floor(step.xp_reward));
  }
  return STEP_XP_DEFAULTS[step.type] ?? 20;
}

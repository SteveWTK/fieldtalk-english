// src/lib/predictions/rewards.js
//
// Single source of truth for prediction rewards. Imported by both
// the UI (to show "+10 XP" hints next to widgets) and the submit
// API (to validate / log expected reward). The Postgres function
// `resolve_match` has the same numbers baked in — if you change a
// value here, update the SQL too.

export const PREDICTION_TYPES = ["winner", "exact_score", "first_scorer_team"];

// XP values calibrated to the pack vault (pack_xp_cost = 200), so
// a correct pick directly unlocks the stated number of packs:
//   winner             →   1 pack  (200 XP)
//   exact_score        →   3 packs (600 XP)
//   first_scorer_team  →   1 pack  (200 XP)
// Keep these in lock-step with the integers baked into the
// resolve_match() Postgres function — see MATCH_PREDICTIONS_SCHEMA.sql
// (or the focused PREDICTION_REWARDS_UPDATE.sql migration that
// updates only the function).
export const REWARDS = {
  winner: {
    xp: 200,
    packs: 1,
    label_en: "Match winner",
    label_pt: "Vencedor",
  },
  exact_score: {
    xp: 600,
    packs: 3,
    label_en: "Exact score",
    label_pt: "Placar exato",
  },
  first_scorer_team: {
    xp: 200,
    packs: 1,
    label_en: "First scorer",
    label_pt: "Quem abre o placar",
  },
};

export function getReward(predictionType) {
  return REWARDS[predictionType] || null;
}

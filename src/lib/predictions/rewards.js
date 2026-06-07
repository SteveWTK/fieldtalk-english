// src/lib/predictions/rewards.js
//
// Single source of truth for prediction rewards. Imported by both
// the UI (to show "+10 XP" hints next to widgets) and the submit
// API (to validate / log expected reward). The Postgres function
// `resolve_match` has the same numbers baked in — if you change a
// value here, update the SQL too.

export const PREDICTION_TYPES = ["winner", "exact_score", "first_scorer_team"];

export const REWARDS = {
  // Easy. ~33% baseline odds without skill.
  winner: { xp: 10, label_en: "Match winner", label_pt: "Vencedor" },
  // Hard. Single-digit % baseline odds; the headline reward.
  exact_score: { xp: 50, label_en: "Exact score", label_pt: "Placar exato" },
  // Medium. ~50% odds (excluding draws).
  first_scorer_team: {
    xp: 20,
    label_en: "First scorer",
    label_pt: "Quem abre o placar",
  },
};

export function getReward(predictionType) {
  return REWARDS[predictionType] || null;
}

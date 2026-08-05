// src/lib/players/proPathGoals.js
//
// Canonical Pro Path goal registry — the "why are you here?" a player
// picks on slide 2 of onboarding. Drives:
//   - Copy tone in nudges + emails (trials-focused messaging vs
//     already-pro messaging)
//   - Recommended lessons ordering (a trials-focused player gets
//     the trials axis surfaced first)
//   - Segment-level analytics ("of our propath_26_27 signups, X%
//     are academy-based, Y% are prepping for trials")
//
// Slug values MUST stay in sync with the CHECK constraint in
// PROPATH_ONBOARDING_MIGRATION.sql — 'trials' | 'academy' |
// 'going_pro' | 'general'. Editing a label here is fine; changing
// the slug requires a matching migration.

import { Target, Users, Plane, Sparkles } from "lucide-react";

export const PROPATH_GOALS = [
  {
    slug: "trials",
    Icon: Target,
    en: {
      title: "Preparing for trials",
      body: "You have a specific trial coming up and need to skill up fast.",
    },
    pt: {
      title: "Preparando para peneiras",
      body: "Você tem uma peneira marcada e precisa se preparar rápido.",
    },
  },
  {
    slug: "academy",
    Icon: Users,
    en: {
      title: "At an academy, aiming pro",
      body: "You're in a base / academy setup and building toward the first team.",
    },
    pt: {
      title: "Na base, mirando o profissional",
      body: "Você está numa base ou academia e mira o time principal.",
    },
  },
  {
    slug: "going_pro",
    Icon: Plane,
    en: {
      title: "Going pro / moving abroad",
      body: "You're a signed player planning a move or already playing overseas.",
    },
    pt: {
      title: "Profissional / atuando fora",
      body: "Você é profissional planejando uma mudança ou já joga fora do país.",
    },
  },
  {
    slug: "general",
    Icon: Sparkles,
    en: {
      title: "General improvement",
      body: "You love the game and want to sharpen your English around it.",
    },
    pt: {
      title: "Melhorar em geral",
      body: "Você ama o futebol e quer afiar seu inglês ao redor dele.",
    },
  },
];

export function getProPathGoal(slug) {
  if (!slug) return null;
  return PROPATH_GOALS.find((g) => g.slug === slug) || null;
}

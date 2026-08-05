// src/lib/lessons/skillAxes.js
//
// Canonical skill-axis registry for the Pro Path Skill Radar.
// The 6 axes below are what a rounded football player needs to be
// linguistically ready for — from dressing-room chat to media, from
// tactical instructions to injury discussions with a physio.
//
// Adding an axis (rare — kept small on purpose so the radar stays
// legible):
//   1. Add an entry to SKILL_AXES below with { id, en, pt, IconName }
//   2. Import the icon in Icon consumers (radar component tree)
//   3. Existing lessons don't need updating — they simply don't
//      contribute to the new axis until an editor tags them
//
// Axis ids are the string values persisted in lessons.skill_axes[].
// Keep them stable across releases: renaming here would orphan the
// tags in the DB.

import {
  MessageCircle, // communication — verbal talk on the pitch
  Layout,        // tactics — reading formations + instructions
  Mic,           // media — interviews, press, socials
  Activity,      // fitness — injuries, recovery, load
  Target,        // trials — trialling, agents, contracts
  Users,         // coach — coach-to-player dialogue
} from "lucide-react";

export const SKILL_AXES = [
  {
    id: "communication",
    en: "Communication on the pitch",
    pt: "Comunicação em campo",
    // Short label used inside the radar polygon where space is tight.
    shortEn: "Communication",
    shortPt: "Comunicação",
    Icon: MessageCircle,
  },
  {
    id: "tactics",
    en: "Tactical talk",
    pt: "Falar sobre tática",
    shortEn: "Tactics",
    shortPt: "Tática",
    Icon: Layout,
  },
  {
    id: "media",
    en: "Media & interviews",
    pt: "Mídia e entrevistas",
    shortEn: "Media",
    shortPt: "Mídia",
    Icon: Mic,
  },
  {
    id: "fitness",
    en: "Injuries & fitness",
    pt: "Lesões e preparo físico",
    shortEn: "Fitness",
    shortPt: "Preparo",
    Icon: Activity,
  },
  {
    id: "trials",
    en: "Trials & agency",
    pt: "Peneiras e empresários",
    shortEn: "Trials",
    shortPt: "Peneiras",
    Icon: Target,
  },
  {
    id: "coach",
    en: "Coach-to-player",
    pt: "Técnico e jogador",
    shortEn: "Coach",
    shortPt: "Técnico",
    Icon: Users,
  },
];

// Lookup helper — returns an axis definition by id, or null when the
// id is unrecognised (defensive against stale DB tags).
export function getSkillAxis(id) {
  return SKILL_AXES.find((a) => a.id === id) || null;
}

// Localised label for an axis. Pass the caller's language code and
// whether you want the short (inside radar) or full (list, tooltip)
// variant.
export function skillAxisLabel(axisId, lang = "en", variant = "full") {
  const a = getSkillAxis(axisId);
  if (!a) return axisId;
  if (variant === "short") {
    return lang === "pt" ? a.shortPt : a.shortEn;
  }
  return lang === "pt" ? a.pt : a.en;
}

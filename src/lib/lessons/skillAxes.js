// src/lib/lessons/skillAxes.js
//
// Canonical skill-axis registry for the Pro Path Skill Radar.
// Six axes covering what a rounded football player needs to be
// linguistically ready for — on the pitch, off it, and everywhere
// in between.
//
// Ordering below is the ORDER OF APPEARANCE on the radar (clockwise
// from the top). Slot 0 is the top of the hexagon by convention
// (radar's angle formula starts at -90°).
//
// Adding an axis (rare — kept at six on purpose so the hexagon stays
// legible; grow past six only after a UX rethink):
//   1. Add an entry to SKILL_AXES with { id, en, pt, IconName }
//   2. Import the icon in Icon consumers (radar component tree)
//   3. Existing lessons don't need updating — they simply don't
//      contribute to the new axis until an editor tags them.
//
// Renaming an axis:
//   - Changing labels (en/pt/shortEn/shortPt) is safe any time.
//   - Changing `id` requires a migration on lessons.skill_axes
//     because tags in the DB will orphan otherwise. See
//     PROPATH_SKILL_AXES_RENAME.sql for the pattern.

import {
  MessageCircle, // pitch_talk — verbal talk on the pitch
  Layout,        // tactics — reading formations + instructions
  Users,         // coach — coach-to-player dialogue
  Mic,           // media_trials — interviews + trial questions (both mic moments)
  Compass,       // daily_life — navigating a new city / country / host family
  Activity,      // fitness — injuries, recovery, load
} from "lucide-react";

export const SKILL_AXES = [
  {
    // Renamed from "communication". "Pitch Talk" reads as a football-
    // native phrase and cleanly distinguishes on-pitch chat from the
    // other communication-adjacent axes (Coach, Media). Kept at slot
    // 0 (top of the hexagon) as the anchoring skill — everything else
    // radiates from being able to talk in the game itself.
    id: "pitch_talk",
    en: "Pitch Talk",
    pt: "No campo",
    // Short label used inside the radar polygon where space is tight.
    shortEn: "Pitch Talk",
    shortPt: "No campo",
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
    // Coach dialogue sits next to Tactics because they naturally chain
    // — the coach's tactical instructions are lived-out in on-pitch
    // conversations with teammates.
    id: "coach",
    en: "Coach-to-player",
    pt: "Técnico e jogador",
    shortEn: "Coach",
    shortPt: "Técnico",
    Icon: Users,
  },
  {
    // Merged from the earlier "media" + "trials" axes. Both are high-
    // stakes moments where the player is answering questions AND
    // selling themselves — the underlying language skill is the same.
    // Combining kept the total axis count at 6 (the hexagon stays
    // legible) while opening a slot for Daily Life.
    id: "media_trials",
    en: "Media & Contracts",
    pt: "Mídia & Contratos",
    shortEn: "Media & Contracts",
    shortPt: "Mídia & Contratos",
    Icon: Mic,
  },
  {
    id: "fitness",
    en: "Injuries & fitness",
    pt: "Lesões e preparo físico",
    shortEn: "Fitness",
    shortPt: "Preparo físico",
    Icon: Activity,
  },
  {
    // New axis. Everything a player-abroad needs to navigate life
    // outside the club: shops, banks, transport, host family, doctor
    // visits that AREN'T injuries, admin. The Compass icon evokes
    // finding your way in a new city / country.
    id: "daily_life",
    en: "Daily life",
    pt: "Vida cotidiana",
    shortEn: "Daily Life",
    shortPt: "Dia a Dia",
    Icon: Compass,
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

// src/lib/squads/squadConfig.js
//
// One configuration object per formation. Each `slots` entry has:
//   - id:      string ("GK", "LB", "CM1", …) — used as the JSONB key on
//              player_squads.positions
//   - label:   short display label
//   - x/y:     percentages on the (vertical) pitch — same coordinate
//              vocabulary as DragDropFormation / InteractivePitchFormation,
//              and rotated CW for landscape layouts via transformPosition()
//   - accepts: array of sticker positions allowed in this slot
//
// Position-zone policy (from the planning chat):
//   - GK → goalkeepers only
//   - CB → centre-backs only
//   - LB/RB → side-specific full-backs only
//   - CM1/CM2/CM3 → any midfielder (DM/CM/AM interchangeable)
//   - LW/RW → either winger (left/right interchangeable)
//   - ST → strikers only

export const FORMATIONS = {
  "4-3-3": {
    id: "4-3-3",
    label: "4-3-3",
    slots: [
      { id: "GK",  label: "GK",  x: "50%", y: "92%", accepts: ["GK"] },
      { id: "LB",  label: "LB",  x: "15%", y: "75%", accepts: ["LB"] },
      { id: "CB1", label: "CB",  x: "37%", y: "78%", accepts: ["CB"] },
      { id: "CB2", label: "CB",  x: "63%", y: "78%", accepts: ["CB"] },
      { id: "RB",  label: "RB",  x: "85%", y: "75%", accepts: ["RB"] },
      { id: "CM1", label: "CM",  x: "30%", y: "55%", accepts: ["CM", "DM", "AM"] },
      { id: "CM2", label: "CM",  x: "50%", y: "50%", accepts: ["CM", "DM", "AM"] },
      { id: "CM3", label: "CM",  x: "70%", y: "55%", accepts: ["CM", "DM", "AM"] },
      { id: "LW",  label: "LW",  x: "18%", y: "28%", accepts: ["LW", "RW"] },
      { id: "ST",  label: "ST",  x: "50%", y: "18%", accepts: ["ST"] },
      { id: "RW",  label: "RW",  x: "82%", y: "28%", accepts: ["LW", "RW"] },
    ],
  },
};

export function getFormation(formationId) {
  return FORMATIONS[formationId] || FORMATIONS["4-3-3"];
}

/** True iff the sticker can be placed in the given slot. */
export function isPositionCompatible(sticker, slot) {
  if (!sticker || !slot) return false;
  return (slot.accepts || []).includes(sticker.position);
}

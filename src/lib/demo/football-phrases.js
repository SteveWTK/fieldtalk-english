// src/lib/demo/football-phrases.js
//
// Curated bank of football phrases + Portuguese translations used by
// the 90-second demo. Small on purpose: the demo isn't a lesson bank,
// it's a taste — 6 phrases is enough to run one vocab-tap round + one
// memory-match round without repeating.
//
// Beat 1 (VocabTapBeat) picks the "anchor" phrase (usually the Q1
// correct-answer, so the WhatsApp → web loop closes) and pairs it
// with 2 distractors from this list.
// Beat 4 (VocabGameBeat) uses 4 phrases (anchor + 3 others) as memory
// pairs.

export const FOOTBALL_PHRASES = [
  {
    id: "park_the_bus",
    en: "park the bus",
    pt: "defender fundo",
    note: "Estratégia extremamente defensiva; jogar apenas para não sofrer gol.",
  },
  {
    id: "nutmeg",
    en: "nutmeg",
    pt: "caneta",
    note: "Passar a bola por entre as pernas do adversário.",
  },
  {
    id: "clean_sheet",
    en: "keep a clean sheet",
    pt: "não sofrer gol",
    note: "Manter o gol sem ser vazado durante a partida.",
  },
  {
    id: "against_the_run_of_play",
    en: "against the run of play",
    pt: "contra o jogo",
    note: "Gol ou momento que vai contra o que estava acontecendo em campo.",
  },
  {
    id: "in_the_driving_seat",
    en: "in the driving seat",
    pt: "controlando o jogo",
    note: "Time que domina e dita o ritmo da partida.",
  },
  {
    id: "through_on_goal",
    en: "through on goal",
    pt: "cara a cara com o goleiro",
    note: "Atacante que fica sozinho de frente para o goleiro.",
  },
];

const BY_ID = new Map(FOOTBALL_PHRASES.map((p) => [p.id, p]));

/**
 * Pick the anchor phrase for the demo — the same expression the lead
 * saw on WhatsApp. We match by trying to align the Q1 correct-answer
 * label (in PT) to one of our known phrases. If nothing matches
 * (bespoke Q1 content David wrote), we fall back to "park the bus".
 */
export function pickAnchorFromSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.buttons)) return BY_ID.get("park_the_bus");
  const correct = snapshot.buttons.find((b) => b?.correct === true);
  if (!correct) return BY_ID.get("park_the_bus");

  const label =
    (correct.label && (correct.label.pt || correct.label.en)) || "";
  if (!label) return BY_ID.get("park_the_bus");

  // Case-insensitive substring match on either PT or EN side.
  const normalized = String(label).trim().toLowerCase();
  const hit = FOOTBALL_PHRASES.find(
    (p) =>
      p.pt.toLowerCase().includes(normalized) ||
      p.en.toLowerCase().includes(normalized) ||
      normalized.includes(p.pt.toLowerCase()) ||
      normalized.includes(p.en.toLowerCase()),
  );
  return hit || BY_ID.get("park_the_bus");
}

/**
 * Given an anchor, return an array of 3 phrases (anchor + 2 distractors)
 * for the beat-1 tap round.
 */
export function distractorsForBeat1(anchor) {
  const pool = FOOTBALL_PHRASES.filter((p) => p.id !== anchor.id);
  const shuffled = shuffle(pool).slice(0, 2);
  return shuffle([anchor, ...shuffled]);
}

/**
 * Given an anchor, return 4 phrases for beat 4 (memory match). Always
 * includes the anchor, plus 3 others.
 */
export function pickForBeat4(anchor) {
  const others = shuffle(FOOTBALL_PHRASES.filter((p) => p.id !== anchor.id)).slice(0, 3);
  return [anchor, ...others];
}

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

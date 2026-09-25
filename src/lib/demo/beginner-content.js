// src/lib/demo/beginner-content.js
//
// Content bank for the beginner-variant demo at /demo/beginner.
// Everything here is tuned for a lower-English-confidence audience:
// player positions, parts of the pitch, and simple in-game shouts
// that any 12-year-old academy player already understands in
// Portuguese. Paul picks which variant to share on a lead-by-lead
// basis — this file is what the beginner variant reads.

// ─── Positions ───────────────────────────────────────────────────
//
// Four positions on the pitch, laid out for the SVG viewBox 100×140
// that InteractivePitchFormation uses. Coordinates are percentages
// so a slim rebuild of that same pitch renders them in the right
// spot without importing the auth-coupled component.
//
// Each position doubles as:
//   - a vocab tap card option (id / en / pt / note)
//   - a marker on the pitch beat (x / y coordinates)

export const BEGINNER_POSITIONS = [
  {
    id: "goalkeeper",
    en: "goalkeeper",
    pt: "goleiro",
    x: 50,
    y: 128,
    note: "Guarda o gol. Só ele pode usar as mãos dentro da área.",
  },
  {
    id: "defender",
    en: "defender",
    pt: "zagueiro",
    x: 32,
    y: 95,
    note: "Fica atrás, cortando os ataques adversários.",
  },
  {
    id: "midfielder",
    en: "midfielder",
    pt: "meio-campo",
    x: 50,
    y: 62,
    note: "Liga a defesa ao ataque. Corre o campo inteiro.",
  },
  {
    id: "striker",
    en: "striker",
    pt: "atacante",
    x: 62,
    y: 25,
    note: "O que faz o gol. Fica mais perto do gol adversário.",
  },
];

const POSITIONS_BY_ID = new Map(BEGINNER_POSITIONS.map((p) => [p.id, p]));

/**
 * Anchor + 2 distractors for the beginner vocab-tap beat. Anchor is
 * always "goalkeeper" — most iconic position, the one every visitor
 * has heard in some form of English. Distractors are two other
 * positions from the same set, so the choice feels coherent (all
 * positions, no wildcards).
 */
export function getBeginnerVocabOptions() {
  const anchor = POSITIONS_BY_ID.get("goalkeeper");
  const distractors = BEGINNER_POSITIONS.filter(
    (p) => p.id !== anchor.id,
  ).slice(0, 2);
  const options = shuffle([anchor, ...distractors]);
  return { anchor, options };
}

// ─── Listening clip ──────────────────────────────────────────────
//
// A very short in-game call. Kept simple so the exercise is about
// hearing the specific word, not decoding a sentence.

export const BEGINNER_LISTENING_CLIP = {
  fullText: "Man on! Pass it back!",
  before: "Man on! Pass it",
  after: "!",
  options: [
    { id: "back", label: "back", correct: true },
    { id: "up", label: "up", correct: false },
    { id: "away", label: "away", correct: false },
  ],
  translation: "Marcação! Passa pra trás!",
  note:
    '"Man on" = alguém tá vindo pra pegar a bola. "Pass it back" = passa pra trás. Duas frases que qualquer treinador grita 20 vezes por jogo.',
  audioSrc: "/audio/demo/listening-clip-beginner.mp3",
};

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

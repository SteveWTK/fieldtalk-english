// src/components/demo/beats/VocabGameBeat.js
//
// Beat 4 (~30s): 8 cards face-up on a small grid (4 EN + 4 PT). Tap two,
// if they match (same phrase id) the pair stays revealed with its own
// colour so the pairings remain visually distinct — sky / violet /
// amber / rose in match order. Non-matching taps flash red-alert and
// clear. Timer counts up. Beat completes when all 4 pairs matched.
//
// The colour-coding + end-of-round pairs summary is the reveal: a lead
// scanning the grid at the end can immediately see which EN went with
// which PT. Mirrors the "keep pairs on the table" behaviour of the
// real MemoryMatch step.

"use client";

import { useEffect, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import Button from "@/components/ui/button";
import { pickForBeat4 } from "@/lib/demo/football-phrases";

// One palette per matched pair. All full literal class strings so the
// Tailwind JIT scanner keeps them in the bundle.
const PAIR_STYLES = [
  {
    card: "border-sky-400/70 bg-sky-400/10 text-primary-50",
    check: "text-sky-300",
    row: "border-sky-400/40 bg-sky-400/[0.06]",
  },
  {
    card: "border-violet-400/70 bg-violet-400/10 text-primary-50",
    check: "text-violet-300",
    row: "border-violet-400/40 bg-violet-400/[0.06]",
  },
  {
    card: "border-amber-400/70 bg-amber-400/10 text-primary-50",
    check: "text-amber-300",
    row: "border-amber-400/40 bg-amber-400/[0.06]",
  },
  {
    card: "border-rose-400/70 bg-rose-400/10 text-primary-50",
    check: "text-rose-300",
    row: "border-rose-400/40 bg-rose-400/[0.06]",
  },
];

export default function VocabGameBeat({ anchor, onDone }) {
  const [phrases] = useState(() => pickForBeat4(anchor));
  const [cards] = useState(() => buildCards(phrases));
  const [selected, setSelected] = useState([]); // array of card indices
  const [matchedOrder, setMatchedOrder] = useState([]); // phraseIds in match order
  const [wrongFlash, setWrongFlash] = useState(null); // { a, b }
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const allMatched = matchedOrder.length >= 4;
  const elapsed = Math.floor((now - startedAt) / 1000);

  useEffect(() => {
    if (selected.length !== 2) return;
    const [aIdx, bIdx] = selected;
    const a = cards[aIdx];
    const b = cards[bIdx];
    if (a.phraseId === b.phraseId && a.side !== b.side) {
      setMatchedOrder((prev) =>
        prev.includes(a.phraseId) ? prev : [...prev, a.phraseId],
      );
      setSelected([]);
    } else {
      setWrongFlash({ a: aIdx, b: bIdx });
      const t = setTimeout(() => {
        setWrongFlash(null);
        setSelected([]);
      }, 500);
      return () => clearTimeout(t);
    }
  }, [selected, cards]);

  function matchedIndex(phraseId) {
    return matchedOrder.indexOf(phraseId);
  }

  function tap(idx) {
    if (allMatched) return;
    if (matchedIndex(cards[idx].phraseId) >= 0) return;
    if (selected.includes(idx)) return;
    if (wrongFlash) return;
    setSelected((prev) => (prev.length < 2 ? [...prev, idx] : [idx]));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className="text-sm text-primary-300 leading-relaxed max-w-md">
          Ligue cada expressão à sua tradução.
        </p>
        <div className="text-[11px] text-primary-500 tabular-nums font-mono shrink-0">
          {matchedOrder.length} / 4 · {formatSS(elapsed)}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card, i) => {
          const pairIdx = matchedIndex(card.phraseId);
          const isMatched = pairIdx >= 0;
          const isSelected = selected.includes(i);
          const isWrong =
            wrongFlash && (wrongFlash.a === i || wrongFlash.b === i);
          const style = isMatched ? PAIR_STYLES[pairIdx] : null;
          const cls = isMatched
            ? style.card
            : isWrong
              ? "border-signal-alert/60 bg-signal-alert/10 text-primary-50 animate-pulse"
              : isSelected
                ? "border-signal-focus/60 bg-signal-focus/10 text-primary-50"
                : "border-primary-700 bg-primary-800/60 hover:border-primary-600 hover:bg-primary-800 text-primary-100";
          return (
            <button
              key={`${card.phraseId}-${card.side}`}
              type="button"
              onClick={() => tap(i)}
              disabled={isMatched}
              className={`aspect-[3/2] flex items-center justify-center text-center px-2 py-3 rounded-control border transition-colors ${cls}`}
            >
              <span className="text-xs sm:text-sm font-medium leading-tight">
                {card.side === "en" ? (
                  <span className="italic">&ldquo;{card.text}&rdquo;</span>
                ) : (
                  card.text
                )}
                {isMatched && (
                  <Check className={`inline-block w-3 h-3 ml-1 ${style.check}`} />
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Pairs summary — shows each matched EN ↔ PT in its pair colour so
          the lead sees the actual learning at a glance. Grows as pairs
          are matched, not just at the end. */}
      {matchedOrder.length > 0 && (
        <div className="mt-5 space-y-1.5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary-500 font-semibold">
            {allMatched ? "As 4 expressões" : "Pares que você encontrou"}
          </p>
          {matchedOrder.map((phraseId, idx) => {
            const p = phrases.find((x) => x.id === phraseId);
            if (!p) return null;
            const style = PAIR_STYLES[idx];
            return (
              <div
                key={phraseId}
                className={`rounded-control border px-3 py-2 text-sm flex items-center gap-2 flex-wrap ${style.row}`}
              >
                <span className="italic text-primary-100">
                  &ldquo;{p.en}&rdquo;
                </span>
                <span className="text-primary-500">↔</span>
                <span className="text-primary-100 font-medium">{p.pt}</span>
              </div>
            );
          })}
        </div>
      )}

      {allMatched && (
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <p className="text-sm text-accent-300 font-semibold flex-1">
            Boa! 4 expressões em {formatSS(elapsed)}.
          </p>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onDone}
            Icon={ArrowRight}
          >
            Ver a plataforma
          </Button>
        </div>
      )}
    </div>
  );
}

function buildCards(phrases) {
  const cards = [];
  for (const p of phrases) {
    cards.push({ phraseId: p.id, side: "en", text: p.en });
    cards.push({ phraseId: p.id, side: "pt", text: p.pt });
  }
  // Shuffle so the anchor doesn't always sit first.
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

function formatSS(s) {
  return `${s}s`;
}

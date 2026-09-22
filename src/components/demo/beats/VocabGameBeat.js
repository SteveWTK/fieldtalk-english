// src/components/demo/beats/VocabGameBeat.js
//
// Beat 4 (~30s): 8 cards face-up on a small grid (4 EN + 4 PT). Tap two,
// if they match (same phrase id) the pair stays revealed with a lime
// glow, else they flash and remain flippable. Timer counts up. Beat
// completes when all 4 pairs matched (or the user hits Próximo early).
//
// Mirrors MemoryMatch's card treatment but face-up throughout — a
// tap-the-pair micro-game rather than a memory game, because the demo
// is 30 seconds and hiding faces makes it feel slow.

"use client";

import { useEffect, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import Button from "@/components/ui/button";
import { pickForBeat4 } from "@/lib/demo/football-phrases";

export default function VocabGameBeat({ anchor, onDone }) {
  const [cards] = useState(() => buildCards(anchor));
  const [selected, setSelected] = useState([]); // array of card indices
  const [matched, setMatched] = useState(new Set()); // phrase ids
  const [wrongFlash, setWrongFlash] = useState(null); // { a, b }
  const [startedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const allMatched = matched.size >= 4;
  const elapsed = Math.floor((now - startedAt) / 1000);

  useEffect(() => {
    if (selected.length !== 2) return;
    const [aIdx, bIdx] = selected;
    const a = cards[aIdx];
    const b = cards[bIdx];
    if (a.phraseId === b.phraseId && a.side !== b.side) {
      setMatched((prev) => new Set(prev).add(a.phraseId));
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

  function tap(idx) {
    if (allMatched) return;
    if (matched.has(cards[idx].phraseId)) return;
    if (selected.includes(idx)) return;
    if (wrongFlash) return;
    setSelected((prev) =>
      prev.length < 2 ? [...prev, idx] : [idx],
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className="text-sm text-primary-300 leading-relaxed max-w-md">
          Ligue cada expressão à sua tradução.
        </p>
        <div className="text-[11px] text-primary-500 tabular-nums font-mono shrink-0">
          {matched.size} / 4 · {formatSS(elapsed)}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {cards.map((card, i) => {
          const isMatched = matched.has(card.phraseId);
          const isSelected = selected.includes(i);
          const isWrong =
            wrongFlash && (wrongFlash.a === i || wrongFlash.b === i);
          const cls = isMatched
            ? "border-accent-400/60 bg-accent-400/[0.08] text-primary-50"
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
                  <Check className="inline-block w-3 h-3 ml-1 text-accent-300" />
                )}
              </span>
            </button>
          );
        })}
      </div>

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

function buildCards(anchor) {
  const phrases = pickForBeat4(anchor);
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

// src/components/demo/beats/PitchBeat.js
//
// Beat 4 (beginner variant, ~30s): a top-down football pitch with
// four position markers. Prompt cycles through positions in random
// order — the visitor taps the marker matching the English name
// being called. Correct tap: permanent lime glow + label. Wrong tap:
// brief red flash on the wrong marker; visitor tries again. Round
// finishes when all 4 markers are matched.
//
// Mirrors the visual language of the real InteractivePitchFormation
// lesson step (same SVG geometry, same "marker with audio icon" idea)
// without pulling in that component's auth-coupled runtime, audio-
// preloader, or onboarding hint infrastructure. If the real step ever
// grows a shared standalone pitch primitive we could switch to it;
// meanwhile this stays lean.

"use client";

import { useState } from "react";
import { Check, ArrowRight, Volume2 } from "lucide-react";
import Button from "@/components/ui/button";
import { BEGINNER_POSITIONS } from "@/lib/demo/beginner-content";

// Same palette as VocabGameBeat's matched-pair colours so both beats
// feel like they belong in the same product. Rotated per match order.
const MATCH_STYLES = [
  {
    marker: "bg-sky-400/90 border-sky-200 text-sky-950",
    label: "bg-sky-400 text-sky-950",
  },
  {
    marker: "bg-violet-400/90 border-violet-200 text-violet-950",
    label: "bg-violet-400 text-violet-950",
  },
  {
    marker: "bg-amber-400/90 border-amber-200 text-amber-950",
    label: "bg-amber-400 text-amber-950",
  },
  {
    marker: "bg-rose-400/90 border-rose-200 text-rose-950",
    label: "bg-rose-400 text-rose-950",
  },
];

/**
 * @param {{ onDone: () => void }} props
 */
export default function PitchBeat({ onDone }) {
  // Random prompt order — replay-friendly since the beat is meant to
  // be repeatable while Paul iterates on which lead sees which demo.
  const [prompts] = useState(() => shuffle(BEGINNER_POSITIONS));
  const [matchedIds, setMatchedIds] = useState([]); // in match order
  const [wrongId, setWrongId] = useState(null);

  const currentPromptIdx = matchedIds.length;
  const currentPrompt = prompts[currentPromptIdx] || null;
  const allDone = matchedIds.length >= prompts.length;

  function speak(text) {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-GB";
      u.rate = 0.9;
      window.speechSynthesis.speak(u);
    } catch {
      /* silent */
    }
  }

  function tap(marker) {
    if (allDone) return;
    if (matchedIds.includes(marker.id)) return;
    if (!currentPrompt) return;
    if (wrongId) return; // ignore taps during a red flash
    if (marker.id === currentPrompt.id) {
      setMatchedIds((prev) => [...prev, marker.id]);
    } else {
      setWrongId(marker.id);
      setTimeout(() => setWrongId(null), 500);
    }
  }

  const matchStyleFor = (id) => {
    const idx = matchedIds.indexOf(id);
    return idx >= 0 ? MATCH_STYLES[idx % MATCH_STYLES.length] : null;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className="text-sm text-primary-300 leading-relaxed max-w-md">
          Toque na posição que o treinador chamar.
        </p>
        <div className="text-[11px] text-primary-500 tabular-nums font-mono shrink-0">
          {matchedIds.length} / {prompts.length}
        </div>
      </div>

      {/* Pitch canvas — SVG pitch with markers positioned by percent. */}
      <div
        className="relative w-full max-w-sm mx-auto rounded-card overflow-hidden border border-primary-700 shadow-[0_4px_24px_rgba(0,0,0,0.35)]"
        style={{ aspectRatio: "100 / 140" }}
      >
        {/* Pitch markings — inline SVG lifted from
            InteractivePitchFormation, trimmed to the vertical layout. */}
        <svg
          viewBox="0 0 100 140"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          <rect x="0" y="0" width="100" height="140" fill="#15803d" />
          <rect
            x="8"
            y="8"
            width="84"
            height="124"
            fill="none"
            stroke="white"
            strokeWidth="0.4"
          />
          <line
            x1="8"
            y1="70"
            x2="92"
            y2="70"
            stroke="white"
            strokeWidth="0.4"
          />
          <circle
            cx="50"
            cy="70"
            r="8"
            fill="none"
            stroke="white"
            strokeWidth="0.4"
          />
          <circle cx="50" cy="70" r="0.6" fill="white" />
          <rect
            x="28"
            y="8"
            width="44"
            height="14"
            fill="none"
            stroke="white"
            strokeWidth="0.4"
          />
          <rect
            x="38"
            y="8"
            width="24"
            height="6"
            fill="none"
            stroke="white"
            strokeWidth="0.4"
          />
          <rect
            x="28"
            y="118"
            width="44"
            height="14"
            fill="none"
            stroke="white"
            strokeWidth="0.4"
          />
          <rect
            x="38"
            y="126"
            width="24"
            height="6"
            fill="none"
            stroke="white"
            strokeWidth="0.4"
          />
        </svg>

        {/* Markers */}
        {BEGINNER_POSITIONS.map((pos) => {
          const isMatched = matchedIds.includes(pos.id);
          const isWrong = wrongId === pos.id;
          const style = matchStyleFor(pos.id);
          return (
            <button
              key={pos.id}
              type="button"
              onClick={() => tap(pos)}
              disabled={isMatched || allDone}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 group"
              style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
            >
              <span
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                  isMatched
                    ? style.marker
                    : isWrong
                      ? "bg-signal-alert/80 border-signal-alert text-primary-50 animate-pulse"
                      : "bg-primary-900/85 border-white/80 text-primary-50 group-hover:scale-110 group-hover:border-accent-400"
                }`}
              >
                {isMatched ? (
                  <Check className="w-4 h-4" strokeWidth={3} />
                ) : (
                  <span className="text-[10px] font-black uppercase tracking-wider">
                    {pos.pt.slice(0, 1)}
                  </span>
                )}
              </span>
              {isMatched && (
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${style.label}`}
                >
                  {pos.pt}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Prompt or completion state */}
      {!allDone && currentPrompt && (
        <div className="mt-5 rounded-card border border-primary-700 bg-primary-800/70 p-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => speak(currentPrompt.en)}
              className="shrink-0 w-10 h-10 rounded-full bg-primary-900 border border-primary-700 hover:border-accent-400/60 text-primary-300 hover:text-accent-300 flex items-center justify-center transition-colors"
              aria-label={`Ouvir ${currentPrompt.en}`}
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary-500 font-semibold mb-0.5">
                Toque no
              </p>
              <p className="text-lg sm:text-xl font-black tracking-tight text-primary-50 font-display italic leading-tight">
                &ldquo;{currentPrompt.en}&rdquo;
              </p>
            </div>
          </div>
        </div>
      )}

      {allDone && (
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <p className="text-sm text-accent-300 font-semibold flex-1">
            Boa! Você achou as quatro posições.
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

function shuffle(arr) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

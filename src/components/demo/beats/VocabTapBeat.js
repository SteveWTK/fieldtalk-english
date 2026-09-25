// src/components/demo/beats/VocabTapBeat.js
//
// Beat 1 (~15s): the anchor English phrase sits in a card; three PT
// options below. Tap the correct match. Instant feedback, then Next.
//
// Mirrors the visual language of the real VocabularyList card in the
// lesson player — same slate ramp, same lime-on-correct, but built
// standalone so this file never imports the auth-coupled component.

"use client";

import { useState } from "react";
import { Check, X, Volume2 } from "lucide-react";
import Button from "@/components/ui/button";
import { distractorsForBeat1 } from "@/lib/demo/football-phrases";

/**
 * @param {{
 *   anchor: {id?: string, en: string, pt: string, note?: string},
 *   options?: Array<object>,   // optional override — beginner variant passes
 *                              //   position vocab; default variant falls
 *                              //   through to football-phrases distractors
 *   onDone: () => void,
 * }} props
 */
export default function VocabTapBeat({ anchor, options: optionsProp, onDone }) {
  const [options] = useState(
    () => optionsProp || distractorsForBeat1(anchor),
  );
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);

  function speak() {
    // Best-effort TTS — falls back to silent if the browser doesn't
    // support the API or the user hasn't granted audio permission.
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      const utter = new SpeechSynthesisUtterance(anchor.en);
      utter.lang = "en-GB";
      utter.rate = 0.9;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch {
      /* silent */
    }
  }

  function pick(option) {
    if (reveal) return;
    setPicked(option);
    setReveal(true);
  }

  const isCorrect = picked && picked.id === anchor.id;

  return (
    <div>
      <p className="text-sm text-primary-300 leading-relaxed mb-4">
        O treinador diz esta expressão em inglês. Toque na tradução em português.
      </p>

      {/* Anchor phrase card */}
      <div className="rounded-card border border-primary-700 bg-primary-800 p-5 sm:p-6 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary-500 font-semibold mb-2">
              English
            </p>
            <p className="text-2xl sm:text-3xl font-black tracking-tight text-primary-50 font-display">
              &ldquo;{anchor.en}&rdquo;
            </p>
          </div>
          <button
            type="button"
            onClick={speak}
            className="shrink-0 w-11 h-11 rounded-full bg-primary-900 border border-primary-700 hover:border-accent-400/60 text-primary-300 hover:text-accent-300 flex items-center justify-center transition-colors"
            aria-label="Ouvir pronúncia"
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt) => {
          const isPicked = picked?.id === opt.id;
          const isRight = opt.id === anchor.id;
          const state =
            !reveal
              ? "idle"
              : isRight
                ? "right"
                : isPicked
                  ? "wrong"
                  : "faded";
          const cls = {
            idle: "border-primary-700 bg-primary-800/60 hover:border-primary-600 hover:bg-primary-800 text-primary-100",
            right: "border-accent-400/70 bg-accent-400/[0.10] text-primary-50",
            wrong: "border-signal-alert/60 bg-signal-alert/10 text-primary-50",
            faded: "border-primary-700 bg-primary-800/40 text-primary-500",
          }[state];
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => pick(opt)}
              disabled={reveal}
              className={`w-full text-left px-4 py-3 rounded-control border transition-colors ${cls}`}
            >
              <div className="flex items-center gap-2">
                <span className="flex-1 font-medium text-sm sm:text-base">
                  {opt.pt}
                </span>
                {state === "right" && (
                  <Check className="w-4 h-4 text-accent-300" />
                )}
                {state === "wrong" && (
                  <X className="w-4 h-4 text-signal-alert" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback + next */}
      {reveal && (
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            {isCorrect ? (
              <p className="text-sm text-accent-300">
                Boa. {anchor.note || ""}
              </p>
            ) : (
              <p className="text-sm text-primary-300">
                Era <strong className="text-primary-50">{anchor.pt}</strong>.{" "}
                {anchor.note || ""}
              </p>
            )}
          </div>
          <Button type="button" variant="primary" size="sm" onClick={onDone}>
            Próximo →
          </Button>
        </div>
      )}
    </div>
  );
}

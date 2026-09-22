// src/components/demo/beats/ListeningBeat.js
//
// Beat 2 (~25s): a post-match interview snippet. The demo plays the
// sentence via SpeechSynthesis (falls back to a silent transcript
// when TTS isn't available) and asks the user to fill in one blank
// from 3 options.
//
// Mirrors the visual language of AudioComprehension without pulling
// in the XP / progress writes that component does.

"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Check, X, Eye } from "lucide-react";
import Button from "@/components/ui/button";

// A short generic post-match line — deliberately not football-jargon-
// heavy so the exercise stays about listening for the specific blank,
// not decoding vocabulary.
//
// Structure: transcript with ___ marker + 3 options + correct id.
const CLIP = {
  fullText:
    "We had the better of them in the first half, but we didn't take our chances.",
  before: "We had the better of them in the first half, but we didn't take our",
  after: ".",
  options: [
    { id: "chances", label: "chances", correct: true },
    { id: "shots", label: "shots", correct: false },
    { id: "goals", label: "goals", correct: false },
  ],
  translation:
    "Fomos melhores que eles no primeiro tempo, mas não aproveitamos as chances.",
  note: '"Take your chances" = aproveitar as oportunidades. Frase clássica de entrevista pós-jogo.',
};

export default function ListeningBeat({ onDone }) {
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [playedOnce, setPlayedOnce] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const utterRef = useRef(null);

  useEffect(() => {
    return () => {
      // Silence any in-flight speech when the beat unmounts.
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* silent */
        }
      }
    };
  }, []);

  function play() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      // No TTS — reveal the transcript so the user can still read it.
      setShowTranscript(true);
      setPlayedOnce(true);
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(CLIP.fullText);
      utter.lang = "en-GB";
      utter.rate = 0.9;
      utterRef.current = utter;
      window.speechSynthesis.speak(utter);
      setPlayedOnce(true);
    } catch {
      setShowTranscript(true);
      setPlayedOnce(true);
    }
  }

  function pick(opt) {
    if (reveal) return;
    setPicked(opt);
    setReveal(true);
  }

  const isCorrect = picked?.correct === true;

  return (
    <div>
      <p className="text-sm text-primary-300 leading-relaxed mb-4">
        Ouça a fala do jogador na entrevista e complete a lacuna.
      </p>

      {/* Player controls */}
      <div className="rounded-card border border-primary-700 bg-primary-800 p-4 sm:p-5 mb-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={play}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-sm font-semibold transition-colors"
          >
            {playedOnce ? <RotateCcw className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {playedOnce ? "Ouvir de novo" : "Tocar"}
          </button>
          <button
            type="button"
            onClick={() => setShowTranscript((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-primary-300 hover:text-primary-50 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {showTranscript ? "Esconder texto" : "Mostrar texto"}
          </button>
        </div>
      </div>

      {/* Transcript with blank */}
      <div className="rounded-card border border-primary-700 bg-primary-panel p-4 sm:p-5 mb-4">
        <p className="text-[10px] uppercase tracking-[0.3em] text-primary-500 font-semibold mb-2">
          {showTranscript ? "Transcript" : "Complete a frase"}
        </p>
        <p className="text-base sm:text-lg text-primary-50 leading-relaxed">
          {showTranscript ? (
            <>
              {CLIP.before}{" "}
              <span className="text-accent-300 font-semibold">
                {reveal
                  ? CLIP.options.find((o) => o.correct === true).label
                  : "___"}
              </span>
              {CLIP.after}
            </>
          ) : (
            <>
              {CLIP.before}{" "}
              <span className="inline-block min-w-[3rem] border-b-2 border-accent-400/60 mx-1">
                {reveal ? (
                  <span className="text-accent-300 font-semibold px-1">
                    {CLIP.options.find((o) => o.correct === true).label}
                  </span>
                ) : (
                  <span className="opacity-0 select-none">___</span>
                )}
              </span>
              {CLIP.after}
            </>
          )}
        </p>
      </div>

      {/* Options */}
      <div className="grid grid-cols-3 gap-2">
        {CLIP.options.map((opt) => {
          const isPicked = picked?.id === opt.id;
          const state =
            !reveal
              ? "idle"
              : opt.correct
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
              className={`px-3 py-2.5 rounded-control border transition-colors text-sm font-medium ${cls}`}
            >
              <span className="inline-flex items-center gap-1">
                {opt.label}
                {state === "right" && <Check className="w-3.5 h-3.5" />}
                {state === "wrong" && <X className="w-3.5 h-3.5" />}
              </span>
            </button>
          );
        })}
      </div>

      {reveal && (
        <div className="mt-6 flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-primary-300">
              {isCorrect ? "Boa!" : "Quase — era "}
              {!isCorrect && (
                <strong className="text-primary-50">chances</strong>
              )}
              {!isCorrect && ". "}
              {CLIP.note}
            </p>
            <p className="text-xs text-primary-500 italic mt-2">
              🇧🇷 {CLIP.translation}
            </p>
          </div>
          <Button type="button" variant="primary" size="sm" onClick={onDone}>
            Próximo →
          </Button>
        </div>
      )}
    </div>
  );
}

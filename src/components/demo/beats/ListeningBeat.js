// src/components/demo/beats/ListeningBeat.js
//
// Beat 2 (~25s): a post-match interview snippet. Plays the pre-
// recorded audio clip (see AUDIO_SRC below) with browser
// SpeechSynthesis as a fallback when the file is missing, then asks
// the user to fill in one blank from 3 options.
//
// Recording drop-in:
//   1. David records the CLIP.fullText line as an mp3 (short — the
//      whole thing should feel like a 4–6 second post-match soundbite).
//   2. Save at:  public/audio/demo/listening-clip.mp3
//   3. Ship. No code changes needed — the <audio> element loads it
//      at that URL and the TTS fallback stops kicking in automatically.
//
// Recording tips (for whoever's behind the mic):
//   - British / neutral English accent — matches the "European
//     destination" positioning of the product.
//   - Natural post-match delivery — slightly out of breath, warm.
//   - Same pace as an actual interview soundbite; no lesson-narrator
//     over-enunciation.
//   - Full sentence, no gaps for the blank — the ear does the work.
//   - 128kbps mono mp3 is fine. Under 100kB per clip.
//
// Mirrors the visual language of AudioComprehension without pulling
// in the XP / progress writes that component does.

"use client";

import { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Check, X, Eye } from "lucide-react";
import Button from "@/components/ui/button";

// Default clip = post-match interview line for the advanced variant.
// The beginner variant passes its own clip prop (in-game shout).
const DEFAULT_AUDIO_SRC = "/audio/demo/listening-clip.mp3";

const DEFAULT_CLIP = {
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
  audioSrc: DEFAULT_AUDIO_SRC,
};

/**
 * @param {{
 *   onDone: () => void,
 *   clip?: {
 *     fullText: string,
 *     before: string,
 *     after: string,
 *     options: Array<{id: string, label: string, correct?: boolean}>,
 *     translation?: string,
 *     note?: string,
 *     audioSrc?: string,   // /public path to the pre-recorded mp3
 *   },
 * }} props
 */
export default function ListeningBeat({ onDone, clip: clipProp }) {
  const CLIP = clipProp || DEFAULT_CLIP;
  const AUDIO_SRC = CLIP.audioSrc || DEFAULT_AUDIO_SRC;
  const [picked, setPicked] = useState(null);
  const [reveal, setReveal] = useState(false);
  const [playedOnce, setPlayedOnce] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  // Audio state — starts optimistic; flips to false if the file 404s
  // or throws on play, at which point we fall back to SpeechSynthesis.
  const [audioAvailable, setAudioAvailable] = useState(true);
  const audioRef = useRef(null);
  const utterRef = useRef(null);

  useEffect(() => {
    // Capture the ref inside the effect so the cleanup uses the same
    // element instance the effect saw, not whatever the ref is
    // pointing at when the component unmounts later.
    const audioEl = audioRef.current;
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          /* silent */
        }
      }
      if (audioEl) {
        try {
          audioEl.pause();
        } catch {
          /* silent */
        }
      }
    };
  }, []);

  function playTts() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
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

  function play() {
    if (audioAvailable && audioRef.current) {
      try {
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            setAudioAvailable(false);
            playTts();
          });
        }
        setPlayedOnce(true);
        return;
      } catch {
        setAudioAvailable(false);
      }
    }
    playTts();
  }

  function pick(opt) {
    if (reveal) return;
    setPicked(opt);
    setReveal(true);
  }

  const isCorrect = picked?.correct === true;

  return (
    <div>
      {/* Real audio element — hidden. Preloads metadata so we know
          quickly whether the file exists. On any error, audioAvailable
          flips and subsequent play() calls route through TTS. */}
      <audio
        ref={audioRef}
        src={AUDIO_SRC}
        preload="metadata"
        onError={() => setAudioAvailable(false)}
      >
        <track kind="captions" />
      </audio>

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
                <strong className="text-primary-50">
                  {CLIP.options.find((o) => o.correct === true)?.label || ""}
                </strong>
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

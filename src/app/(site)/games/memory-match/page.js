// src/app/(site)/games/memory-match/page.js
//
// Football Memory Match — match each English football role to its
// Portuguese equivalent. Game Centre flagship; gated by the parent
// /games layout so non-paying users never reach it.
//
// XP: awarded once per UTC day per user via awardXp({ source:
// "game/memory_match", … }). Replays the same day still work but
// won't grant additional XP (we gate client-side via localStorage —
// if a determined user farms it that's fine, we can server-throttle
// later by reading player_xp_events).
//
// Card pool: pulled inline below. Easy to grow — add to WORDS and
// the grid resizes automatically.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Timer,
} from "lucide-react";
import { awardXp } from "@/lib/xp/awardXp";

const WORDS = [
  { en: "Centre forward", pt: "Centro-avante" },
  { en: "Striker", pt: "Atacante" },
  { en: "Right winger", pt: "Ponta direita" },
  { en: "Left winger", pt: "Ponta esquerda" },
  { en: "Playmaker", pt: "Armador" },
  { en: "Midfielder", pt: "Meio-campista" },
  { en: "Defensive midfielder", pt: "Volante" },
  { en: "Attacking midfielder", pt: "Meia atacante" },
  { en: "Centre back", pt: "Zagueiro central" },
  { en: "Left back", pt: "Lateral esquerdo" },
  { en: "Right back", pt: "Lateral direito" },
  { en: "Goalkeeper", pt: "Goleiro" },
];

const XP_REWARD = 10;
const XP_SOURCE = "game/memory_match";
const DAILY_STORAGE_KEY = "fieldtalk:games:memoryMatch:lastAwardDay";

function todayUtcKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
}

function shuffle(array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function makeDeck() {
  return shuffle(
    WORDS.flatMap((w) => [
      { id: w.en, text: w.en, lang: "en" },
      { id: w.en, text: w.pt, lang: "pt" },
    ])
  );
}

export default function MemoryMatchPage() {
  const [cards, setCards] = useState(() => makeDeck());
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const [alreadyAwardedToday, setAlreadyAwardedToday] = useState(false);

  // Tick the timer once started (and not yet completed).
  useEffect(() => {
    if (!startedAt || completed) return;
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, completed]);

  // Detect daily award state once on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const last = window.localStorage.getItem(DAILY_STORAGE_KEY);
    if (last === todayUtcKey()) setAlreadyAwardedToday(true);
  }, []);

  const reset = useCallback(() => {
    setCards(makeDeck());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setStartedAt(null);
    setElapsedSec(0);
    setCompleted(false);
    setAwarded(false);
    // Refresh "already awarded" — keeps the badge accurate if midnight rolls.
    if (typeof window !== "undefined") {
      const last = window.localStorage.getItem(DAILY_STORAGE_KEY);
      setAlreadyAwardedToday(last === todayUtcKey());
    }
  }, []);

  const handleFlip = (index) => {
    if (completed) return;
    if (flipped.length === 2) return;
    if (flipped.includes(index)) return;
    if (matched.includes(cards[index].id)) return;
    if (!startedAt) setStartedAt(Date.now());
    const next = [...flipped, index];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = next.map((i) => cards[i]);
      if (first.id === second.id && first.lang !== second.lang) {
        setMatched((m) => [...m, first.id]);
        // No need to wait — clear the flipped slots immediately so the
        // user can chain matches quickly when on a hot streak.
        setTimeout(() => setFlipped([]), 350);
      } else {
        setTimeout(() => setFlipped([]), 900);
      }
    }
  };

  // Completion detection + XP award. The award fires only once per
  // UTC day per user; subsequent completes still show the win screen
  // but with a "Come back tomorrow" note instead of the XP burst.
  useEffect(() => {
    if (matched.length !== WORDS.length) return;
    if (completed) return;
    setCompleted(true);
    if (alreadyAwardedToday) return;
    (async () => {
      const result = await awardXp({
        amount: XP_REWARD,
        source: XP_SOURCE,
        sourceId: todayUtcKey(),
        metadata: {
          moves,
          elapsedSec: Math.floor((Date.now() - (startedAt || Date.now())) / 1000),
        },
      });
      if (result?.ok) {
        setAwarded(true);
        if (typeof window !== "undefined") {
          window.localStorage.setItem(DAILY_STORAGE_KEY, todayUtcKey());
        }
        setAlreadyAwardedToday(true);
      }
    })();
  }, [matched.length, completed, alreadyAwardedToday, moves, startedAt]);

  const accuracy = useMemo(() => {
    if (moves === 0) return 0;
    return Math.round((WORDS.length / moves) * 100);
  }, [moves]);

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.18), rgba(16,185,129,0) 70%)",
          }}
        />
      </div>

      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href="/games"
            className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            Game Centre
          </Link>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>

        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-2">
            Game Centre
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Football Memory Match
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-xl leading-relaxed">
            Match each English football role to its Portuguese equivalent.
            Beat the deck once a day to earn{" "}
            <span className="text-emerald-300 font-semibold">+{XP_REWARD} XP</span>.
          </p>
        </header>

        <div className="flex items-center gap-3 mb-5 text-xs text-white/60">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]">
            <Timer className="w-3.5 h-3.5" />
            <span className="tabular-nums">
              {Math.floor(elapsedSec / 60)
                .toString()
                .padStart(2, "0")}
              :{(elapsedSec % 60).toString().padStart(2, "0")}
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] tabular-nums">
            {matched.length}/{WORDS.length} pairs
          </div>
          <div className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] tabular-nums">
            {moves} moves
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
          {cards.map((card, i) => {
            const isMatched = matched.includes(card.id);
            const isFlipped = flipped.includes(i) || isMatched;
            return (
              <button
                key={i}
                type="button"
                onClick={() => handleFlip(i)}
                disabled={isMatched}
                className={`aspect-[4/3] flex items-center justify-center rounded-2xl text-sm sm:text-base font-bold leading-tight px-2 sm:px-3 transition-all duration-200
                  ${
                    isMatched
                      ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-100"
                      : isFlipped
                        ? "bg-white text-[#062013] shadow-lg scale-[1.02]"
                        : "bg-white/[0.06] border border-white/10 text-white/40 hover:border-emerald-400/40 hover:text-white/80"
                  }`}
              >
                <span className="text-center">
                  {isFlipped ? card.text : "?"}
                </span>
              </button>
            );
          })}
        </div>

        {completed && (
          <div className="mt-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/25 mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-300" />
            </div>
            <h2 className="text-xl font-black text-white">Deck cleared!</h2>
            <p className="text-sm text-white/60 mt-1">
              {moves} moves · {Math.floor(elapsedSec / 60)}m {elapsedSec % 60}s
              · {accuracy}% accuracy
            </p>
            {awarded ? (
              <p className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5" />+{XP_REWARD} XP awarded
              </p>
            ) : alreadyAwardedToday ? (
              <p className="mt-3 text-xs text-white/45">
                Daily XP already earned — come back tomorrow for more.
              </p>
            ) : null}
            <button
              type="button"
              onClick={reset}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-[#062013] text-sm font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Play again
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

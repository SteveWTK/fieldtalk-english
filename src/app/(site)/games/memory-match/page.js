// src/app/(site)/games/memory-match/page.js
//
// Football Memory Match — vocabulary-driven (Phase 2). Pulls its
// deck from the `vocabulary` table via /api/vocabulary, so the same
// game powers every category — positions, flags, pitch zones, etc.
//
// Card-pairing rules (per row):
//   - If image_url is set → IMAGE card  ↔  EN-term card
//     (used for flags, pitch zones, anything visual)
//   - Otherwise            → EN-term card  ↔  PT-term card
//     (used for positions, expressions, anything text-only)
//
// URL params:
//   ?category=<>     required — drives which vocabulary subset loads
//   ?subcategory=<>  optional further filter
//   ?count=<n>       optional, default 8 pairs (16 cards on a 4×4)
//
// XP: same +10/day rule as the legacy game; localStorage gate keyed
// by category so each category counts as its own daily reward.
"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Timer,
  Loader2,
} from "lucide-react";
import { awardXp } from "@/lib/xp/awardXp";

const XP_REWARD = 10;
const XP_SOURCE = "game/memory_match";
const DEFAULT_PAIR_COUNT = 8;

function todayUtcKey() {
  return new Date().toISOString().slice(0, 10);
}
function storageKeyFor(category) {
  return `fieldtalk:games:memoryMatch:${category}:lastAwardDay`;
}

function shuffle(array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Turn N vocabulary rows into 2N cards. Each row produces a pair
// where the "left side" is always the row id (so matching is just
// id equality) and the "right side" varies per-card:
//
//   { id: <vocab.id>, kind: "image" | "en" | "pt", text?, image? }
//
// pair[0] uses image if present, otherwise en
// pair[1] uses en  if pair[0] is image, otherwise pt
function buildDeck(entries, pairCount) {
  const picked = shuffle(entries).slice(0, pairCount);
  const cards = [];
  for (const v of picked) {
    if (v.image_url) {
      cards.push({ pairId: v.id, kind: "image", image: v.image_url, alt: v.en_term });
      cards.push({ pairId: v.id, kind: "en", text: v.en_term });
    } else {
      cards.push({ pairId: v.id, kind: "en", text: v.en_term });
      cards.push({ pairId: v.id, kind: "pt", text: v.pt_term });
    }
  }
  return shuffle(cards);
}

const COPY = {
  en: {
    eyebrow: "Game Centre",
    title: "Football Memory Match",
    body: "Match each pair. Beat the deck once a day in each category to earn",
    backToHub: "Game Centre",
    reset: "Reset",
    pairs: "pairs",
    moves: "moves",
    deckCleared: "Deck cleared!",
    awarded: "XP awarded",
    alreadyAwarded: "Daily XP already earned in this category — come back tomorrow for more.",
    playAgain: "Play again",
    loading: "Loading vocabulary…",
    error: "Could not load this category. Try another from the Game Centre.",
    empty: "No vocabulary found for this category yet.",
  },
  pt: {
    eyebrow: "Game Centre",
    title: "Memória do Futebol",
    body: "Combine cada par. Vença o baralho uma vez por dia em cada categoria para ganhar",
    backToHub: "Game Centre",
    reset: "Recomeçar",
    pairs: "pares",
    moves: "jogadas",
    deckCleared: "Baralho concluído!",
    awarded: "XP ganho",
    alreadyAwarded: "XP diário já ganho nesta categoria — volte amanhã para mais.",
    playAgain: "Jogar de novo",
    loading: "Carregando vocabulário…",
    error: "Não foi possível carregar essa categoria. Tente outra no Game Centre.",
    empty: "Ainda não há vocabulário para esta categoria.",
  },
};

function MemoryMatchInner() {
  const search = useSearchParams();
  const category = search.get("category") || "positions";
  const subcategory = search.get("subcategory") || "";
  const pairCount =
    Number(search.get("count") || DEFAULT_PAIR_COUNT) || DEFAULT_PAIR_COUNT;

  // Language preference — read from localStorage in line with the
  // rest of the app. Doesn't need useLanguage context here since this
  // page renders inside ProtectedRoute/GamesGate already.
  const [lang, setLang] = useState("en");
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem("ft.language") || "en";
      setLang(stored === "pt" ? "pt" : "en");
    } catch {
      /* default to en */
    }
  }, []);
  const copy = COPY[lang] || COPY.en;

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]); // matched pairIds
  const [moves, setMoves] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [completed, setCompleted] = useState(false);
  const [awarded, setAwarded] = useState(false);
  const [alreadyAwardedToday, setAlreadyAwardedToday] = useState(false);

  // ── Fetch vocabulary on mount + when category changes ──
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const params = new URLSearchParams({ category });
        if (subcategory) params.set("subcategory", subcategory);
        // Edition filter — we want WC2026-specific rows + universal
        // (NULL) rows. The API does that when we pass an edition.
        params.set("edition", "wc2026");
        const res = await fetch(`/api/vocabulary?${params.toString()}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || "Failed");
        setEntries(json.entries || []);
      } catch (err) {
        if (cancelled) return;
        setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [category, subcategory]);

  // ── Rebuild the deck whenever entries change OR user resets ──
  const buildAndSet = useCallback(() => {
    if (entries.length === 0) {
      setCards([]);
      return;
    }
    const requested = Math.min(pairCount, entries.length);
    setCards(buildDeck(entries, requested));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setStartedAt(null);
    setElapsedSec(0);
    setCompleted(false);
    setAwarded(false);
    try {
      const last = window.localStorage.getItem(storageKeyFor(category));
      setAlreadyAwardedToday(last === todayUtcKey());
    } catch {
      setAlreadyAwardedToday(false);
    }
  }, [entries, pairCount, category]);

  useEffect(() => {
    buildAndSet();
  }, [buildAndSet]);

  // Timer
  useEffect(() => {
    if (!startedAt || completed) return;
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, completed]);

  const handleFlip = (index) => {
    if (completed) return;
    if (flipped.length === 2) return;
    if (flipped.includes(index)) return;
    if (matched.includes(cards[index].pairId)) return;
    if (!startedAt) setStartedAt(Date.now());
    const next = [...flipped, index];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [first, second] = next.map((i) => cards[i]);
      // Match condition: same pairId AND different card kinds.
      // Different kinds prevents the user flipping two EN cards or
      // two image cards (which couldn't happen anyway since each
      // pair only has two distinct kinds, but the guard makes the
      // intent obvious).
      if (first.pairId === second.pairId && first.kind !== second.kind) {
        setMatched((m) => [...m, first.pairId]);
        setTimeout(() => setFlipped([]), 350);
      } else {
        setTimeout(() => setFlipped([]), 900);
      }
    }
  };

  // ── Completion + XP award ──
  const pairCountActual = useMemo(
    () => Math.floor(cards.length / 2),
    [cards.length]
  );
  useEffect(() => {
    if (pairCountActual === 0) return;
    if (matched.length !== pairCountActual) return;
    if (completed) return;
    setCompleted(true);
    if (alreadyAwardedToday) return;
    (async () => {
      const result = await awardXp({
        amount: XP_REWARD,
        source: XP_SOURCE,
        sourceId: `${category}:${todayUtcKey()}`,
        metadata: {
          category,
          subcategory: subcategory || null,
          moves,
          elapsedSec: Math.floor(
            (Date.now() - (startedAt || Date.now())) / 1000
          ),
          pairs: pairCountActual,
        },
      });
      if (result?.ok) {
        setAwarded(true);
        try {
          window.localStorage.setItem(
            storageKeyFor(category),
            todayUtcKey()
          );
        } catch {
          /* private mode */
        }
        setAlreadyAwardedToday(true);
      }
    })();
  }, [
    matched.length,
    pairCountActual,
    completed,
    alreadyAwardedToday,
    category,
    subcategory,
    moves,
    startedAt,
  ]);

  const accuracy = useMemo(() => {
    if (moves === 0 || pairCountActual === 0) return 0;
    return Math.round((pairCountActual / moves) * 100);
  }, [moves, pairCountActual]);

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
            {copy.backToHub}
          </Link>
          <button
            type="button"
            onClick={buildAndSet}
            disabled={loading || entries.length === 0}
            className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {copy.reset}
          </button>
        </div>

        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-2">
            {copy.eyebrow}
            <span className="ml-2 text-white/40">· {category}</span>
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {copy.title}
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-xl leading-relaxed">
            {copy.body}{" "}
            <span className="text-emerald-300 font-semibold">+{XP_REWARD} XP</span>.
          </p>
        </header>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
            <p className="text-xs text-white/55">{copy.loading}</p>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-red-400/40 bg-red-500/10 p-5 text-sm text-red-200">
            {copy.error}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-sm text-white/55 text-center">
            {copy.empty}
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5 text-xs text-white/60">
              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]">
                <Timer className="w-3.5 h-3.5" />
                <span className="tabular-nums">
                  {Math.floor(elapsedSec / 60).toString().padStart(2, "0")}:
                  {(elapsedSec % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] tabular-nums">
                {matched.length}/{pairCountActual} {copy.pairs}
              </div>
              <div className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] tabular-nums">
                {moves} {copy.moves}
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 sm:gap-3">
              {cards.map((card, i) => (
                <Card
                  key={i}
                  card={card}
                  isFlipped={
                    flipped.includes(i) || matched.includes(card.pairId)
                  }
                  isMatched={matched.includes(card.pairId)}
                  onClick={() => handleFlip(i)}
                />
              ))}
            </div>

            {completed && (
              <div className="mt-6 rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-5 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/25 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                </div>
                <h2 className="text-xl font-black text-white">
                  {copy.deckCleared}
                </h2>
                <p className="text-sm text-white/60 mt-1">
                  {moves} {copy.moves} · {Math.floor(elapsedSec / 60)}m{" "}
                  {elapsedSec % 60}s · {accuracy}%
                </p>
                {awarded ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" />+{XP_REWARD} {copy.awarded}
                  </p>
                ) : alreadyAwardedToday ? (
                  <p className="mt-3 text-xs text-white/45">
                    {copy.alreadyAwarded}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={buildAndSet}
                  className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 text-[#062013] text-sm font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  {copy.playAgain}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Card({ card, isFlipped, isMatched, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isMatched}
      className={`aspect-[4/3] flex items-center justify-center rounded-2xl text-sm sm:text-base font-bold leading-tight px-2 sm:px-3 transition-all duration-200 overflow-hidden
        ${
          isMatched
            ? "bg-emerald-500/20 border border-emerald-400/40 text-emerald-100"
            : isFlipped
              ? "bg-white text-[#062013] shadow-lg scale-[1.02]"
              : "bg-white/[0.06] border border-white/10 text-white/40 hover:border-emerald-400/40 hover:text-white/80"
        }`}
    >
      {isFlipped ? (
        card.kind === "image" ? (
          // Next/Image needs explicit sizing inside the flex parent;
          // the wrapper div keeps the image bounded to the card.
          <div className="relative w-full h-full">
            <Image
              src={card.image}
              alt={card.alt || ""}
              fill
              sizes="(max-width: 640px) 33vw, 200px"
              className="object-contain p-2"
              unoptimized
            />
          </div>
        ) : (
          <span className="text-center">{card.text}</span>
        )
      ) : (
        "?"
      )}
    </button>
  );
}

// Next 15 requires components that read useSearchParams to be wrapped
// in a Suspense boundary; otherwise the build fails and runtime
// degrades to a full-page bailout. Tiny inline fallback matches the
// rest of the dark theme.
export default function MemoryMatchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#070707]">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-300" />
        </div>
      }
    >
      <MemoryMatchInner />
    </Suspense>
  );
}

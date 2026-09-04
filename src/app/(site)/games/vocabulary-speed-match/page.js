// src/app/(site)/games/vocabulary-speed-match/page.js
//
// Vocabulary Speed Match — the Game Centre's headline practice game.
// Draws its deck from the player's personal_vocabulary (words they've
// saved from lesson vocabulary steps + memory-match pairs), and uses
// the same drag-english-to-target pattern as DragDropVocabulary.
//
// Round shape:
//   - Player selects size (5 / 8 / 12) + optional skill-axis filter
//   - Deck built by shuffling filtered personal vocab and slicing to N
//   - Targets show image_url if present, translation text otherwise
//   - Each correct drop fires POST /api/vocabulary/practice to bump
//     times_practiced (fire-and-forget — a failed bump doesn't stop
//     the game, and the API is idempotent-per-round because the round
//     itself is short)
//
// XP: +15 XP once per day (localStorage-gated, mirrors memory-match).
//     Different + higher than memory-match because the words practised
//     are ones the player chose to remember, i.e. higher-signal drills.
//
// Access: the /games layout already gates everything under this route
//         behind auth + Full Edition (or admin bypass), so this page
//         doesn't wrap in ProtectedRoute again.
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ChevronLeft,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Timer,
  Loader2,
  BookmarkCheck,
  AlertCircle,
} from "lucide-react";
import { awardXp } from "@/lib/xp/awardXp";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { SKILL_AXES, skillAxisLabel } from "@/lib/lessons/skillAxes";

const XP_REWARD = 15;
const XP_SOURCE = "game/vocabulary_speed_match";
const STORAGE_KEY = "fieldtalk:games:vocabSpeedMatch:lastAwardDay";
const DEFAULT_ROUND_SIZE = 8;
const ROUND_SIZE_OPTIONS = [5, 8, 12];

function todayUtcKey() {
  return new Date().toISOString().slice(0, 10);
}

function shuffle(array) {
  const out = array.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const COPY = {
  en: {
    eyebrow: "Game Centre",
    title: "Vocabulary Speed Match",
    body: "Practise the words you've saved. Drag each English word onto its image or translation.",
    backToHub: "Game Centre",
    loading: "Loading your vocabulary…",
    emptyTitle: "Save some words first",
    emptyBody:
      "Tap the Save button on any vocabulary card or matched memory-game pair to build your practice deck.",
    emptyCta: "Go to lessons",
    setupTitle: "Set up your round",
    setupBody: "How many words this round?",
    filterLabel: "Skill",
    filterAll: "All skills",
    startBtn: "Start round",
    notEnoughWords: (n) =>
      `Only ${n} saved word${n === 1 ? "" : "s"} match this filter — save more to play longer rounds.`,
    matched: "matched",
    moves: "moves",
    reset: "Reset",
    exit: "Exit",
    wrongPlace: "Not the right match — try again.",
    deckCleared: "Round complete!",
    xpAwarded: "XP awarded",
    alreadyAwarded:
      "Daily XP already earned in this game — come back tomorrow.",
    accuracy: "accuracy",
    playAgain: "Play again",
    changeFilter: "Change filter",
    error: "Something went wrong loading your vocabulary. Try again.",
  },
  pt: {
    eyebrow: "Game Centre",
    title: "Vocabulário: Combine Rápido",
    body: "Pratique as palavras que você salvou. Arraste cada palavra em inglês para sua imagem ou tradução.",
    backToHub: "Game Centre",
    loading: "Carregando seu vocabulário…",
    emptyTitle: "Salve algumas palavras primeiro",
    emptyBody:
      "Toque em Salvar em qualquer palavra ou par do jogo de memória para montar seu baralho de prática.",
    emptyCta: "Ir para as aulas",
    setupTitle: "Configure sua rodada",
    setupBody: "Quantas palavras nesta rodada?",
    filterLabel: "Habilidade",
    filterAll: "Todas as habilidades",
    startBtn: "Começar",
    notEnoughWords: (n) =>
      `Apenas ${n} palavra${n === 1 ? "" : "s"} salva${n === 1 ? "" : "s"} corresponde${n === 1 ? "" : "m"} a este filtro — salve mais para rodadas mais longas.`,
    matched: "certos",
    moves: "jogadas",
    reset: "Recomeçar",
    exit: "Sair",
    wrongPlace: "Combinação errada — tente novamente.",
    deckCleared: "Rodada concluída!",
    xpAwarded: "XP ganho",
    alreadyAwarded: "XP diário já ganho neste jogo — volte amanhã.",
    accuracy: "precisão",
    playAgain: "Jogar de novo",
    changeFilter: "Trocar filtro",
    error: "Algo deu errado ao carregar seu vocabulário. Tente novamente.",
  },
};

export default function VocabularySpeedMatchPage() {
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.pt;

  const [vocabulary, setVocabulary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Round configuration + game state. `phase` progresses:
  //   setup -> playing -> complete
  const [phase, setPhase] = useState("setup");
  const [roundSize, setRoundSize] = useState(DEFAULT_ROUND_SIZE);
  const [skillFilter, setSkillFilter] = useState("all");
  const [round, setRound] = useState([]);

  // Fetch personal vocab on mount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await fetch("/api/vocabulary/personal");
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || "load_failed");
        setVocabulary(json.vocabulary || []);
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
  }, []);

  // Distinct axes present in saved vocab, ordered by SKILL_AXES.
  // Filter dropdown only surfaces axes with actual saves so the
  // player never picks an option that returns zero rounds.
  const availableAxes = useMemo(() => {
    const seen = new Set(
      vocabulary.map((w) => w.skillAxis).filter((a) => typeof a === "string"),
    );
    return SKILL_AXES.filter((a) => seen.has(a.id)).map((a) => a.id);
  }, [vocabulary]);

  // Words matching the current skill filter — used to compute pool
  // size for the round-size selector.
  const filteredPool = useMemo(() => {
    if (skillFilter === "all") return vocabulary;
    return vocabulary.filter((w) => w.skillAxis === skillFilter);
  }, [vocabulary, skillFilter]);

  const startRound = useCallback(() => {
    const size = Math.min(roundSize, filteredPool.length);
    if (size < 2) return;
    const picked = shuffle(filteredPool).slice(0, size);
    setRound(picked);
    setPhase("playing");
  }, [filteredPool, roundSize]);

  const endRound = useCallback(() => {
    setPhase("complete");
  }, []);

  const restart = useCallback(() => {
    setRound([]);
    setPhase("setup");
  }, []);

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
          {phase === "playing" && (
            <button
              type="button"
              onClick={restart}
              className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/30 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {copy.exit}
            </button>
          )}
        </div>

        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-2">
            {copy.eyebrow}
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {copy.title}
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-xl leading-relaxed">
            {copy.body}
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
        ) : vocabulary.length === 0 ? (
          <EmptyDeck copy={copy} />
        ) : phase === "setup" ? (
          <SetupScreen
            copy={copy}
            lang={lang}
            totalSaved={vocabulary.length}
            filteredCount={filteredPool.length}
            roundSize={roundSize}
            onRoundSize={setRoundSize}
            skillFilter={skillFilter}
            onSkillFilter={setSkillFilter}
            availableAxes={availableAxes}
            onStart={startRound}
          />
        ) : phase === "playing" ? (
          <SpeedMatchGame
            round={round}
            copy={copy}
            onComplete={endRound}
          />
        ) : (
          <CompleteScreen
            copy={copy}
            round={round}
            onPlayAgain={() => {
              // Roll a fresh deck with the same settings.
              startRound();
            }}
            onChangeFilter={restart}
          />
        )}
      </main>
    </div>
  );
}

function EmptyDeck({ copy }) {
  return (
    <section className="rounded-2xl bg-white/[0.04] border border-white/10 p-6 sm:p-8 text-center">
      <div className="w-12 h-12 rounded-2xl bg-emerald-400/15 flex items-center justify-center mx-auto mb-3">
        <BookmarkCheck className="w-6 h-6 text-emerald-300" />
      </div>
      <h2 className="text-lg font-bold text-white mb-1">{copy.emptyTitle}</h2>
      <p className="text-sm text-white/60 leading-relaxed max-w-sm mx-auto">
        {copy.emptyBody}
      </p>
      <Link
        href="/lesson"
        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-[#062013] text-sm font-bold transition-colors"
      >
        <Sparkles className="w-4 h-4" />
        {copy.emptyCta}
      </Link>
    </section>
  );
}

function SetupScreen({
  copy,
  lang,
  totalSaved,
  filteredCount,
  roundSize,
  onRoundSize,
  skillFilter,
  onSkillFilter,
  availableAxes,
  onStart,
}) {
  // Only surface round-size options that fit within the current pool
  // — no point offering "12 words" when the filter left 5 saves.
  const validSizes = ROUND_SIZE_OPTIONS.filter((n) => n <= filteredCount);
  // If the pool is smaller than the smallest option (2+ words needed
  // for any round), we still show the block but disable Start.
  const effectiveSize = validSizes.includes(roundSize)
    ? roundSize
    : validSizes[validSizes.length - 1] || 0;
  const canStart = effectiveSize >= 2;

  return (
    <section className="space-y-6">
      <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-5 sm:p-6">
        <h2 className="text-lg font-bold text-white mb-1">{copy.setupTitle}</h2>
        <p className="text-xs text-white/50 mb-4">
          {totalSaved} {lang === "pt" ? "palavras salvas no total" : "words saved in total"}
        </p>

        {availableAxes.length > 0 && (
          <div className="mb-5">
            <label className="block text-xs uppercase tracking-wider text-white/45 font-bold mb-2">
              {copy.filterLabel}
            </label>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                active={skillFilter === "all"}
                onClick={() => onSkillFilter("all")}
              >
                {copy.filterAll}
              </FilterChip>
              {availableAxes.map((id) => (
                <FilterChip
                  key={id}
                  active={skillFilter === id}
                  onClick={() => onSkillFilter(id)}
                >
                  {skillAxisLabel(id, lang, "short")}
                </FilterChip>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs uppercase tracking-wider text-white/45 font-bold mb-2">
            {copy.setupBody}
          </label>
          <div className="flex gap-2">
            {ROUND_SIZE_OPTIONS.map((n) => {
              const disabled = n > filteredCount;
              const isActive = effectiveSize === n;
              return (
                <button
                  key={n}
                  type="button"
                  disabled={disabled}
                  onClick={() => onRoundSize(n)}
                  className={`flex-1 px-3 py-2.5 rounded-xl font-bold text-sm transition-colors border ${
                    isActive
                      ? "bg-emerald-500 text-[#062013] border-emerald-400"
                      : disabled
                        ? "bg-white/[0.02] text-white/25 border-white/5 cursor-not-allowed"
                        : "bg-white/[0.04] text-white/80 border-white/10 hover:border-emerald-400/40 hover:text-white"
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          {!canStart && (
            <p className="text-xs text-amber-300/80 mt-3 inline-flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              {copy.notEnoughWords(filteredCount)}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={!canStart}
        className="w-full py-3 rounded-full bg-emerald-400 hover:bg-emerald-300 text-[#062013] font-black tracking-wide disabled:bg-white/10 disabled:text-white/30 transition-colors"
      >
        {copy.startBtn}
      </button>
    </section>
  );
}

function FilterChip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
        active
          ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
          : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/25"
      }`}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────
// SpeedMatchGame: the actual drag-drop board. Adapted from
// DragDropVocabulary but tailored to personal-vocab shape (englishImage
// instead of image_url, no audio prefetch) and self-contained (no XP
// via getStepXp; XP is awarded by the parent on completion).
// ─────────────────────────────────────────────────────────────────────
function SpeedMatchGame({ round, copy, onComplete }) {
  // Independent shuffles for the tray (English cards) and targets
  // (image/translation cards) so the mapping is non-trivial. Memoised
  // once per round — remounting via a fresh key resets them.
  const shuffledSources = useMemo(() => shuffle(round), [round]);
  const shuffledTargets = useMemo(() => shuffle(round), [round]);

  const [matches, setMatches] = useState({});
  const [moves, setMoves] = useState(0);
  const [draggingId, setDraggingId] = useState(null);
  const [dragPos, setDragPos] = useState({ x: 0, y: 0 });
  const [hoveredTargetId, setHoveredTargetId] = useState(null);
  const [shakeId, setShakeId] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [completed, setCompleted] = useState(false);

  const targetRefs = useRef({});
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const totalItems = round.length;
  const matchedCount = Object.keys(matches).length;

  // Timer ticks once startedAt is set and stops on completion.
  useEffect(() => {
    if (!startedAt || completed) return;
    const id = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, completed]);

  // When the last match lands, mark complete + fire onComplete so the
  // page can transition to the summary screen. Use ref so a shifting
  // onComplete doesn't retrigger this effect.
  useEffect(() => {
    if (matchedCount === totalItems && totalItems > 0 && !completed) {
      setCompleted(true);
      const elapsed = startedAt
        ? Math.floor((Date.now() - startedAt) / 1000)
        : 0;
      const accuracy =
        moves === 0 ? 0 : Math.round((totalItems / moves) * 100);
      onCompleteRef.current?.({
        moves,
        elapsedSec: elapsed,
        accuracy,
        totalItems,
      });
    }
  }, [matchedCount, totalItems, completed, moves, startedAt]);

  const findTargetAtPoint = useCallback(
    (clientX, clientY) => {
      for (const item of round) {
        const el = targetRefs.current[item.id];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom
        ) {
          return item.id;
        }
      }
      return null;
    },
    [round],
  );

  const handlePointerDown = (e, itemId) => {
    if (matches[itemId]) return;
    e.preventDefault();
    setDraggingId(itemId);
    setDragPos({ x: e.clientX, y: e.clientY });
    if (!startedAt) setStartedAt(Date.now());
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore — some browsers refuse capture on synthetic events
    }
  };

  const handlePointerMove = useCallback(
    (e) => {
      if (!draggingId) return;
      setDragPos({ x: e.clientX, y: e.clientY });
      setHoveredTargetId(findTargetAtPoint(e.clientX, e.clientY));
    },
    [draggingId, findTargetAtPoint],
  );

  const bumpPractice = useCallback((vocabularyId) => {
    // Fire-and-forget bump. Failures are silent by design — a missed
    // increment is way less bad than blocking the game on a request.
    try {
      fetch("/api/vocabulary/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vocabularyId }),
      }).catch(() => {});
    } catch {
      /* silent */
    }
  }, []);

  const handlePointerUp = useCallback(
    (e) => {
      if (!draggingId) return;
      const droppedId = findTargetAtPoint(e.clientX, e.clientY);

      if (droppedId && droppedId === draggingId) {
        setMatches((prev) => ({ ...prev, [draggingId]: true }));
        setErrorMessage(null);
        setMoves((m) => m + 1);
        bumpPractice(draggingId);
      } else if (droppedId) {
        setShakeId(draggingId);
        setErrorMessage(copy.wrongPlace);
        setMoves((m) => m + 1);
        setTimeout(() => setShakeId(null), 600);
        setTimeout(() => setErrorMessage(null), 1800);
      }
      // Dropped outside any target — no move penalty, no shake.

      setDraggingId(null);
      setHoveredTargetId(null);
    },
    [draggingId, findTargetAtPoint, copy.wrongPlace, bumpPractice],
  );

  // Global pointer listeners are only attached while dragging, so we
  // don't pay for them (or fire spurious state updates) at rest.
  useEffect(() => {
    if (!draggingId) return;
    const move = (e) => handlePointerMove(e);
    const up = (e) => handlePointerUp(e);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [draggingId, handlePointerMove, handlePointerUp]);

  const unmatchedSources = shuffledSources.filter((w) => !matches[w.id]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-xs text-white/60 flex-wrap">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03]">
          <Timer className="w-3.5 h-3.5" />
          <span className="tabular-nums">
            {Math.floor(elapsedSec / 60).toString().padStart(2, "0")}:
            {(elapsedSec % 60).toString().padStart(2, "0")}
          </span>
        </div>
        <div className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] tabular-nums">
          {matchedCount}/{totalItems} {copy.matched}
        </div>
        <div className="px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] tabular-nums">
          {moves} {copy.moves}
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-200 border border-red-400/30 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" />
          {errorMessage}
        </div>
      )}

      {/* English tray. Wrap gap-3 works on all widths — no target-
          count breakpoints needed. */}
      {unmatchedSources.length > 0 && (
        <div className="bg-white/[0.03] rounded-xl px-4 py-4 border border-white/10">
          <div className="flex flex-wrap gap-3 justify-center">
            {unmatchedSources.map((item) => (
              <div
                key={item.id}
                onPointerDown={(e) => handlePointerDown(e, item.id)}
                style={{ touchAction: "none" }}
              >
                <EnglishCard
                  item={item}
                  isShaking={shakeId === item.id}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Targets grid. min 120px cards, wrap freely. */}
      <div className="flex flex-wrap gap-3 justify-center">
        {shuffledTargets.map((item) => (
          <TargetCard
            key={item.id}
            item={item}
            isMatched={!!matches[item.id]}
            isHovered={hoveredTargetId === item.id && !matches[item.id]}
            registerRef={(el) => {
              targetRefs.current[item.id] = el;
            }}
          />
        ))}
      </div>

      {/* Floating card that follows the pointer while dragging. */}
      {draggingId && (
        <div
          className="fixed pointer-events-none z-50"
          style={{
            left: dragPos.x,
            top: dragPos.y,
            transform: "translate(-50%, -50%)",
          }}
        >
          <EnglishCard
            item={round.find((w) => w.id === draggingId) || {}}
          />
        </div>
      )}

      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translateX(0);
          }
          20%,
          60% {
            transform: translateX(-8px);
          }
          40%,
          80% {
            transform: translateX(8px);
          }
        }
        :global(.animate-shake) {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}

function EnglishCard({ item, isShaking = false }) {
  return (
    <div
      className={`select-none touch-none px-4 py-3 rounded-lg shadow-md border-2 cursor-grab active:cursor-grabbing bg-white text-gray-900 transition-colors text-center font-semibold ${
        isShaking
          ? "animate-shake border-red-500"
          : "border-gray-300 hover:border-emerald-500"
      }`}
      style={{ minWidth: "110px" }}
    >
      {item.english || ""}
    </div>
  );
}

function TargetCard({ item, isMatched, isHovered, registerRef }) {
  const showImage =
    typeof item.englishImage === "string" &&
    item.englishImage.trim().length > 0;
  return (
    <div
      ref={registerRef}
      className={`rounded-lg shadow-md border-2 overflow-hidden bg-white/[0.06] transition-all ${
        isMatched
          ? "border-emerald-500"
          : isHovered
            ? "border-emerald-400 scale-105"
            : "border-white/15"
      }`}
      style={{ width: "130px" }}
    >
      {isMatched && (
        <div className="bg-emerald-500 text-[#062013] text-xs font-bold px-2 py-1 text-center flex items-center justify-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          {item.english}
        </div>
      )}
      <div className="relative h-20 flex items-center justify-center p-2">
        {showImage ? (
          <Image
            src={item.englishImage}
            alt={item.english || ""}
            fill
            sizes="130px"
            className="object-contain p-2"
          />
        ) : (
          <span className="text-center text-sm font-bold text-white/85 leading-tight">
            {item.translation}
          </span>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// CompleteScreen: summary + XP + play-again. Kept as a separate
// component so the game board can unmount fully between rounds and
// the completion animation feels distinct.
// ─────────────────────────────────────────────────────────────────────
function CompleteScreen({ copy, round, onPlayAgain, onChangeFilter }) {
  const [awarded, setAwarded] = useState(false);
  const [alreadyAwardedToday, setAlreadyAwardedToday] = useState(false);

  // Award XP once on mount. Guarded by a localStorage day-key so a
  // player who plays five rounds in a row only gets XP once today.
  const awardOnceRef = useRef(false);
  useEffect(() => {
    if (awardOnceRef.current) return;
    awardOnceRef.current = true;

    let last = null;
    try {
      last = window.localStorage.getItem(STORAGE_KEY);
    } catch {
      /* private mode */
    }
    if (last === todayUtcKey()) {
      setAlreadyAwardedToday(true);
      return;
    }
    (async () => {
      const result = await awardXp({
        amount: XP_REWARD,
        source: XP_SOURCE,
        sourceId: todayUtcKey(),
        metadata: {
          words: round.length,
        },
      });
      if (result?.ok) {
        setAwarded(true);
        try {
          window.localStorage.setItem(STORAGE_KEY, todayUtcKey());
        } catch {
          /* silent */
        }
      }
    })();
  }, [round.length]);

  return (
    <section className="rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-6 text-center">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/25 mb-3">
        <CheckCircle2 className="w-6 h-6 text-emerald-300" />
      </div>
      <h2 className="text-xl font-black text-white">{copy.deckCleared}</h2>
      <p className="text-sm text-white/60 mt-1">
        {round.length} {copy.matched}
      </p>
      {awarded ? (
        <p className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-200 text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />+{XP_REWARD} {copy.xpAwarded}
        </p>
      ) : alreadyAwardedToday ? (
        <p className="mt-3 text-xs text-white/45">{copy.alreadyAwarded}</p>
      ) : null}
      <div className="flex flex-col sm:flex-row gap-2 mt-5 justify-center">
        <button
          type="button"
          onClick={onPlayAgain}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#062013] text-sm font-bold transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {copy.playAgain}
        </button>
        <button
          type="button"
          onClick={onChangeFilter}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full border border-white/15 text-white/70 hover:text-white hover:border-white/30 text-sm font-semibold transition-colors"
        >
          {copy.changeFilter}
        </button>
      </div>
    </section>
  );
}

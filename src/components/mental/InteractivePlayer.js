// src/components/mental/InteractivePlayer.js
//
// Full-screen player for the three text/audio-based mental training
// types: champion_scenario, match_prep, voice_of_champion. All three
// share a common shell (dark backdrop, close button, ambient orb
// glow, completion screen with XP celebration) with type-specific
// inner render.
//
// Progress reporting matches MeditationPlayer's contract:
//   POST /api/mental/progress → returns xp_awarded + xp_source
//   Client fires awardXp() with those values.

"use client";

import { useEffect, useRef, useState } from "react";
import {
  X,
  Play,
  Pause,
  Loader2,
  CheckCircle2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { awardXp } from "@/lib/xp/awardXp";
import {
  t,
  pickLang,
  ACTIVITY_TONES,
} from "@/lib/mental/constants";
import Button from "@/components/ui/button";

/**
 * @param {{
 *   activity: object,
 *   onClose: () => void,
 *   onCompleted?: (data) => void,
 * }} props
 */
export default function InteractivePlayer({ activity, onClose, onCompleted }) {
  const { lang } = useLanguage();
  const type = activity?.activity_type;
  const tone = ACTIVITY_TONES[type] || ACTIVITY_TONES.champion_scenario;

  // Phase: 'playing' → 'complete'. Champion scenarios have their own
  // internal state (option picked → explanation shown → continue),
  // but externally the transition is still playing → complete.
  const [phase, setPhase] = useState("playing");
  const [xpAwarded, setXpAwarded] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const startedAtRef = useRef(Date.now());

  async function submitCompletion(metadata) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const spentSec = Math.round(
        (Date.now() - startedAtRef.current) / 1000,
      );
      const res = await fetch("/api/mental/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activity?.id || null,
          activity_type: type,
          duration_seconds: spentSec,
          metadata: metadata || null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setXpAwarded(json.xp_awarded || 0);
        if (json.xp_awarded > 0 && json.xp_source) {
          awardXp({
            amount: json.xp_awarded,
            source: json.xp_source,
            sourceId: json.xp_source_id,
            metadata: { mental: true },
          });
        }
      }
    } catch {
      /* silent — completion still shows */
    } finally {
      setSubmitting(false);
      setPhase("complete");
      onCompleted?.({});
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-primary-900 text-primary-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <AmbientTint accent={tone.signal} />

      <button
        type="button"
        onClick={onClose}
        className="fixed top-4 right-4 z-30 p-2 rounded-full bg-primary-800 hover:bg-primary-700 text-primary-300 hover:text-primary-50"
        aria-label={t("player.close", lang)}
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative z-10 min-h-full flex flex-col items-center justify-center p-4 py-16">
        {phase === "playing" && (
          <>
            {type === "champion_scenario" && (
              <ChampionScenario
                activity={activity}
                tone={tone}
                lang={lang}
                onComplete={(picked) =>
                  submitCompletion({
                    picked_index: picked.index,
                    correct: picked.correct,
                  })
                }
              />
            )}
            {type === "match_prep" && (
              <MatchPrepRitual
                activity={activity}
                tone={tone}
                lang={lang}
                onComplete={() => submitCompletion({})}
              />
            )}
            {type === "voice_of_champion" && (
              <VoiceOfChampion
                activity={activity}
                tone={tone}
                lang={lang}
                onComplete={(picked) =>
                  submitCompletion(picked ? { picked_index: picked.index, correct: picked.correct } : {})
                }
              />
            )}
          </>
        )}

        {phase === "complete" && (
          <CompletionScreen
            title={pickLang(activity?.title, lang)}
            xpAwarded={xpAwarded}
            onClose={onClose}
            lang={lang}
            submitting={submitting}
          />
        )}
      </div>
    </div>
  );
}

/* ─── Shared ambient tint ─────────────────────────────────────── */
//
// Bespoke atmospheric overlay — the whole player leans on it for mood,
// so per DS this is treated as art (like the LivingOrb) and keeps its
// multi-stop radial gradients. Hex constants are aligned to the signal
// palette (mental=violet #c084fc, performance=orange #fb923c,
// english=sky #38bdf8, slate=neutral).

function AmbientTint({ accent }) {
  const gradient = {
    mental:
      "radial-gradient(ellipse at 20% 20%, rgba(192,132,252,0.15), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.10), transparent 55%)",
    performance:
      "radial-gradient(ellipse at 20% 20%, rgba(251,146,60,0.18), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(239,68,68,0.10), transparent 55%)",
    english:
      "radial-gradient(ellipse at 20% 20%, rgba(56,189,248,0.15), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(163,230,53,0.10), transparent 55%)",
    slate:
      "radial-gradient(ellipse at 20% 20%, rgba(148,163,184,0.12), transparent 55%)",
  }[accent] || "radial-gradient(ellipse at center, rgba(255,255,255,0.05), transparent)";
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{ background: gradient }}
      aria-hidden="true"
    />
  );
}

/* ─── Champion Scenario ───────────────────────────────────────── */

function ChampionScenario({ activity, tone, lang, onComplete }) {
  const isPt = lang === "pt";
  const content = activity?.content || {};
  const scenario = pickLang(content.scenario, lang);
  const options = Array.isArray(content.options) ? content.options : [];

  const [pickedIdx, setPickedIdx] = useState(null);
  const answered = pickedIdx != null;
  const picked = options[pickedIdx];
  const pickedCorrect = picked?.correct === true;
  const correctIdx = options.findIndex((o) => o.correct === true);

  return (
    <div className="w-full max-w-2xl text-center">
      <p className={`text-[10px] uppercase tracking-[0.35em] font-semibold mb-3 ${tone.chip} inline-block px-3 py-1 rounded-full`}>
        {pickLang(tone.label, lang)}
      </p>
      <h2 className="text-lg sm:text-xl font-light text-primary-50 leading-relaxed mb-8 whitespace-pre-wrap">
        {scenario}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl mx-auto">
        {options.map((opt, i) => {
          const label = pickLang(opt.label, lang);
          const isPicked = pickedIdx === i;
          const isCorrect = opt.correct === true;
          let styleClass;
          if (!answered) {
            styleClass = "border-primary-600 bg-primary-900 text-primary-100 hover:border-primary-500 hover:bg-primary-800";
          } else if (isCorrect) {
            styleClass = "border-accent-400/60 bg-accent-400/10 text-primary-50";
          } else if (isPicked) {
            styleClass = "border-signal-alert/60 bg-signal-alert/10 text-primary-50";
          } else {
            styleClass = "border-primary-700 bg-primary-panel text-primary-500";
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => !answered && setPickedIdx(i)}
              className={`text-left px-4 py-3 rounded-control border transition-colors ${styleClass}`}
            >
              <span className="text-[10px] uppercase tracking-wider opacity-60 font-bold block mb-1">
                {String.fromCharCode(65 + i)}
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-6 max-w-xl mx-auto text-left space-y-3">
          <p className={`text-sm font-bold ${pickedCorrect ? "text-accent-300" : "text-amber-300"}`}>
            {pickedCorrect
              ? t("player.correct", lang)
              : t("player.notQuite", lang)}
          </p>
          {picked?.explanation && (
            <p className="text-sm text-primary-100 leading-relaxed">
              {pickLang(picked.explanation, lang)}
            </p>
          )}
          {!pickedCorrect && correctIdx >= 0 && options[correctIdx]?.explanation && (
            <p className="text-sm text-primary-300 leading-relaxed border-l-2 border-accent-400/40 pl-3">
              <span className="text-accent-300 font-bold">
                {isPt ? "A resposta certa:" : "The right answer:"}
              </span>{" "}
              {pickLang(options[correctIdx].explanation, lang)}
            </p>
          )}
          <div className="pt-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() =>
                onComplete({ index: pickedIdx, correct: pickedCorrect })
              }
            >
              {t("player.continue", lang)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Match Prep Ritual ───────────────────────────────────────── */

function MatchPrepRitual({ activity, tone, lang, onComplete }) {
  const isPt = lang === "pt";
  const content = activity?.content || {};
  const technique = pickLang(content.technique, lang);
  const phrases = Array.isArray(content.phrases) ? content.phrases : [];
  const audioUrl = lang === "en"
    ? activity?.audio_url_en
    : activity?.audio_url_pt;

  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  return (
    <div className="w-full max-w-2xl">
      <p className={`text-[10px] uppercase tracking-[0.35em] font-semibold mb-3 ${tone.chip} inline-block px-3 py-1 rounded-full`}>
        {pickLang(tone.label, lang)}
      </p>
      <h2 className="text-2xl sm:text-3xl font-light tracking-tight text-primary-50 mb-2">
        {pickLang(activity?.title, lang)}
      </h2>
      {technique && (
        <p className="text-sm text-primary-300 leading-relaxed mb-6 whitespace-pre-wrap">
          {technique}
        </p>
      )}

      {/* Phrase cards — the "language" of the technique. Each has
          English text (what elite players actually say) with a PT
          hint below. */}
      {phrases.length > 0 && (
        <div className="space-y-2 mb-6">
          <p className="text-[10px] uppercase tracking-wider text-primary-400 font-bold">
            {isPt ? "Frases de auto-fala" : "Self-talk phrases"}
          </p>
          {phrases.map((p, i) => (
            <div
              key={i}
              className="rounded-control border border-primary-700 bg-primary-800 p-3"
            >
              <p className="text-lg font-medium text-primary-50">
                {p.text_en || ""}
              </p>
              {p.text_pt && (
                <p className="text-xs text-primary-400 mt-1">{p.text_pt}</p>
              )}
              {p.note && (
                <p className="text-[11px] text-primary-500 mt-2 italic">
                  {p.note}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Optional pre-match audio */}
      {audioUrl && (
        <div className="rounded-control border border-primary-700 bg-primary-800 p-4 mb-6">
          <p className="text-[11px] uppercase tracking-wider text-primary-300 font-semibold mb-2">
            {isPt ? "Ouça antes do próximo jogo" : "Listen before your next match"}
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={togglePlay}
              className="w-12 h-12 rounded-full bg-primary-800 hover:bg-primary-600 border border-primary-500 flex items-center justify-center"
            >
              {playing ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="w-10 h-10 rounded-full bg-primary-800 hover:bg-primary-700 border border-primary-700 flex items-center justify-center text-primary-300"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setPlaying(false)}
              preload="metadata"
            />
          </div>
        </div>
      )}

      <div className="pt-2">
        <Button variant="primary" Icon={Sparkles} onClick={onComplete}>
          {t("player.complete", lang)}
        </Button>
      </div>
    </div>
  );
}

/* ─── Voice of Champions ──────────────────────────────────────── */

function VoiceOfChampion({ activity, tone, lang, onComplete }) {
  const isPt = lang === "pt";
  const content = activity?.content || {};
  const athlete = content.athlete || {};
  const quoteEn = pickLang(content.quote, "en");
  const quotePt = pickLang(content.quote, "pt");
  const background = pickLang(content.background, lang);
  const audioUrl = lang === "en"
    ? activity?.audio_url_en
    : activity?.audio_url_pt;

  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showQuestion, setShowQuestion] = useState(false);
  const [pickedIdx, setPickedIdx] = useState(null);

  const q = content.comprehension_question;
  const hasQuestion =
    q && q.prompt && Array.isArray(q.options) && q.options.length > 0;

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  function handleContinue() {
    if (hasQuestion && !showQuestion) {
      setShowQuestion(true);
      return;
    }
    if (hasQuestion && pickedIdx != null) {
      onComplete({
        index: pickedIdx,
        correct: q.options[pickedIdx]?.correct === true,
      });
      return;
    }
    onComplete(null);
  }

  return (
    <div className="w-full max-w-2xl">
      <p className={`text-[10px] uppercase tracking-[0.35em] font-semibold mb-3 ${tone.chip} inline-block px-3 py-1 rounded-full`}>
        {pickLang(tone.label, lang)}
      </p>

      {/* Athlete card */}
      <div className="flex items-center gap-3 mb-6">
        {athlete.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={athlete.photo_url}
            alt={athlete.name || ""}
            className="w-14 h-14 rounded-full object-cover ring-2 ring-primary-600"
          />
        ) : (
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-400 flex items-center justify-center text-xl font-black">
            {(athlete.name || "?").charAt(0)}
          </div>
        )}
        <div>
          <p className="font-semibold text-primary-50 text-lg">
            {athlete.name || "—"}
          </p>
          {athlete.subtitle && (
            <p className="text-xs text-primary-400">{athlete.subtitle}</p>
          )}
        </div>
      </div>

      {/* The quote — English big, Portuguese small below */}
      {!showQuestion && (
        <>
          <blockquote className="relative pl-6 mb-6">
            <span className="absolute left-0 top-0 text-4xl leading-none text-violet-400/60">
              &ldquo;
            </span>
            <p className="text-xl sm:text-2xl font-light leading-relaxed text-primary-50 italic">
              {quoteEn}
            </p>
            {quotePt && (
              <p className="text-sm text-primary-400 mt-3 italic">{quotePt}</p>
            )}
          </blockquote>

          {background && (
            <p className="text-sm text-primary-300 leading-relaxed mb-6">
              {background}
            </p>
          )}

          {audioUrl && (
            <div className="rounded-control border border-primary-700 bg-primary-800 p-4 mb-6">
              <p className="text-[11px] uppercase tracking-wider text-primary-300 font-semibold mb-2">
                {isPt ? "Ouça na voz" : "Listen"}
              </p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-primary-800 hover:bg-primary-600 border border-primary-500 flex items-center justify-center"
                >
                  {playing ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  className="w-10 h-10 rounded-full bg-primary-800 hover:bg-primary-700 border border-primary-700 flex items-center justify-center text-primary-300"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setPlaying(false)}
                  preload="metadata"
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Optional comprehension question */}
      {showQuestion && hasQuestion && (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.35em] text-primary-500 font-semibold">
            {t("player.comprehensionTitle", lang)}
          </p>
          <p className="text-lg font-light text-primary-50">
            {pickLang(q.prompt, lang)}
          </p>
          <div className="space-y-2">
            {q.options.map((opt, i) => {
              const answered = pickedIdx != null;
              const isPicked = pickedIdx === i;
              const isCorrect = opt.correct === true;
              let styleClass;
              if (!answered) {
                styleClass = "border-primary-600 bg-primary-900 text-primary-100 hover:border-primary-500";
              } else if (isCorrect) {
                styleClass = "border-accent-400/60 bg-accent-400/10 text-primary-50";
              } else if (isPicked) {
                styleClass = "border-signal-alert/60 bg-signal-alert/10 text-primary-50";
              } else {
                styleClass = "border-primary-700 bg-primary-panel text-primary-500";
              }
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pickedIdx == null && setPickedIdx(i)}
                  className={`w-full text-left px-4 py-3 rounded-control border transition-colors ${styleClass}`}
                >
                  {pickLang(opt.label, lang)}
                </button>
              );
            })}
          </div>
          {pickedIdx != null && q.explanation && (
            <p className="text-sm text-primary-300 pt-2">
              {pickLang(q.explanation, lang)}
            </p>
          )}
        </div>
      )}

      <div className="pt-4">
        <Button
          variant="primary"
          onClick={handleContinue}
          disabled={showQuestion && hasQuestion && pickedIdx == null}
        >
          {showQuestion || !hasQuestion
            ? t("player.complete", lang)
            : t("player.continue", lang)}
        </Button>
      </div>
    </div>
  );
}

/* ─── Shared completion screen ────────────────────────────────── */

function CompletionScreen({ title, xpAwarded, onClose, lang, submitting }) {
  return (
    <div className="w-full max-w-md text-center animate-fade-in">
      {/* Completion glyph — swapped from Sparkles to CheckCircle2
          to match the "Session banked / Sessão registrada" register.
          Reads like a training log entry, not a celebration shimmer. */}
      <div className="mx-auto w-16 h-16 rounded-full bg-accent-400/20 flex items-center justify-center mb-4">
        {submitting ? (
          <Loader2 className="w-7 h-7 text-accent-300 animate-spin" />
        ) : (
          <CheckCircle2 className="w-7 h-7 text-accent-300" strokeWidth={2} />
        )}
      </div>
      <h2 className="text-2xl font-light tracking-tight mb-2">
        {t("player.completedCelebration", lang)}
      </h2>
      {title && <p className="text-sm text-primary-300 mb-4">{title}</p>}
      {xpAwarded > 0 && (
        <p className="inline-block px-4 py-2 rounded-full bg-accent-400/15 text-accent-300 font-bold text-lg tabular-nums">
          {t("player.xpAwarded", lang).replace("{n}", xpAwarded)}
        </p>
      )}
      <div className="mt-6">
        <Button variant="primary" onClick={onClose}>
          {t("player.close", lang)}
        </Button>
      </div>
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.4s ease-out; }
      `}</style>
    </div>
  );
}

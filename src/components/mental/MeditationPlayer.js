// src/components/mental/MeditationPlayer.js
//
// Full-screen meditation player. Two modes:
//
//   'guided'  — plays audio_url_pt / audio_url_en depending on the
//               language pick. Runs alongside the LivingOrb. Ends
//               with an optional comprehension question.
//
//   'silent'  — no audio; player picks length + bell interval, orb
//               animates, bells ring at intervals + at end. Same
//               component so the visual language is consistent.
//
// State machine:
//   setup   — silent mode only; user picks length + bells
//   playing — orb + timer running; guided audio playing if mode='guided'
//   question — post-session comprehension (guided mode only)
//   complete — celebration screen with XP + return
//
// Progress is POSTed to /api/mental/progress at the moment the
// session hits 'complete' (not on close). The XP award side-effect
// happens server-side.

"use client";

import { useEffect, useRef, useState } from "react";
import { X, Play, Pause, Volume2, VolumeX, Loader2, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import {
  t,
  pickLang,
  ACTIVITY_TONES,
  SILENT_TIMER_LENGTHS,
  SILENT_TIMER_BELL_INTERVALS,
  DEFAULT_BELL_SOUND_URL,
  computeSilentTimerXp,
} from "@/lib/mental/constants";
import LivingOrb from "@/components/mental/LivingOrb";
import { awardXp } from "@/lib/xp/awardXp";

// Default 4-7-8 rhythm — activities can override via
// content.orb.breathe_{in,hold,out}. The phase label ("Breathe in"
// / "Hold" / "Breathe out") is derived from the CURRENT elapsed sec
// modulo the cycle length, so it stays in sync with whatever cycle
// the orb is animating.
const DEFAULT_BREATHE = { in: 4, hold: 7, out: 8 };

/**
 * @param {{
 *   activity: object | null,   // full mental_activities row; null for freeform silent
 *   mode: 'guided' | 'silent', // if null, inferred from activity.activity_type
 *   onClose: () => void,
 *   onCompleted?: (data) => void,
 * }} props
 */
export default function MeditationPlayer({
  activity,
  mode: modeProp,
  onClose,
  onCompleted,
}) {
  const { lang } = useLanguage();
  const mode =
    modeProp ||
    (activity?.activity_type === "silent_timer" ? "silent" : "guided");

  // Orb config — per-activity overrides in `content.orb`, falls back
  // to type-default accent + 4-7-8 breathing.
  const orbConfig = activity?.content?.orb || {};
  const accent =
    orbConfig.accent ||
    ACTIVITY_TONES[activity?.activity_type || "meditation"]?.accent ||
    "teal";
  const breatheIn = Number(orbConfig.breathe_in) || DEFAULT_BREATHE.in;
  const breatheHold = Number.isFinite(Number(orbConfig.breathe_hold))
    ? Number(orbConfig.breathe_hold)
    : DEFAULT_BREATHE.hold;
  const breatheOut = Number(orbConfig.breathe_out) || DEFAULT_BREATHE.out;

  const [phase, setPhase] = useState(mode === "silent" ? "setup" : "playing");
  const [audioLang, setAudioLang] = useState(lang === "en" ? "en" : "pt");
  const [muted, setMuted] = useState(false);

  // Silent-timer state
  const silentContent = activity?.content || {};
  const [silentMinutes, setSilentMinutes] = useState(
    silentContent.default_length_minutes || 10,
  );
  const [bellIntervalMin, setBellIntervalMin] = useState(0);

  // Playback state — elapsed seconds since start.
  const [elapsedSec, setElapsedSec] = useState(0);
  const [durationSec, setDurationSec] = useState(
    activity?.duration_seconds || 0,
  );
  const [paused, setPaused] = useState(false);

  // Comprehension state (guided mode)
  const [selectedIdx, setSelectedIdx] = useState(null);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const audioRef = useRef(null);
  const bellRef = useRef(null);
  const startedAtRef = useRef(null);
  const lastBellRef = useRef(-1);

  // ── Timer tick — 250ms so the elapsed reads smoothly enough ────
  useEffect(() => {
    if (phase !== "playing" || paused) return;
    if (startedAtRef.current == null) {
      startedAtRef.current = Date.now();
    }
    const startAtLocal = startedAtRef.current;
    const id = setInterval(() => {
      const secs = Math.floor((Date.now() - startAtLocal) / 1000);
      setElapsedSec(secs);
    }, 250);
    return () => clearInterval(id);
  }, [phase, paused]);

  // ── Guided audio ────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== "guided" || phase !== "playing") return;
    const audio = audioRef.current;
    if (!audio) return;
    const src = audioLang === "en" ? activity?.audio_url_en : activity?.audio_url_pt;
    if (!src) return;
    audio.src = src;
    audio.muted = muted;
    audio.play().catch(() => {
      // Autoplay blocked — user must click Resume once.
      setPaused(true);
    });
    const onEnded = () => transitionToQuestionOrComplete();
    const onLoaded = () => {
      if (Number.isFinite(audio.duration) && audio.duration > 0) {
        setDurationSec(Math.round(audio.duration));
      }
    };
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("loadedmetadata", onLoaded);
    return () => {
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("loadedmetadata", onLoaded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, phase, audioLang]);

  // Pause/resume the audio when the paused flag flips.
  useEffect(() => {
    if (mode !== "guided") return;
    const audio = audioRef.current;
    if (!audio) return;
    if (paused) audio.pause();
    else audio.play().catch(() => {});
  }, [paused, mode]);

  // Mute toggle — react to state changes on the audio element. The
  // earlier setup effect only applied `muted` when the audio first
  // loaded, so clicking the button mid-session had no effect.
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  // ── Silent timer — bells + end-of-session ──────────────────────
  useEffect(() => {
    if (mode !== "silent" || phase !== "playing") return;
    const totalSec = silentMinutes * 60;
    const intervalSec = bellIntervalMin * 60;

    // End of session
    if (elapsedSec >= totalSec) {
      playBell(bellRef.current);
      transitionToQuestionOrComplete();
      return;
    }

    // Interval bells — ring once when we cross the boundary.
    if (intervalSec > 0) {
      const currentBell = Math.floor(elapsedSec / intervalSec);
      if (currentBell > 0 && currentBell !== lastBellRef.current) {
        lastBellRef.current = currentBell;
        playBell(bellRef.current);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedSec, mode, phase]);

  function transitionToQuestionOrComplete() {
    const hasQuestion =
      mode === "guided" &&
      activity?.content?.comprehension_question?.prompt;
    if (hasQuestion) {
      setPhase("question");
    } else {
      submitCompletion(null);
    }
  }

  async function submitCompletion(answer) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const spentSec =
        mode === "silent"
          ? silentMinutes * 60
          : elapsedSec || activity?.duration_seconds || 0;
      const res = await fetch("/api/mental/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_id: activity?.id || null,
          activity_type: activity?.activity_type || mode === "silent" ? "silent_timer" : "meditation",
          duration_seconds: spentSec,
          metadata:
            answer != null
              ? { comprehension_answer: answer, lang: audioLang }
              : { lang: audioLang, silent_minutes: silentMinutes },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setXpAwarded(json.xp_awarded || 0);
        // Fire the actual XP award — the /progress endpoint told us
        // the amount but doesn't award XP itself (awardXp() is
        // browser-only). This is the same pattern lessons use.
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

  // ── Render ─────────────────────────────────────────────────────

  const title = pickLang(activity?.title, lang) || t("hub.silentTimerCard.title", lang);

  return (
    <div
      className="fixed inset-0 z-50 bg-black text-white overflow-hidden"
      role="dialog"
      aria-modal="true"
    >
      {/* Ambient background — very slow shifting radial gradient
          matched to the accent. Kept super subtle so the orb owns
          the visual center. */}
      <AmbientBackdrop accent={accent} />

      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-30 p-2 rounded-full bg-white/[0.05] hover:bg-white/[0.1] text-white/70 hover:text-white"
        aria-label={t("player.close", lang)}
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative z-10 h-full flex flex-col items-center justify-center p-4">
        {phase === "setup" && (
          <SilentSetup
            lang={lang}
            silentMinutes={silentMinutes}
            setSilentMinutes={setSilentMinutes}
            bellIntervalMin={bellIntervalMin}
            setBellIntervalMin={setBellIntervalMin}
            content={silentContent}
            onStart={() => setPhase("playing")}
          />
        )}

        {phase === "playing" && (
          <>
            <PhaseAndOrb
              mode={mode}
              activity={activity}
              accent={accent}
              elapsedSec={elapsedSec}
              paused={paused}
              audioLang={audioLang}
              lang={lang}
              breatheIn={breatheIn}
              breatheHold={breatheHold}
              breatheOut={breatheOut}
            />
            <PlayerControls
              lang={lang}
              paused={paused}
              onPauseToggle={() => setPaused((p) => !p)}
              muted={muted}
              onMuteToggle={() => setMuted((m) => !m)}
              showAudioLangSwitch={mode === "guided"}
              audioLang={audioLang}
              onAudioLangChange={setAudioLang}
              showMute={mode === "guided"}
              onEnd={() => transitionToQuestionOrComplete()}
              elapsedSec={elapsedSec}
              durationSec={mode === "silent" ? silentMinutes * 60 : durationSec}
            />
          </>
        )}

        {phase === "question" && (
          <ComprehensionQuestion
            activity={activity}
            audioLang={audioLang}
            selectedIdx={selectedIdx}
            onSelect={setSelectedIdx}
            onContinue={() => submitCompletion(selectedIdx)}
            lang={lang}
            submitting={submitting}
          />
        )}

        {phase === "complete" && (
          <CompletionScreen
            title={title}
            xpAwarded={xpAwarded}
            onClose={onClose}
            lang={lang}
          />
        )}
      </div>

      {/* Hidden audio elements — one for the guided narration, one
          for the bell chime. Preloaded so first play is snappy. */}
      <audio ref={audioRef} preload="auto" />
      <audio
        ref={bellRef}
        preload="auto"
        src={silentContent.bell_sound_url || DEFAULT_BELL_SOUND_URL}
      />
    </div>
  );
}

function AmbientBackdrop({ accent }) {
  const gradient = {
    teal: "radial-gradient(ellipse at 20% 20%, rgba(20,184,166,0.15), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(59,130,246,0.12), transparent 55%)",
    violet:
      "radial-gradient(ellipse at 20% 20%, rgba(139,92,246,0.15), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(219,39,119,0.10), transparent 55%)",
    emerald:
      "radial-gradient(ellipse at 20% 20%, rgba(16,185,129,0.15), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(163,230,53,0.10), transparent 55%)",
    amber:
      "radial-gradient(ellipse at 20% 20%, rgba(245,158,11,0.15), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(239,68,68,0.10), transparent 55%)",
    slate:
      "radial-gradient(ellipse at 20% 20%, rgba(148,163,184,0.15), transparent 55%), radial-gradient(ellipse at 80% 80%, rgba(30,41,59,0.30), transparent 55%)",
  }[accent] || "";

  return (
    <div
      className="absolute inset-0 pointer-events-none animate-ambient"
      style={{ background: gradient }}
    >
      <style jsx>{`
        @keyframes ambient-drift {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
            opacity: 0.8;
          }
          50% {
            transform: translate(2%, -2%) scale(1.05);
            opacity: 1;
          }
        }
        .animate-ambient {
          animation: ambient-drift 40s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function PhaseAndOrb({
  mode,
  activity,
  accent,
  elapsedSec,
  paused,
  audioLang,
  lang,
  breatheIn,
  breatheHold,
  breatheOut,
}) {
  const phase = phaseFromElapsed(elapsedSec, breatheIn, breatheHold, breatheOut);
  const phaseLabel =
    phase === "in"
      ? t("player.breatheIn", lang)
      : phase === "hold"
        ? t("player.hold", lang)
        : t("player.breatheOut", lang);
  const title = pickLang(activity?.title, audioLang);
  const subLabel =
    mode === "silent" ? t("player.justBreathe", lang) : null;

  return (
    <div className="flex flex-col items-center gap-4">
      {title && (
        <p className="text-[11px] uppercase tracking-[0.35em] text-white/40 font-semibold">
          {title}
        </p>
      )}
      <LivingOrb
        size={280}
        phaseLabel={phaseLabel}
        subLabel={subLabel}
        paused={paused}
        accent={accent}
        breatheIn={breatheIn}
        breatheHold={breatheHold}
        breatheOut={breatheOut}
      />
      <p className="mt-2 text-3xl font-light tabular-nums text-white/85">
        {formatMMSS(elapsedSec)}
      </p>
    </div>
  );
}

function PlayerControls({
  lang,
  paused,
  onPauseToggle,
  muted,
  onMuteToggle,
  showAudioLangSwitch,
  audioLang,
  onAudioLangChange,
  showMute,
  onEnd,
  elapsedSec,
  durationSec,
}) {
  const progressPct =
    durationSec > 0 ? Math.min(100, (elapsedSec / durationSec) * 100) : 0;

  return (
    <div className="mt-8 w-full max-w-md flex flex-col items-center gap-4">
      {/* Progress bar — thin, unobtrusive. Only shown when we know
          the total (silent mode always; guided once metadata loads). */}
      {durationSec > 0 && (
        <div className="w-full h-0.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div
            className="h-full bg-white/70 transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      <div className="flex items-center gap-3">
        {showAudioLangSwitch && (
          <div className="inline-flex rounded-full bg-white/[0.05] border border-white/10 p-0.5 mr-2">
            {["pt", "en"].map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onAudioLangChange(code)}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-full transition-colors ${
                  audioLang === code
                    ? "bg-white/20 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        )}
        <button
          type="button"
          onClick={onPauseToggle}
          className="w-14 h-14 rounded-full bg-white/[0.08] hover:bg-white/[0.15] border border-white/20 flex items-center justify-center transition-colors"
        >
          {paused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
        </button>
        {showMute && (
          <button
            type="button"
            onClick={onMuteToggle}
            className="w-10 h-10 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 flex items-center justify-center text-white/70"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={onEnd}
          className="ml-4 text-xs text-white/45 hover:text-white/80 underline underline-offset-4"
        >
          {t("player.complete", lang)}
        </button>
      </div>
    </div>
  );
}

function SilentSetup({
  lang,
  silentMinutes,
  setSilentMinutes,
  bellIntervalMin,
  setBellIntervalMin,
  content,
  onStart,
}) {
  const presets =
    (Array.isArray(content.presets) && content.presets.length > 0
      ? content.presets
      : SILENT_TIMER_LENGTHS);
  const bellOptions =
    (Array.isArray(content.bell_intervals) && content.bell_intervals.length > 0
      ? content.bell_intervals
      : SILENT_TIMER_BELL_INTERVALS);

  return (
    <div className="w-full max-w-lg text-center">
      <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-semibold mb-2">
        {t("player.silentSetupTitle", lang)}
      </p>
      <h2 className="text-2xl sm:text-3xl font-light tracking-tight mb-6">
        {t("hub.silentTimerCard.title", lang)}
      </h2>

      {/* Length picker */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-3">
          {t("player.silentLength", lang)}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {presets.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setSilentMinutes(m)}
              className={`px-4 py-2 rounded-full text-sm font-semibold border transition-colors ${
                silentMinutes === m
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/25"
              }`}
            >
              {m} {t("player.silentLengthMin", lang)}
            </button>
          ))}
        </div>
        <div className="mt-3 inline-flex items-center gap-2 text-xs text-white/50">
          <span>{t("player.silentCustom", lang)}</span>
          <input
            type="number"
            min={1}
            max={120}
            value={silentMinutes}
            onChange={(e) => setSilentMinutes(Number(e.target.value) || 1)}
            className="w-16 bg-white/[0.06] border border-white/15 rounded-lg px-2 py-1 text-center text-white text-sm tabular-nums focus:outline-none focus:border-white/40"
          />
          <span>{t("player.silentLengthMin", lang)}</span>
        </div>
      </div>

      {/* Bell interval */}
      <div className="mb-8">
        <p className="text-xs uppercase tracking-wider text-white/50 font-semibold mb-3">
          {t("player.silentBellInterval", lang)}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {bellOptions.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setBellIntervalMin(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                bellIntervalMin === m
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/25"
              }`}
            >
              {m === 0
                ? t("player.silentBellsOff", lang)
                : `${m} ${t("player.silentLengthMin", lang)}`}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        disabled={silentMinutes < 1}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white text-black font-bold text-sm disabled:opacity-50"
      >
        <Play className="w-4 h-4" />
        {t("player.silentBegin", lang)}
      </button>
    </div>
  );
}

function ComprehensionQuestion({ activity, audioLang, selectedIdx, onSelect, onContinue, lang, submitting }) {
  const question = activity?.content?.comprehension_question;
  if (!question) return null;
  const prompt = pickLang(question.prompt, audioLang);
  const options = Array.isArray(question.options) ? question.options : [];
  const explanation = pickLang(question.explanation, audioLang);
  const answered = selectedIdx != null;
  const correct = options[selectedIdx]?.correct === true;

  return (
    <div className="w-full max-w-md text-center">
      <p className="text-[10px] uppercase tracking-[0.35em] text-white/40 font-semibold mb-2">
        {t("player.comprehensionTitle", lang)}
      </p>
      <h2 className="text-xl font-light tracking-tight mb-6">{prompt}</h2>
      <div className="space-y-2 mb-6">
        {options.map((opt, i) => {
          const label = pickLang(opt.label, audioLang);
          const isSelected = selectedIdx === i;
          const isCorrect = opt.correct === true;
          const revealStyle = answered
            ? isCorrect
              ? "border-emerald-400/60 bg-emerald-500/10 text-white"
              : isSelected
                ? "border-red-400/60 bg-red-500/10 text-white"
                : "border-white/10 bg-white/[0.02] text-white/50"
            : "border-white/15 bg-white/[0.04] text-white/85 hover:border-white/30";
          return (
            <button
              key={i}
              type="button"
              onClick={() => !answered && onSelect(i)}
              className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${revealStyle}`}
            >
              {label}
            </button>
          );
        })}
      </div>
      {answered && explanation && (
        <p className="text-sm text-white/70 mb-4">
          <span className={correct ? "text-emerald-300 font-bold" : "text-amber-300 font-bold"}>
            {correct ? t("player.correct", lang) : t("player.notQuite", lang)}
          </span>{" "}
          {explanation}
        </p>
      )}
      {answered && (
        <button
          type="button"
          onClick={onContinue}
          disabled={submitting}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black font-bold text-sm disabled:opacity-50"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {t("player.continue", lang)}
        </button>
      )}
    </div>
  );
}

function CompletionScreen({ title, xpAwarded, onClose, lang }) {
  return (
    <div className="w-full max-w-md text-center animate-fade-in">
      <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
        <Sparkles className="w-7 h-7 text-emerald-300" />
      </div>
      <h2 className="text-2xl font-light tracking-tight mb-2">
        {t("player.completedCelebration", lang)}
      </h2>
      {title && <p className="text-sm text-white/60 mb-4">{title}</p>}
      {xpAwarded > 0 && (
        <p className="inline-block px-4 py-2 rounded-full bg-emerald-500/15 text-emerald-200 font-bold text-lg tabular-nums">
          {t("player.xpAwarded", lang).replace("{n}", xpAwarded)}
        </p>
      )}
      <div className="mt-6">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white text-black font-bold text-sm"
        >
          {t("player.close", lang)}
        </button>
      </div>
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────────── */

/**
 * Which phase of the breathe cycle we're in RIGHT NOW, given elapsed
 * seconds + the current activity's in/hold/out timings. Matches the
 * orb keyframes so the phase label reads in sync with what the eye
 * sees, regardless of the configured rhythm.
 */
function phaseFromElapsed(elapsedSec, breatheIn, breatheHold, breatheOut) {
  const cycleMs = Math.max(2000, (breatheIn + breatheHold + breatheOut) * 1000);
  const inhaleMs = breatheIn * 1000;
  const holdMs = breatheHold * 1000;
  const posInCycle = (elapsedSec * 1000) % cycleMs;
  if (posInCycle < inhaleMs) return "in";
  if (posInCycle < inhaleMs + holdMs) return "hold";
  return "out";
}

function formatMMSS(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function playBell(audioEl) {
  if (!audioEl) return;
  try {
    audioEl.currentTime = 0;
    audioEl.play().catch(() => {});
  } catch {
    /* silent */
  }
}

// Suppress unused import lint — kept for potential future use.
void computeSilentTimerXp;

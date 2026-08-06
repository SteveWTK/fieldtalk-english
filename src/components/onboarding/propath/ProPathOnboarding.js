// src/components/onboarding/propath/ProPathOnboarding.js
//
// Pro Path 26/27 first-run flow. Full-screen overlay, three slides,
// deliberately short — every second the user spends here is a second
// not spent in a lesson. The whole flow is one emotional beat: "you
// belong here, we know what you're after, let's go".
//
//   Slide 1 — Position picker    ("Where do you play?")
//   Slide 2 — Goal picker        ("What's your goal?")
//   Slide 3 — Ready celebration  (Skill Radar teaser → first action)
//
// Persistence:
//   Both selections are saved together via POST /api/onboarding/complete
//   when the user taps the final CTA. That endpoint also flips
//   players.onboarding_completed = true, which is the gate the parent
//   /lesson page reads to decide whether to mount this overlay at all.
//
// Visual language:
//   Same dark base + lime/slate ambient glows as the /propath landing
//   and dashboard, so the whole edition feels like one continuous
//   surface. Entrance animations are subtle vertical rises — see
//   pp-onb-rise below.
"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  X,
  Check,
  Sparkles,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import { NOT_SURE_YET, getPosition } from "@/lib/players/positions";
import { PROPATH_GOALS } from "@/lib/players/proPathGoals";
import { SKILL_AXES, skillAxisLabel } from "@/lib/lessons/skillAxes";

const COPY = {
  en: {
    skip: "Skip",
    back: "Back",
    next: "Next",
    finishing: "Setting up…",
    slide1: {
      eyebrow: "Welcome to Pro Path 26/27",
      title: "Where do you play?",
      body: "Pick your main position. You can always change this later from your profile.",
      notSure: "Not sure yet — I play across positions",
    },
    slide2: {
      eyebrow: "Your goal",
      title: "What brings you here?",
      body: "This helps us surface the right lessons and nudges for where you are right now.",
    },
    slide3: {
      eyebrow: "You're set",
      titlePrefix: "Welcome,",
      body: "Your dashboard is ready. Complete at least one lesson in each of the 6 areas below to unlock your Trial-Ready certificate.",
      cta: "Go to my dashboard",
    },
    dots: (n, total) => `Step ${n} of ${total}`,
  },
  pt: {
    skip: "Pular",
    back: "Voltar",
    next: "Avançar",
    finishing: "Preparando…",
    slide1: {
      eyebrow: "Bem-vindo ao Pro Path 26/27",
      title: "Onde você joga?",
      body: "Escolha sua posição principal. Você pode alterar isso depois no seu perfil.",
      notSure: "Ainda não sei — jogo em várias posições",
    },
    slide2: {
      eyebrow: "Seu objetivo",
      title: "O que traz você aqui?",
      body: "Isso nos ajuda a sugerir as aulas certas e os avisos ideais para o momento em que você está.",
    },
    slide3: {
      eyebrow: "Tudo pronto",
      titlePrefix: "Bem-vindo,",
      body: "Seu painel está pronto. Complete pelo menos uma aula em cada uma das 6 áreas abaixo para desbloquear seu certificado Pronto para Peneiras.",
      cta: "Ir para meu painel",
    },
    dots: (n, total) => `Passo ${n} de ${total}`,
  },
};

export default function ProPathOnboarding({
  userName,
  onDismiss,
}) {
  const { lang } = useLanguage();
  const copy = COPY[lang] || COPY.en;
  const router = useRouter();

  // Slide index — 0/1/2. We keep it as a number so ← → transitions
  // can compute direction (for slide-in-from-left vs right).
  const [slideIdx, setSlideIdx] = useState(0);
  const [direction, setDirection] = useState("forward"); // forward | back
  const [mounted, setMounted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Selections. `position` may be null (== "not sure yet"), which is
  // valid — we still allow advancing. Goal is required to complete.
  const [position, setPosition] = useState(undefined); // undefined = untouched
  const [goal, setGoal] = useState(null);

  useEffect(() => {
    // Defer entrance animation one paint tick so the overlay doesn't
    // land already animated.
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const slides = 3;

  const canAdvance = useMemo(() => {
    if (slideIdx === 0) return position !== undefined; // any selection made (incl. null "not sure")
    if (slideIdx === 1) return !!goal;
    return true;
  }, [slideIdx, position, goal]);

  const goNext = () => {
    if (!canAdvance) return;
    setDirection("forward");
    setSlideIdx((i) => Math.min(i + 1, slides - 1));
  };
  const goBack = () => {
    setDirection("back");
    setSlideIdx((i) => Math.max(i - 1, 0));
  };

  const finish = async ({ skipped = false } = {}) => {
    setSaving(true);
    setSaveError(null);
    try {
      // Even on skip we POST — flipping onboarding_completed=true is
      // the mechanism that stops the modal from re-appearing. If the
      // user skipped we simply omit position/goal from the payload.
      const body = { onboarding_completed: true };
      if (!skipped) {
        // position may be null (== "not sure yet"), send only when
        // the user actively picked a code.
        if (position) body.position = position;
        if (goal) body.propath_goal = goal;
      }
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Could not save your setup");
      }
      onDismiss?.();
      router.push("/dashboard");
    } catch (err) {
      setSaveError(err.message);
      setSaving(false);
    }
  };

  const handleSkip = () => finish({ skipped: true });

  const slideKey = `slide-${slideIdx}`;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#070707] text-white overflow-y-auto">
      {/* Ambient glows — same lime + slate identity as landing +
          dashboard. Duplicated here so the overlay reads as part of
          the Pro Path world, not a modal from a different app. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, rgba(163,230,53,0.16), rgba(163,230,53,0) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-25%] right-[-15%] w-[55vw] h-[55vw] rounded-full blur-3xl opacity-50"
          style={{
            background:
              "radial-gradient(circle at center, rgba(148,163,184,0.12), rgba(148,163,184,0) 70%)",
          }}
        />
      </div>

      {/* Top bar — skip is deliberately understated (small, muted) so
          the user's eye lands on the slide content, not the escape
          hatch. Keeping it available respects users who want to
          bounce straight to the app. */}
      <div className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-4">
        <p className="text-[11px] uppercase tracking-[0.25em] text-white/45 font-bold">
          {copy.dots(slideIdx + 1, slides)}
        </p>
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving}
          className="inline-flex items-center gap-1 text-xs text-white/45 hover:text-white/70 transition-colors disabled:opacity-40"
        >
          {copy.skip}
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Slide viewport. We render only the active slide (rather than
          all three positioned) so screen-readers see one heading tree
          at a time and Tab order stays natural. Slide keys drive the
          re-mount + entrance animation. */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-4">
        <div
          key={slideKey}
          className={`w-full max-w-2xl ${
            mounted ? (direction === "back" ? "pp-onb-rise-back" : "pp-onb-rise") : "opacity-0"
          }`}
        >
          {slideIdx === 0 && (
            <SlidePosition
              copy={copy.slide1}
              value={position}
              onChange={setPosition}
              lang={lang}
            />
          )}
          {slideIdx === 1 && (
            <SlideGoal copy={copy.slide2} value={goal} onChange={setGoal} lang={lang} />
          )}
          {slideIdx === 2 && (
            <SlideReady
              copy={copy.slide3}
              userName={userName}
              lang={lang}
            />
          )}
        </div>
      </main>

      {/* Footer nav. Fixed layout so slide-height changes don't shift
          the primary CTA around the viewport. */}
      <footer className="relative z-10 px-4 sm:px-6 py-5 border-t border-white/5">
        {saveError && (
          <p className="text-center text-sm text-red-300 mb-3">{saveError}</p>
        )}
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            disabled={slideIdx === 0 || saving}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold transition-colors ${
              slideIdx === 0
                ? "opacity-0 pointer-events-none"
                : "text-white/70 hover:text-white hover:bg-white/[0.06]"
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            {copy.back}
          </button>

          {/* Progress dots — dead centre, minimal, respect prefers-
              reduced-motion for the fill transition. */}
          <div className="flex items-center gap-2">
            {Array.from({ length: slides }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === slideIdx
                    ? "w-8 bg-accent-400"
                    : i < slideIdx
                      ? "w-1.5 bg-accent-400/60"
                      : "w-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>

          {slideIdx < slides - 1 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canAdvance || saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-accent-400 hover:bg-accent-300 disabled:opacity-40 disabled:cursor-not-allowed text-primary-900 font-bold text-sm tracking-wide transition-colors"
            >
              {copy.next}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => finish()}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full bg-accent-400 hover:bg-accent-300 disabled:opacity-60 text-primary-900 font-bold text-sm tracking-wide transition-colors"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {copy.finishing}
                </>
              ) : (
                <>
                  {copy.slide3.cta}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      </footer>

      <style jsx global>{`
        @keyframes pp-onb-rise {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pp-onb-rise-back {
          0% {
            opacity: 0;
            transform: translateY(-16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .pp-onb-rise {
          animation: pp-onb-rise 0.55s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .pp-onb-rise-back {
          animation: pp-onb-rise-back 0.55s cubic-bezier(0.16, 1, 0.3, 1)
            forwards;
        }
      `}</style>
    </div>
  );
}

// ─── Slide 1 — position picker (pitch-shaped layout) ─────────────
// Buttons are placed in a 12-column grid that mirrors a football
// pitch. Reading top-to-bottom: keeper alone in the centre, three
// defenders spread across, three midfielders, four attackers with
// wingers on the flanks. The layout communicates position at a
// glance without needing icons; a subtle bordered "pitch card"
// wraps everything for the visual cue.
//
// Left/right orientation follows the standard formation-diagram
// convention (viewer looking down from above, attacking upward):
// LB / LW sit on the viewer's LEFT. If a user's mental model is
// "viewer-behind-goal", we can swap the row-2 and row-4 orders in
// one place here — every position lookup uses codes, so downstream
// data isn't touched.
function SlidePosition({ copy, value, onChange, lang }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300/80 font-bold mb-2">
        {copy.eyebrow}
      </p>
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
        {copy.title}
      </h2>
      <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed mb-6">
        {copy.body}
      </p>

      {/* Pitch card — subtle bordered container with a faint centre
          line to sell the "you're picking on a pitch" metaphor
          without dominating the interface. */}
      <div className="relative rounded-3xl border border-white/[0.07] bg-white/[0.015] p-3 sm:p-4">
        <div
          className="pointer-events-none absolute left-4 right-4 top-1/2 -translate-y-1/2 border-t border-dashed border-white/5"
          aria-hidden
        />

        <div className="relative grid grid-cols-12 gap-2 sm:gap-3">
          {/* Row 1 — goalkeeper, centred */}
          <div className="col-start-5 col-span-4">
            <PosButton
              pos={getPosition("GK")}
              active={value === "GK"}
              onClick={() => onChange("GK")}
              lang={lang}
            />
          </div>

          {/* Row 2 — defenders (LB / CB / RB from left to right) */}
          <div className="col-span-4">
            <PosButton
              pos={getPosition("LB")}
              active={value === "LB"}
              onClick={() => onChange("LB")}
              lang={lang}
            />
          </div>
          <div className="col-span-4">
            <PosButton
              pos={getPosition("CB")}
              active={value === "CB"}
              onClick={() => onChange("CB")}
              lang={lang}
            />
          </div>
          <div className="col-span-4">
            <PosButton
              pos={getPosition("RB")}
              active={value === "RB"}
              onClick={() => onChange("RB")}
              lang={lang}
            />
          </div>

          {/* Row 3 — midfield (DM / CM / AM). These are back-to-front
              roles, not left/right; showing them in a horizontal
              row keeps the pitch shape while acknowledging that DM
              sits deepest and AM highest. */}
          <div className="col-span-4">
            <PosButton
              pos={getPosition("DM")}
              active={value === "DM"}
              onClick={() => onChange("DM")}
              lang={lang}
            />
          </div>
          <div className="col-span-4">
            <PosButton
              pos={getPosition("CM")}
              active={value === "CM"}
              onClick={() => onChange("CM")}
              lang={lang}
            />
          </div>
          <div className="col-span-4">
            <PosButton
              pos={getPosition("AM")}
              active={value === "AM"}
              onClick={() => onChange("AM")}
              lang={lang}
            />
          </div>

          {/* Row 4 — attack (LW / CF / ST / RW). Wingers on the
              flanks, forwards in the middle. */}
          <div className="col-span-3">
            <PosButton
              pos={getPosition("LW")}
              active={value === "LW"}
              onClick={() => onChange("LW")}
              lang={lang}
            />
          </div>
          <div className="col-span-3">
            <PosButton
              pos={getPosition("CF")}
              active={value === "CF"}
              onClick={() => onChange("CF")}
              lang={lang}
            />
          </div>
          <div className="col-span-3">
            <PosButton
              pos={getPosition("ST")}
              active={value === "ST"}
              onClick={() => onChange("ST")}
              lang={lang}
            />
          </div>
          <div className="col-span-3">
            <PosButton
              pos={getPosition("RW")}
              active={value === "RW"}
              onClick={() => onChange("RW")}
              lang={lang}
            />
          </div>
        </div>
      </div>

      {/* "Not sure yet" — deliberately full-width + softer so it feels
          like a legitimate escape hatch rather than a hidden option. */}
      <button
        type="button"
        onClick={() => onChange(null)}
        aria-pressed={value === null}
        className={`mt-3 w-full rounded-2xl border p-3 text-sm transition-all ${
          value === null
            ? "border-accent-400/60 bg-accent-400/[0.08] text-accent-100"
            : "border-dashed border-white/15 bg-transparent text-white/55 hover:text-white/80 hover:border-white/30"
        }`}
      >
        {lang === "pt" ? NOT_SURE_YET.pt : NOT_SURE_YET.en}
      </button>
    </div>
  );
}

// Single position tile — code prominent, full label small below.
// Defensive against getPosition returning null (defensive so a typo
// in the layout above degrades to a hidden slot rather than crashing).
function PosButton({ pos, active, onClick, lang }) {
  if (!pos) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={lang === "pt" ? pos.pt : pos.en}
      className={`w-full h-full flex flex-col items-center justify-center rounded-xl border py-2 sm:py-2.5 px-1 transition-all ${
        active
          ? "border-accent-400 bg-accent-400/10 shadow-[0_0_18px_rgba(163,230,53,0.18)]"
          : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
      }`}
    >
      <span
        className={`text-base sm:text-lg font-black tracking-tight tabular-nums ${
          active ? "text-accent-200" : "text-white/85"
        }`}
      >
        {pos.code}
      </span>
      <span
        className={`text-[9px] sm:text-[10px] mt-0.5 leading-tight text-center line-clamp-1 ${
          active ? "text-white/80" : "text-white/50"
        }`}
      >
        {lang === "pt" ? pos.pt : pos.en}
      </span>
    </button>
  );
}

// ─── Slide 2 — goal picker ──────────────────────────────────────
function SlideGoal({ copy, value, onChange, lang }) {
  return (
    <div className="text-center">
      <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300/80 font-bold mb-2">
        {copy.eyebrow}
      </p>
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">
        {copy.title}
      </h2>
      <p className="text-sm text-white/60 max-w-md mx-auto leading-relaxed mb-6">
        {copy.body}
      </p>

      <div className="grid gap-2.5 sm:gap-3">
        {PROPATH_GOALS.map((g) => {
          const active = value === g.slug;
          const Icon = g.Icon;
          const t = lang === "pt" ? g.pt : g.en;
          return (
            <button
              key={g.slug}
              type="button"
              onClick={() => onChange(g.slug)}
              aria-pressed={active}
              className={`flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                active
                  ? "border-accent-400 bg-accent-400/10 shadow-[0_0_24px_rgba(163,230,53,0.15)]"
                  : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]"
              }`}
            >
              <div
                className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${
                  active
                    ? "bg-accent-400/20 text-accent-200"
                    : "bg-white/[0.06] text-white/70"
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm sm:text-base font-bold ${
                    active ? "text-accent-100" : "text-white/90"
                  }`}
                >
                  {t.title}
                </p>
                <p className="text-xs sm:text-sm text-white/60 mt-0.5 leading-relaxed">
                  {t.body}
                </p>
              </div>
              {active && (
                <Check className="w-4 h-4 text-accent-300 shrink-0 mt-1" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Slide 3 — ready celebration ────────────────────────────────
function SlideReady({ copy, userName, lang }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 rounded-full bg-accent-400/20 border border-accent-400/40 mx-auto mb-4 flex items-center justify-center">
        <Sparkles className="w-7 h-7 text-accent-300" />
      </div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-accent-300/80 font-bold mb-2">
        {copy.eyebrow}
      </p>
      <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-3">
        {copy.titlePrefix}{" "}
        <span className="bg-gradient-to-r from-accent-300 via-accent-200 to-accent-100 bg-clip-text text-transparent">
          {(userName || "").split(" ")[0] || (lang === "pt" ? "jogador" : "player")}
        </span>
      </h2>
      <p className="text-sm text-white/70 max-w-md mx-auto leading-relaxed mb-6">
        {copy.body}
      </p>

      {/* Skill Radar teaser — the six axis chips arranged in a
          hex-ish row. Not the full radar (kept small so the slide
          doesn't feel overloaded) but enough that the user recognises
          the axes when they see the real radar on the dashboard next. */}
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto">
        {SKILL_AXES.map((axis) => {
          const Icon = axis.Icon;
          return (
            <div
              key={axis.id}
              className="flex flex-col items-center gap-1 rounded-xl bg-white/[0.03] border border-white/10 py-2.5 px-1"
            >
              <Icon className="w-4 h-4 text-accent-300/80" />
              <p className="text-[10px] font-bold text-white/70 text-center leading-tight">
                {skillAxisLabel(axis.id, lang, "short")}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

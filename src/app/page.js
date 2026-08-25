// src/app/page.js
//
// Root landing — fieldtalkenglish.com.
//
// Front door for organic / search / direct traffic that doesn't
// arrive via a partner branch link (those go to /wc2026?branch=<slug>).
//
// Post-WC layout: two-edition chooser. Pro Path 26/27 is the primary
// (evergreen, ongoing business focus, lime identity); WC2026 is the
// secondary (legacy, still accessible until Aug 31 2026, emerald +
// gold identity preserved). Each card routes to its dedicated
// landing page (/propath or /wc2026) where the full edition
// experience begins.
//
// Signed-in users see their current edition's card highlighted with
// a "Continue" CTA that skips straight to /lesson — the front door
// gets out of their way.
//
// This page is deliberately calm — one hero, two clearly labelled
// choices, no upsell chrome. If we ever add more editions, they slot
// in as additional cards; the two-card layout becomes a small grid.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Target } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePlayerProfile } from "@/lib/hooks/usePlayerData";
import { useLanguage } from "@/lib/contexts/LanguageContext";

const COPY = {
  en: {
    heroTitle: "FieldTalk English",
    heroTagline: "The football English you'll actually use.",
    chooseHeading: "Choose your edition",
    continue: "Continue",
    yourEdition: "Your edition",
    langLabel: "EN",
    propath: {
      eyebrow: "The season's edition",
      title: "Pro Path 26/27",
      tagline:
        "Dressing room, coach, agent, media — the English every serious player needs.",
      cta: "Explore Pro Path",
    },
    wc2026: {
      eyebrow: "Legacy edition",
      title: "World Cup 2026",
      tagline:
        "Match-day English through the tournament that made the world watch. Still available.",
      cta: "Explore WC2026",
    },
  },
  pt: {
    heroTitle: "FieldTalk English",
    heroTagline: "O inglês do futebol que você vai usar de verdade.",
    chooseHeading: "Escolha sua edição",
    continue: "Continuar",
    yourEdition: "Sua edição",
    langLabel: "PT",
    propath: {
      eyebrow: "A edição da temporada",
      title: "Pro Path 26/27",
      tagline:
        "Vestiário, técnico, empresário, imprensa — o inglês que todo jogador sério precisa.",
      cta: "Conhecer o Pro Path",
    },
    wc2026: {
      eyebrow: "Edição legado",
      title: "Copa do Mundo 2026",
      tagline:
        "O inglês dos gramados na Copa que fez o mundo assistir. Ainda disponível.",
      cta: "Conhecer a WC2026",
    },
  },
};

// Two lightweight stripe motifs — one per edition — so each card
// gets its own visual DNA at a glance. Pro Path leans lime + slate
// (matches /propath); WC keeps the multi-nation flag palette.
const PROPATH_STRIPE = [
  "#a3e635", // lime
  "#bef264", // pale lime
  "#84cc16", // lime-500
  "#94a3b8", // slate-400
];
// const WC_STRIPE = [
//   "#009C3B", // Brazil green
//   "#FFDF00", // Brazil yellow
//   "#FFFFFF",
//   "#CE1126",
//   "#0055A4",
//   "#75AADB",
// ];

export default function RootLandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile } = usePlayerProfile(user?.id);
  const { lang, setLang } = useLanguage();
  const copy = COPY[lang] || COPY.en;

  // Defer entrance animations until mount so the first paint doesn't
  // catch mid-frame. Matches the /propath and /wc2026 pattern.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // If the caller is signed in, "Continue" routes them straight into
  // the app. Otherwise both cards behave the same (go to that
  // edition's landing → its Enter button → /join with edition tag).
  const goDirectly = () => router.push("/lesson");

  const userEdition = profile?.edition || null;
  const isSignedIn = !!user;

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden flex flex-col">
      {/* Ambient glows — lime for the primary Pro Path card side,
          a hint of emerald for the WC card side, so the palette
          reads as "the two editions co-existing" rather than either
          one owning the whole page. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-15%] left-[-15%] w-[70vw] h-[70vw] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, rgba(163,230,53,0.18), rgba(163,230,53,0) 70%)",
            animation: "rl-glow-pulse 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.12), rgba(16,185,129,0) 70%)",
            animation: "rl-glow-pulse 11s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0) 30%, rgba(0,0,0,0.5) 100%)",
          }}
        />
      </div>

      {/* Language toggle — top-right, floating so it doesn't take
          vertical real estate away from the hero. */}
      <div className="absolute top-4 right-4 z-20 flex gap-1 text-[10px] sm:text-xs">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            lang === "en"
              ? "bg-accent-400 text-primary-900"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang("pt")}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            lang === "pt"
              ? "bg-accent-400 text-primary-900"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          PT
        </button>
      </div>

      {/* Hero — brand mark + tagline. Compact so both cards sit
          above the fold on a laptop. */}
      <header className="relative z-10 pt-16 sm:pt-20 px-6 text-center">
        <h1
          className={`font-black tracking-tight leading-[0.95] opacity-0 ${
            mounted ? "rl-rise" : ""
          }`}
          style={{
            animationDelay: "150ms",
            fontSize: "clamp(2.25rem, 8vw, 4.5rem)",
          }}
        >
          {copy.heroTitle}
        </h1>
        <p
          className={`mt-3 text-sm sm:text-base text-white/60 max-w-lg mx-auto leading-relaxed opacity-0 ${
            mounted ? "rl-fade-in" : ""
          }`}
          style={{ animationDelay: "450ms" }}
        >
          {copy.heroTagline}
        </p>
      </header>

      {/* Edition chooser */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
        <p
          className={`text-[10px] uppercase tracking-[0.3em] text-white/40 font-bold mb-4 sm:mb-6 opacity-0 ${
            mounted ? "rl-fade-in" : ""
          }`}
          style={{ animationDelay: "700ms" }}
        >
          {copy.chooseHeading}
        </p>

        <div className="w-full max-w-xl grid grid-cols-1 md:grid-cols-1 gap-4 sm:gap-6">
          {/* Pro Path — primary card. Accent lime border + glow so
              it visually leads. */}
          <EditionCard
            variant="propath"
            eyebrow={copy.propath.eyebrow}
            title={copy.propath.title}
            tagline={copy.propath.tagline}
            cta={copy.propath.cta}
            stripe={PROPATH_STRIPE}
            Icon={Target}
            href="/propath"
            highlighted={isSignedIn ? userEdition === "propath_26_27" : true}
            userLabel={copy.yourEdition}
            continueLabel={copy.continue}
            showContinue={isSignedIn && userEdition === "propath_26_27"}
            onContinue={goDirectly}
            mounted={mounted}
            animationDelay="950ms"
          />

          {/* WC2026 — secondary card. Emerald + gold DNA preserved
              from the tournament identity. Reads as "still here"
              rather than "not chosen". */}
          {/* <EditionCard
            variant="wc"
            eyebrow={copy.wc2026.eyebrow}
            title={copy.wc2026.title}
            tagline={copy.wc2026.tagline}
            cta={copy.wc2026.cta}
            stripe={WC_STRIPE}
            Icon={Trophy}
            href="/wc2026"
            highlighted={isSignedIn && userEdition === "wc2026"}
            userLabel={copy.yourEdition}
            continueLabel={copy.continue}
            showContinue={isSignedIn && userEdition === "wc2026"}
            onContinue={goDirectly}
            mounted={mounted}
            animationDelay="1150ms"
          /> */}
        </div>
      </main>

      {/* Minimal footer — no chrome, just © line. Keeps the page
          calm and directs the eye to the two cards. */}
      <footer className="relative z-10 pb-6 sm:pb-8 text-center text-[11px] text-white/30">
        © 2026 FieldTalk English
      </footer>

      <style jsx global>{`
        @keyframes rl-rise {
          0% {
            opacity: 0;
            transform: translateY(24px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes rl-fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes rl-stripe {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }
          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }
        @keyframes rl-glow-pulse {
          0%,
          100% {
            opacity: 0.65;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.08);
          }
        }
        .rl-rise {
          animation: rl-rise 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .rl-fade-in {
          animation: rl-fade-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .rl-stripe {
          animation: rl-stripe 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: left center;
        }
      `}</style>
    </div>
  );
}

// Edition card — dark glassy panel with an edition-specific colour
// stripe at the top. Two variants:
//   variant="propath" → lime border + subtle lime glow when highlighted
//   variant="wc"      → emerald border + subtle amber glow when highlighted
//
// `highlighted` is a strong visual cue for "this is you / this is the
// primary one". Signed-out users see Pro Path highlighted (the
// ongoing edition); signed-in users see whichever edition matches
// their profile.
function EditionCard({
  variant,
  eyebrow,
  title,
  tagline,
  cta,
  stripe,
  Icon,
  href,
  highlighted,
  userLabel,
  continueLabel,
  showContinue,
  onContinue,
  mounted,
  animationDelay,
}) {
  const isPropath = variant === "propath";
  const borderClass = highlighted
    ? isPropath
      ? "border-accent-400/60 shadow-[0_0_40px_rgba(163,230,53,0.15)]"
      : "border-emerald-400/60 shadow-[0_0_40px_rgba(16,185,129,0.12)]"
    : "border-white/10 hover:border-white/25";
  const iconBg = isPropath
    ? "bg-accent-400/15 text-accent-300"
    : "bg-emerald-500/15 text-emerald-300";
  const ctaClass = isPropath
    ? "bg-accent-400 hover:bg-accent-300 text-primary-900"
    : "bg-emerald-500 hover:bg-emerald-400 text-[#062013]";

  return (
    <div
      className={`relative rounded-3xl bg-white/[0.04] backdrop-blur-sm border ${borderClass} transition-colors overflow-hidden opacity-0 ${
        mounted ? "rl-rise" : ""
      }`}
      style={{ animationDelay }}
    >
      {/* Top stripe — visual DNA per edition. Slides in on mount. */}
      <div
        className={`flex h-1.5 w-full overflow-hidden opacity-0 ${
          mounted ? "rl-stripe" : ""
        }`}
        style={{ animationDelay }}
      >
        {stripe.map((color, i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              backgroundColor: color,
              boxShadow: `inset 0 0 6px ${color}`,
            }}
          />
        ))}
      </div>

      <div className="p-5 sm:p-7">
        {highlighted && userLabel && (
          <p className="text-[10px] uppercase tracking-[0.25em] text-white/45 font-bold mb-2">
            {userLabel}
          </p>
        )}
        <div className="flex items-start gap-3 mb-3">
          <div
            className={`shrink-0 w-11 h-11 rounded-2xl flex items-center justify-center ${iconBg}`}
          >
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p
              className={`text-[10px] uppercase tracking-[0.25em] font-bold ${
                isPropath ? "text-accent-300/80" : "text-emerald-300/80"
              }`}
            >
              {eyebrow}
            </p>
            <h2 className="text-lg sm:text-xl font-black tracking-tight mt-0.5">
              {title}
            </h2>
          </div>
        </div>

        <p className="text-sm text-white/70 leading-relaxed mb-5">{tagline}</p>

        <div className="flex flex-col sm:flex-row gap-2">
          <Link
            href={href}
            className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full font-bold text-sm tracking-wide transition-colors ${ctaClass}`}
          >
            {cta}
            <ArrowRight className="w-4 h-4" />
          </Link>
          {showContinue && (
            <button
              type="button"
              onClick={onContinue}
              className={`inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full font-bold text-sm tracking-wide border border-white/20 hover:border-white/40 text-white bg-white/[0.03] hover:bg-white/[0.08] transition-colors`}
            >
              {continueLabel}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// src/app/page.js
//
// Root landing — the front door for globalplayer.app.
//
// Layout (2026-09):
//   [ambient lime wash — atmospheric only]
//   [lang toggle — floating top-right]
//   [Hero]
//     - Global Player crest, Sweep sting (DS-approved landing sting)
//     - GLOBAL PLAYER wordmark, gp-word letter-space collapse
//     - Tagline, gp-fade
//   [Signature accent line — the lime/slate stripe from the old
//    Pro Path card, promoted to a page-level flourish; slides in
//    with gp-sweep after the hero settles]
//   [Single CTA — routes based on auth state:
//     logged-in  → "Enter" / "Entrar"  → /dashboard
//     logged-out → "Start" / "Começar" → /join]
//   [© footer]
//
// The two-edition chooser (Pro Path + WC2026 cards) was retired
// 2026-09. The old /propath step added a click without adding
// value now that "Pro Path" is the only edition. New / returning
// players go straight from here into the product.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useLanguage } from "@/lib/contexts/LanguageContext";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";

const COPY = {
  en: {
    wordmark: "GLOBAL PLAYER",
    heroTagline: "The football English you'll actually use.",
    startCta: "Start",
    enterCta: "Enter",
  },
  pt: {
    wordmark: "GLOBAL PLAYER",
    heroTagline: "O inglês do futebol que você vai usar de verdade.",
    startCta: "Começar",
    enterCta: "Entrar",
  },
};

// The signature accent line — four shades from lime → pale lime →
// lime-500 → slate-400. Same palette that used to live on the top
// of the Pro Path card; promoted to a page-level flourish now that
// the card is gone. Kept in a constant so we can tune the ratio /
// swap in richer palettes without hunting through JSX.
const ACCENT_STRIPE = [
  "#a3e635", // accent-400
  "#bef264", // accent-300
  "#84cc16", // accent-500
  "#94a3b8", // primary-400 (slate)
];

export default function RootLandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { lang, setLang } = useLanguage();
  const copy = COPY[lang] || COPY.en;

  // Defer entrance animations until mount so the first paint doesn't
  // catch mid-frame.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Route the single CTA based on auth state — a signed-in player
  // goes straight to their dashboard; a new visitor goes to /join.
  const isSignedIn = !!user;
  const ctaHref = isSignedIn ? "/dashboard" : "/join";
  const ctaLabel = isSignedIn ? copy.enterCta : copy.startCta;
  const goDirectly = () => router.push(ctaHref);

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden flex flex-col">
      {/* Ambient glows — a single lime wash on the top-left with a
          slate counter-wash bottom-right. Reads as "brand lime is
          the star here." */}
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
              "radial-gradient(circle at center, rgba(148,163,184,0.10), rgba(148,163,184,0) 70%)",
            animation: "rl-glow-pulse 11s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(2,6,23,0) 30%, rgba(2,6,23,0.5) 100%)",
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
              : "bg-primary-800 text-primary-400 hover:text-primary-100"
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
              : "bg-primary-800 text-primary-400 hover:text-primary-100"
          }`}
        >
          PT
        </button>
      </div>

      {/* Hero — animated crest + wordmark + tagline. The Global
          Player mark uses the DS "Sweep" sting (bars slide in from
          the left with a 90ms stagger + slight overshoot); the
          wordmark below uses "Word" (letter-space collapse). Under
          prefers-reduced-motion, both fall back to a 200ms fade
          (declared in globals.css). */}
      <header className="relative z-10 pt-14 sm:pt-20 px-6 text-center flex flex-col items-center">
        {mounted && (
          <div className="mb-5 sm:mb-6">
            <GlobalPlayerLogo
              variant="crest"
              tone="tonalDark"
              size={96}
              sting="sweep"
            />
          </div>
        )}
        <h1
          className={`font-display font-black tracking-wordmark leading-none uppercase opacity-0 ${
            mounted ? "animate-gp-word" : ""
          }`}
          style={{
            animationDelay: "540ms",
            fontSize: "clamp(1.75rem, 6vw, 3.25rem)",
          }}
        >
          {copy.wordmark}
        </h1>
        <p
          className={`mt-4 text-sm sm:text-base text-primary-300 max-w-lg leading-relaxed opacity-0 ${
            mounted ? "animate-gp-fade" : ""
          }`}
          style={{ animationDelay: "820ms" }}
        >
          {copy.heroTagline}
        </p>
      </header>

      {/* Signature accent stripe — the lime/slate motif that used
          to top the Pro Path card, now a page-level flourish. Slides
          in with gp-sweep once the hero has settled so the two
          stings don't compete. `origin-left` keeps the overshoot
          reading as "line drawing itself in from the left". */}
      <div className="relative z-10 mt-8 sm:mt-10 w-full max-w-xl mx-auto px-6">
        <div
          className={`flex h-2 w-full overflow-hidden rounded-full opacity-0 ${
            mounted ? "animate-gp-sweep" : ""
          }`}
          style={{ animationDelay: "1000ms", transformOrigin: "left center" }}
        >
          {ACCENT_STRIPE.map((color, i) => (
            <div
              key={i}
              className="flex-1"
              style={{
                backgroundColor: color,
                boxShadow: `inset 0 0 8px ${color}`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Single CTA — Start (logged-out) or Enter (logged-in).
          Routes straight to /join or /dashboard so the front door
          gets out of the player's way. */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-10 sm:py-14">
        <button
          type="button"
          onClick={goDirectly}
          className={`group inline-flex items-center gap-2 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 font-display font-black uppercase tracking-button px-8 py-3.5 text-base sm:text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900 opacity-0 ${
            mounted ? "animate-gp-rise" : ""
          }`}
          style={{ animationDelay: "1300ms" }}
        >
          {ctaLabel}
          <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
        </button>
        {/* Signed-out helper line — small nudge so newcomers know
            what "Start" actually starts. Signed-in users don't need
            this. */}
        {!isSignedIn && (
          <Link
            href="/signin"
            className={`mt-5 text-xs text-primary-400 hover:text-primary-100 transition-colors opacity-0 ${
              mounted ? "animate-gp-fade" : ""
            }`}
            style={{ animationDelay: "1500ms" }}
          >
            {lang === "pt" ? "Já tem uma conta? Entrar" : "Already have an account? Sign in"}
          </Link>
        )}
      </main>

      {/* Minimal footer — no chrome, just © line. Keeps the page
          calm and directs the eye to the two cards. */}
      <footer className="relative z-10 pb-6 sm:pb-8 text-center text-[11px] text-primary-500">
        © 2026 Global Player
      </footer>

      <style jsx global>{`
        /* Slow ambient glow pulse for the corner washes — the one
           bespoke keyframe left after the rewrite. Everything else
           (hero entrance, wordmark, stripe, CTA) uses the shared
           gp-* motion tokens from tailwind.config. */
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
      `}</style>
    </div>
  );
}


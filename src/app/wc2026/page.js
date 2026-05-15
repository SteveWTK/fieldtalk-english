// src/app/wc2026/page.js
// World Cup 2026 Edition landing page.
//
// Bespoke, full-bleed dark-mode entry surface. Marketing material sends users
// here; logged-in users tap "Enter" and go straight to the lesson list,
// guests are routed to signup with an edition flag preserved on the URL so
// their player row can later be tagged with edition = 'wc2026'.
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { getBranch } from "@/lib/branches";

// Colour strip inspired by the marketing artwork — drawn from flags of
// historically significant World Cup nations. Pure decoration, not a flag set.
const STRIPE_COLORS = [
  "#009C3B", // Brazil green
  "#FFDF00", // Brazil yellow
  "#FFFFFF", // White (Argentina, France, England)
  "#CE1126", // Red (Spain, Canada, Mexico)
  "#0055A4", // French blue
  "#FFCD00", // Sweden / Brazil tone
  "#1A1A1A", // Near-black
  "#75AADB", // Argentina sky blue
];

function WorldCup2026LandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchKey = searchParams.get("branch");
  const branch = getBranch(branchKey);
  const { user } = useAuth();
  const { t } = useTranslation();
  // We delay applying the entrance animations until the component has mounted
  // on the client so the user doesn't catch the page mid-animation on slow
  // first-paint, and so server-rendered HTML doesn't include the keyframe
  // state in a way that flashes.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEnter = () => {
    if (user) {
      router.push("/lesson");
    } else {
      // Streamlined fan-edition signup (Google + email only), edition tag
      // flows through on the URL. Preserve the branch param so /join shows
      // the same branded logo.
      const joinUrl = branchKey
        ? `/join?edition=wc2026&branch=${encodeURIComponent(branchKey)}`
        : "/join?edition=wc2026";
      router.push(joinUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden flex flex-col">
      {/* Ambient background — two slow-pulsing radial glows. */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[70vw] h-[70vw] rounded-full blur-3xl bg-glow-green" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl bg-glow-gold" />
        {/* Subtle vignette to focus attention center */}
        <div className="absolute inset-0 bg-radial-vignette" />
      </div>

      {/* Top: Cultura Inglesa logo + "presents" line */}
      <header className="relative z-10 pt-12 sm:pt-14 px-6 flex flex-col items-center gap-4">
        <div
          className={`opacity-0 ${mounted ? "wc-fade-down" : ""}`}
          style={{ animationDelay: "100ms" }}
        >
          <Image
            src={branch.logoSrc}
            alt={branch.alt}
            width={180}
            height={64}
            priority
            className="h-14 sm:h-16 w-auto opacity-90"
          />
        </div>
        <p
          className={`text-xs sm:text-sm tracking-[0.35em] text-white/50 italic uppercase opacity-0 ${
            mounted ? "wc-fade-in" : ""
          }`}
          style={{ animationDelay: "450ms" }}
        >
          {t("wc_presents")}
        </p>
      </header>

      {/* Middle: main title + colour stripe */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1
          className={`font-black tracking-tight leading-[0.95] opacity-0 ${
            mounted ? "wc-rise" : ""
          }`}
          style={{
            animationDelay: "750ms",
            fontSize: "clamp(2.5rem, 12vw, 6rem)",
          }}
        >
          FieldTalk English
        </h1>

        <div
          className={`mt-4 opacity-0 ${mounted ? "wc-rise" : ""}`}
          style={{ animationDelay: "1050ms" }}
        >
          <p className="text-lg sm:text-2xl md:text-3xl font-light tracking-wide">
            <span className="bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400 bg-clip-text text-transparent">
              {t("wc_subtitle")}
            </span>
          </p>
        </div>

        {/* Colour stripe — slides in horizontally, then individual segments
            settle. Each segment has its own glow that gives a subtle neon feel
            against the dark backdrop. */}
        <div
          className={`mt-12 sm:mt-16 flex h-[10px] sm:h-3 w-[80%] max-w-md rounded-full overflow-hidden opacity-0 ${
            mounted ? "wc-stripe" : ""
          }`}
          style={{ animationDelay: "1350ms" }}
        >
          {STRIPE_COLORS.map((color, i) => (
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
      </main>

      {/* Bottom: single CTA */}
      <footer className="relative z-10 pb-16 sm:pb-20 flex justify-center px-6">
        <button
          onClick={handleEnter}
          className={`group relative px-14 py-4 rounded-full font-bold tracking-[0.15em] uppercase text-base sm:text-lg text-[#070707] bg-white hover:scale-[1.03] active:scale-[0.98] transition-transform duration-300 opacity-0 ${
            mounted ? "wc-rise" : ""
          }`}
          style={{ animationDelay: "1600ms" }}
        >
          <span className="relative z-10">{t("wc_cta_enter")}</span>
          {/* Glow ring on hover */}
          <span className="absolute inset-0 rounded-full ring-2 ring-white/30 group-hover:ring-emerald-300/60 wc-pulse-ring" />
        </button>
      </footer>

      {/* All animations live here so the page is self-contained. */}
      <style jsx global>{`
        /* Background glows */
        .bg-glow-green {
          background: radial-gradient(
            circle at center,
            rgba(16, 185, 129, 0.22),
            rgba(16, 185, 129, 0) 70%
          );
          animation: wc-glow-pulse 9s ease-in-out infinite;
        }
        .bg-glow-gold {
          background: radial-gradient(
            circle at center,
            rgba(234, 179, 8, 0.15),
            rgba(234, 179, 8, 0) 70%
          );
          animation: wc-glow-pulse 11s ease-in-out infinite reverse;
        }
        .bg-radial-vignette {
          background: radial-gradient(
            ellipse at center,
            rgba(0, 0, 0, 0) 30%,
            rgba(0, 0, 0, 0.5) 100%
          );
        }

        /* Entrance animations */
        @keyframes wc-fade-down {
          0% {
            opacity: 0;
            transform: translateY(-14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes wc-fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes wc-rise {
          0% {
            opacity: 0;
            transform: translateY(24px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes wc-stripe {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }
          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }
        .wc-fade-down {
          animation: wc-fade-down 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .wc-fade-in {
          animation: wc-fade-in 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .wc-rise {
          animation: wc-rise 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .wc-stripe {
          animation: wc-stripe 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: left center;
        }

        /* Ambient + idle animations */
        @keyframes wc-glow-pulse {
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
        @keyframes wc-pulse-ring {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(255, 255, 255, 0.05);
          }
        }
        .wc-pulse-ring {
          animation: wc-pulse-ring 2.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function WorldCup2026Landing() {
  // useSearchParams must live under a Suspense boundary for static rendering.
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#070707]" aria-hidden />}
    >
      <WorldCup2026LandingContent />
    </Suspense>
  );
}

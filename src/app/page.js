// src/app/page.js
//
// Root landing — fieldtalkenglish.com.
//
// A stripped-down sibling of the partner-branded /wc2026 page:
// same dark theme, ambient glows and stripe motif, but no Cultura
// Inglesa logo and no "presents" line — this URL is the generic
// front door for organic / search / direct traffic that doesn't
// arrive via a partner branch link.
//
// English by default. Cultura branches and other partners use
// /wc2026?branch=<slug> which renders the Portuguese-leaning
// branded version. When we add more editions post-WC2026 this
// page will evolve into an edition picker; for the next two months
// it's a single CTA into the WC2026 funnel.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

// Same stripe-colour set as /wc2026 — colours drawn from WC-relevant
// nations' flags. Pure decoration, not a flag set.
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

export default function RootLandingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleEnter = () => {
    if (user) {
      router.push("/lesson");
    } else {
      // Send to the streamlined fan-edition signup with the WC2026
      // tag pre-applied so the players row is created in the right
      // edition from minute zero. No branch slug — that's reserved
      // for the partner-branded /wc2026?branch=<slug> URLs.
      router.push("/join?edition=wc2026");
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden flex flex-col">
      {/* Ambient glows — emerald + amber, slow pulse. Same vocabulary
          as /wc2026 and /pricing so the funnel feels continuous. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-15%] left-[-15%] w-[70vw] h-[70vw] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.22), rgba(16,185,129,0) 70%)",
            animation: "rl-glow-pulse 9s ease-in-out infinite",
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, rgba(234,179,8,0.15), rgba(234,179,8,0) 70%)",
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

      {/* Centre: brand mark + edition + stripe + CTA. No partner
          logo, no "presents" line. */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1
          className={`font-black tracking-tight leading-[0.95] opacity-0 ${
            mounted ? "rl-rise" : ""
          }`}
          style={{
            animationDelay: "200ms",
            fontSize: "clamp(2.5rem, 12vw, 6rem)",
          }}
        >
          FieldTalk English
        </h1>

        <div
          className={`mt-4 opacity-0 ${mounted ? "rl-rise" : ""}`}
          style={{ animationDelay: "500ms" }}
        >
          <p className="text-lg sm:text-2xl md:text-3xl font-light tracking-wide">
            <span className="bg-gradient-to-r from-emerald-400 via-yellow-300 to-emerald-400 bg-clip-text text-transparent">
              World Cup 2026 Edition
            </span>
          </p>
        </div>

        {/* Colour stripe */}
        <div
          className={`mt-12 sm:mt-16 flex h-[10px] sm:h-3 w-[80%] max-w-md rounded-full overflow-hidden opacity-0 ${
            mounted ? "rl-stripe" : ""
          }`}
          style={{ animationDelay: "800ms" }}
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

        {/* Tagline — short, English. The branded /wc2026 page uses a
            longer Portuguese intro for Brazilian audiences; here we
            keep it punchy and edition-neutral. */}
        <p
          className={`mt-10 max-w-md text-sm sm:text-base text-white/65 leading-relaxed opacity-0 ${
            mounted ? "rl-rise" : ""
          }`}
          style={{ animationDelay: "1050ms" }}
        >
          Learn English through the World Cup — vocabulary, predictions,
          sticker packs, and a squad to build.
        </p>
      </main>

      {/* CTA — bottom, single button, mirrors /wc2026's style. */}
      <footer className="relative z-10 pb-16 sm:pb-20 flex justify-center px-6">
        <button
          onClick={handleEnter}
          className={`group relative px-14 py-4 rounded-full font-bold tracking-[0.15em] uppercase text-base sm:text-lg text-[#070707] bg-white hover:scale-[1.03] active:scale-[0.98] transition-transform duration-300 opacity-0 ${
            mounted ? "rl-rise" : ""
          }`}
          style={{ animationDelay: "1300ms" }}
        >
          <span className="relative z-10">Enter</span>
          <span className="absolute inset-0 rounded-full ring-2 ring-white/30 group-hover:ring-emerald-300/60 rl-pulse-ring" />
        </button>
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
        @keyframes rl-pulse-ring {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(255, 255, 255, 0.05);
          }
        }
        .rl-rise {
          animation: rl-rise 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .rl-stripe {
          animation: rl-stripe 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: left center;
        }
        .rl-pulse-ring {
          animation: rl-pulse-ring 2.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

// src/app/propath/page.js
//
// FieldTalk Pro Path 26/27 landing page. Marketing sends players
// (and academies/clubs interested in trials) here. Signed-in users
// tap "Enter" and go straight to /lesson; guests get routed to
// /join with edition=propath_26_27 pre-applied so their player row
// is tagged on signup.
//
// Visual language sibling to /wc2026:
//   - Same dark base (#070707) + ambient glows so both editions
//     feel like the same brand.
//   - Different accent story: WC leans multi-nation stripe + gold;
//     Pro Path leans single cool-white/emerald "floodlight" bar
//     with a subtle cyan touch (evocative of tunnel + pitch lighting,
//     not fanfare).
//   - Tagline emphasises real-world utility, not gamification.
//
// Partner-branch flow (?branch=<slug>) reuses the same infrastructure
// as WC2026 so an academy can co-brand its own Pro Path landing.
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { getBranch } from "@/lib/branches";
import { rememberPartnerReferrer } from "@/lib/partners/referrer";

// Single accent bar rather than a multi-nation stripe — a horizontal
// "floodlight" sweeping across the page. Two-stop gradient keeps the
// visual identity distinct from WC2026's flags-inspired multi-colour.
const ACCENT_BAR_GRADIENT =
  "linear-gradient(90deg, #34d399 0%, #a7f3d0 50%, #67e8f9 100%)";

function ProPathLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchKey = searchParams.get("branch");
  const branch = getBranch(branchKey);
  const { user } = useAuth();
  const { t } = useTranslation();

  // Defer entrance animations until mount so first-paint doesn't
  // catch mid-frame. Matches the /wc2026 pattern.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Persist branch slug so it survives Google-OAuth redirect + email
  // signup. Same pattern as /wc2026.
  useEffect(() => {
    if (branchKey) rememberPartnerReferrer(branchKey);
  }, [branchKey]);

  const handleEnter = () => {
    if (user) {
      router.push("/lesson");
    } else {
      // Route to the streamlined signup with the Pro Path edition tag
      // pre-applied. Preserve branch so /join renders the partner
      // logo. Edition slug matches editions.js EDITIONS key.
      const joinUrl = branchKey
        ? `/join?edition=propath_26_27&branch=${encodeURIComponent(branchKey)}`
        : "/join?edition=propath_26_27";
      router.push(joinUrl);
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden flex flex-col">
      {/* Ambient background — two slow radial glows in cooler tones
          than /wc2026 to signal "athletic / clinical" rather than
          "tournament / celebratory". */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[70vw] h-[70vw] rounded-full blur-3xl bg-pp-glow-emerald" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl bg-pp-glow-cyan" />
        <div className="absolute inset-0 bg-pp-vignette" />
      </div>

      {/* Top: partner logo (co-branded academy variant if branch is
          set) + "presents" eyebrow */}
      <header className="relative z-10 pt-12 sm:pt-14 px-6 flex flex-col items-center gap-4">
        <div
          className={`opacity-0 ${mounted ? "pp-fade-down" : ""}`}
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
            mounted ? "pp-fade-in" : ""
          }`}
          style={{ animationDelay: "450ms" }}
        >
          {t("propath_eyebrow")}
        </p>
      </header>

      {/* Middle: main title + tagline + accent bar */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <h1
          className={`font-black tracking-tight leading-[0.95] opacity-0 ${
            mounted ? "pp-rise" : ""
          }`}
          style={{
            animationDelay: "750ms",
            fontSize: "clamp(2.5rem, 12vw, 6rem)",
          }}
        >
          FieldTalk English
        </h1>

        <div
          className={`mt-4 opacity-0 ${mounted ? "pp-rise" : ""}`}
          style={{ animationDelay: "1050ms" }}
        >
          <p className="text-lg sm:text-2xl md:text-3xl font-light tracking-wide">
            <span className="bg-gradient-to-r from-emerald-300 via-emerald-200 to-cyan-300 bg-clip-text text-transparent">
              {t("propath_subtitle")}
            </span>
          </p>
        </div>

        {/* Tagline — one line, restrained. This is the real product
            positioning; sits between the edition name and the CTA. */}
        <p
          className={`mt-6 max-w-lg text-sm sm:text-base text-white/60 leading-relaxed opacity-0 ${
            mounted ? "pp-fade-in" : ""
          }`}
          style={{ animationDelay: "1250ms" }}
        >
          {t("propath_tagline")}
        </p>

        {/* Accent bar — single sweep of light rather than a nation
            stripe. Matches the "floodlight" identity we picked. */}
        <div
          className={`mt-12 sm:mt-16 h-[6px] sm:h-2 w-[80%] max-w-md rounded-full opacity-0 ${
            mounted ? "pp-stripe" : ""
          }`}
          style={{
            animationDelay: "1450ms",
            background: ACCENT_BAR_GRADIENT,
            boxShadow: "0 0 24px rgba(52, 211, 153, 0.35)",
          }}
        />
      </main>

      {/* Bottom: single CTA. Logged-in users skip to /lesson; guests
          land in /join with edition pre-applied. */}
      <footer className="relative z-10 pb-16 sm:pb-20 flex justify-center px-6">
        <button
          onClick={handleEnter}
          className={`group relative px-14 py-4 rounded-full font-bold tracking-[0.15em] uppercase text-base sm:text-lg text-[#070707] bg-white hover:scale-[1.03] active:scale-[0.98] transition-transform duration-300 opacity-0 ${
            mounted ? "pp-rise" : ""
          }`}
          style={{ animationDelay: "1700ms" }}
        >
          <span className="relative z-10">
            {user ? t("propath_cta_enter") : t("propath_cta_start")}
          </span>
          <span className="absolute inset-0 rounded-full ring-2 ring-white/30 group-hover:ring-emerald-300/60 pp-pulse-ring" />
        </button>
      </footer>

      {/* All animations self-contained — pp- prefix keeps them from
          colliding with the wc- animations on /wc2026 if a user
          navigates directly from one to the other via link. */}
      <style jsx global>{`
        .bg-pp-glow-emerald {
          background: radial-gradient(
            circle at center,
            rgba(16, 185, 129, 0.22),
            rgba(16, 185, 129, 0) 70%
          );
          animation: pp-glow-pulse 9s ease-in-out infinite;
        }
        .bg-pp-glow-cyan {
          background: radial-gradient(
            circle at center,
            rgba(103, 232, 249, 0.14),
            rgba(103, 232, 249, 0) 70%
          );
          animation: pp-glow-pulse 11s ease-in-out infinite reverse;
        }
        .bg-pp-vignette {
          background: radial-gradient(
            ellipse at center,
            rgba(0, 0, 0, 0) 30%,
            rgba(0, 0, 0, 0.5) 100%
          );
        }

        @keyframes pp-fade-down {
          0% {
            opacity: 0;
            transform: translateY(-14px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pp-fade-in {
          0% {
            opacity: 0;
          }
          100% {
            opacity: 1;
          }
        }
        @keyframes pp-rise {
          0% {
            opacity: 0;
            transform: translateY(24px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pp-stripe {
          0% {
            opacity: 0;
            transform: scaleX(0);
          }
          100% {
            opacity: 1;
            transform: scaleX(1);
          }
        }
        .pp-fade-down {
          animation: pp-fade-down 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .pp-fade-in {
          animation: pp-fade-in 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .pp-rise {
          animation: pp-rise 1s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .pp-stripe {
          animation: pp-stripe 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          transform-origin: left center;
        }

        @keyframes pp-glow-pulse {
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
        @keyframes pp-pulse-ring {
          0%,
          100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
          50% {
            box-shadow: 0 0 0 10px rgba(255, 255, 255, 0.05);
          }
        }
        .pp-pulse-ring {
          animation: pp-pulse-ring 2.6s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default function ProPathLanding() {
  // useSearchParams must live under a Suspense boundary for static
  // rendering — same pattern as /wc2026.
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-[#070707]" aria-hidden />}
    >
      <ProPathLandingContent />
    </Suspense>
  );
}

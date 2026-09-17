// src/app/propath/page.js
//
// Global Player Pro Path 26/27 landing page. Marketing sends players
// (and academies/clubs interested in trials) here. Signed-in users
// tap "Enter" and go straight to /lesson; guests get routed to
// /join with edition=propath_26_27 pre-applied so their player row
// is tagged on signup.
//
// Visual language sibling to /wc2026:
//   - Same dark base (primary-900) + ambient lime wash so both editions
//     feel like the same brand.
//   - Different accent story: WC leans multi-nation stripe + gold;
//     Pro Path leans single lime "floodlight" bar (evocative of tunnel
//     + pitch lighting, not fanfare).
//   - Tagline emphasises real-world utility, not gamification.
//
// Partner-branch flow (?branch=<slug>) reuses the same infrastructure
// as WC2026 so an academy can co-brand its own Pro Path landing.
//
// The root `/` no longer routes here (streamlined 2026-09), but
// existing external links may still land users on this page, so the
// chrome must read as fully Global Player.
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { useTranslation } from "@/hooks/useTranslation";
import { getBranch } from "@/lib/branches";
import { rememberPartnerReferrer } from "@/lib/partners/referrer";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";
import { Button } from "@/components/ui/button";

// Single accent bar rather than a multi-nation stripe — a horizontal
// "floodlight" sweeping across the page. Two-stop gradient keeps the
// visual identity distinct from WC2026's flags-inspired multi-colour.
const ACCENT_BAR_GRADIENT =
  "linear-gradient(90deg, #a3e635 0%, #bef264 50%, #d9f99d 100%)";

// Umbrella-brand default for Pro Path landings without a branch
// override. WC2026 keeps the Cultura lion as its default; Pro Path
// defaults to Inspire Future (our parent business name) to underline
// that this edition is the Global Player product rather than a specific
// partner campaign. Academy / club logos still take over when a
// ?branch=<slug> is present via the shared BRANCHES registry.
const INSPIRE_FUTURE_LOGO = {
  logoSrc: "/logos/gp-open-tonal-dark-1000.png",
  alt: "Global Player",
};

function ProPathLandingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const branchKey = searchParams.get("branch");
  // When a branch slug is present we honour it (co-branded partner
  // landing). Otherwise we use the Inspire Future default rather than
  // falling through to the WC-era Cultura default from branches.js.
  const branch = branchKey ? getBranch(branchKey) : INSPIRE_FUTURE_LOGO;
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
    <div className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden flex flex-col">
      {/* Ambient lime wash — matches the root `/` treatment so a user
          landing here from an old external link reads the page as
          part of the same Global Player brand system. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-15%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(circle at center, rgba(163,230,53,0.12), rgba(163,230,53,0) 70%)",
          }}
        />
        <div className="absolute top-[-15%] left-[-15%] w-[70vw] h-[70vw] rounded-full blur-3xl bg-pp-glow-lime" />
        <div className="absolute bottom-[-20%] right-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl bg-pp-glow-slate" />
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
          className={`text-xs sm:text-sm tracking-[0.35em] text-primary-400 italic uppercase opacity-0 ${
            mounted ? "pp-fade-in" : ""
          }`}
          style={{ animationDelay: "450ms" }}
        >
          {t("propath_eyebrow")}
        </p>
      </header>

      {/* Middle: Global Player crest + main title + tagline + accent
          bar. Crest sits above the wordmark so the page reads as
          Global Player first, edition name second. */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        {mounted && (
          <div className="mb-6 sm:mb-8">
            <GlobalPlayerLogo
              variant="crest"
              tone="tonalDark"
              size={80}
              sting="sweep"
            />
          </div>
        )}

        <h1
          className={`font-display font-black tracking-tight leading-[0.95] text-primary-50 opacity-0 ${
            mounted ? "pp-rise" : ""
          }`}
          style={{
            animationDelay: "750ms",
            fontSize: "clamp(2.5rem, 12vw, 6rem)",
          }}
        >
          Global Player
        </h1>

        <div
          className={`mt-4 opacity-0 ${mounted ? "pp-rise" : ""}`}
          style={{ animationDelay: "1050ms" }}
        >
          <p className="text-lg sm:text-2xl md:text-3xl font-light tracking-wide">
            <span className="bg-gradient-to-r from-accent-300 via-accent-200 to-accent-100 bg-clip-text text-transparent">
              {t("propath_subtitle")}
            </span>
          </p>
        </div>

        {/* Tagline — one line, restrained. This is the real product
            positioning; sits between the edition name and the CTA. */}
        {/* <p
          className={`mt-6 max-w-lg text-sm sm:text-base text-primary-300 leading-relaxed opacity-0 ${
            mounted ? "pp-fade-in" : ""
          }`}
          style={{ animationDelay: "1250ms" }}
        >
          {t("propath_tagline")}
        </p> */}

        {/* Accent bar — single sweep of light rather than a nation
            stripe. Matches the "floodlight" identity we picked. */}
        <div
          className={`mt-12 sm:mt-16 h-[6px] sm:h-2 w-[80%] max-w-md rounded-full opacity-0 ${
            mounted ? "pp-stripe" : ""
          }`}
          style={{
            animationDelay: "1450ms",
            background: ACCENT_BAR_GRADIENT,
            // Lime glow matching accent-400 rgb so the bar reads as
            // one continuous piece of "floodlight" instead of a
            // painted stripe on the void.
            boxShadow: "0 0 24px rgba(163, 230, 53, 0.35)",
          }}
        />
      </main>

      {/* Bottom: single CTA. Logged-in users skip to /lesson; guests
          land in /join with edition pre-applied. */}
      <footer className="relative z-10 pb-16 sm:pb-20 flex justify-center px-6">
        <div
          className={`opacity-0 ${mounted ? "pp-rise" : ""}`}
          style={{ animationDelay: "1700ms" }}
        >
          <Button
            variant="primary"
            size="lg"
            onClick={handleEnter}
            Icon={ArrowRight}
          >
            {user ? t("propath_cta_enter") : t("propath_cta_start")}
          </Button>
        </div>
      </footer>

      {/* All animations self-contained — pp- prefix keeps them from
          colliding with the wc- animations on /wc2026 if a user
          navigates directly from one to the other via link. */}
      <style jsx global>{`
        /* Ambient glow palette — accent-400 (electric lime, rgb 163
           230 53) paired with primary-400 (sophisticated slate, rgb
           148 163 184). Matches the "contemporary high-tech" identity
           we picked in tailwind.config.js, distinct from WC2026's
           emerald + gold fanfare. */
        .bg-pp-glow-lime {
          background: radial-gradient(
            circle at center,
            rgba(163, 230, 53, 0.2),
            rgba(163, 230, 53, 0) 70%
          );
          animation: pp-glow-pulse 9s ease-in-out infinite;
        }
        .bg-pp-glow-slate {
          background: radial-gradient(
            circle at center,
            rgba(148, 163, 184, 0.16),
            rgba(148, 163, 184, 0) 70%
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
      `}</style>
    </div>
  );
}

export default function ProPathLanding() {
  // useSearchParams must live under a Suspense boundary for static
  // rendering — same pattern as /wc2026.
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-primary-900" aria-hidden />}
    >
      <ProPathLandingContent />
    </Suspense>
  );
}

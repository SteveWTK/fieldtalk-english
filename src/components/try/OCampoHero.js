// src/components/try/OCampoHero.js
//
// Animated brand hero for /o-campo. Ports the exact entrance sequence
// from the root landing (/) so a visitor sent between them feels one
// continuous surface:
//
//   t=0ms     — crest (sting="sweep", bars slide in from left)
//   t=540ms   — GLOBAL PLAYER wordmark (gp-word, letter-space collapse)
//   t=820ms   — tagline fade (gp-fade)
//   t=1000ms  — signature accent stripe (gp-sweep)
//
// Mount-gated so the first paint doesn't catch mid-frame — the sting
// stuttering we saw on /o-campo was the logo animating during the
// initial hydration pass; waiting until `mounted` fixes it the same
// way the root landing does.

"use client";

import { useEffect, useState } from "react";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";

const WORDMARK = "GLOBAL PLAYER";

// Same four-shade lime→slate stripe the root landing uses. Kept
// local rather than imported so this component is self-contained.
const ACCENT_STRIPE = [
  "#a3e635", // accent-400
  "#bef264", // accent-300
  "#84cc16", // accent-500
  "#94a3b8", // primary-400 (slate)
];

export default function OCampoHero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <>
      {/* Crest — only rendered after mount so hydration doesn't catch
          the sting mid-flight. */}
      <div className="mb-5 sm:mb-6">
        {mounted && (
          <GlobalPlayerLogo
            variant="crest"
            tone="tonalDark"
            size={96}
            sting="sweep"
          />
        )}
      </div>

      {/* Wordmark — letter-space collapse. Same timing + class as root. */}
      <h1
        className={`font-display font-black tracking-wordmark leading-none uppercase opacity-0 ${
          mounted ? "animate-gp-word" : ""
        }`}
        style={{
          animationDelay: "540ms",
          fontSize: "clamp(1.75rem, 6vw, 3.25rem)",
        }}
      >
        {WORDMARK}
      </h1>

      {/* Signature accent stripe — slides in last so it reads as a
          "and here we go" flourish rather than competing with the
          wordmark for the eye. */}
      <div className="mt-8 sm:mt-10 w-full max-w-xl mx-auto">
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
    </>
  );
}

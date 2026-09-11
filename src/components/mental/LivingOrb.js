// src/components/mental/LivingOrb.js
//
// The centerpiece of the meditation player — a large soft-glow orb
// that breathes in a 4-7-8 rhythm (inhale 4s → hold 7s → exhale 8s).
// Pure CSS animations + a couple of SVG filter tricks. No library,
// no framer-motion — the whole thing is ~5kb of styles.
//
// Uses:
//   - Two nested radial gradient layers with different animation
//     cadences produce the "shimmer inside the glow" effect.
//   - A blur filter on the outer div is what gives the halo. When
//     the div scales the halo scales WITH it, so the breathe feels
//     alive rather than merely animated.
//   - A slow hue-rotate + saturation dance keeps the palette
//     drifting through teal → deep blue → violet over ~30s.
//   - Twelve orbiting dots (pure keyframes, staggered) provide the
//     "particle drift" the meditation player subconsciously reads
//     as "something is alive inside this".
//
// A `phaseLabel` prop drives the small text overlay ("Breathe in",
// "Hold", "Breathe out") — the parent player computes the phase
// from a synced timer so mute users still get the guidance.

"use client";

import React from "react";

/**
 * @param {{
 *   size?: number,            // orb diameter in px at rest (default 260)
 *   phaseLabel?: string,      // overlay text ("Breathe in", etc.)
 *   subLabel?: string,        // smaller secondary text (e.g. "Feche os olhos…")
 *   paused?: boolean,         // freeze the breathe animation
 *   accent?: 'teal' | 'violet' | 'emerald' | 'amber' | 'slate',
 * }} props
 */
export default function LivingOrb({
  size = 260,
  phaseLabel,
  subLabel,
  paused = false,
  accent = "teal",
}) {
  const palette = ACCENT_PALETTES[accent] || ACCENT_PALETTES.teal;

  return (
    <div
      className="relative flex items-center justify-center"
      style={{
        width: size * 2,
        height: size * 2,
      }}
      aria-hidden="true"
    >
      {/* Twelve orbiting particles — soft dots that drift around the
          orb on a slow orbit. Placed OUTSIDE the .orb so they don't
          scale with the breathe. */}
      <div className="absolute inset-0 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i * 360) / 12;
          return (
            <span
              key={i}
              className="orb-particle"
              style={{
                "--i": i,
                "--angle": `${angle}deg`,
                "--orbit-r": `${size * 0.72}px`,
                background: palette.particle,
                animationPlayState: paused ? "paused" : "running",
              }}
            />
          );
        })}
      </div>

      {/* The orb itself. Two-layer gradient — the outer is a large
          radial glow (contributes the halo), the inner is a smaller
          shimmer that rotates + hue-shifts independently. */}
      <div
        className="orb"
        style={{
          width: size,
          height: size,
          background: palette.outer,
          animationPlayState: paused ? "paused" : "running",
        }}
      >
        <div
          className="orb-inner"
          style={{
            background: palette.inner,
            animationPlayState: paused ? "paused" : "running",
          }}
        />
        <div
          className="orb-highlight"
          style={{
            animationPlayState: paused ? "paused" : "running",
          }}
        />
      </div>

      {/* Phase labels — sit inside the orb visually, absolutely
          positioned so they don't inherit the scale. Keep it
          minimal — this is a meditation, not a UI dashboard. */}
      {(phaseLabel || subLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {phaseLabel && (
            <p className="text-2xl sm:text-3xl font-light tracking-wide text-white/95 drop-shadow-lg">
              {phaseLabel}
            </p>
          )}
          {subLabel && (
            <p className="mt-2 text-xs text-white/60 tracking-wide">
              {subLabel}
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        /* ── The orb — a soft-glow disk that breathes 4-7-8 ─── */
        .orb {
          position: absolute;
          border-radius: 9999px;
          filter: blur(8px);
          animation: breathe 19s ease-in-out infinite;
          box-shadow:
            0 0 60px 20px ${palette.glow1},
            0 0 120px 40px ${palette.glow2};
        }

        .orb-inner {
          position: absolute;
          inset: 15%;
          border-radius: 9999px;
          filter: blur(6px);
          animation: shimmer 8s ease-in-out infinite;
        }

        /* A small bright highlight — the "star" you catch inside the
           orb at certain angles. Rotates so it never sits still. */
        .orb-highlight {
          position: absolute;
          top: 20%;
          left: 25%;
          width: 25%;
          height: 25%;
          border-radius: 9999px;
          background: radial-gradient(
            circle at center,
            rgba(255, 255, 255, 0.9),
            rgba(255, 255, 255, 0) 60%
          );
          filter: blur(6px);
          animation: highlight-drift 14s ease-in-out infinite;
          opacity: 0.65;
        }

        /* ── 4-7-8 breathe cycle — 19s total, matches the numbers ── */
        @keyframes breathe {
          /* 0-21%   : inhale 4s → scale up */
          /* 21-58%  : hold 7s   → hold size */
          /* 58-100% : exhale 8s → scale down */
          0% { transform: scale(1); }
          21% { transform: scale(1.18); }
          58% { transform: scale(1.18); }
          100% { transform: scale(1); }
        }

        @keyframes shimmer {
          0%, 100% {
            transform: rotate(0deg) scale(1);
            opacity: 0.85;
          }
          50% {
            transform: rotate(180deg) scale(1.08);
            opacity: 1;
          }
        }

        @keyframes highlight-drift {
          0% { transform: translate(0, 0); opacity: 0.65; }
          25% { transform: translate(15%, -8%); opacity: 0.8; }
          50% { transform: translate(30%, 5%); opacity: 0.6; }
          75% { transform: translate(15%, 12%); opacity: 0.75; }
          100% { transform: translate(0, 0); opacity: 0.65; }
        }

        /* ── Orbiting particles ─────────────────────────────── */
        :global(.orb-particle) {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 4px;
          height: 4px;
          margin-top: -2px;
          margin-left: -2px;
          border-radius: 9999px;
          filter: blur(1.5px);
          opacity: 0.7;
          transform-origin: center;
          animation:
            orbit 24s linear infinite,
            twinkle 4s ease-in-out infinite;
          animation-delay: calc(var(--i) * -2s), calc(var(--i) * -0.3s);
        }

        @keyframes orbit {
          from {
            transform: rotate(var(--angle)) translateX(var(--orbit-r)) rotate(calc(var(--angle) * -1));
          }
          to {
            transform: rotate(calc(var(--angle) + 360deg)) translateX(var(--orbit-r)) rotate(calc((var(--angle) + 360deg) * -1));
          }
        }

        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}

/**
 * Per-accent gradients + glow colours. Each palette shifts the orb
 * from cool → warm subtly so the meditation player, silent timer,
 * and match-prep ritual don't all feel like the same screen.
 */
const ACCENT_PALETTES = {
  teal: {
    outer:
      "radial-gradient(circle at 30% 30%, #67e8f9, #0e7490 55%, #1e3a8a 90%)",
    inner:
      "radial-gradient(circle at 60% 60%, #a5f3fc, transparent 65%)",
    glow1: "rgba(103, 232, 249, 0.35)",
    glow2: "rgba(30, 58, 138, 0.35)",
    particle: "rgba(165, 243, 252, 0.9)",
  },
  violet: {
    outer:
      "radial-gradient(circle at 30% 30%, #c4b5fd, #7c3aed 55%, #4c1d95 90%)",
    inner:
      "radial-gradient(circle at 60% 60%, #ddd6fe, transparent 65%)",
    glow1: "rgba(196, 181, 253, 0.35)",
    glow2: "rgba(76, 29, 149, 0.35)",
    particle: "rgba(221, 214, 254, 0.9)",
  },
  emerald: {
    outer:
      "radial-gradient(circle at 30% 30%, #6ee7b7, #059669 55%, #064e3b 90%)",
    inner:
      "radial-gradient(circle at 60% 60%, #a7f3d0, transparent 65%)",
    glow1: "rgba(110, 231, 183, 0.35)",
    glow2: "rgba(6, 78, 59, 0.35)",
    particle: "rgba(167, 243, 208, 0.9)",
  },
  amber: {
    outer:
      "radial-gradient(circle at 30% 30%, #fcd34d, #d97706 55%, #7c2d12 90%)",
    inner:
      "radial-gradient(circle at 60% 60%, #fde68a, transparent 65%)",
    glow1: "rgba(252, 211, 77, 0.35)",
    glow2: "rgba(124, 45, 18, 0.35)",
    particle: "rgba(253, 230, 138, 0.9)",
  },
  slate: {
    outer:
      "radial-gradient(circle at 30% 30%, #e2e8f0, #64748b 55%, #1e293b 90%)",
    inner:
      "radial-gradient(circle at 60% 60%, #f1f5f9, transparent 65%)",
    glow1: "rgba(226, 232, 240, 0.35)",
    glow2: "rgba(30, 41, 59, 0.35)",
    particle: "rgba(241, 245, 249, 0.85)",
  },
};

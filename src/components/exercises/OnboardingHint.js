// components/exercises/OnboardingHint.js
"use client";

/**
 * Tiny, subtle dismissable onboarding tooltip. Positioned absolutely
 * inside a `relative`-positioned parent. Caller is responsible for:
 *   - localisation (pass already-translated `text`)
 *   - localStorage one-shot logic (see useOnboardingFlag)
 *
 * Tones use full Tailwind class names (not template-interpolated) so the
 * JIT compiler can see them at build time.
 *
 * Props:
 *   text       — string already in user's language
 *   placement  — CSS object: { left, top, right, bottom, transform }
 *   arrow      — "up" | "down" | "left" | "right" | null
 *   onDismiss  — called on tap
 *   tone       — "emerald" (default) | "amber" | "blue"
 *   className  — extra classes for the inner pill
 */
export default function OnboardingHint({
  text,
  placement = {},
  arrow = null,
  onDismiss,
  tone = "emerald",
  className = "",
}) {
  const toneStyles = {
    emerald: {
      pill: "bg-emerald-600/95",
      borderColour: "rgb(5, 150, 105)",
    },
    amber: {
      pill: "bg-amber-500/95",
      borderColour: "rgb(245, 158, 11)",
    },
    blue: {
      pill: "bg-blue-600/95",
      borderColour: "rgb(37, 99, 235)",
    },
  };
  const { pill, borderColour } = toneStyles[tone] || toneStyles.emerald;

  const arrowEl = (() => {
    if (!arrow) return null;
    if (arrow === "up") {
      return (
        <div
          className="absolute w-0 h-0 border-x-8 border-x-transparent left-1/2 -translate-x-1/2 -top-2 border-b-8"
          style={{ borderBottomColor: borderColour }}
          aria-hidden="true"
        />
      );
    }
    if (arrow === "down") {
      return (
        <div
          className="absolute w-0 h-0 border-x-8 border-x-transparent left-1/2 -translate-x-1/2 -bottom-2 border-t-8"
          style={{ borderTopColor: borderColour }}
          aria-hidden="true"
        />
      );
    }
    if (arrow === "left") {
      return (
        <div
          className="absolute w-0 h-0 border-y-8 border-y-transparent top-1/2 -translate-y-1/2 -left-2 border-r-8"
          style={{ borderRightColor: borderColour }}
          aria-hidden="true"
        />
      );
    }
    return (
      <div
        className="absolute w-0 h-0 border-y-8 border-y-transparent top-1/2 -translate-y-1/2 -right-2 border-l-8"
        style={{ borderLeftColor: borderColour }}
        aria-hidden="true"
      />
    );
  })();

  return (
    <div
      className="absolute z-30 pointer-events-auto onboard-hint-enter"
      style={placement}
      onClick={onDismiss}
      role="button"
      aria-label={text}
    >
      <div
        className={`relative ${pill} text-white text-xs sm:text-sm font-medium px-3 py-2 rounded-lg shadow-lg cursor-pointer max-w-[16rem] whitespace-normal text-center ${className}`}
      >
        {text}
        {arrowEl}
      </div>
      <style jsx>{`
        @keyframes onboard-hint-enter {
          0% {
            opacity: 0;
            transform: scale(0.94);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        :global(.onboard-hint-enter) {
          animation: onboard-hint-enter 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

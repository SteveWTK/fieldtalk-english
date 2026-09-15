// src/components/ui/eyebrow.js
//
// The Global Player Eyebrow — the small italic-uppercase kicker
// that sits above headings on marketing surfaces and inside product
// panels. Per HANDOFF.md §1 (Type):
//
//   "Archivo 500 italic, uppercase, 12–13px, 0.30em tracking"
//
// Tones:
//   accent (default) → lime italic — the classic marketing kicker
//                       ("Global Player · CRM", "FieldTalk").
//   muted            → primary-400 italic — for in-panel usage where
//                       an accent would over-punch.
//   plain            → primary-50 italic — for uses inside a lime
//                       or otherwise coloured background where the
//                       accent would clash.
//
// Sizes are Tailwind text-size classes. Defaults `text-xs` (12px)
// which is the DS lower bound; use `text-[13px]` for slightly
// heavier hero contexts.
"use client";

/**
 * @param {{
 *   children: React.ReactNode,
 *   tone?: 'accent' | 'muted' | 'plain',
 *   size?: string,      // Tailwind text-* class, default 'text-xs'
 *   className?: string,
 *   as?: keyof JSX.IntrinsicElements,
 * } & Record<string, any>} props
 */
function Eyebrow({
  children,
  tone = "accent",
  size = "text-xs",
  className = "",
  as: Tag = "p",
  ...rest
}) {
  const toneClass = TONE_CLASSES[tone] || TONE_CLASSES.accent;
  const cls = [
    // Archivo (font-display), 500 (font-medium), italic
    "font-display font-medium italic",
    // uppercase + 0.30em tracking (matches `tracking-eyebrow` token)
    "uppercase tracking-eyebrow",
    // Prevent line breaks in typical kicker usage — most eyebrows
    // are 1-3 words. Callers can override via className if needed.
    "whitespace-nowrap",
    "leading-tight",
    size,
    toneClass,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={cls} {...rest}>
      {children}
    </Tag>
  );
}

const TONE_CLASSES = {
  // Lime — the classic accent register. `accent-400` on dark; the
  // DS light-mode swap to accent-700 happens in a different theme
  // context that isn't wired yet, so we stay on accent-400 for now.
  accent: "text-accent-400",
  muted: "text-primary-400",
  plain: "text-primary-50",
};

export default Eyebrow;
export { Eyebrow };

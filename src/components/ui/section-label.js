// src/components/ui/section-label.js
//
// The Global Player SectionLabel — the small upright uppercase
// label that sits above cards, above field groups, above stat
// tiles. The workaday sibling of Eyebrow (which is italic + accent
// and belongs on hero / marketing / kicker slots).
//
// Per HANDOFF.md §1 (Type):
//   "Instrument Sans 400, uppercase, 11px, 0.26em tracking"
//
// Colour is primary-500 by default (`text-primary-500`) so the
// label reads as scaffold rather than content — HANDOFF says
// slate-500 on dark for exactly this reason.
"use client";

/**
 * @param {{
 *   children: React.ReactNode,
 *   size?: string,      // Tailwind text-* class, default 'text-[11px]'
 *   tone?: 'default' | 'muted',
 *   className?: string,
 *   as?: keyof JSX.IntrinsicElements,
 * } & Record<string, any>} props
 */
function SectionLabel({
  children,
  size = "text-[11px]",
  tone = "default",
  className = "",
  as: Tag = "p",
  ...rest
}) {
  const toneClass =
    tone === "muted" ? "text-primary-600" : "text-primary-500";
  const cls = [
    // Instrument Sans (default font-sans), upright
    "font-sans",
    // Weight 400 — labels shouldn't fight body copy for attention.
    // Bold labels are what the old app used; DS is more restrained.
    "font-normal",
    "uppercase tracking-label",
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

export default SectionLabel;
export { SectionLabel };

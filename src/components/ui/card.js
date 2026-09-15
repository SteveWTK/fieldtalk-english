// src/components/ui/card.js
//
// The Global Player Card — the workhorse container. Flat surface,
// hairline border, radius 12, NO drop shadow on dark. Per
// docs/brand/handoff/HANDOFF.md §1 and the design-system readme:
//
//   "A card looks like: flat #0b1220 (or #020617 when nested), 1px
//    #1e293b, radius 12px (16px if it's a panel), 20px padding,
//    contents stacked with a 12–16px gap, and an 11px uppercase
//    0.22–0.3em slate-500 label on top. No shadow. No coloured
//    left border. No rounded-corner-plus-accent-stripe patterns."
//
// The prior contents of this file (a shadcn-style Card family with
// drop shadows) had zero callers in the codebase and have been
// replaced during Stage 4 of the rebrand. If you find stale imports
// of `{ Card, CardHeader, CardTitle }` etc., migrate them to the new
// `<Card label="…">{children}</Card>` shape below — the previous
// sub-components are gone.
//
// Props:
//   label     → optional SectionLabel rendered at the top of the
//                card (uppercase 11px slate-500, 0.26em tracking).
//   nested    → false (default) fills with primary-panel (#0b1220).
//                true bumps the fill to primary-800 (#0f172a) so a
//                nested card visually separates from its parent.
//   padding   → override the default `p-5` (20px) if a specific card
//                needs tighter or looser padding.
//   gap       → override the default `space-y-3` (12px) between
//                stacked children.
//   className → merged onto the root so callers can extend layout
//                (e.g. `h-full` when in a grid).
"use client";

import SectionLabel from "@/components/ui/section-label";

/**
 * @param {{
 *   label?: string | React.ReactNode,
 *   nested?: boolean,
 *   padding?: string,     // Tailwind padding class(es), default `p-5`
 *   gap?: string,         // Tailwind space-y class, default `space-y-3`
 *   className?: string,
 *   children: React.ReactNode,
 *   as?: keyof JSX.IntrinsicElements,
 * } & Record<string, any>} props
 */
function Card({
  label,
  nested = false,
  padding = "p-5",
  gap = "space-y-3",
  className = "",
  children,
  as: Tag = "div",
  ...rest
}) {
  const bg = nested ? "bg-primary-800" : "bg-primary-panel";
  const cls = [
    bg,
    "border border-primary-700",
    "rounded-card", // 12px per DS
    padding,
    gap,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={cls} {...rest}>
      {label && <SectionLabel>{label}</SectionLabel>}
      {children}
    </Tag>
  );
}

export default Card;
export { Card };

// src/components/ui/panel.js
//
// The Global Player Panel — the larger sibling of Card. Same flat
// dark surface + hairline border, but with 16px radius and a
// canonical header slot for eyebrow / title / meta. Used as the
// top-level container for a page section (dashboards, admin CRUD,
// list views). Cards go INSIDE a panel; panels don't go inside
// cards.
//
// Per HANDOFF.md §1: radius 16px, "34px padding" per DS reference
// but that's for the huge specimen canvases — in real product
// screens 20–24px reads better. Default here is `p-5 sm:p-6`
// (20px mobile / 24px desktop) to match what we've been building
// by hand in the leads + coach dashboards.
"use client";

import Eyebrow from "@/components/ui/eyebrow";

/**
 * @param {{
 *   eyebrow?: string | React.ReactNode,
 *   title?: string | React.ReactNode,
 *   meta?: React.ReactNode,          // right-aligned metadata (updated-at, counts…)
 *   padding?: string,                // Tailwind padding class(es)
 *   gap?: string,                    // vertical stack gap for the panel body
 *   headerAction?: React.ReactNode,  // right-aligned action button in the header
 *   className?: string,
 *   children: React.ReactNode,
 *   as?: keyof JSX.IntrinsicElements,
 * } & Record<string, any>} props
 */
function Panel({
  eyebrow,
  title,
  meta,
  padding = "p-5 sm:p-6",
  gap = "space-y-4",
  headerAction,
  className = "",
  children,
  as: Tag = "section",
  ...rest
}) {
  const hasHeader = eyebrow || title || meta || headerAction;
  const cls = [
    "bg-primary-panel",
    "border border-primary-700",
    "rounded-panel", // 16px per DS
    padding,
    gap,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={cls} {...rest}>
      {hasHeader && (
        <header className="flex items-baseline justify-between gap-4 flex-wrap">
          <div className="flex flex-col gap-1.5 min-w-0">
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
            {title && (
              <h2 className="text-lg sm:text-xl font-display font-bold tracking-tight text-primary-50 leading-tight m-0">
                {title}
              </h2>
            )}
          </div>
          {(meta || headerAction) && (
            <div className="flex items-center gap-3 shrink-0">
              {meta && (
                <div className="text-xs text-primary-500 tabular-nums">
                  {meta}
                </div>
              )}
              {headerAction}
            </div>
          )}
        </header>
      )}
      {children}
    </Tag>
  );
}

export default Panel;
export { Panel };

// src/components/ui/stat-tile.js
//
// The Global Player StatTile — a KPI tile for dashboard headers.
// Standard layout: SectionLabel-style label above, Archivo 900 30px
// value below, optional caption. Slate panel fill, 1px primary-700
// border, 12px radius.
//
// Per DS: numbers stay bare — no arrow glyphs, no delta badges, no
// rounding. Grouped in 3-up grids at the page level (this component
// is a single tile, the grid is the caller's job).
//
// Tones:
//   default → primary-50 value (the standard)
//   accent  → accent-400 value (the "single accented tile per row"
//             rule — use for the composite readiness / hero metric)
"use client";

/**
 * @param {{
 *   label: React.ReactNode,
 *   value: React.ReactNode,
 *   caption?: React.ReactNode,
 *   tone?: 'default' | 'accent',
 *   className?: string,
 * } & Record<string, any>} props
 */
function StatTile({
  label,
  value,
  caption,
  tone = "default",
  className = "",
  ...rest
}) {
  const valueColor = tone === "accent" ? "text-accent-400" : "text-primary-50";

  return (
    <div
      className={[
        "flex flex-col gap-1.5",
        "rounded-card border border-primary-700 bg-primary-panel",
        "p-4 sm:p-[18px]",
        className,
      ].join(" ").trim()}
      {...rest}
    >
      <div className="text-[11px] font-sans font-normal uppercase tracking-label text-primary-400">
        {label}
      </div>
      <div
        className={`font-display font-black text-[30px] leading-none tabular-nums ${valueColor}`}
      >
        {value}
      </div>
      {caption && (
        <div className="text-xs text-primary-400 leading-snug mt-0.5">
          {caption}
        </div>
      )}
    </div>
  );
}

export default StatTile;
export { StatTile };

// src/components/ui/chip.js
//
// The Global Player Chip — a small pill for filters, tags and
// selection states. Per HANDOFF.md, Chips carry two signals:
//
//   1. Selected vs unselected. Selected = filled pill; unselected =
//      transparent with primary-600 border.
//   2. Feature identity via optional `signal` prop. When selected,
//      the fill takes the signal's colour (sky = Inglês, violet =
//      Mental, orange = Desempenho, red = Alerta). No signal ⇒ lime.
//
// Renders as `<span>` by default (for tags / labels). Pass
// `as="button"` when the chip is a clickable filter — that also
// wires up cursor + keyboard focus.
"use client";

/**
 * @param {{
 *   selected?: boolean,
 *   signal?: 'english' | 'mental' | 'performance' | 'alert' | null,
 *   as?: 'span' | 'button' | 'a',
 *   href?: string,        // used when as='a'
 *   size?: 'sm' | 'md',   // md is DS default; sm is for dense filter rows
 *   Icon?: React.ComponentType,
 *   className?: string,
 *   children: React.ReactNode,
 * } & Record<string, any>} props
 */
function Chip({
  selected = false,
  signal,
  as = "span",
  href,
  size = "md",
  Icon,
  className = "",
  children,
  ...rest
}) {
  // Base — every chip shares typography + shape.
  const baseClass = [
    "inline-flex items-center gap-1.5",
    "font-sans font-semibold",
    "rounded-full",
    "leading-tight whitespace-nowrap",
    "border transition-colors duration-micro ease-out",
    as === "button" || as === "a" ? "cursor-pointer" : "",
    as === "button" || as === "a"
      ? "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
      : "",
    SIZES[size] || SIZES.md,
  ]
    .filter(Boolean)
    .join(" ");

  // Selected + unselected + optional signal tint.
  let stateClass;
  if (selected) {
    stateClass = signal
      ? SIGNAL_SELECTED[signal] || SIGNAL_SELECTED.default
      : "bg-accent-400 text-primary-800 border-transparent";
  } else {
    stateClass =
      "bg-transparent text-primary-300 border-primary-600 hover:text-primary-100 hover:border-primary-400";
  }

  const cls = [baseClass, stateClass, className].filter(Boolean).join(" ");

  const inner = (
    <>
      {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
      <span>{children}</span>
    </>
  );

  if (as === "a" && href) {
    // Not using Next Link here — filter chips are usually
    // route-local, and callers can wrap in Link themselves if
    // needed. A plain <a> keeps the API predictable + <span>-like.
    return (
      <a href={href} className={cls} {...rest}>
        {inner}
      </a>
    );
  }
  if (as === "button") {
    return (
      <button type="button" className={cls} {...rest}>
        {inner}
      </button>
    );
  }
  return (
    <span className={cls} {...rest}>
      {inner}
    </span>
  );
}

const SIZES = {
  // 7px 14px, 12px label per DS. Tight vertical rhythm.
  md: "px-3.5 py-1.5 text-xs",
  // For inline filters + tag lists inside dense tables.
  sm: "px-2.5 py-1 text-[11px]",
};

// Signal-coloured selected states. Text stays ink (primary-800) so
// contrast holds against the bright signal fill. Border transparent
// so the pill looks solid.
const SIGNAL_SELECTED = {
  default: "bg-accent-400 text-primary-800 border-transparent",
  english: "bg-signal-english text-primary-800 border-transparent",
  mental: "bg-signal-mental text-primary-800 border-transparent",
  performance: "bg-signal-performance text-primary-800 border-transparent",
  alert: "bg-signal-alert text-primary-50 border-transparent",
};

export default Chip;
export { Chip };

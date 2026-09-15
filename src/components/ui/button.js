// src/components/ui/button.js
//
// The Global Player Button. Follows docs/brand/handoff/HANDOFF.md §3.
//
// The prior contents of this file (a small shadcn-style Button that
// wasn't referenced anywhere in the codebase) have been replaced with
// the Global Player primary control component during Stage 4 of the
// rebrand. If you see stale imports of `{ Button }` (named export)
// they still resolve — this module exports both a default and named
// `Button` to preserve backwards compatibility with any missed
// callers.
//
// Variants:
//   primary   → lime pill on primary-800 text — THE next action.
//               Per DS rule, use AT MOST ONE per view.
//   secondary → transparent, primary-600 border, primary-50 text.
//   ghost     → accent-400 text only, no border, no fill. For
//               tertiary actions ("Cancel", "See more") where a
//               bordered pill would over-weight the layout.
//   danger    → red-700 fill on primary-50 text. Destructive-only
//               (delete, unenroll, remove).
//
// Sizes: sm / md (default) / lg — DS padding + font sizes.
//
// Renders as <button> by default, or a Next <Link>-compatible anchor
// when `as="a"` and `href` is supplied. Also accepts an `Icon` prop
// (a Lucide component) for a leading glyph — auto-sized.
//
// Focus ring: 2px accent-400 at 2px offset, all variants.
"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

/**
 * @param {{
 *   variant?: 'primary' | 'secondary' | 'ghost' | 'danger',
 *   size?: 'sm' | 'md' | 'lg',
 *   fullWidth?: boolean,
 *   disabled?: boolean,
 *   loading?: boolean,          // shows a spinner + disables interaction
 *   Icon?: React.ComponentType, // leading Lucide icon
 *   IconTrailing?: React.ComponentType,
 *   as?: 'button' | 'a',
 *   href?: string,              // required when as='a'
 *   type?: 'button' | 'submit' | 'reset',
 *   onClick?: (e: any) => void,
 *   className?: string,
 *   children: React.ReactNode,
 * } & Record<string, any>} props
 */
function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  loading = false,
  Icon,
  IconTrailing,
  as = "button",
  href,
  type = "button",
  onClick,
  className = "",
  children,
  ...rest
}) {
  const isDisabled = disabled || loading;

  const baseClass = [
    "inline-flex items-center justify-center gap-2",
    // Archivo 800 uppercase, tracked per DS
    "font-display font-extrabold uppercase tracking-button",
    "whitespace-nowrap leading-none",
    "rounded-full",
    // Micro transition token (120ms, ease-out) — hovers only, no
    // scale, no translate.
    "transition-colors duration-micro ease-out",
    // Focus ring — accent-400 at 2px offset, all variants
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900",
    fullWidth ? "w-full" : "",
    // DS explicitly forbids opacity fades on interactive elements
    // (would make disabled + loading indistinguishable from hover),
    // so disabled = slate-700 fill + muted label instead.
    isDisabled ? "cursor-not-allowed" : "cursor-pointer",
  ].join(" ");

  const sizeClass = SIZES[size] || SIZES.md;
  const variantClass = isDisabled
    ? DISABLED_CLASS
    : VARIANTS[variant] || VARIANTS.primary;
  const iconSize = ICON_SIZES[size] || ICON_SIZES.md;

  const inner = (
    <>
      {loading ? (
        <Loader2
          className={`${iconSize} animate-spin`}
          aria-hidden="true"
        />
      ) : Icon ? (
        <Icon className={iconSize} aria-hidden="true" />
      ) : null}
      <span>{children}</span>
      {!loading && IconTrailing ? (
        <IconTrailing className={iconSize} aria-hidden="true" />
      ) : null}
    </>
  );

  const commonProps = {
    className: `${baseClass} ${sizeClass} ${variantClass} ${className}`.trim(),
    ...rest,
  };

  // Next <Link> when `as='a'` + `href` is set. Client navigation
  // stays intact; any additional link props (target, rel, etc.) are
  // picked up from `...rest`.
  if (as === "a" && href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        aria-disabled={isDisabled || undefined}
        {...commonProps}
      >
        {inner}
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      aria-disabled={isDisabled || undefined}
      {...commonProps}
    >
      {inner}
    </button>
  );
}

const SIZES = {
  // 9px 18px, 11px label — tight rows (chips, table actions)
  sm: "px-4 py-2 text-[11px]",
  // 13px 26px, 13px label — the workhorse
  md: "px-6 py-3 text-[13px]",
  // 15px 34px, 14px label — marketing-hero CTA
  lg: "px-8 py-3.5 text-[14px]",
};

const ICON_SIZES = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-4 h-4",
};

const VARIANTS = {
  // Lime pill, primary-800 ink. Hover LIGHTENS to accent-300 (DS
  // rule for hover on dark backgrounds — never darken). Press goes
  // to accent-500.
  primary:
    "bg-accent-400 text-primary-800 hover:bg-accent-300 active:bg-accent-500 border border-transparent",
  // Transparent pill, primary-600 border. Border brightens on hover
  // so the affordance is visible on any slate background.
  secondary:
    "bg-transparent text-primary-50 border border-primary-600 hover:border-primary-400 hover:text-white active:border-primary-300",
  // Text-only accent — no border, no fill. Slightly-reduced side
  // padding vs primary/secondary; override with className if aligning
  // exactly with a filled sibling.
  ghost:
    "bg-transparent text-accent-400 hover:text-accent-300 active:text-accent-500 border border-transparent",
  // Destructive — red-700 fill.
  danger:
    "bg-red-700 text-primary-50 hover:bg-red-600 active:bg-red-800 border border-transparent",
};

// DS-mandated disabled treatment. No opacity — slate-700 fill,
// muted label. Prevents disabled from looking identical to a hover
// fade elsewhere in the layout.
const DISABLED_CLASS =
  "bg-primary-700 text-primary-500 border border-transparent";

export default Button;
export { Button };

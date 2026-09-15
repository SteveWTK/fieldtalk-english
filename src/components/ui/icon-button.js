// src/components/ui/icon-button.js
//
// The Global Player IconButton — a square pill with one Lucide
// glyph and a required `label` for screen readers. Per the design
// system, "no icon-only control ships unlabelled." The label is
// exposed via `aria-label` + a native `title` tooltip; it never
// renders as visible text (that's what `Button` is for).
//
// Sizes: sm (32px) / md (40px) / lg (48px). Mobile-first surfaces
// should use md or lg so tap targets clear 44px.
//
// Variants: same visual language as Button (primary / secondary /
// ghost / danger), tuned for the icon-only footprint.
//
// Focus ring: 2px accent-400 at 2px offset, matching Button.
"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";

/**
 * @param {{
 *   Icon: React.ComponentType,   // required — the Lucide glyph
 *   label: string,               // required — aria-label + title
 *   variant?: 'primary' | 'secondary' | 'ghost' | 'danger',
 *   size?: 'sm' | 'md' | 'lg',
 *   disabled?: boolean,
 *   loading?: boolean,
 *   as?: 'button' | 'a',
 *   href?: string,
 *   type?: 'button' | 'submit' | 'reset',
 *   onClick?: (e: any) => void,
 *   className?: string,
 * } & Record<string, any>} props
 */
function IconButton({
  Icon,
  label,
  variant = "ghost",
  size = "md",
  disabled = false,
  loading = false,
  as = "button",
  href,
  type = "button",
  onClick,
  className = "",
  ...rest
}) {
  if (!Icon) {
    throw new Error("IconButton requires an `Icon` prop (a Lucide component).");
  }
  if (!label) {
    // Enforced at dev time — screen-reader-invisible controls are a
    // hard no-go for this design system.
    throw new Error(
      "IconButton requires a `label` prop for screen readers + tooltip.",
    );
  }

  const isDisabled = disabled || loading;
  const box = BOX_SIZES[size] || BOX_SIZES.md;
  const iconSize = ICON_SIZES[size] || ICON_SIZES.md;
  const variantClass = isDisabled
    ? DISABLED_CLASS
    : VARIANTS[variant] || VARIANTS.ghost;

  const baseClass = [
    "inline-flex items-center justify-center",
    "rounded-full",
    "transition-colors duration-micro ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900",
    isDisabled ? "cursor-not-allowed" : "cursor-pointer",
    box,
  ].join(" ");

  const inner = loading ? (
    <Loader2 className={`${iconSize} animate-spin`} aria-hidden="true" />
  ) : (
    <Icon className={iconSize} aria-hidden="true" />
  );

  const commonProps = {
    className: `${baseClass} ${variantClass} ${className}`.trim(),
    "aria-label": label,
    title: label,
    ...rest,
  };

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

const BOX_SIZES = {
  sm: "w-8 h-8",   // 32px
  md: "w-10 h-10", // 40px — hits the 44px target with the ring
  lg: "w-12 h-12", // 48px
};

const ICON_SIZES = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-5 h-5",
};

const VARIANTS = {
  primary:
    "bg-accent-400 text-primary-800 hover:bg-accent-300 active:bg-accent-500",
  secondary:
    "bg-transparent text-primary-50 border border-primary-600 hover:border-primary-400 hover:text-white active:border-primary-300",
  ghost:
    "bg-transparent text-primary-400 hover:text-primary-50 hover:bg-white/[0.04] active:bg-white/[0.08]",
  danger:
    "bg-transparent text-primary-400 hover:text-red-300 hover:bg-red-500/10 active:bg-red-500/15",
};

const DISABLED_CLASS = "bg-primary-800 text-primary-500";

export default IconButton;
export { IconButton };

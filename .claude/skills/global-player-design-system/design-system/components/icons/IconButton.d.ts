import * as React from "react";

/** A square pill holding one Lucide glyph. `ghost` is the default for toolbars; `solid` is lime and still counts as the one primary action per view. */
export interface IconButtonProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "style"> {
  /** Lucide icon name. */
  icon: string;
  /** Required — becomes aria-label and title. Icon-only controls are never unlabelled. */
  label: string;
  /** Default "ghost". */
  variant?: "ghost" | "outline" | "solid" | "danger";
  /** sm 32 · md 40 · lg 48 px. All meet the 44px touch target at md and above; use md or lg on mobile. Default "md". */
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function IconButton(props: IconButtonProps): React.JSX.Element;

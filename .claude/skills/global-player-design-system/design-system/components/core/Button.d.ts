import * as React from "react";

/**
 * Archivo 800 uppercase pill. Exactly one `primary` (lime) button per view — it is the single next action.
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Default "primary" (lime on dark / ink on light). "inverse" is white-on-dark for marketing headers. */
  variant?: "primary" | "secondary" | "ghost" | "danger" | "inverse";
  /** sm 9/18 · md 13/26 · lg 15/34. Default "md". */
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  fullWidth?: boolean;
  /** Render as another element, e.g. "a". Default "button". */
  as?: "button" | "a" | "span";
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): React.JSX.Element;

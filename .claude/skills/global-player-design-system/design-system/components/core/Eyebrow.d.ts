import * as React from "react";

/** Archivo 500 italic uppercase at 0.3em tracking — the brand's kicker above a headline. */
export interface EyebrowProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Default "accent" (lime 400 dark / lime 700 light). */
  tone?: "accent" | "muted" | "primary";
  /** px. Default 12. */
  size?: number;
  children?: React.ReactNode;
}
export declare function Eyebrow(props: EyebrowProps): React.JSX.Element;

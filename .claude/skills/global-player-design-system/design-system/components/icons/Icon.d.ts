import * as React from "react";

/**
 * A Lucide glyph at the brand's fixed drawing: stroke-width 2, round caps, 20px or 24px box, currentColor.
 * Lucide is the confirmed UI icon set — the brand mark itself is never used as an icon.
 */
export interface IconProps extends Omit<React.SVGProps<SVGSVGElement>, "name" | "color" | "style"> {
  /** Lucide icon name, kebab or Pascal: "chevron-right", "ChevronRight". */
  name: string;
  /** Box size in px. Use 20 in dense UI, 24 in headers. Default 20. */
  size?: number;
  /** Default 2 — do not change without a reason; it is what matches Archivo. */
  strokeWidth?: number;
  /** Default "currentColor" so the icon inherits its context. */
  color?: string;
  /** Accessible label. Omit for decorative icons (they get aria-hidden). */
  label?: string;
  style?: React.CSSProperties;
}
export declare function Icon(props: IconProps): React.JSX.Element;

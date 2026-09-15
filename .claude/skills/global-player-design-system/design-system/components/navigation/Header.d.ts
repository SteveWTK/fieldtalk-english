import * as React from "react";

/**
 * The product header. `open` (24px open bars, 16px padding) is the default; `crest` (37px crest, 20px padding)
 * is the swap for client-facing, white-label and light-mode portals.
 */
export interface HeaderProps {
  /** Default "open". */
  variant?: "open" | "crest";
  items?: string[];
  active?: string;
  onSelect?: (item: string) => void;
  locale?: "pt" | "en";
  onLocaleChange?: (next: "pt" | "en") => void;
  /** Extra nodes before the locale pill, e.g. a Button. */
  right?: React.ReactNode;
  style?: React.CSSProperties;
}
export declare function Header(props: HeaderProps): React.JSX.Element;

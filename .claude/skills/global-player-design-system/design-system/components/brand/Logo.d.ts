import * as React from "react";

/**
 * The Global Player mark: three rising chevron bars, with (crest) or without (open) the shield.
 * Open bars are the product/digital default; the crest is the authority variant.
 */
export interface LogoProps extends Omit<React.SVGProps<SVGSVGElement>, "style" | "title"> {
  /** "open" for product UI, favicons, social and motion; "crest" for contracts, portals, kit and decks. Default "open". */
  mark?: "open" | "crest";
  /** Colour ramp. Default "tonalDark". Light surfaces use "tonalLight" (lime 700 top bar). */
  tone?: "tonalDark" | "tonalLight" | "monoWhite" | "monoInk" | "monoLime" | "currentColor";
  /** Rendered height in px. Crest minimum 32; open minimum 16. Default 32. */
  size?: number;
  /** One of the three approved on-load stings. Default "none". */
  sting?: "none" | "stack" | "sweep" | "draw";
  /** Override the shield stroke (crest only). */
  shieldColor?: string;
  /** Accessible label. Default "Global Player". */
  title?: string;
  style?: React.CSSProperties;
}
export declare function Logo(props: LogoProps): React.JSX.Element;

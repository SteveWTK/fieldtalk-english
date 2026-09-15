import * as React from "react";

/**
 * Mark + "GLOBAL PLAYER" wordmark, optionally with a localised slogan.
 */
export interface LockupProps {
  /** Default "horizontal" — nav bars, headers, email signatures. "vertical" for splash, covers, ceremonial. */
  orientation?: "horizontal" | "vertical";
  mark?: "open" | "crest";
  tone?: "tonalDark" | "tonalLight" | "monoWhite" | "monoInk" | "monoLime" | "currentColor";
  /** Mark height in px; the wordmark scales from it. Default 34. */
  size?: number;
  /** Localised slogan, e.g. "Da base ao palco global". The name itself never translates. */
  slogan?: string;
  wordmarkColor?: string;
  style?: React.CSSProperties;
}
export declare function Lockup(props: LockupProps): React.JSX.Element;

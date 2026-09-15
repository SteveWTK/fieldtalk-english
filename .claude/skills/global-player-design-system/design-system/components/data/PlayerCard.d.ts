import * as React from "react";

/**
 * The product's signature object: an athlete with avatar, identity line and their module bars, signed with the open mark.
 */
export interface PlayerCardProps {
  name: React.ReactNode;
  /** Two letters for the avatar fallback. */
  initials?: string;
  /** Identity line, e.g. "Sub-17 · Meia · Santos FC" — separated with · not commas. */
  meta?: React.ReactNode;
  metrics?: Array<{ label: React.ReactNode; value: number; signal?: "english" | "mental" | "performance" | "alert" | "accent" }>;
  /** Ramp for the signing mark. Pass "tonalLight" on light surfaces — lime 400 fails contrast on white. Default "tonalDark". */
  tone?: "tonalDark" | "tonalLight" | "monoWhite" | "monoInk" | "monoLime" | "currentColor";
  onClick?: () => void;
  style?: React.CSSProperties;
}
export declare function PlayerCard(props: PlayerCardProps): React.JSX.Element;

import * as React from "react";

/** The commercial-tier device: 1, 2 or 3 chevron bars, topmost always lime. The only sanctioned derivative of the logo. */
export interface TierBadgeProps {
  /** academia = 1 bar, clube = 2, federacao = 3. Default "academia". */
  tier?: "academia" | "clube" | "federacao";
  /** Height in px. Default 31. */
  size?: number;
  style?: React.CSSProperties;
}
export declare function TierBadge(props: TierBadgeProps): React.JSX.Element;

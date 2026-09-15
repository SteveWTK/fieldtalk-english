import * as React from "react";

/** The PT · EN pill in every header. Current locale reads first. Portuguese is the default. */
export interface LocaleSwitcherProps {
  locale?: "pt" | "en";
  onChange?: (next: "pt" | "en") => void;
  style?: React.CSSProperties;
}
export declare function LocaleSwitcher(props: LocaleSwitcherProps): React.JSX.Element;

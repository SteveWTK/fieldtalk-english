import * as React from "react";

/** Horizontal nav: slate-400 labels, the active one slate-50 with a 2px lime underline. No pills, no backgrounds. */
export interface NavTabsProps {
  items?: string[];
  active?: string;
  onSelect?: (item: string) => void;
  style?: React.CSSProperties;
}
export declare function NavTabs(props: NavTabsProps): React.JSX.Element;

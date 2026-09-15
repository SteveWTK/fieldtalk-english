import * as React from "react";

/** Filter / tag pill. Unselected is an outline; selected fills lime, or a signal colour when the chip names a module. */
export interface ChipProps extends React.HTMLAttributes<HTMLElement> {
  selected?: boolean;
  /** Fill with a module's signal colour instead of lime when selected. */
  signal?: "english" | "mental" | "performance" | "alert";
  /** "button" when interactive. Default "span". */
  as?: "span" | "button" | "a";
  children?: React.ReactNode;
}
export declare function Chip(props: ChipProps): React.JSX.Element;

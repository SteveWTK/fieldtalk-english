import * as React from "react";

/** The upright 11px uppercase 0.26em slate label used on every card and panel header. Instrument Sans, not Archivo. */
export interface SectionLabelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** px. Default 11. */
  size?: number;
  children?: React.ReactNode;
}
export declare function SectionLabel(props: SectionLabelProps): React.JSX.Element;

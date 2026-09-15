import * as React from "react";

/**
 * A single KPI: 11px uppercase label over an Archivo 900 figure. Use `tone="accent"` for the one number that matters most.
 */
export interface StatTileProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  /** "accent" renders the figure in lime. One per row at most. Default "default". */
  tone?: "default" | "accent";
  caption?: React.ReactNode;
}
export declare function StatTile(props: StatTileProps): React.JSX.Element;

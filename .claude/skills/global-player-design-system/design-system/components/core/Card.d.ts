import * as React from "react";

/** Flat 12px-radius surface with a hairline border and an optional uppercase label. No shadow on dark. */
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** 11px uppercase 0.22em label rendered at the top. */
  label?: React.ReactNode;
  /** Use inside a Panel so the card sits darker than its parent. Default false. */
  nested?: boolean;
  /** Override the 20px default. */
  padding?: string | number;
  children?: React.ReactNode;
}
export declare function Card(props: CardProps): React.JSX.Element;

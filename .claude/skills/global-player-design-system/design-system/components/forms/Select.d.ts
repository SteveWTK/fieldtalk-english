import * as React from "react";

/** Native select with the brand's lime ▾ caret. Same 8px box as Input; `active` gives it the lime border. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: React.ReactNode;
  /** Strings, or { value, label } pairs. */
  options?: Array<string | { value: string; label: string }>;
  /** Show the lime border used for the open/selected state. Default false. */
  active?: boolean;
  wrapperStyle?: React.CSSProperties;
}
export declare function Select(props: SelectProps): React.JSX.Element;

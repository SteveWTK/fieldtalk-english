import * as React from "react";

/** Text field: 8px radius, 13/15 padding, ink fill, slate 600 border that goes lime 400 on focus. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /** 12px slate-400 label above the field. */
  label?: React.ReactNode;
  /** Caption below; turns red when `invalid`. */
  hint?: React.ReactNode;
  invalid?: boolean;
  wrapperStyle?: React.CSSProperties;
}
export declare function Input(props: InputProps): React.JSX.Element;

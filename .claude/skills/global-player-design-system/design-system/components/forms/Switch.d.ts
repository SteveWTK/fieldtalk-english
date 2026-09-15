import * as React from "react";

/** 44×24 pill toggle: lime 400 track with an ink knob when on, slate 600 with a slate 300 knob when off. */
export interface SwitchProps {
  checked?: boolean;
  onChange?: (next: boolean) => void;
  /** 13px slate-400 text to the right. */
  label?: React.ReactNode;
  disabled?: boolean;
  style?: React.CSSProperties;
}
export declare function Switch(props: SwitchProps): React.JSX.Element;

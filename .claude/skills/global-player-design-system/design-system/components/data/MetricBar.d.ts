import * as React from "react";

/** 6px progress row: label left, percentage right, slate-700 track with a signal-coloured fill. The only chart primitive. */
export interface MetricBarProps {
  label: React.ReactNode;
  /** 0–100. Rendered bare with a % sign. */
  value: number;
  /** Module colour. "accent" (lime) is reserved for the composite readiness score. Default "accent". */
  signal?: "english" | "mental" | "performance" | "alert" | "accent";
  style?: React.CSSProperties;
}
export declare function MetricBar(props: MetricBarProps): React.JSX.Element;

import * as React from "react";

/** 16px-radius section container: 34px padding, optional eyebrow + Archivo 700 title + right-aligned meta. */
export interface PanelProps extends React.HTMLAttributes<HTMLElement> {
  title?: React.ReactNode;
  /** Uppercase 0.3em label above the title. */
  eyebrow?: React.ReactNode;
  /** Right-aligned caption, e.g. "Atualizado há 2 dias". */
  meta?: React.ReactNode;
  children?: React.ReactNode;
}
export declare function Panel(props: PanelProps): React.JSX.Element;

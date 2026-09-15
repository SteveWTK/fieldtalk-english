import * as React from "react";

/** Circular slate avatar. Falls back to Archivo 800 initials — there is no illustrated placeholder in this brand. */
export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Two letters, e.g. "LF". */
  initials?: string;
  /** px. Default 46. */
  size?: number;
  src?: string;
  alt?: string;
}
export declare function Avatar(props: AvatarProps): React.JSX.Element;

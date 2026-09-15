import React from "react";

export function SectionLabel({ children, size = 11, style, ...rest }) {
  return (
    <div style={{ fontFamily: "var(--gp-font-text)", fontSize: size, letterSpacing: "var(--gp-track-label)", textTransform: "uppercase", color: "var(--gp-text-label-color)", ...style }} {...rest}>
      {children}
    </div>
  );
}

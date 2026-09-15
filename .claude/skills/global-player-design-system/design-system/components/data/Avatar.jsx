import React from "react";

export function Avatar({ initials, size = 46, src, alt = "", style, ...rest }) {
  return (
    <div style={{ width: size, height: size, flex: "none", borderRadius: "var(--gp-radius-pill)", background: "var(--gp-bg-raised)", border: "1px solid var(--gp-border-strong)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--gp-font-display)", fontWeight: "var(--gp-weight-extrabold)", fontSize: Math.round(size * 0.33), color: "var(--gp-text-muted)", ...style }} {...rest}>
      {src ? <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initials}
    </div>
  );
}

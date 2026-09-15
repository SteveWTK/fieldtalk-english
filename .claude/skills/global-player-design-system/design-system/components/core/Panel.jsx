import React from "react";

export function Panel({ title, eyebrow, meta, children, style, ...rest }) {
  return (
    <section style={{ background: "var(--gp-bg-panel)", border: "1px solid var(--gp-border-default)", borderRadius: "var(--gp-radius-panel)", padding: "var(--gp-pad-panel)", display: "flex", flexDirection: "column", gap: "var(--gp-space-5)", ...style }} {...rest}>
      {(eyebrow || title || meta) && (
        <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "var(--gp-space-4)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {eyebrow && <div style={{ fontSize: "var(--gp-text-label)", letterSpacing: "var(--gp-track-eyebrow)", textTransform: "uppercase", color: "var(--gp-text-label-color)" }}>{eyebrow}</div>}
            {title && <h2 style={{ margin: 0, fontFamily: "var(--gp-font-display)", fontWeight: "var(--gp-weight-bold)", fontSize: "var(--gp-text-h2)", color: "var(--gp-text-primary)" }}>{title}</h2>}
          </div>
          {meta && <div style={{ fontSize: "var(--gp-text-caption)", color: "var(--gp-text-faint)" }}>{meta}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

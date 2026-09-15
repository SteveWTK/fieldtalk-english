import React from "react";

const SIZES = {
  sm: { padding: "9px 18px", fontSize: 11 },
  md: { padding: "13px 26px", fontSize: 13 },
  lg: { padding: "15px 34px", fontSize: 14 },
};

export function Button({ variant = "primary", size = "md", disabled = false, fullWidth = false, as = "button", children, style, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  const base = {
    fontFamily: "var(--gp-font-display)",
    fontWeight: "var(--gp-weight-extrabold)",
    fontSize: s.fontSize,
    letterSpacing: "var(--gp-track-button)",
    textTransform: "uppercase",
    padding: s.padding,
    borderRadius: "var(--gp-radius-pill)",
    border: "1px solid transparent",
    background: "transparent",
    cursor: disabled ? "not-allowed" : "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: fullWidth ? "100%" : undefined,
    textDecoration: "none",
    lineHeight: 1,
    whiteSpace: "nowrap",
    transition: "background var(--gp-dur-micro) var(--gp-ease-out), color var(--gp-dur-micro) var(--gp-ease-out), border-color var(--gp-dur-micro) var(--gp-ease-out)",
  };
  const variants = {
    primary: { background: "var(--gp-action-primary-bg)", color: "var(--gp-action-primary-fg)" },
    secondary: { borderColor: "var(--gp-action-secondary-border)", color: "var(--gp-action-secondary-fg)" },
    ghost: { color: "var(--gp-action-ghost-fg)", padding: `${s.padding.split(" ")[0]} 8px` },
    danger: { background: "var(--gp-action-danger-bg)", color: "var(--gp-action-danger-fg)" },
    inverse: { background: "var(--gp-slate-50)", color: "var(--gp-slate-800)" },
  };
  const off = disabled ? { background: "var(--gp-action-disabled-bg)", color: "var(--gp-action-disabled-fg)", borderColor: "transparent" } : null;
  const Tag = as;
  return (
    <Tag disabled={as === "button" ? disabled : undefined} aria-disabled={disabled || undefined} style={{ ...base, ...(variants[variant] || variants.primary), ...off, ...style }} {...rest}>
      {children}
    </Tag>
  );
}

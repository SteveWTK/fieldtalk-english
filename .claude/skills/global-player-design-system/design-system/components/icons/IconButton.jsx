import React from "react";
import { Icon } from "./Icon.jsx";

const SIZES = { sm: { box: 32, glyph: 16 }, md: { box: 40, glyph: 20 }, lg: { box: 48, glyph: 24 } };

export function IconButton({ icon, label, variant = "ghost", size = "md", disabled = false, style, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  const variants = {
    ghost: { background: "transparent", borderColor: "transparent", color: "var(--gp-text-muted)" },
    outline: { background: "transparent", borderColor: "var(--gp-action-secondary-border)", color: "var(--gp-action-secondary-fg)" },
    solid: { background: "var(--gp-action-primary-bg)", borderColor: "transparent", color: "var(--gp-action-primary-fg)" },
    danger: { background: "var(--gp-action-danger-bg)", borderColor: "transparent", color: "var(--gp-action-danger-fg)" },
  };
  const off = disabled ? { background: "var(--gp-action-disabled-bg)", borderColor: "transparent", color: "var(--gp-action-disabled-fg)" } : null;
  return (
    <button type="button" aria-label={label} title={label} disabled={disabled}
      style={{ width: s.box, height: s.box, flex: "none", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, border: "1px solid", borderRadius: "var(--gp-radius-pill)", cursor: disabled ? "not-allowed" : "pointer", transition: "background var(--gp-dur-micro) var(--gp-ease-out), color var(--gp-dur-micro) var(--gp-ease-out), border-color var(--gp-dur-micro) var(--gp-ease-out)", ...(variants[variant] || variants.ghost), ...off, ...style }} {...rest}>
      <Icon name={icon} size={s.glyph} />
    </button>
  );
}

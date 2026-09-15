import React from "react";

export function NavTabs({ items = [], active, onSelect, style }) {
  return (
    <nav style={{ display: "flex", gap: 22, fontFamily: "var(--gp-font-text)", fontSize: 14, ...style }}>
      {items.map((it) => {
        const on = it === active;
        return (
          <button key={it} type="button" onClick={() => onSelect && onSelect(it)}
            style={{ background: "none", border: "none", padding: "0 0 4px", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", color: on ? "var(--gp-text-primary)" : "var(--gp-text-muted)", borderBottom: on ? "2px solid var(--gp-text-accent)" : "2px solid transparent", transition: "color var(--gp-dur-micro) var(--gp-ease-out)" }}>
            {it}
          </button>
        );
      })}
    </nav>
  );
}

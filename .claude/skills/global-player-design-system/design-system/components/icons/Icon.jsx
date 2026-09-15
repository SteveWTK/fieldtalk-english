import React from "react";

/* Lucide is Global Player's UI glyph set — the drawing that matches Archivo's
   geometric, blunt-terminal construction. Always stroke-width 2, round caps.
   The UMD bundle is loaded once, lazily, and cached on window. */
const SRC = "https://unpkg.com/lucide@0.544.0/dist/umd/lucide.min.js";
let loading = null;

function toPascal(name) {
  return String(name).replace(/(^|[-_])(\w)/g, (_, __, c) => c.toUpperCase());
}

function loadLucide() {
  if (window.lucide) return Promise.resolve(window.lucide);
  if (!loading) {
    loading = new Promise((res, rej) => {
      const s = document.createElement("script");
      s.src = SRC;
      s.crossOrigin = "anonymous";
      s.onload = () => res(window.lucide);
      s.onerror = rej;
      document.head.appendChild(s);
    });
  }
  return loading;
}

function camelize(attrs) {
  const out = {};
  for (const [k, v] of Object.entries(attrs || {})) {
    out[k === "class" ? "className" : k.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = v;
  }
  return out;
}

export function Icon({ name, size = 20, strokeWidth = 2, color = "currentColor", label, style, ...rest }) {
  const [lib, setLib] = React.useState(() => window.lucide || null);
  React.useEffect(() => { if (!lib) loadLucide().then(setLib).catch(() => {}); }, [lib]);
  const glyph = lib && lib.icons && (lib.icons[toPascal(name)] || lib.icons[name]);
  const box = { width: size, height: size, flex: "none", display: "block", ...style };
  if (!glyph) return <span aria-hidden="true" style={box} {...rest} />;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
      width={size} height={size} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : "true"} style={box} {...rest}>
      {glyph.map(([tag, attrs], i) => React.createElement(tag, { key: i, ...camelize(attrs) }))}
    </svg>
  );
}

// src/components/ui/avatar.js
//
// The Global Player Avatar — a circular tile that shows either a
// photo (via `src`) or 1–3 initials as a fallback. Ships with three
// preset sizes so callers don't invent their own. Custom pixel sizes
// remain available for edge cases (e.g. a 64px hero avatar).
//
// Per DS: raised slate fill, primary-600 hairline, Archivo 800 body,
// full pill radius. Never a drop shadow.
"use client";

const SIZE_PRESETS = {
  sm: 28,
  md: 36,
  lg: 48,
};

/**
 * Derive up to 2 initials from a name string. "Léo Fernandes" → "LF".
 * Non-alpha tokens (dashes, apostrophes) are stripped. Returns empty
 * string if we can't extract anything useful — caller can decide to
 * show a placeholder in that case.
 */
function deriveInitials(name) {
  if (!name || typeof name !== "string") return "";
  const parts = name
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}]/gu, ""))
    .filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * @param {{
 *   initials?: string,       // explicit initials (max 3 chars). If
 *                             // omitted, derives from `name`.
 *   name?: string,           // full name — used for initials + alt.
 *   src?: string,            // optional photo URL.
 *   alt?: string,            // photo alt — defaults to `name`.
 *   size?: 'sm' | 'md' | 'lg' | number,  // preset or pixel value.
 *   className?: string,
 * } & Record<string, any>} props
 */
function Avatar({
  initials,
  name,
  src,
  alt,
  size = "md",
  className = "",
  ...rest
}) {
  const px = typeof size === "number" ? size : (SIZE_PRESETS[size] || SIZE_PRESETS.md);
  const label = (initials || deriveInitials(name) || "").slice(0, 3);
  // Body scales down at small sizes so 3-char initials still fit.
  const fontPx = Math.max(10, Math.round(px * 0.34));

  return (
    <div
      className={[
        "shrink-0 inline-flex items-center justify-center",
        "rounded-full bg-primary-700 border border-primary-600",
        "text-primary-300 font-display font-extrabold uppercase",
        "overflow-hidden",
        className,
      ].join(" ").trim()}
      style={{ width: px, height: px, fontSize: fontPx }}
      aria-label={!src && name ? name : undefined}
      {...rest}
    >
      {src ? (
        // Deliberate <img> — Avatar is a fixed-size tile (max 48px in
        // the presets), so LCP + bandwidth savings from next/image
        // don't apply. Skipping next/image also avoids requiring a
        // remote-loader config for every academy/player photo host.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt ?? name ?? ""}
          className="w-full h-full object-cover"
        />
      ) : (
        label
      )}
    </div>
  );
}

export default Avatar;
export { Avatar, deriveInitials };

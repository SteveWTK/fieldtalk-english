# Handoff: Global Player — brand, design system & rename

## Overview
"Global Player" is the new name and identity for the EdTech platform formerly known as FieldTalk / Pro Path.
This bundle contains (a) the full visual design system, (b) production-ready logo assets, and (c) the token +
component code needed to apply the identity across the existing web app and to complete the rename.

## About the design files
The `.dc.html` files in `design-references/` are **design references authored in HTML** — prototypes showing
intended look, spacing and motion. They are **not** production code to copy. Recreate them in this codebase's
existing environment (Next.js + React + Tailwind) using established patterns and component library.

## Fidelity
**High-fidelity.** Colours, type, spacing, radii and motion values below are final. Match them exactly.

---

## 1. Design tokens

### Colour
Existing `primary` (slate) and `accent` (lime) scales are unchanged — keep the Tailwind config as-is.
Additions:

| Token | Hex | Use |
|---|---|---|
| signal.english | #38bdf8 | "Inglês de campo" feature colour |
| signal.mental | #c084fc | "Blindagem mental" feature colour |
| signal.performance | #fb923c | "Desempenho" feature colour |
| signal.alert | #f87171 | Errors, expiring items |

Rules:
- Dark is the default surface. Page `#020617`, panels `#0b1220`, cards `#0f172a`, borders `#1e293b`.
- **One lime element per view** — the single next action. Lime is never decorative.
- On light surfaces, lime 400 fails contrast for text/icons: use **lime 700 `#4d7c0f`** for ink on white,
  and keep lime 400 only as a *fill* behind dark text.
- Signal colours are for feature identity and status only. They are never brand colours and never appear in the logo.

### Type
- Display / headings: **Archivo** (300, 500, 700, 800, 900 + 500 italic).
- Body & UI: **Instrument Sans** (400, 500, 600).
- Both from Google Fonts; self-host via `next/font/google` for CLS-free loading.

| Role | Family / weight | Size | Tracking |
|---|---|---|---|
| Display | Archivo 900 | 44–72px | -0.03em |
| H1 | Archivo 800 | 32px | -0.02em |
| H2 | Archivo 700 | 22px | normal |
| Eyebrow | Archivo 500 italic, uppercase | 12–13px | 0.30em |
| Body | Instrument Sans 400 | 16px / 1.6 | normal |
| Caption | Instrument Sans 400 | 13px | normal |
| Label | Instrument Sans 400, uppercase | 11px | 0.26em |
| Wordmark | Archivo 900, uppercase | any | 0.15–0.20em |

### Spacing, radius, elevation
- Spacing: 4pt scale — 8 / 12 / 16 / 24 / 32 / 48 / 64.
- Radius: 8 controls · 12 cards · 16 panels · 999 pills.
- Elevation: borders over shadows on dark. Where a shadow is needed: `0 8px 32px rgba(2,6,23,.6)`.

### Motion
| Token | Duration | Easing |
|---|---|---|
| micro (hover, toggle) | 120ms | ease-out |
| ui (panel, menu) | 220ms | cubic-bezier(.22,1,.36,1) |
| entrance | 620ms, 110ms stagger | cubic-bezier(.22,1,.36,1) |
| brand sting | ≤1.2s | see logo animation below |

All motion must respect `prefers-reduced-motion`, falling back to a 200ms opacity fade.

---

## 2. Logo system

Two marks, one geometry. Three chevrons rising: slate 500 → slate 400 → lime 400.

- **Crested** — chevrons inside a shield. Authority register.
- **Open bars** — chevrons alone. Modern, minimal, small-size safe.

### Which to use
| Context | Mark |
|---|---|
| Web app header (default) | Open |
| Marketing site header | Open |
| Landing hero / splash | Either |
| Player dossier, certificates, contracts, letterhead | Crested |
| Favicon, social avatar, notification badge | Open |
| Banners, kit, pitchside board | Crested |

### Hard rules
- Clear space on all sides = the height of one bar.
- Minimum size: crest **32px**, open bars **16px**.
- Never recolour the bars, rotate/skew the mark, vary the stroke weights between bars, or place lime on lime.
- One-colour cut (all three bars one ink) is the approved reduction for embroidery, vinyl and etching.

### Geometry (authoritative)
Crest shield path, viewBox `0 0 100 108`:
`M50 5 L91 20 V57 C91 82 72 96 50 103 C28 96 9 82 9 57 V20 Z` — stroke-width 3.2
Crest bars (stroke-width 7, round caps/joins):
`M28 66 L50 50 L72 66` · `M28 52 L50 36 L72 52` · `M28 38 L50 22 L72 38`
Open bars, viewBox `0 0 100 74` (stroke-width 9, round caps/joins):
`M14 62 L50 44 L86 62` · `M14 46 L50 28 L86 46` · `M14 30 L50 12 L86 30`
Below ~28px, raise the open-bars stroke to 12–13 so it stays legible.

### On-load animation (landing page — "Sweep")
Each bar slides in from the left with a slight overshoot, 90ms apart, wordmark fades in after.
```css
@keyframes gp-sweep {
  from { opacity: 0; transform: translateX(-30px) scaleX(.86); }
  70%  { transform: translateX(3px) scaleX(1.02); }
  to   { opacity: 1; transform: translateX(0) scaleX(1); }
}
/* bar 1: 0ms · bar 2: 90ms · bar 3: 180ms · wordmark: 500ms, 700ms ease-out fade */
```
A second sting, "Crest draw" (shield draws over 900ms, bars stamp in at 340/450/560ms, lime bar gets a
620ms drop-shadow glow at 800ms), is reserved for video intros and the app splash. See
`design-references/Global Player Brand Package.dc.html` for both, with replay controls.

---

## 3. Components to update

### Header (`components/layout/Header`)
Open-bars mark at 28–32px + wordmark "GLOBAL PLAYER" in Archivo 900, 15px, 0.15em tracking, `primary-50`.
Active nav item: `primary-50` text with a 2px `accent-400` bottom border, 4px below the label.
Inactive: `primary-400`. Locale switcher is a pill, 1px `primary-700` border, 12px `primary-500` text.
A crested variant of the same header (36px crest, taller bar, light surface) is required for club-portal
and white-label views — build it as a `variant` prop, not a second component.

### Buttons
- Primary: `bg-accent-400 text-primary-800`, pill, 13px Archivo 800 uppercase 0.12em, padding 13px 26px. Hover → `accent-300`.
- Secondary: transparent, 1px `primary-600` border, `primary-50` text.
- Ghost: `accent-400` text, no border.
- Destructive: `bg-red-700 text-primary-50`.
- Focus ring: 2px `accent-400` at 2px offset, all variants.

### Inputs
`bg-primary-900`, 1px `primary-600` border, radius 8, 13px 15px padding, 15px `primary-100` text.
Focus border → `accent-400`. Label 12px `primary-400` above the field.

### Player card
Radius 12, `bg-primary-900`, 1px `primary-700` border. Avatar 46px circle. Name Archivo 700 17px.
Meta 12px `primary-500`. Metric bars: 6px tall, radius 3, track `primary-700`, fill = the metric's
signal colour; "Prontidão global" uses `accent-400`.

### Progress / metric bars
Always animate width from 0 on mount with the `ui` token (220ms). Never animate colour.

---

## 4. The rename: FieldTalk / Pro Path → Global Player

Do a full-repo pass. Checklist:
1. **Strings** — search case-insensitively for `fieldtalk`, `field talk`, `propath`, `pro path`, `ProPath`.
   Replace the product name with `Global Player`. Keep component/file names in the same style as the repo
   (`ProPathDashboard` → `GlobalPlayerDashboard`, etc.) and update all imports.
2. **i18n files** — update both `pt` and `en` bundles. The product name **never translates**; only the
   descriptor and slogan do. Approved pairs:
   - "Blindagem mental. Inglês de campo." / "Mental armour. Field English."
   - "Da base ao palco global." / "From the academy to the world stage."
   - "Preparado para o mundo." / "Ready for the world."
3. **Metadata** — `<title>`, Open Graph title/description/image, `manifest.json` (name, short_name, icons,
   theme_color `#020617`, background_color `#020617`), `apple-touch-icon`, favicon.
4. **Assets** — replace every old logo file with the equivalent from `brand-assets/`; delete the old ones so
   they can't be re-imported.
5. **Transactional email + PDF templates** — these usually hold a hard-coded logo URL and the old name.
6. **Legal/footer lines, email signatures, seed data, test fixtures, Storybook stories.**
7. Portuguese copy runs ~20% longer than English — after the rename, re-check every button and card in PT
   for wrapping; never fix a height to the English string.

---

## 5. Assets
`brand-assets/` — see its own README. SVG is the master format for everything on screen or in print;
PNGs are provided only for platforms that require raster (app stores, social profiles, email).

## 6. Files in this bundle
- `design-references/Global Player Design System.dc.html` — the full system (tokens, components, app shell, formats).
- `design-references/Global Player Brand Package.dc.html` — logo system + the three on-load animations, with replay controls.
- `design-references/Global Player Logo Directions.dc.html` — the original four directions (context only; 1B was chosen).
- `tailwind.tokens.js` — drop-in `theme.extend` additions.
- `GlobalPlayerLogo.tsx` — reference React component for both marks.

Open the `.dc.html` files in a browser to inspect any value directly.

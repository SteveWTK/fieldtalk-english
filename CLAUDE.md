# Global Player

## Brand

The product is **Global Player**. The former names FieldTalk and Pro Path are retired and must never
appear in code, copy, comments, tests or assets.

Bilingual PT/EN, Portuguese-first for player-facing and Brazilian marketing copy, English for
international B2B. The product name never translates — only descriptors and slogans do. Portuguese
strings run ~20% longer than English: never fix a button or card height to the English string.

## Design system

The Global Player Design System is installed at
\`.claude/skills/global-player-design-system/\` — read its \`SKILL.md\` and \`readme.md\` before
any UI work. The written spec is at \`docs/brand/HANDOFF.md\`.

Non-negotiables:

- Dark is the default. Page \`#020617\`, panel \`#0b1220\`, card \`#0f172a\`, border \`#1e293b\`.
- **Lime \`#a3e635\` has exactly one job per screen: the single next action.** One lime button per view.
  Lime is never decorative.
- **No drop shadows on dark surfaces.** Depth is the slate ramp plus a 1px hairline border.
- Signal colours (sky / violet / orange / red) are for feature identity and status only. Never brand.
- On light surfaces the accent swaps to lime 700 \`#4d7c0f\` for type and icons.
- Type: Archivo for display/headings/wordmark, Instrument Sans for body/UI, JetBrains Mono for the
  status/terminal register only. Self-hosted — never link Google Fonts CDN.
- Radius: 8 controls, 12 cards, 16 panels, full pills for buttons/chips/avatars.
- Do not introduce new brand colours, fonts, or a second accent.

## Logo

Two marks, one geometry. Copy the SVGs from the design system's \`assets/logos/\` — never redraw,
simplify or re-derive them.

- **Open bars** — default for product UI, favicon, avatars. Minimum 16px.
- **Crested** — documents, contracts, club portals, kit, banners. Minimum 32px.
  Clear space on all sides equals the height of one chevron bar. Never recolour the bars, rotate or skew
  the mark, vary stroke weights between bars, or place lime on lime.

## Copy voice

Short, declarative, unsentimental. A full stop is the emphasis. No exclamation marks (except inside
quoted touchline speech), no hype adjectives, no emoji, no first person. Numbers bare and unrounded.

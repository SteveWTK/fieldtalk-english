# Migration plan — FieldTalk / Pro Path → Global Player

The existing app is substantial and already uses the slate + lime palette, so this is a **rebrand and
uplift, not a rebuild**. The plan below is staged so the app builds and runs after every stage, and so
each stage is a reviewable PR rather than one enormous diff.

Work stage by stage. Finish and verify one before starting the next.

---

## Stage 0 — Install the system (no visual change)

1. Copy `design-system/` into the repo at `.claude/skills/global-player-design-system/`.
2. Copy `handoff/` to `docs/brand/` (or anywhere durable) so the spec and references stay with the code.
3. Add the `CLAUDE.md` block below to the repo root.
4. Convert the fonts: `design-system/assets/fonts/*.ttf` → `.woff2`, place them in the app's public
   font directory, and update the `src:` URLs in your copy of `tokens/fonts.css`.
   (`npx glyphhanger` or `fonttools` — the design system ships `.ttf` because binary font conversion
   couldn't be done in the design tool.)
5. Commit. Nothing renders differently yet.

**Prompt:** _"Install the Global Player design system skill from `.claude/skills/global-player-design-system/`.
Read its SKILL.md and readme.md and summarise back to me what tokens and components are available.
Make no changes to app code."_

---

## Stage 1 — Tokens (low risk, wide reach)

Merge `handoff/tailwind.tokens.js` into `tailwind.config` `theme.extend`. The `primary` and `accent`
ramps are unchanged from what the app already uses — this **adds** the four signal colours, the two font
families, the tracking/radius/duration tokens and the `gp-sweep` keyframe. Wire the token CSS from
`design-system/tokens/` into the global stylesheet so `var(--gp-*)` resolves.

Verify: the app looks identical except the two new font families taking effect.

**Prompt:** _"Merge handoff/tailwind.tokens.js into our Tailwind config and import the design system's
token CSS globally. Do not change any component markup. Then list every place in the codebase that
hard-codes a hex value that now has a token."_

---

## Stage 2 — The rename

The full checklist is in `handoff/HANDOFF.md` §4. In short: strings (case-insensitive `fieldtalk`,
`field talk`, `propath`, `pro path`), component and file names, both i18n bundles, metadata and Open
Graph, `manifest.json`, favicons and app icons, transactional email and PDF templates, footer legal
lines, seed data and test fixtures, Storybook stories.

Replace every old logo file with its equivalent from `design-system/assets/logos/` and
`assets/icons/`, then **delete the old files** so they can't be re-imported.

**The product name never translates.** Only descriptors and slogans localise — approved pairs are in
`HANDOFF.md` §4.2.

Verify: grep the repo for the old names and get zero hits, including in `.json`, `.md` and test files.

**Prompt:** _"Execute the rename in handoff/HANDOFF.md section 4. Work file by file, show me the diff
for each group (strings, i18n, metadata, assets, emails, fixtures), and run the test suite after each
group. Flag anything ambiguous instead of guessing."_

---

## Stage 3 — Logo and header

Add `GlobalPlayerLogo.tsx` (or generate it from the design system's `components/brand/Logo`) and
replace every old logo usage. Then rebuild the header per `HANDOFF.md` §3: open-bars mark at 28–32px
plus the wordmark, `accent-400` underline on the active nav item, and the crested variant as a
`variant` prop — **not** a second component.

Verify at 320px, 768px and 1440px, and check the favicon and PWA icon on a real device.

**Prompt:** _"Replace all logo usage with the design system Logo component, and rebuild the Header per
HANDOFF.md section 3 with open and crested variants behind one `variant` prop. Keep all existing nav
routes, auth state and locale-switcher behaviour exactly as they are."_

---

## Stage 4 — Component uplift (the "modern, high-performance" feel)

This is the stage that changes how the app feels, and the one to take slowly — **one component per PR**.
Take each from the design system rather than restyling by hand: `Button`, `IconButton`, `Input`,
`Select`, `Chip`, `Switch`, `Card`, `Panel`, `PlayerCard`, `MetricBar`, `StatTile`, `Avatar`,
`NavTabs`, `Eyebrow`, `SectionLabel`, `TierBadge`, `LocaleSwitcher`.

Suggested order, cheapest and most visible first:

1. `Button` / `IconButton` — every screen, and the **one lime CTA per view** rule starts paying off here.
2. `Card` / `Panel` — flat `#0b1220`, 1px `#1e293b`, radius 12/16, **no shadow on dark**. If the current
   app uses drop shadows in dark mode, removing them is the single biggest feel change.
3. `Input` / `Select` / `Chip` / `Switch`.
4. `MetricBar` / `StatTile` / `PlayerCard` — where the signal colours (sky = Inglês, violet = Mental,
   orange = Desempenho) land, with lime reserved for _Prontidão global_.
5. `NavTabs`, `Avatar`, `Eyebrow`, `SectionLabel`, `TierBadge`.

Compare each against `design-system/ui_kits/squad_platform/` as you go.

**Prompt (repeat per component):** _"Replace our Button with the design system's Button. Keep every
existing prop and call site working — add an adapter layer if the APIs differ. Show me the before/after
of three usages before applying it repo-wide."_

---

## Stage 5 — Motion and polish

Add the motion tokens as Tailwind durations/easings. Put **Sweep** on the landing page logo (780ms,
90ms stagger) and reserve **Crest draw** for the app splash. Animate metric-bar widths from 0 on mount
with the `ui` token. Everything falls back to a 200ms fade under `prefers-reduced-motion`.

Rules worth restating: no bounces, no springs beyond Sweep's single overshoot, no parallax, no infinite loops, no lime glow on product chrome.

---

## Stage 6 — Light mode / club portal

Only if you need the white-label view now. The accent swaps to lime 700 `#4d7c0f` for type and icons;
lime 400 stays only as a fill behind dark ink; light mode is the one surface allowed soft shadows.
Reference: `design-system/ui_kits/club_portal/`.

---

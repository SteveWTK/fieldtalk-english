# Global Player — Design System

**Version 1.0 · Direction 1B, "Ascent Crest"**

Global Player is a bilingual (Portuguese-first, English-second), **B2B-first youth-football development platform**. Brazilian academies, clubs and federations use it to prepare base-category athletes (Sub-15 / Sub-17 / Sub-20) for international transfers — not by coaching football, but by building the three things scouts can't see on a highlight reel: **blindagem mental** (mental armour), **inglês de campo** (field English) and measured **desempenho** (performance readiness). The commercial output is a *dossiê do atleta* — a player dossier European agents and clubs know how to read.

The buyer is an academy director, a club's youth coordinator, or a federation. The end user is a 15-year-old. Both live in the same product, which is why the system is dark, dense and instrument-like for the athlete, and can flip to a light, institutional register for contracts, portals and exports.

## Products in this system

| Surface | What it is | UI kit |
|---|---|---|
| **Squad platform** (web app) | The B2B product: squad roster, athlete dossiers, pathway tracks, reports, agent sharing. Dark by default, light for white-label club portals. | `ui_kits/squad_platform/` |
| **Club portal** (light) | The white-label, client-facing view of the same data: crested header, English locale, lime 700 accent, the only surface that uses shadows. | `ui_kits/club_portal/` |
| **Marketing site** | PT-first acquisition site for academies, clubes and agentes. Dark, hero-led, one lime CTA. | `ui_kits/marketing_site/` |
| **Athlete app** (mobile) | The player-facing daily surface: today's lesson, mental routine, field-English drill, readiness score. | `ui_kits/athlete_app/` |
| **Sales deck** | 16:9 deck for academies, clubs, federations and investors. | `slides/` |

## Sources this system was built from

Everything here was derived from material supplied in this project — no external brand reference, no Figma file, no codebase.

- `uploads/Global Player Brand Package.dc.html` — the logo system (crested + open bars, vertical/horizontal lockups, app-icon set), on-load motion stings, colour & type, landing hero / app splash / B2B tier device.
- `uploads/Global Player Design System.dc.html` — the authoritative spec: logo decision table, clear space & minimum sizes, "never" rules, colour ramps, type scale, radius/spacing/motion tokens, component set, both app-shell header variants, bilingual rules, and the format library (mobile, deck, social, business card, A4 dossier, pitchside board, training bib).
- `uploads/Global Player Logo Directions.dc.html` — the exploration that Direction **1B Ascent Crest** was chosen from.
- `uploads/Global Player Instagram Billboard.dc.html` — three pinned 4:5 posts in three versions; **1C shipped**. `uploads/Global Player Instagram Grid.dc.html` — the nine-tile launch grid, superseded by the billboard and kept for reference. Both are where the 540px lattice and the mono "terminal" register come from.
- `uploads/gp-*.svg` / `gp-*.png` — production logo, lockup, app-icon and favicon exports. Copied to `assets/`.
- `uploads/Archivo-*.ttf`, `uploads/InstrumentSans-*.ttf` — licensed webfonts (SIL OFL; licences copied alongside). Copied to `assets/fonts/`.

- `uploads/BUILD_BRIEF.md` — the authoritative build brief, written in the *Global Player Logo Redesign* project. Everything below is reconciled against it.

Two things the brief points at that did **not** arrive in this project: `code/HANDOFF.md` (named as "the authoritative source for every value"), `code/tailwind.tokens.js` and `GlobalPlayerLogo.tsx`; and the `social/` folder of shipped posts, billboard tiles and avatars. Where the brief defers to HANDOFF.md, values here were read out of `Global Player Design System.dc.html` instead — see *Substitutions and gaps*.

The retired names **FieldTalk** and **Pro Path** appear nowhere in this system, per the brief.

---

## CONTENT FUNDAMENTALS

### The register
Short, declarative, unsentimental. The brand is talking to people who are tired of being promised things, so it **states and measures** rather than enthusing. Sentences are often two to six words and land as verdicts.

> **Talento não basta. Preparo, sim.**
> *Talent isn't enough. Preparation is.*

> **Medido em tempo real · Não é opinião**
> *Measured in real time. Not an opinion.*

> **O ativo mais valioso do clube é o menino de 15.**
> *The club's most valuable asset is the 15-year-old.*

Note the shape: a concession followed by a correction ("Talento não basta. **Preparo, sim.**"), or a flat number offered instead of an adjective ("81", "+3x", "18 mes.", "1 painel"). Full stops inside headlines are used as punches — `TALENTO / NÃO / BASTA.` sets on three lines with the period kept.

### Person
- **Third person or no person at all** in B2B copy: "Preparação completa para atletas de base", "Retorno para o clube". The product describes the athlete to the buyer.
- **Second person (você / implied tu)** only in the athlete app, and even there it's imperative rather than chummy: "Fala com o treinador", "Rotina pré-jogo: 4 minutos", "Começar".
- **Never first person.** The brand has no "we're excited to…" voice. No "our mission".

### Portuguese first, English second
PT is the primary locale; EN is the export locale. The rules:
- **"Global Player" never translates.** Always Archivo 900 caps at 0.15–0.2em tracking, in every locale.
- Only the **descriptor and slogan** localise. Established pairs:
  - *Blindagem mental. Inglês de campo.* → Mental armour. Field English.
  - *Da base ao palco global.* → From the academy to the world stage.
  - *Preparado para o mundo.* → Ready for the world.
- **Feature names stay Portuguese in the PT product** even when the subject is English: the module is *Inglês de campo*, and the drill content inside it is English in quotes — `"Man on!"`, `"Hold the line."`, `"Switch it."` The quotes are load-bearing; they mark real touchline speech vs textbook English.
- PT strings run **~20% longer** than EN. Never fix a button or card height to the English string; test in PT first.

### Casing
- **UPPERCASE** for the wordmark, buttons, eyebrows, labels, mono status lines, and social headlines. Always with tracking (0.12em buttons, 0.2–0.3em eyebrows/labels, 0.15–0.2em wordmark).
- **Sentence case** for headlines in product and marketing (`Elenco Sub-17`, `Blindagem mental e valorização internacional para atletas de base.`) — *except* on social, where headlines go full caps.
- **Sentence case** for body, always. No Title Case Sentences anywhere.

### Numbers and data
Numbers are the brand's rhetoric. Percentages unrounded and bare (`72%`, `81%`, `74%`), counts bare (`28`, `9`), deltas with a sign (`+3x`), durations abbreviated (`18 mes.`, `4 minutos`). Set big numbers in Archivo 900. Never dress a number in a badge or an arrow-up icon.

### Punctuation
**No exclamation marks and no hype adjectives.** A full stop is the brand's emphasis. The only exclamation marks in the whole system are inside quoted touchline speech — `"Man on!"` — where they're transcription, not tone.

### Emoji
**Never**, with one exception the brief allows: a single flag emoji in a social bio. Not in product, not in marketing, not in social. Status is carried by colour and by mono text (`SISTEMA ATIVO`, `01 / 09`), never by a glyph.

### Micro-copy examples worth copying
`Novo atleta` · `Export dossier` · `Falar com vendas` · `Ver a plataforma` · `Começar` · `ENTRAR` · `Atualizado há 2 dias · Updated 2 days ago` · `Relatório mensal para o agente` · `Dossiê do atleta · 2026 · Confidencial` · `Prontidão global` · `Prontidão média`

---

## VISUAL FOUNDATIONS

### The idea
One drawing, two states. Three rising chevron bars — slate 500, slate 400, lime 400 — read as an ascent: the athlete's trajectory. Put a shield around them and you have the **crest** (authority: contracts, club portals, federation decks, kit, pitchside). Take the shield away and you have the **open bars** (modern, minimal: app icon, product UI, motion, social, favicon). Nothing is redrawn between the two — same chevrons, same angles, same spacing.

### Colour
- **Slate is the ground — roughly 80% of every surface.** Nine steps, 50 → 900, plus two dark working surfaces: `#0b1220` (panel) and `#060a12` (the outermost page behind panels).
- **Lime `#a3e635` is the accent with exactly one job per screen: the single next action.** One lime button per view. Lime is also the top chevron bar and the active-nav underline — that's it.
- The crest's three bars are **the only place the neutral ramp and the accent meet by rule**: slate 500 / slate 400 rising into lime 400. Never recolour the top bar.
- **Signal colours** — sky `#38bdf8` (Inglês), violet `#c084fc` (Mental), orange `#fb923c` (Desempenho), red `#f87171` (Alerta) — differentiate features and status only. They are never brand colours and never appear in a logo.
- **Light-mode rule:** on white, lime 400 fails contrast for small text. Swap the accent to **lime 700 `#4d7c0f`** for type and icons; keep lime 400 only as a *fill* behind dark ink.
- Dark is the default. Light mode is a deliberate swap for client-facing, printed and white-label surfaces — not a user preference toggle in the athlete app.

### Type
- **Archivo** — display, wordmark, headlines, buttons, big numbers. 900 for display and the wordmark; 800 for H1, button labels and stat figures; 700 for H2/H3; **500 italic** for eyebrows and the slogan.
- **Instrument Sans** — body, UI, captions, form labels. 400 / 500 / 600.
- **JetBrains Mono** — the status / terminal register: social captions (`SISTEMA ATIVO`, `01 / 09`, `MEDIDO EM TEMPO REAL`), drill lines, system readouts. Not used in product chrome or marketing body copy.
- Display tracking is negative (`-0.02em` to `-0.05em`) and leading is tight (0.88–1.02) — headlines are set as dense blocks. Body leading is generous (1.6–1.65). Eyebrows and labels go the other way: uppercase, 0.26–0.4em, 10–13px, often lime italic.
- Both families carry Portuguese diacritics cleanly at UI sizes. Check `ã ç õ é ê í ó ú à` in any new cut.

### Space and layout
4pt base; the ladder actually used is **8 / 12 / 16 / 24 / 32 / 48 / 64**. Card gutters are 24px, panel padding 34px, card padding 20px, page padding 72px on large canvases, and section gaps 88px. Layouts are grid-first with explicit `gap` — nothing is spaced by margins on siblings.

Product screens are a header plus a padded body; specimen and brand canvases are a single column of sections divided by 1px slate-700 rules. Nothing is centred except splashes, app icons, story-format social and the pitchside board.

**Logo clear space = the height of one chevron bar** on all four sides. Minimum sizes: **crest 32px**, **open bars 16px** (below 32px the crest closes up — swap to open bars at heavier stroke).

### Backgrounds
Four, and no more — and no gradient beyond these subtle radial washes:
1. **Flat slate** — `#020617` page, `#0b1220` panel. The default for 90% of product.
2. **Radial washes over `#020617`** — three sanctioned tints and no others: lime `#1a2e05` (the corner bloom behind landing heroes and deck title slides), blue `#101c34` (social top-left), centre blue `#0f1c33` (social centre tile). Always a *bloom* anchored to a corner or the centre — never a full-canvas wash, never diagonal, never a linear gradient.
3. **The 540px lattice** — 1px `rgba(148,163,184,0.10)` rules at 540px intervals, used on social so a 3×3 grid reads as one continuous dashboard. Paired with 2px lime tracer lines and small glowing nodes at the intersections. Social only.
4. **Solid lime** — full-bleed `#a3e635` with `#0f172a` ink, for one-in-nine social tiles, training bibs and app icons.

No photography is specified in the supplied material. **There are no brand photographs or illustrations in this system** — where imagery would go, the material uses a lime or ink field, a big Archivo 900 statement, or the lattice. If photography is added later the brief implies dark, cool, high-contrast pitch imagery cropped so the bars sit in the left third; treat that as unconfirmed.

### Motion
Four durations, two curves, and a hard ceiling:
- **Micro 120ms `ease-out`** — hovers, chip toggles.
- **UI 220ms `cubic-bezier(.22,1,.36,1)`** — panels, drawers, tab changes.
- **Entrance 620ms, same curve, 110ms stagger** — page and card entrances.
- **Brand sting ≤ 1.2s.** Three approved stings: **Stack** (bars rise bottom-up, 130ms apart — calmest), **Sweep** (slides in with a slight overshoot — most athletic; use on the landing page), **Crest draw** (shield draws, bars stamp in, lime flashes — cinematic; reserved for video intros and the app splash).
- Everything respects `prefers-reduced-motion` by falling back to a 200ms fade. No bounces, no springs beyond the single overshoot in Sweep, no parallax, no infinite loops.

### States
- **Hover** — lime primary lifts *lighter* to lime 300 `#bef264`; secondary/ghost brightens its border to slate 500 and its label to slate 50; nav items go from slate 400 to slate 50. Never darken on hover in dark mode.
- **Press** — colour only: lime 500 `#84cc16`. No scale-down, no translate.
- **Focus** — 2px lime 400 ring at 2px offset (in light mode, lime 700). Focus-visible only.
- **Selected** — a 2px lime underline for nav, a filled lime pill for chips, a lime border for the active input/select.
- **Disabled** — slate 700 fill with `#64748b` label. No opacity fades on interactive elements.

### Borders, radii, shadows
- **1px `#1e293b` everywhere on dark**; `#131d2e` for the subtle inner rules inside tables. 1px `#e2e8f0` on light.
- Radii: **8px** controls (inputs, selects, small tiles) · **12px** cards · **16px** panels · **18px** app icons · **26px** device frames · **full pills** for every button, chip, tag and avatar.
- **Dark surfaces carry no drop shadow.** Depth is the slate ramp plus a hairline border — a card is `#020617` on a `#0b1220` panel, or `#0b1220` on `#020617`. Shadows exist only in light mode, and softly.
- A **lime glow** (`0 0 22px rgba(163,230,53,0.45)`) is permitted on social tracer lines and nodes, and on the big social stat number as a text-shadow. Never on product chrome or buttons.
- No transparency or blur in product chrome — no frosted headers, no scrims. Transparency appears only as the low-alpha lattice rules and the fades at the ends of social tracer lines.
- Progress tracks are 5–6px tall, radius 3px, slate 700 track with a signal-coloured or lime fill. Never a ring/donut.

### What a card looks like
Flat `#0b1220` (or `#020617` when nested), 1px `#1e293b`, radius 12px (16px if it's a panel), 20px padding, contents stacked with a 12–16px gap, and an 11px uppercase 0.22–0.3em slate-500 label on top. No shadow. No coloured left border. No rounded-corner-plus-accent-stripe patterns.

---

## ICONOGRAPHY

**Lucide is the UI icon set** — confirmed as what Global Player has been using, and carried through the rebrand. It is wrapped as `Icon` so the drawing is locked: `stroke-width: 2`, `stroke-linecap: round`, a 20px box in dense UI and 24px in headers, `currentColor` so it inherits its context. Icons sit at `--gp-text-muted` at rest and `--gp-text-primary` on hover; on light surfaces they follow the accent swap to lime 700. `IconButton` puts one glyph in a square pill (32 / 40 / 48px — use 40 or 48 on mobile so the target clears 44px) and requires a `label`, so no icon-only control ships unlabelled. The library loads once, lazily, from the pinned UMD bundle `unpkg.com/lucide@0.544.0`.

Lucide never replaces the brand mark, and the chevron bars are never used as an icon.

Beyond Lucide, the material carries its own non-pictorial vocabulary, and it does most of the work:

1. **The brand mark, and only as the mark.** The chevron bars appear at 20–60px in headers, cards, avatars, splash and social, in full tonal (three colours), mono, or single-colour cut. All eight production SVGs and their PNG fallbacks are in `assets/logos/` and `assets/icons/`. Use them; never redraw them.
2. **The tier device** — a progressive version of the mark where 1 / 2 / 3 bars encode the commercial tier (Academia / Clube / Federação). This is the one sanctioned derivative of the logo. Shipped as `TierBadge`.
3. **Unicode glyphs, sparingly**, where a control needs an affordance: `▾` (U+25BE) for select carets, `›` (U+203A) as a list bullet in the social/mono register, `·` (U+00B7) as the universal metadata separator, `—` and `→` in mono status lines. These are set in the surrounding font, coloured lime or slate — they are typography, not icons.
4. **Bars, dots and rules instead of pictograms.** Progress bars, 8px segment pips, 9px histogram columns, 2–3px accent rules and 14px glowing nodes carry most of the meaning that an icon set would otherwise carry.
5. **No emoji. No icon font. No PNG icon sprites.** The one sanctioned exception the brief allows is a single flag emoji in a social bio. The `assets/icons/` directory holds app icons and favicons only — Lucide is loaded as code, not stored as files.

---

## Substitutions and gaps — please confirm

- **`code/HANDOFF.md` was not supplied**, though the brief names it as the authoritative source for every value. Every token here was read directly out of `Global Player Design System.dc.html`, so the ramps, type scale, spacing, radius and motion figures should match — but if HANDOFF.md or `tailwind.tokens.js` disagrees anywhere, they win. Send them and I'll diff.
- **Fonts ship as `.ttf`, not `.woff2`.** The brief asks for woff2; font-binary conversion isn't something I can do here. Variable files carry the correct `font-weight` ranges (Archivo 100–900, Instrument Sans 400–700, JetBrains Mono 100–800) and static cuts are declared as `* Static` fallback families. Run the conversion in the build pipeline and swap the `src:` URLs in `tokens/fonts.css`.
- **The `social/` folder never arrived** — no 1080×1080 posts, no 1080×1350 billboard tiles (version 1C), no avatars. The social system is documented from the reference documents but no shipped asset is in `assets/`.
- **No photography or illustration exists anywhere in the material.** Confirm whether photography is in scope; if so a direction needs establishing.

---

## Index

**Root**
- `styles.css` — the single entry point consumers link. `@import` lines only.
- `readme.md` — this file.
- `SKILL.md` — Agent-Skills-compatible entry point.
- `thumbnail.html` — homepage tile.

**`tokens/`** — `fonts.css` · `colors.css` · `typography.css` · `spacing.css` · `radius.css` · `elevation.css` · `motion.css` · `semantic.css` (dark default + `[data-gp-theme="light"]`).

**`assets/`**
- `fonts/` — Archivo + Instrument Sans (variable and static cuts) with OFL licences.
- `logos/` — crest and open-bar marks in tonal / mono-white / mono-ink / mono-lime / currentColor, four lockups (horizontal + vertical × crest + open, dark + light), PNG fallbacks at 1000px.
- `icons/` — app icons (dark / light / lime, SVG + 1024px PNG) and favicons (SVG, 32, 64).

**`guidelines/`** — foundation specimen cards (Brand, Colors, Type, Spacing groups) shown in the Design System tab.

**`components/`** — the brief's inventory, built in full:
- `brand/` — `Logo`, `Lockup`, `TierBadge`
- `core/` — `Button`, `Card`, `Panel`\*, `Eyebrow`\*, `SectionLabel`\*
- `icons/` — `Icon`\*, `IconButton`
- `forms/` — `Input`, `Select`, `Chip`, `Switch`
- `data/` — `StatTile`, `MetricBar`, `PlayerCard`, `Avatar`\*
- `navigation/` — `Header` (open + crested), `NavTabs`\*, `LocaleSwitcher`

**Intentional additions** (\* above) — five primitives the brief doesn't list, each needed by a surface it does:
- `Panel` — the 16px-radius section container every screen in the master reference is built from; without it each kit re-declares the same padding and border.
- `Eyebrow` and `SectionLabel` — the Archivo-500-italic-lime kicker and the upright 11px slate label. They appear on nearly every card in the reference and are the two easiest things to get wrong by hand.
- `Avatar` — required by `PlayerCard` and both header variants.
- `NavTabs` — extracted from `Header` so the underline-active pattern can be reused inside a page.
- `Icon` — the Lucide wrapper that locks stroke-width 2 and `currentColor`; `IconButton` (which the brief does list) needs it.

**`ui_kits/`** — `squad_platform/` (dark product app) · `club_portal/` (light white-label) · `marketing_site/` · `athlete_app/`

**`templates/`** — starting folders a consuming project copies: `squad-dashboard/` (app screen), `marketing-landing/` (landing page), `sales-deck/` (5-slide 16:9 deck on `deck-stage`). Each loads this system through its own `ds-base.js`.

**`slides/`** — `TitleSlide`, `StatSlide`, `ModuleSlide`, `QuoteSlide`, `ClosingSlide` (1280×720 cards).

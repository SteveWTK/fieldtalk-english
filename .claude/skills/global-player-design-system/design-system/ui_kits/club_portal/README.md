# Club portal (light) — UI kit

The white-label, client-facing view: the **crested** header variant, English locale, and the whole tree wrapped in `data-gp-theme="light"`.

What changes versus the dark product app — and nothing else does:
- Accent swaps to **lime 700 `#4d7c0f`** for type and icons. Lime 400 survives only as a fill behind dark ink.
- Primary buttons become ink-on-white, not lime.
- Cards pick up `--gp-shadow-light-card` — light mode is the only place a shadow is allowed.
- Focus rings are lime 700 on a white halo.

**Click-through:** **U17 Squad** (KPI row, filters, roster) → click any player → **Player dossier** (readiness 81, three pathways, PT/EN export rows).

Screens: `PortalHeader.jsx` · `PortalSquad.jsx` · `PortalDossier.jsx`, mounted by `app.jsx`.

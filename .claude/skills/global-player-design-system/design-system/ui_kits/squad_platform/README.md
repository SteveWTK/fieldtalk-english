# Squad platform — UI kit

The B2B web app. Dark by default; the crested header + `data-gp-theme="light"` is the white-label club-portal swap (see `components/navigation/navigation.card.html`).

**Click-through:** login → **Elenco** (KPI row, module filters, roster of PlayerCards) → click any athlete → **Dossiê** (readiness 81, three trilhas, session history, PT/EN export) → *Enviar ao agente* → **Relatórios** (per-track readiness, squad table, agent sharing, tier plan).

Screens: `Login.jsx` · `Squad.jsx` · `Dossier.jsx` · `Reports.jsx`, mounted by `app.jsx`.

Everything is composed from the bundled primitives — `Header`, `NavTabs`, `LocaleSwitcher`, `Button`, `Input`, `Select`, `Chip`, `Switch`, `Card`, `Panel`, `StatTile`, `MetricBar`, `PlayerCard`, `Avatar`, `Logo`, `TierBadge`, `Eyebrow`, `SectionLabel`. No primitive is re-implemented here.

Copy is Portuguese-first; every string has an EN pair in `readme.md` → *Content fundamentals*.

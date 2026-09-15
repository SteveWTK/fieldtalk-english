The app shell header — one per screen.

```jsx
<Header items={["Elenco","Trilhas","Relatórios","Agentes"]} active="Elenco" onSelect={setTab} />
<Header variant="crest" items={["Squad","Pathways","Reports","Agents"]} active="Squad" locale="en" />
```

Wrap the crest variant in `data-gp-theme="light"` for club portals and investor demos.

const { TierBadge, Button, Panel, SectionLabel, Eyebrow } = window.GlobalPlayerDesignSystem_019dfe;

const TIERS = [
  { tier: "academia", name: "Academia", blurb: "Uma categoria, trilhas essenciais.", points: ["1 elenco", "Trilhas core", "Relatório mensal"] },
  { tier: "clube", name: "Clube", blurb: "Todas as divisões de base, radar de skills.", points: ["Todas as categorias", "Radar de skills", "Portal do clube"], featured: true },
  { tier: "federacao", name: "Federação", blurb: "Multi-clube, dossiês para exportação.", points: ["Multi-clube", "Dossiês PT · EN", "API de exportação"] },
];

function Tiers() {
  return (
    <section style={{ padding: "84px 56px", display: "flex", flexDirection: "column", gap: 34, borderTop: "1px solid var(--gp-border-default)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <Eyebrow>Planos</Eyebrow>
        <h2 style={{ margin: 0, fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 40, letterSpacing: "-0.03em", color: "var(--gp-slate-50)" }}>Do elenco à federação</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 24 }}>
        {TIERS.map((t) => (
          <Panel key={t.tier} style={{ gap: 20, borderColor: t.featured ? "var(--gp-lime-400)" : undefined }}>
            <TierBadge tier={t.tier} size={36} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 800, fontSize: 26, color: "var(--gp-text-primary)" }}>{t.name}</div>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--gp-text-muted)" }}>{t.blurb}</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
              {t.points.map((p, i) => (
                <div key={p} style={{ padding: "11px 0", borderTop: "1px solid var(--gp-border-subtle)", fontSize: 14, color: "var(--gp-text-secondary)" }}>{p}</div>
              ))}
            </div>
            <Button variant={t.featured ? "primary" : "secondary"} size="sm">Falar com vendas</Button>
          </Panel>
        ))}
      </div>
    </section>
  );
}
Object.assign(window, { Tiers });

const { Lockup, SectionLabel } = window.GlobalPlayerDesignSystem_019dfe;

function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--gp-border-default)", background: "var(--gp-slate-950)", padding: "56px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 34, alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Lockup mark="open" size={24} />
          <div style={{ fontSize: 13, lineHeight: 1.6, color: "var(--gp-text-faint)", maxWidth: 280 }}>Da base ao palco global.<br />From the academy to the world stage.</div>
        </div>
        {[["Produto", ["Plataforma", "Trilhas", "Dossiê do atleta", "Portal do clube"]], ["Para quem", ["Academias", "Clubes", "Federações", "Agentes"]], ["Empresa", ["Sobre", "Contato", "Privacidade", "Termos"]]].map(([h, items]) => (
          <div key={h} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <SectionLabel>{h}</SectionLabel>
            {items.map((i) => <a key={i} href="#" style={{ fontSize: 13, color: "var(--gp-text-muted)", textDecoration: "none" }}>{i}</a>)}
          </div>
        ))}
      </div>
      <div style={{ marginTop: 44, paddingTop: 22, borderTop: "1px solid var(--gp-border-subtle)", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, fontSize: 12, color: "var(--gp-text-faint)" }}>
        <span>globalplayer.com · São Paulo, BR</span>
        <span>© 2026 Global Player</span>
      </div>
    </footer>
  );
}
Object.assign(window, { SiteFooter });

const { Logo, SectionLabel } = window.GlobalPlayerDesignSystem_019dfe;

const STATS = [
  { v: "+3x", l: "prontidão para trial", lime: true },
  { v: "18 mes.", l: "ciclo de preparação" },
  { v: "1 painel", l: "para todo o elenco" },
];

function StatSlide() {
  return (
    <div style={{ width: 1280, height: 720, background: "var(--gp-bg-panel)", padding: 88, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 56, fontFamily: "var(--gp-font-text)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 800, fontSize: 46, letterSpacing: "-0.02em", color: "var(--gp-slate-50)" }}>Retorno para o clube</div>
        <Logo mark="open" size={34} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 34, flex: 1 }}>
        {STATS.map((s) => (
          <div key={s.v} style={{ borderTop: `3px solid ${s.lime ? "var(--gp-lime-400)" : "var(--gp-slate-600)"}`, paddingTop: 28, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 68, lineHeight: 1, letterSpacing: "-0.03em", color: "var(--gp-slate-50)" }}>{s.v}</div>
            <div style={{ fontSize: 24, lineHeight: 1.4, color: "var(--gp-text-muted)" }}>{s.l}</div>
          </div>
        ))}
      </div>
      <SectionLabel size={14}>Base de 28 atletas · ciclo 2025–2026</SectionLabel>
    </div>
  );
}
Object.assign(window, { StatSlide });

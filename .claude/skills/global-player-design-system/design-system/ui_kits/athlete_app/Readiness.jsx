const { Button, MetricBar, Card, Eyebrow, SectionLabel, Logo } = window.GlobalPlayerDesignSystem_019dfe;

function Readiness({ onBack }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Button variant="ghost" size="sm" onClick={onBack}>← Hoje</Button>
        <Logo mark="open" size={17} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "14px 0" }}>
        <SectionLabel>Prontidão global</SectionLabel>
        <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 96, lineHeight: 0.82, letterSpacing: "-0.05em", color: "var(--gp-lime-400)", textShadow: "0 0 70px rgba(163,230,53,0.35)" }}>81</div>
        <div style={{ display: "flex", gap: 8 }}>
          {[1, 1, 1, 1, 0].map((on, i) => <span key={i} style={{ width: 34, height: 8, borderRadius: 4, background: on ? "var(--gp-lime-400)" : "var(--gp-slate-700)" }} />)}
        </div>
        <div style={{ fontFamily: "var(--gp-font-mono)", fontSize: 11, letterSpacing: "0.16em", color: "var(--gp-text-faint)", textAlign: "center" }}>MEDIDO EM TEMPO REAL · NÃO É OPINIÃO</div>
      </div>
      <Card nested style={{ gap: 14, borderRadius: 14 }}>
        <MetricBar label="Inglês de campo" value={72} signal="english" />
        <MetricBar label="Blindagem mental" value={64} signal="mental" />
        <MetricBar label="Desempenho" value={58} signal="performance" />
      </Card>
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
        <Eyebrow size={10}>Preparado para o mundo</Eyebrow>
        <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--gp-text-muted)" }}>O teu dossiê vai ao agente no fim do mês.</div>
      </div>
    </div>
  );
}
Object.assign(window, { Readiness });

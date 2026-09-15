const { Panel, SectionLabel, Button, Switch, MetricBar, Avatar, Chip, TierBadge } = window.GlobalPlayerDesignSystem_019dfe;

function Reports() {
  const [monthly, setMonthly] = React.useState(true);
  const [dossier, setDossier] = React.useState(false);
  return (
    <div style={{ padding: "34px 26px", display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 24, alignItems: "start" }}>
      <Panel eyebrow="Relatórios" title="Prontidão por trilha" meta="Sub-17 · 28 atletas">
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <MetricBar label="Inglês de campo" value={68} signal="english" />
          <MetricBar label="Blindagem mental" value={61} signal="mental" />
          <MetricBar label="Desempenho" value={55} signal="performance" />
          <MetricBar label="Prontidão global" value={74} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0, marginTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr .8fr .8fr .8fr", padding: "10px 0", borderBottom: "1px solid var(--gp-border-default)" }}>
            {["Atleta", "Inglês", "Mental", "Global"].map((h) => <SectionLabel key={h} size={11}>{h}</SectionLabel>)}
          </div>
          {[["Thiago Rocha", "TR", 84, 79, 88], ["Lucas Ferreira", "LF", 72, 64, 81], ["Bruno Matheus", "BM", 58, 71, 66], ["Igor Nascimento", "IN", 41, 52, 47]].map(([n, i, a, b, c]) => (
            <div key={n} style={{ display: "grid", gridTemplateColumns: "1.6fr .8fr .8fr .8fr", alignItems: "center", padding: "12px 0", borderBottom: "1px solid var(--gp-border-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}><Avatar initials={i} size={30} /><span style={{ fontSize: 14, color: "var(--gp-text-secondary)" }}>{n}</span></div>
              <span style={{ fontSize: 14, color: "var(--gp-signal-english)" }}>{a}%</span>
              <span style={{ fontSize: 14, color: "var(--gp-signal-mental)" }}>{b}%</span>
              <span style={{ fontFamily: "var(--gp-font-display)", fontWeight: 800, fontSize: 15, color: c >= 74 ? "var(--gp-lime-400)" : "var(--gp-text-muted)" }}>{c}%</span>
            </div>
          ))}
        </div>
      </Panel>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <Panel eyebrow="Agentes" title="Compartilhamento" style={{ gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Switch checked={monthly} onChange={setMonthly} label="Relatório mensal para o agente" />
            <Switch checked={dossier} onChange={setDossier} label="Acesso ao dossiê completo" />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Chip>3 agentes ativos</Chip>
            <Chip selected>2 clubes UE</Chip>
          </div>
          <Button size="sm">Convidar agente</Button>
        </Panel>
        <Panel eyebrow="Plano" title="Clube" style={{ gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[["academia", "Academia", "Single squad, core lessons"], ["clube", "Clube", "All youth divisions, skill radar"], ["federacao", "Federação", "Multi-club, export dossiers"]].map(([t, n, d]) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 16, opacity: t === "clube" ? 1 : 0.55 }}>
                <TierBadge tier={t} />
                <div><div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 700, fontSize: 16, color: "var(--gp-slate-100)" }}>{n}</div><div style={{ fontSize: 12, color: "var(--gp-text-faint)" }}>{d}</div></div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
Object.assign(window, { Reports });

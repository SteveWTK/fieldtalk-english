const { Panel, SectionLabel, MetricBar, Eyebrow, Card } = window.GlobalPlayerDesignSystem_019dfe;

const MODULES = [
  { signal: "english", title: "Inglês de campo", body: "O idioma que o jogador usa. Não o do livro didático.", lines: ['"Man on!"', '"Hold the line."', '"Switch it."'], value: 72 },
  { signal: "mental", title: "Blindagem mental", body: "Rotina pré-jogo, gestão de erro, entrevista simulada.", lines: ["Rotina pré-jogo · 4 min", "Pós-erro · 6 min", "Entrevista · 12 min"], value: 64 },
  { signal: "performance", title: "Desempenho", body: "Medido em ciclos de seis semanas. Não é opinião.", lines: ["Sprint 30m", "Recuperação", "Carga semanal"], value: 58 },
];

function Modules() {
  return (
    <section style={{ padding: "84px 56px", display: "flex", flexDirection: "column", gap: 34, borderTop: "1px solid var(--gp-border-default)" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 680 }}>
        <Eyebrow>Método</Eyebrow>
        <h2 style={{ margin: 0, fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 40, lineHeight: 1, letterSpacing: "-0.03em", color: "var(--gp-slate-50)" }}>Talento não basta. Preparo, sim.</h2>
        <p style={{ margin: 0, fontSize: 16, lineHeight: 1.6, color: "var(--gp-text-muted)" }}>Três camadas: mente, idioma e desempenho. Medidas, não prometidas.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 24 }}>
        {MODULES.map((m) => (
          <Panel key={m.title} style={{ gap: 18 }}>
            <div style={{ height: 3, width: 64, background: `var(--gp-signal-${m.signal})` }} />
            <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 800, fontSize: 24, color: "var(--gp-text-primary)" }}>{m.title}</div>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--gp-text-muted)" }}>{m.body}</p>
            <Card nested style={{ gap: 10 }}>
              {m.lines.map((l) => (
                <div key={l} style={{ display: "flex", gap: 12, alignItems: "baseline", fontFamily: "var(--gp-font-mono)", fontSize: 14, color: "var(--gp-slate-300)" }}>
                  <span style={{ color: `var(--gp-signal-${m.signal})` }}>›</span><span>{l}</span>
                </div>
              ))}
            </Card>
            <MetricBar label="Média do elenco" value={m.value} signal={m.signal} />
          </Panel>
        ))}
      </div>
    </section>
  );
}
Object.assign(window, { Modules });

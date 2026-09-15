const { Logo, Eyebrow, MetricBar } = window.GlobalPlayerDesignSystem_019dfe;

const MODULES = [
  { signal: "english", t: "Inglês de campo", b: "O idioma que o jogador usa. Não o do livro didático.", v: 72 },
  { signal: "mental", t: "Blindagem mental", b: "Rotina pré-jogo, gestão de erro, entrevista simulada.", v: 64 },
  { signal: "performance", t: "Desempenho", b: "Medido em ciclos de seis semanas. Não é opinião.", v: 58 },
];

function ModuleSlide() {
  return (
    <div style={{ width: 1280, height: 720, background: "var(--gp-slate-900)", padding: 88, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 48, fontFamily: "var(--gp-font-text)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Eyebrow size={15}>Método</Eyebrow>
          <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 58, lineHeight: 1, letterSpacing: "-0.03em", color: "var(--gp-slate-50)" }}>Três camadas.<br />Medidas, não prometidas.</div>
        </div>
        <Logo mark="open" size={34} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 34, flex: 1 }}>
        {MODULES.map((m) => (
          <div key={m.t} style={{ border: "1px solid var(--gp-border-default)", borderRadius: 16, background: "var(--gp-bg-panel)", padding: 34, display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ height: 4, width: 76, background: `var(--gp-signal-${m.signal})` }} />
            <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 800, fontSize: 30, color: "var(--gp-slate-50)" }}>{m.t}</div>
            <div style={{ fontSize: 20, lineHeight: 1.5, color: "var(--gp-text-muted)", flex: 1 }}>{m.b}</div>
            <MetricBar label="Média do elenco" value={m.v} signal={m.signal} style={{ fontSize: 18 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
Object.assign(window, { ModuleSlide });

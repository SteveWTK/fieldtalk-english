const { Button, Avatar, MetricBar, Card, Panel, SectionLabel, Eyebrow, Chip, Logo } = window.GlobalPlayerDesignSystem_019dfe;

const MODULES = [
  { name: "Inglês de campo", signal: "english", value: 72, note: '12 de 18 aulas · última: "Man on!"' },
  { name: "Blindagem mental", signal: "mental", value: 64, note: "Rotina pré-jogo · 9 sessões" },
  { name: "Desempenho", signal: "performance", value: 58, note: "Testes físicos · ciclo 3 de 6" },
];

function Dossier({ player, onBack, onShare }) {
  const p = player || { name: "Lucas Ferreira", initials: "LF", meta: "Sub-17 · Meia · Santos FC" };
  return (
    <div style={{ padding: "34px 26px", display: "flex", flexDirection: "column", gap: 24 }}>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ alignSelf: "flex-start" }}>← Elenco</Button>

      <div style={{ borderRadius: "var(--gp-radius-panel)", border: "1px solid var(--gp-border-default)", background: "var(--gp-grad-panel)", padding: 34, display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
        <Avatar initials={p.initials} size={72} />
        <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
          <Eyebrow size={11}>Dossiê do atleta · 2026 · Confidencial</Eyebrow>
          <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 38, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--gp-text-primary)" }}>{p.name}</div>
          <div style={{ fontSize: 14, color: "var(--gp-text-muted)" }}>{p.meta}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <SectionLabel>Prontidão global</SectionLabel>
            <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 56, lineHeight: 1, color: "var(--gp-lime-400)" }}>81</div>
          </div>
          <Button size="sm" onClick={onShare}>Enviar ao agente</Button>
        </div>
        <Logo mark="crest" size={78} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        <Panel eyebrow="Trilhas" title="Três camadas">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {MODULES.map((m) => (
              <Card key={m.name} nested>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
                  <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 700, fontSize: 17, color: "var(--gp-text-primary)" }}>{m.name}</div>
                  <Chip selected signal={m.signal}>{m.value}%</Chip>
                </div>
                <MetricBar label={m.note} value={m.value} signal={m.signal} />
              </Card>
            ))}
          </div>
        </Panel>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <Panel eyebrow="Histórico" title="Últimas sessões" style={{ gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {[["Rotina pré-jogo", "há 2 dias", "mental"], ['Drill "Switch it."', "há 4 dias", "english"], ["Teste de sprint", "há 1 semana", "performance"], ["Entrevista simulada EN", "há 2 semanas", "english"]].map(([t, w, s], i) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderBottom: i < 3 ? "1px solid var(--gp-border-subtle)" : "none" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: `var(--gp-signal-${s})`, flex: "none" }} />
                  <span style={{ flex: 1, fontSize: 14, color: "var(--gp-text-secondary)" }}>{t}</span>
                  <span style={{ fontSize: 12, color: "var(--gp-text-faint)" }}>{w}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel eyebrow="Exportar" title="Dossiê" style={{ gap: 16 }}>
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--gp-text-muted)" }}>A4 bilingue, crest na capa. Agentes e clubes europeus leem o mesmo documento.</div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button variant="secondary" size="sm">PT · PDF</Button>
              <Button variant="secondary" size="sm">EN · PDF</Button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
Object.assign(window, { Dossier });

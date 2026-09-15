const { Button, Card, Eyebrow, MetricBar, SectionLabel } = window.GlobalPlayerDesignSystem_019dfe;

const LESSONS = {
  english: { label: "Inglês de campo", signal: "english", title: 'Man on!', body: "O companheiro avisa que um adversário vem atrás de ti. Resposta curta, sem parar a jogada.", lines: ['"Man on!"', '"Time!"', '"Switch it."'], value: 45 },
  mental: { label: "Blindagem mental", signal: "mental", title: "Rotina pré-jogo", body: "Quatro minutos: respiração, foco no primeiro toque, uma frase de comando.", lines: ["Respiração 4-7-8", "Primeiro toque", "Frase de comando"], value: 62 },
};

function Lesson({ kind, onBack, onDone }) {
  const l = LESSONS[kind] || LESSONS.english;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }}>
        <Button variant="ghost" size="sm" onClick={onBack}>← Hoje</Button>
        <SectionLabel>3 / 6</SectionLabel>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: "0 8px" }}>
        <div style={{ fontSize: 11, color: `var(--gp-signal-${l.signal})`, letterSpacing: "0.22em", textTransform: "uppercase" }}>{l.label}</div>
        <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 30, lineHeight: 1.02, letterSpacing: "-0.02em", color: "var(--gp-text-primary)" }}>{l.title}</div>
        <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6, color: "var(--gp-text-muted)" }}>{l.body}</p>
      </div>
      <Card nested style={{ gap: 14, borderRadius: 14 }}>
        {l.lines.map((s) => (
          <div key={s} style={{ display: "flex", gap: 12, alignItems: "baseline", fontFamily: "var(--gp-font-mono)", fontSize: 15, color: "var(--gp-slate-200)" }}>
            <span style={{ color: `var(--gp-signal-${l.signal})` }}>›</span><span>{s}</span>
          </div>
        ))}
      </Card>
      <MetricBar label="Progresso do módulo" value={l.value} signal={l.signal} />
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        <Button size="lg" fullWidth onClick={onDone}>Concluir</Button>
        <Button variant="ghost" size="sm" onClick={onBack} style={{ alignSelf: "center" }}>Fazer depois</Button>
      </div>
    </div>
  );
}
Object.assign(window, { Lesson });

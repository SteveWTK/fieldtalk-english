const { Logo, Avatar, Button, Card, MetricBar, Eyebrow, Chip } = window.GlobalPlayerDesignSystem_019dfe;

function Today({ onOpen }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 8px" }}>
        <Logo mark="open" size={19} sting="sweep" />
        <Avatar initials="LF" size={30} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "0 8px" }}>
        <Eyebrow size={11}>Hoje</Eyebrow>
        <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 26, lineHeight: 1.05, color: "var(--gp-text-primary)" }}>Fala com o<br />treinador</div>
      </div>
      <Card nested onClick={() => onOpen("english")} style={{ cursor: "pointer", gap: 12, borderRadius: 14 }}>
        <div style={{ fontSize: 12, color: "var(--gp-signal-english)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Inglês de campo</div>
        <div style={{ fontSize: 16, color: "var(--gp-slate-100)", lineHeight: 1.5 }}>"Man on!" — quando usar e como responder.</div>
        <MetricBar label="12 de 18 aulas" value={45} signal="english" />
      </Card>
      <Card nested onClick={() => onOpen("mental")} style={{ cursor: "pointer", gap: 12, borderRadius: 14 }}>
        <div style={{ fontSize: 12, color: "var(--gp-signal-mental)", letterSpacing: "0.2em", textTransform: "uppercase" }}>Blindagem mental</div>
        <div style={{ fontSize: 16, color: "var(--gp-slate-100)", lineHeight: 1.5 }}>Rotina pré-jogo: 4 minutos.</div>
      </Card>
      <div style={{ display: "flex", gap: 8, padding: "0 8px", flexWrap: "wrap" }}>
        <Chip selected>Prontidão 81</Chip>
        <Chip>Sequência 6 dias</Chip>
      </div>
      <div style={{ marginTop: "auto", display: "flex", justifyContent: "center" }}>
        <Button size="lg" onClick={() => onOpen("english")}>Começar</Button>
      </div>
    </div>
  );
}
Object.assign(window, { Today });

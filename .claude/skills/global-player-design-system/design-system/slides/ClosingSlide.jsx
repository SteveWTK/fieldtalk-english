const { Lockup, Button, TierBadge, SectionLabel } = window.GlobalPlayerDesignSystem_019dfe;

function ClosingSlide() {
  return (
    <div style={{ width: 1280, height: 720, background: "var(--gp-grad-slide)", padding: 88, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", alignItems: "center", textAlign: "center", fontFamily: "var(--gp-font-text)" }}>
      <SectionLabel size={14}>Próximo passo</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <Lockup orientation="vertical" mark="crest" size={132} slogan="Da base ao palco global" />
        <Button size="lg" style={{ fontSize: 18, padding: "18px 44px" }}>Falar com vendas</Button>
      </div>
      <div style={{ display: "flex", gap: 48, alignItems: "center" }}>
        {[["academia", "Academia"], ["clube", "Clube"], ["federacao", "Federação"]].map(([t, n]) => (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <TierBadge tier={t} size={26} />
            <span style={{ fontSize: 18, color: "var(--gp-text-muted)" }}>{n}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
Object.assign(window, { ClosingSlide });

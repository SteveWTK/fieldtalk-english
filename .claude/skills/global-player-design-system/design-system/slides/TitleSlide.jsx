const { Logo, Eyebrow } = window.GlobalPlayerDesignSystem_019dfe;

function TitleSlide() {
  return (
    <div style={{ width: 1280, height: 720, background: "var(--gp-grad-slide)", padding: 88, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: "var(--gp-font-text)" }}>
      <Logo mark="open" size={66} sting="sweep" />
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        <Eyebrow size={16}>Proposta para academias</Eyebrow>
        <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 82, lineHeight: 0.98, letterSpacing: "-0.03em", color: "var(--gp-slate-50)" }}>O ativo mais<br />valioso do clube<br />é o menino de 15.</div>
        <div style={{ fontSize: 22, color: "var(--gp-text-muted)" }}>Global Player · Proposta para academias · 2026</div>
      </div>
    </div>
  );
}
Object.assign(window, { TitleSlide });

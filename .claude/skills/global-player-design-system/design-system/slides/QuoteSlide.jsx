const { Logo, SectionLabel } = window.GlobalPlayerDesignSystem_019dfe;

function QuoteSlide() {
  return (
    <div style={{ width: 1280, height: 720, background: "var(--gp-lime-400)", padding: 88, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", fontFamily: "var(--gp-font-text)" }}>
      <Logo mark="open" tone="monoLime" size={52} />
      <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 104, lineHeight: 0.92, letterSpacing: "-0.04em", color: "var(--gp-slate-800)" }}>Talento<br />não basta.<br />Preparo, sim.</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div style={{ fontSize: 22, color: "var(--gp-lime-900)", maxWidth: 620, lineHeight: 1.45 }}>O Brasil forma craques. O mundo contrata atletas preparados.</div>
        <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 18, letterSpacing: "0.2em", color: "var(--gp-lime-900)" }}>GLOBALPLAYER.COM</div>
      </div>
    </div>
  );
}
Object.assign(window, { QuoteSlide });

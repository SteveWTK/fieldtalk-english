const { Lockup, Button, Input, Eyebrow, SectionLabel } = window.GlobalPlayerDesignSystem_019dfe;

function Login({ onEnter }) {
  return (
    <div style={{ minHeight: "100%", display: "grid", gridTemplateColumns: "1.15fr 1fr" }}>
      <div style={{ background: "var(--gp-grad-hero)", padding: "64px 56px", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 40 }}>
        <Lockup mark="open" size={30} />
        <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 460 }}>
          <Eyebrow>Next Global Player</Eyebrow>
          <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 46, lineHeight: 0.96, letterSpacing: "-0.03em", color: "var(--gp-slate-50)", textWrap: "balance" }}>Blindagem mental e valorização internacional para atletas de base.</div>
          <div style={{ fontSize: 16, lineHeight: 1.6, color: "var(--gp-slate-300)" }}>Inglês de campo, preparo psicológico e um dossiê que agentes e clubes europeus sabem ler.</div>
        </div>
        <SectionLabel>Plataforma para academias, clubes e federações</SectionLabel>
      </div>
      <div style={{ background: "var(--gp-bg-page)", borderLeft: "1px solid var(--gp-border-default)", padding: "64px 56px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SectionLabel>Acesso do clube</SectionLabel>
          <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 800, fontSize: 28, color: "var(--gp-text-primary)" }}>Entrar</div>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); onEnter(); }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Input label="E-mail" type="email" defaultValue="coordenacao@santosfc.com.br" />
          <Input label="Senha" type="password" defaultValue="••••••••••" />
          <Button type="submit" size="lg" fullWidth style={{ marginTop: 8 }}>Entrar</Button>
          <Button variant="ghost" size="sm" as="span" style={{ alignSelf: "center" }}>Esqueci a senha</Button>
        </form>
      </div>
    </div>
  );
}
Object.assign(window, { Login });

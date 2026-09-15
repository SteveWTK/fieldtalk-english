const { Logo, Button, LocaleSwitcher } = window.GlobalPlayerDesignSystem_019dfe;

function SiteHeader({ section, onSection, locale, onLocale }) {
  const items = locale === "pt" ? ["Academias", "Clubes", "Agentes"] : ["Academies", "Clubs", "Agents"];
  return (
    <header style={{ padding: "22px 56px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24, borderBottom: "1px solid var(--gp-border-default)", position: "sticky", top: 0, background: "var(--gp-slate-900)", zIndex: 5 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <Logo mark="open" size={25} sting="sweep" />
        <span style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 16, letterSpacing: "0.16em", color: "var(--gp-text-primary)" }}>GLOBAL PLAYER</span>
      </div>
      <nav style={{ display: "flex", alignItems: "center", gap: 26, fontSize: 13 }}>
        {items.map((i) => (
          <button key={i} type="button" onClick={() => onSection(i)} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, color: section === i ? "var(--gp-text-primary)" : "var(--gp-text-muted)" }}>{i}</button>
        ))}
        <LocaleSwitcher locale={locale} onChange={onLocale} />
        <Button variant="inverse" size="sm">{locale === "pt" ? "Entrar" : "Log in"}</Button>
      </nav>
    </header>
  );
}
Object.assign(window, { SiteHeader });

function Site() {
  const [locale, setLocale] = React.useState("pt");
  const [section, setSection] = React.useState("Academias");
  return (
    <div style={{ background: "var(--gp-bg-page)" }}>
      <SiteHeader section={section} onSection={setSection} locale={locale} onLocale={(l) => { setLocale(l); setSection(l === "pt" ? "Academias" : "Academies"); }} />
      <Hero locale={locale} />
      <Modules />
      <Tiers />
      <SiteFooter />
    </div>
  );
}
const __gpRoot = document.getElementById("root");
if (__gpRoot) ReactDOM.createRoot(__gpRoot).render(<Site />);

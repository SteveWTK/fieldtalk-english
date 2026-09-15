const { Header, Button } = window.GlobalPlayerDesignSystem_019dfe;
const TABS = ["Elenco", "Trilhas", "Relatórios", "Agentes"];

function App() {
  const [authed, setAuthed] = React.useState(false);
  const [tab, setTab] = React.useState("Elenco");
  const [player, setPlayer] = React.useState(null);
  const [locale, setLocale] = React.useState("pt");

  if (!authed) return <Login onEnter={() => setAuthed(true)} />;

  let body;
  if (player) body = <Dossier player={player} onBack={() => setPlayer(null)} onShare={() => setTab("Relatórios")} />;
  else if (tab === "Relatórios" || tab === "Agentes") body = <Reports />;
  else if (tab === "Trilhas") body = <Dossier onBack={() => setTab("Elenco")} onShare={() => setTab("Relatórios")} />;
  else body = <Squad onOpenPlayer={setPlayer} />;

  return (
    <div style={{ minHeight: "100%", background: "var(--gp-bg-page)" }}>
      <Header items={TABS} active={player ? "Elenco" : tab} onSelect={(t) => { setPlayer(null); setTab(t); }} locale={locale} onLocaleChange={setLocale} right={<Button size="sm">Novo atleta</Button>} />
      {body}
    </div>
  );
}
const __gpRoot = document.getElementById("root");
if (__gpRoot) ReactDOM.createRoot(__gpRoot).render(<App />);

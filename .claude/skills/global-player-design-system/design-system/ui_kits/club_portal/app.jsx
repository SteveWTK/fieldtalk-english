function ClubPortal() {
  const [tab, setTab] = React.useState("Squad");
  const [player, setPlayer] = React.useState(null);
  return (
    <div data-gp-theme="light" style={{ minHeight: "100vh", background: "var(--gp-bg-page)", color: "var(--gp-text-primary)" }}>
      <PortalHeader tab={tab} onTab={(t) => { setPlayer(null); setTab(t); }} />
      {player ? <PortalDossier player={player} onBack={() => setPlayer(null)} /> : <PortalSquad onOpen={setPlayer} />}
    </div>
  );
}
const __gpRoot = document.getElementById("root");
if (__gpRoot) ReactDOM.createRoot(__gpRoot).render(<ClubPortal />);

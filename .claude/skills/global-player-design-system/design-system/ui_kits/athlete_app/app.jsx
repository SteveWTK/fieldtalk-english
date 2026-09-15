const TABS = [["hoje", "Hoje"], ["prontidao", "Prontidão"]];

function Phone({ children, tab, onTab }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--gp-slate-950)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
      <div style={{ width: 390, height: 780, border: "1px solid var(--gp-border-default)", borderRadius: "var(--gp-radius-device)", background: "var(--gp-slate-900)", padding: 18, display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden" }}>
        {children}
        <nav style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid var(--gp-border-subtle)", display: "flex", justifyContent: "space-around" }}>
          {TABS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => onTab(k)} style={{ background: "none", border: "none", cursor: "pointer", minHeight: 44, minWidth: 88, fontFamily: "var(--gp-font-text)", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase", color: tab === k ? "var(--gp-lime-400)" : "var(--gp-text-faint)" }}>{l}</button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function AthleteApp() {
  const [tab, setTab] = React.useState("hoje");
  const [lesson, setLesson] = React.useState(null);
  let body;
  if (tab === "prontidao") body = <Readiness onBack={() => setTab("hoje")} />;
  else if (lesson) body = <Lesson kind={lesson} onBack={() => setLesson(null)} onDone={() => { setLesson(null); setTab("prontidao"); }} />;
  else body = <Today onOpen={setLesson} />;
  return <Phone tab={tab} onTab={(t) => { setLesson(null); setTab(t); }}>{body}</Phone>;
}
const __gpRoot = document.getElementById("root");
if (__gpRoot) ReactDOM.createRoot(__gpRoot).render(<AthleteApp />);

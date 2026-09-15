const { Button, StatTile, PlayerCard, Chip, Select, SectionLabel, Panel } = window.GlobalPlayerDesignSystem_019dfe;

const ROSTER = [
  { name: "Lucas Ferreira", initials: "LF", meta: "Sub-17 · Meia · Santos FC", metrics: [{ label: "Inglês de campo", value: 72, signal: "english" }, { label: "Blindagem mental", value: 64, signal: "mental" }, { label: "Prontidão global", value: 81 }] },
  { name: "Bruno Matheus", initials: "BM", meta: "Sub-17 · Lateral · Santos FC", metrics: [{ label: "Inglês de campo", value: 58, signal: "english" }, { label: "Blindagem mental", value: 71, signal: "mental" }, { label: "Prontidão global", value: 66 }] },
  { name: "Igor Nascimento", initials: "IN", meta: "Sub-17 · Zagueiro · Santos FC", metrics: [{ label: "Inglês de campo", value: 41, signal: "english" }, { label: "Blindagem mental", value: 52, signal: "mental" }, { label: "Prontidão global", value: 47 }] },
  { name: "Thiago Rocha", initials: "TR", meta: "Sub-17 · Atacante · Santos FC", metrics: [{ label: "Inglês de campo", value: 84, signal: "english" }, { label: "Blindagem mental", value: 79, signal: "mental" }, { label: "Prontidão global", value: 88 }] },
];

function Squad({ onOpenPlayer }) {
  const [filter, setFilter] = React.useState("Todos");
  return (
    <div style={{ padding: "34px 26px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SectionLabel>Santos FC · Base</SectionLabel>
          <h1 style={{ margin: 0, fontFamily: "var(--gp-font-display)", fontWeight: 800, fontSize: 26, color: "var(--gp-text-primary)" }}>Elenco Sub-17</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Select options={["Sub-17", "Sub-15", "Sub-20"]} wrapperStyle={{ width: 140 }} />
          <Button size="sm">Novo atleta</Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
        <StatTile label="Atletas" value="28" />
        <StatTile label="Prontidão média" value="74%" tone="accent" />
        <StatTile label="Dossiês enviados" value="9" />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {["Todos", "Inglês", "Mental", "Desempenho"].map((c) => (
          <Chip key={c} as="button" selected={filter === c} signal={c === "Inglês" ? "english" : c === "Mental" ? "mental" : c === "Desempenho" ? "performance" : undefined} onClick={() => setFilter(c)}>{c}</Chip>
        ))}
      </div>

      <Panel eyebrow="Elenco" title="28 atletas" meta="Atualizado há 2 dias">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
          {ROSTER.map((p) => <PlayerCard key={p.name} {...p} onClick={() => onOpenPlayer(p)} />)}
        </div>
        <div style={{ fontSize: 12, color: "var(--gp-text-faint)" }}>4 de 28 mostrados</div>
      </Panel>
    </div>
  );
}
Object.assign(window, { Squad, ROSTER });

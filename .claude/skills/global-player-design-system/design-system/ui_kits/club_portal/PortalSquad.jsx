const { StatTile, PlayerCard, Panel, SectionLabel, Select, Chip, IconButton, Icon } = window.GlobalPlayerDesignSystem_019dfe;

const ROSTER = [
  { name: "Thiago Rocha", initials: "TR", meta: "U17 · Forward · Santos FC", metrics: [{ label: "Field English", value: 84, signal: "english" }, { label: "Mental armour", value: 79, signal: "mental" }, { label: "Global readiness", value: 88 }] },
  { name: "Lucas Ferreira", initials: "LF", meta: "U17 · Midfielder · Santos FC", metrics: [{ label: "Field English", value: 72, signal: "english" }, { label: "Mental armour", value: 64, signal: "mental" }, { label: "Global readiness", value: 81 }] },
  { name: "Bruno Matheus", initials: "BM", meta: "U17 · Full-back · Santos FC", metrics: [{ label: "Field English", value: 58, signal: "english" }, { label: "Mental armour", value: 71, signal: "mental" }, { label: "Global readiness", value: 66 }] },
  { name: "Igor Nascimento", initials: "IN", meta: "U17 · Centre-back · Santos FC", metrics: [{ label: "Field English", value: 41, signal: "english" }, { label: "Mental armour", value: 52, signal: "mental" }, { label: "Global readiness", value: 47 }] },
];

function PortalSquad({ onOpen }) {
  const [filter, setFilter] = React.useState("All");
  return (
    <div style={{ padding: "34px 26px", display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <SectionLabel>Santos FC · Academy portal</SectionLabel>
          <h1 style={{ margin: 0, fontFamily: "var(--gp-font-display)", fontWeight: 800, fontSize: 26, color: "var(--gp-text-primary)" }}>U17 Squad</h1>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <IconButton icon="search" label="Search athlete" variant="outline" size="sm" />
          <IconButton icon="filter" label="Filter" variant="outline" size="sm" />
          <Select options={["U17", "U15", "U20"]} wrapperStyle={{ width: 120 }} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
        <StatTile label="Players" value="28" />
        <StatTile label="Avg. readiness" value="74%" tone="accent" />
        <StatTile label="Dossiers sent" value="9" />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {["All", "English", "Mental", "Performance"].map((c) => (
          <Chip key={c} as="button" selected={filter === c} signal={c === "English" ? "english" : c === "Mental" ? "mental" : c === "Performance" ? "performance" : undefined} onClick={() => setFilter(c)}>{c}</Chip>
        ))}
      </div>

      <Panel eyebrow="Squad" title="28 players" meta="Updated 2 days ago">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 16 }}>
          {ROSTER.map((p) => <PlayerCard key={p.name} {...p} tone="tonalLight" onClick={() => onOpen(p)} />)}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--gp-text-faint)" }}>
          <span>4 of 28 shown</span><Icon name="chevron-right" size={14} />
        </div>
      </Panel>
    </div>
  );
}
Object.assign(window, { PortalSquad, ROSTER });

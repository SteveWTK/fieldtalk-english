const { Button, IconButton, Avatar, MetricBar, Card, Panel, SectionLabel, Eyebrow, Chip, Logo, Icon } = window.GlobalPlayerDesignSystem_019dfe;

const MODULES = [
  { name: "Field English", signal: "english", value: 72, note: '12 of 18 lessons · last: "Man on!"' },
  { name: "Mental armour", signal: "mental", value: 64, note: "Pre-match routine · 9 sessions" },
  { name: "Performance", signal: "performance", value: 58, note: "Physical testing · cycle 3 of 6" },
];

function PortalDossier({ player, onBack }) {
  const p = player || { name: "Lucas Ferreira", initials: "LF", meta: "U17 · Midfielder · Santos FC" };
  return (
    <div style={{ padding: "34px 26px", display: "flex", flexDirection: "column", gap: 24 }}>
      <Button variant="ghost" size="sm" onClick={onBack} style={{ alignSelf: "flex-start" }}>← Squad</Button>

      <div style={{ borderRadius: "var(--gp-radius-panel)", border: "1px solid var(--gp-border-default)", background: "var(--gp-bg-panel)", boxShadow: "var(--gp-shadow-light-card)", padding: 34, display: "flex", alignItems: "center", gap: 26, flexWrap: "wrap" }}>
        <Avatar initials={p.initials} size={72} />
        <div style={{ flex: 1, minWidth: 220, display: "flex", flexDirection: "column", gap: 8 }}>
          <Eyebrow size={11}>Player dossier · 2026 · Confidential</Eyebrow>
          <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 38, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--gp-text-primary)" }}>{p.name}</div>
          <div style={{ fontSize: 14, color: "var(--gp-text-muted)" }}>{p.meta}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <SectionLabel>Global readiness</SectionLabel>
            <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 56, lineHeight: 1, color: "var(--gp-lime-700)" }}>81</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <IconButton icon="send" label="Send to agent" variant="outline" size="sm" />
            <IconButton icon="download" label="Download PDF" variant="outline" size="sm" />
          </div>
        </div>
        <Logo mark="crest" tone="tonalLight" size={78} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }}>
        <Panel eyebrow="Pathways" title="Three layers">
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {MODULES.map((m) => (
              <Card key={m.name} nested style={{ boxShadow: "var(--gp-shadow-light-card)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 16 }}>
                  <div style={{ fontFamily: "var(--gp-font-display)", fontWeight: 700, fontSize: 17, color: "var(--gp-text-primary)" }}>{m.name}</div>
                  <Chip selected signal={m.signal}>{m.value}%</Chip>
                </div>
                <MetricBar label={m.note} value={m.value} signal={m.signal} />
              </Card>
            ))}
          </div>
        </Panel>

        <Panel eyebrow="Export" title="Dossier" style={{ gap: 16 }}>
          <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--gp-text-muted)" }}>Bilingual A4, crest on the cover. European agents and clubs read the same document.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[["EN · PDF", "file-text"], ["PT · PDF", "file-text"], ["Share link", "link"]].map(([t, ic], i) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 0", borderTop: "1px solid var(--gp-border-subtle)" }}>
                <Icon name={ic} size={16} />
                <span style={{ flex: 1, fontSize: 14, color: "var(--gp-text-secondary)" }}>{t}</span>
                <Icon name="chevron-right" size={16} />
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
Object.assign(window, { PortalDossier });

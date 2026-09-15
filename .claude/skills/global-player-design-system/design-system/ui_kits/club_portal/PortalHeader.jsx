const { Header, Button } = window.GlobalPlayerDesignSystem_019dfe;

function PortalHeader({ tab, onTab }) {
  return <Header variant="crest" locale="en" items={["Squad", "Pathways", "Reports", "Agents"]} active={tab} onSelect={onTab} right={<Button size="sm">Export dossier</Button>} />;
}
Object.assign(window, { PortalHeader });

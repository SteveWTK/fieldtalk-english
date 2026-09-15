const { Button, Eyebrow } = window.GlobalPlayerDesignSystem_019dfe;

const COPY = {
  pt: { eyebrow: "Next Global Player", h1: "Blindagem mental e valorização internacional para atletas de base.", sub: "Inglês de campo, preparo psicológico e um dossiê que agentes e clubes europeus sabem ler.", a: "Falar com vendas", b: "Ver a plataforma" },
  en: { eyebrow: "Next Global Player", h1: "Mental armour and international value for academy athletes.", sub: "Field English, psychological preparation and a dossier European agents and clubs know how to read.", a: "Talk to sales", b: "See the platform" },
};

function Hero({ locale }) {
  const c = COPY[locale];
  return (
    <section style={{ background: "var(--gp-grad-hero)", padding: "84px 56px 96px", display: "flex", flexDirection: "column", gap: 22, maxWidth: 820 }}>
      <Eyebrow>{c.eyebrow}</Eyebrow>
      <h1 style={{ margin: 0, fontFamily: "var(--gp-font-display)", fontWeight: 900, fontSize: 58, lineHeight: 0.96, letterSpacing: "-0.03em", color: "var(--gp-slate-50)", textWrap: "balance" }}>{c.h1}</h1>
      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.6, color: "var(--gp-slate-300)", maxWidth: 540 }}>{c.sub}</p>
      <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
        <Button size="lg">{c.a}</Button>
        <Button variant="secondary" size="lg">{c.b}</Button>
      </div>
    </section>
  );
}
Object.assign(window, { Hero });

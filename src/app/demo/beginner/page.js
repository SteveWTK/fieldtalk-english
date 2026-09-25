// src/app/demo/beginner/page.js
//
// Beginner-audience variant of the direct-sample demo. Paul (or David)
// shares globalplayerpro.com/demo/beginner with a lead when he wants
// a lower-English-confidence taste — positions on the pitch, a short
// in-game shout, and the football pitch as a canvas instead of the
// abstract memory match.
//
// The route sits alongside /demo (default variant) and /demo/[token]
// (funnel variant). Next matches static > dynamic, so /demo/beginner
// hits this file before Next tries the [token] route.
//
// Everything above the CTA is client-side variant switching in
// DemoExperience. Everything below (the DemoCta) stays consistent
// with /demo — Paul-primary, self-serve secondaries visible.

import DemoExperience from "@/components/demo/DemoExperience";

export const metadata = {
  title: "Global Player — 90-second demo (iniciantes)",
  description:
    "Uma amostra rápida da Global Player para quem tá começando no inglês do futebol — posições, gritos em jogo e o campo como cenário.",
};

export default function DemoBeginnerPage() {
  return (
    <DemoExperience
      anchor={null}
      firstName={null}
      role={null}
      openingLine={null}
      showSelfServeCta={true}
      variant="beginner"
    />
  );
}

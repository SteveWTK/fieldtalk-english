// src/app/demo/page.js
//
// Direct-sample demo — the same 4-beat experience as the funnel demo,
// but no token, no lead lookup, no personalisation. The URL Paul (or
// David) pastes into an ALREADY-active WhatsApp chat when they want
// to send someone a 60-second taste of the product without running
// the full "Oi + Q1 + Q2" outreach funnel first.
//
// Two functional differences vs /demo/[token]:
//   1. No opening callback line ("Você acertou no WhatsApp — X"), because
//      there's no earlier WhatsApp Q&A to call back to. The opener
//      falls through to the generic 90-seconds intro.
//   2. The final CTA card renders BOTH the talk-to-Paul primary and a
//      secondary "explore plans" text link, so an individual visitor
//      or a smaller-Base-tier prospect can self-serve without having
//      to go back through Paul. Paul told us "anything that removes
//      steps and barriers will speed things up" — this is the removed
//      step.
//
// The route sits alongside /demo/[token] — Next matches /demo to this
// file and /demo/<anything> to the dynamic one. Nothing else changes.

import DemoExperience from "@/components/demo/DemoExperience";
import { pickAnchorFromSnapshot } from "@/lib/demo/football-phrases";

export const metadata = {
  title: "Global Player — 90-second demo",
  description:
    "Um sample rápido do que a Global Player faz — vocabulário, escuta, momento mental e um jogo de memória.",
};

export default function DemoDirectPage() {
  // No lead snapshot to pull from — the anchor helper handles null by
  // returning the default "park the bus" phrase.
  const anchor = pickAnchorFromSnapshot(null);

  return (
    <DemoExperience
      anchor={anchor}
      firstName={null}
      role={null}
      openingLine={null}
      showSelfServeCta={true}
    />
  );
}

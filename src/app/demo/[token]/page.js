// src/app/demo/[token]/page.js
//
// Public 90-second demo landing. Server-reads the lead by token (so
// SSR gives the personalised opener even on first paint), then hands
// off to the client-side DemoExperience for the interactive beats.
//
// Route sits at the app root — NOT under (site) — so it inherits no
// auth wrapper. This is the first surface a prospect ever sees; a
// login prompt here would kill the funnel.
//
// The end-of-demo CTA points at the single sales contact configured
// in src/lib/sales/contact.js (Paul by default). The B2B pivot means
// the CTA is a hand-off to a human, not a solo signup — the
// individual join flow waits on the club-portal work (Stage 6 rebrand
// backlog).

import { notFound } from "next/navigation";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";
import DemoExperience from "@/components/demo/DemoExperience";
import { pickAnchorFromSnapshot } from "@/lib/demo/football-phrases";

export const dynamic = "force-dynamic"; // token → lead lookup is per-request

export default async function DemoLandingPage({ params }) {
  const { token } = await params;
  if (!token || typeof token !== "string" || token.length < 4) {
    notFound();
  }

  const supabase = await getSupabaseAdmin();
  const { data: lead } = await supabase
    .from("leads")
    .select(
      "id, full_name, funnel_role, funnel_stage, funnel_q1_snapshot, funnel_q1_is_correct",
    )
    .eq("outreach_token", token.toLowerCase())
    .maybeSingle();

  if (!lead) {
    notFound();
  }

  const firstName = extractFirstName(lead.full_name);
  const openingLine = buildOpeningLine(lead);
  const anchor = pickAnchorFromSnapshot(lead.funnel_q1_snapshot);

  return (
    <DemoExperience
      anchor={anchor}
      firstName={firstName}
      role={lead.funnel_role}
      openingLine={openingLine}
    />
  );
}

/**
 * WhatsApp → web callback. Uses funnel_q1_is_correct to switch between
 * "you got it" / "you almost got it" so the lead feels the demo
 * remembers them.
 */
function buildOpeningLine(lead) {
  const snap = lead.funnel_q1_snapshot;
  if (!snap || !Array.isArray(snap.buttons)) return null;
  const correct = snap.buttons.find((b) => b?.correct === true);
  if (!correct) return null;
  const correctLabel =
    (correct.label && (correct.label.pt || correct.label.en)) || null;
  if (!correctLabel) return null;

  if (lead.funnel_q1_is_correct === true) {
    return `Você acertou no WhatsApp — ${correctLabel}. Agora veja como seus jogadores praticariam isso.`;
  }
  if (lead.funnel_q1_is_correct === false) {
    return `Você quase pegou no WhatsApp — a resposta era ${correctLabel}. Deixa a gente mostrar como um jogador aprende isso em 60 segundos.`;
  }
  return null;
}

function extractFirstName(fullName) {
  if (!fullName || typeof fullName !== "string") return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  const first = trimmed.split(/\s+/)[0];
  return first || null;
}

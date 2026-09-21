// src/app/demo/[token]/page.js
//
// Public landing page for WhatsApp lead-funnel converts. Placed at the
// app root (not under (site)) so it skips the auth layout entirely —
// this is the first surface a prospect sees, and it must NOT ask for a
// login.
//
// PR #2 shipping shape: server-side read of the lead by token, warm
// opening that name-checks them, small "coming soon" panel for the
// 90-second demo, and a stub Sign-up CTA that carries the attribution
// token forward. PR #3 replaces the "coming soon" panel with the real
// 4-beat demo experience.

import { notFound } from "next/navigation";
import Link from "next/link";
import getSupabaseAdmin from "@/lib/supabase-admin-lazy";

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
      "id, full_name, funnel_role, funnel_stage, funnel_q1_snapshot, funnel_q1_is_correct, funnel_q1_button_id",
    )
    .eq("outreach_token", token.toLowerCase())
    .maybeSingle();

  if (!lead) {
    notFound();
  }

  const firstName = extractFirstName(lead.full_name);
  const q1Callback = buildQ1Callback(lead);

  const signupHref = `/auth/signup?attribution_lead_token=${encodeURIComponent(token)}`;

  return (
    <main className="min-h-screen bg-primary-900 text-primary-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        <p className="text-[10px] uppercase tracking-[0.3em] text-accent-400/80 font-semibold mb-2">
          Global Player
        </p>
        <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight">
          Oi{firstName ? ` ${firstName}` : ""}.
        </h1>
        {q1Callback && (
          <p className="text-base sm:text-lg text-primary-200 mt-4 max-w-xl leading-relaxed">
            {q1Callback}
          </p>
        )}
        <p className="text-sm text-primary-300 mt-6 max-w-xl leading-relaxed">
          Aqui é onde a gente te mostra a Global Player em 90 segundos — a
          mesma coisa que seus jogadores vão fazer todo dia no celular.
        </p>

        <div className="mt-8 rounded-card border border-primary-700 bg-primary-panel p-5 sm:p-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary-400 font-semibold mb-2">
            Demo · Em breve
          </p>
          <p className="text-sm text-primary-300 leading-relaxed">
            A demo de 90 segundos aterrissa aqui na próxima entrega — quatro
            interações rápidas (vocabulário, escuta, foco mental, jogo).
            Enquanto isso, se quiser explorar a plataforma inteira:
          </p>
          <div className="mt-4">
            <Link
              href={signupHref}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-sm font-semibold transition-colors"
            >
              Criar minha conta →
            </Link>
          </div>
        </div>

        <p className="text-[11px] text-primary-500 mt-8 leading-relaxed">
          Token · <span className="font-mono">{token}</span>
        </p>
      </div>
    </main>
  );
}

/**
 * Personalised opener that echoes what the lead saw on WhatsApp. Uses
 * the frozen Q1 snapshot so the copy is stable even if David rotates
 * the active question afterwards.
 */
function buildQ1Callback(lead) {
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
    return `Você quase pegou no WhatsApp — a resposta era ${correctLabel}. Deixa a gente te mostrar como um jogador aprende isso em 60 segundos.`;
  }
  return `A gente te fez uma pergunta rápida no WhatsApp — sobre ${correctLabel}. Aqui você vê como seus jogadores aprendem essas coisas.`;
}

function extractFirstName(fullName) {
  if (!fullName || typeof fullName !== "string") return null;
  const trimmed = fullName.trim();
  if (!trimmed) return null;
  const first = trimmed.split(/\s+/)[0];
  return first || null;
}

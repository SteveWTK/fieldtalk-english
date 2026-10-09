// src/app/o-campo/page.js
//
// Link-shareable entry point into Lesson 1 — "O Campo" — as a guest.
// Paul / David paste globalplayerpro.com/o-campo into any WhatsApp
// chat; the recipient clicks → sees this landing → taps "Começar
// aula 1 →" → is a guest player inside the real Lesson 1 within
// seconds.
//
// Route sits at the app root (not under (site)) so no auth wrapper
// loads. The server component renders the branded landing; the lime
// CTA is a client component that activates the guest + redirects.

import TryButton from "@/components/try/TryButton";
import GlobalPlayerLogo from "@/components/brand/GlobalPlayerLogo";

export const metadata = {
  title: "Global Player — Experimente a primeira aula, grátis",
  description:
    "Aula 1 · O Campo. Sem cadastro, sem cartão. Vocabulário, áudio e um exercício mental em poucos minutos.",
};

export default function OCampoLandingPage() {
  return (
    <main className="min-h-screen bg-primary-900 text-primary-50 relative overflow-hidden">
      {/* Ambient wash matches /pricing + /pricing/individual so a lead
          sent between pages feels one continuous surface. */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-70"
          style={{
            background:
              "radial-gradient(circle at center, rgba(163,230,53,0.18), rgba(163,230,53,0) 70%)",
          }}
        />
        <div
          className="absolute bottom-[-25%] right-[-15%] w-[55vw] h-[55vw] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, rgba(148,163,184,0.10), rgba(148,163,184,0) 70%)",
          }}
        />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center text-center">
        {/* Branded hero */}
        <GlobalPlayerLogo
          variant="crest"
          tone="tonalDark"
          size={80}
          sting="sweep"
        />

        <p className="mt-8 text-[10px] uppercase tracking-[0.3em] text-accent-400/80 font-semibold">
          Aula 1 · O Campo
        </p>
        <h1
          className="mt-3 font-display font-black tracking-tight leading-[1.05] text-primary-50 max-w-2xl"
          style={{ fontSize: "clamp(2rem, 6vw, 3.5rem)" }}
        >
          Experimente a Global Player.
          <br />
          <span className="text-accent-300">
            A primeira aula, por nossa conta.
          </span>
        </h1>
        <p className="mt-5 text-base sm:text-lg text-primary-200 leading-relaxed max-w-xl">
          Vocabulário de verdade do campo, áudio de treino, um momento
          mental e um jogo rápido pra fixar. Alguns minutos no celular —
          dá pra fazer antes do próximo treino.
        </p>

        {/* Trust row — chips feel more "landing page" than one tiny line
            of copy, and reinforce the three objections before someone
            even has them. */}
        <ul className="mt-6 flex items-center justify-center gap-2 flex-wrap">
          <TrustChip label="Sem cadastro" />
          <TrustChip label="Sem cartão" />
          <TrustChip label="10 minutos" />
        </ul>

        {/* Primary CTA */}
        <div className="mt-8">
          <TryButton label="Começar aula 1 →" />
        </div>

        {/* What's inside — short, scannable, visual. The lesson itself
            is where we deliver on these promises; the point here is to
            give the visitor an idea of what the next ten minutes look
            like so the click isn't a leap into fog. */}
        <section className="mt-14 w-full max-w-md text-left">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary-400 font-semibold mb-4">
            O que tem dentro
          </p>
          <ul className="space-y-3">
            <InsideItem
              number="1"
              title="Vocabulário do campo"
              body="Posições, partes do campo e as palavras que o técnico usa toda hora."
            />
            <InsideItem
              number="2"
              title="Áudio de treino"
              body="Escuta de verdade — chamadas em jogo, não aula de livro."
            />
            <InsideItem
              number="3"
              title="Momento mental"
              body="Um exercício de respiração. Pré-jogo, pré-entrevista."
            />
            <InsideItem
              number="4"
              title="Jogo rápido"
              body="Jogo de memória pra fixar as expressões antes de fechar."
            />
          </ul>
        </section>

        <p className="mt-14 text-[11px] text-primary-500 leading-relaxed max-w-md">
          Ao continuar você entra como visitante. Pode criar conta ao
          final pra salvar o progresso e desbloquear a Aula 2.
        </p>
      </div>
    </main>
  );
}

function TrustChip({ label }) {
  return (
    <li className="inline-flex items-center gap-1.5 rounded-full border border-primary-700 bg-primary-panel px-3 py-1 text-[11px] font-semibold text-primary-200">
      <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
      {label}
    </li>
  );
}

function InsideItem({ number, title, body }) {
  return (
    <li className="flex items-start gap-3">
      <span className="shrink-0 w-7 h-7 rounded-full bg-primary-panel border border-primary-700 text-accent-400 flex items-center justify-center font-black text-sm tabular-nums">
        {number}
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-primary-50">{title}</p>
        <p className="text-sm text-primary-400 leading-relaxed mt-0.5">
          {body}
        </p>
      </div>
    </li>
  );
}

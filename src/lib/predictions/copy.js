// src/lib/predictions/copy.js
//
// EN / PT translations for the Predictions Centre + its widgets.
// Kept in one file so updating copy doesn't touch every component.

export const COPY = {
  en: {
    pageEyebrow: "FieldTalk WC2026",
    pageTitle: "Match Predictions",
    pageSubtitle:
      "Predict each match three ways. Pick the winner, call the exact score, and choose who scores first.",
    tabUpcoming: "Upcoming",
    tabResults: "Recent results",
    emptyUpcomingTitle: "No matches open right now",
    emptyUpcomingBody:
      "Check back closer to kickoff — predictions open up to 7 days before each match.",
    emptyResultsTitle: "No results yet",
    emptyResultsBody:
      "Once matches finish and we've entered the score, your picks show up here with the XP you earned.",
    badges: {
      locked: "Locked",
      live: "Live",
      kickoffSoon: "Kicks off soon",
      finished: "Finished",
    },
    widgets: {
      winnerTitle: "Match winner",
      winnerHint: "Pick which side wins, or call a draw.",
      home: "Home",
      away: "Away",
      draw: "Draw",
      exactScoreTitle: "Exact score",
      exactScoreHint: "Hardest to nail — biggest reward.",
      firstScorerTitle: "First to score",
      firstScorerHint: "Which side opens the scoring (or a 0–0).",
      none: "No goals",
      save: "Save",
      saving: "Saving…",
      saved: "Saved",
      saveError: "Couldn't save — try again",
      lockedNote: "Kickoff has passed. Picks are locked.",
    },
    results: {
      correct: "Correct",
      wrong: "Missed",
      pending: "Awaiting result",
      youPicked: "You picked",
      xpEarned: "XP earned",
      totalEarned: "Total earned on this match",
    },
    cta: {
      backToDashboard: "Back to dashboard",
    },
    filters: {
      countryAll: "All countries",
      groupAll: "All groups",
      noMatches: "No matches match your filters.",
      clear: "Clear filters",
    },
  },
  pt: {
    pageEyebrow: "FieldTalk WC2026",
    pageTitle: "Palpites dos Jogos",
    pageSubtitle:
      "Faça três palpites por jogo: vencedor, placar exato e quem abre o placar.",
    tabUpcoming: "Próximos",
    tabResults: "Resultados recentes",
    emptyUpcomingTitle: "Nenhum jogo aberto agora",
    emptyUpcomingBody:
      "Volte mais perto do jogo — os palpites abrem até 7 dias antes de cada partida.",
    emptyResultsTitle: "Ainda sem resultados",
    emptyResultsBody:
      "Assim que os jogos terminarem e o placar for inserido, seus palpites aparecem aqui com o XP que você ganhou.",
    badges: {
      locked: "Fechado",
      live: "Ao vivo",
      kickoffSoon: "Começa em breve",
      finished: "Encerrado",
    },
    widgets: {
      winnerTitle: "Vencedor",
      winnerHint: "Escolha o lado que ganha, ou aposte no empate.",
      home: "Mandante",
      away: "Visitante",
      draw: "Empate",
      exactScoreTitle: "Placar exato",
      exactScoreHint: "O mais difícil — e a maior recompensa.",
      firstScorerTitle: "Quem abre o placar",
      firstScorerHint: "Que lado balança a rede primeiro (ou 0 a 0).",
      none: "Sem gols",
      save: "Salvar",
      saving: "Salvando…",
      saved: "Salvo",
      saveError: "Erro ao salvar — tente de novo",
      lockedNote: "A bola já rolou. Os palpites estão fechados.",
    },
    results: {
      correct: "Acertou",
      wrong: "Errou",
      pending: "Aguardando resultado",
      youPicked: "Seu palpite",
      xpEarned: "XP ganho",
      totalEarned: "Total ganho neste jogo",
    },
    cta: {
      backToDashboard: "Voltar ao painel",
    },
    filters: {
      countryAll: "Todos os países",
      groupAll: "Todos os grupos",
      noMatches: "Nenhum jogo combina com os filtros.",
      clear: "Limpar filtros",
    },
  },
};

export function getPredictionsCopy(lang) {
  return COPY[lang] || COPY.en;
}

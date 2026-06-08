// src/lib/push/copy.js
//
// Notification copy templates, indexed by `kind` (the same string
// stored in notification_log.kind) and language. Each template is a
// function that takes a `vars` bag and returns { title, body, url,
// tag } — the exact shape the service worker expects.
//
// Why functions instead of plain strings: variable interpolation
// (player name, match teams, kickoff time) needs to happen at send
// time. Keeping the templates as pure functions also makes them
// trivially unit-testable when we add tests.
//
// Adding a new language:
//   1. Add a new top-level key under TEMPLATES (e.g. "es": {...}).
//   2. Mirror every kind from the "en" branch.
//   3. The send utility falls back to "en" automatically if a kind
//      is missing from the requested language, so partial coverage
//      is safe.

const TEMPLATES = {
  en: {
    // Fires once on first push opt-in. Functions as both a welcome
    // greeting AND a confirmation that notifications are working —
    // since the new onboarding flow encourages users to open their
    // starter pack BEFORE they enable notifications, a pack-specific
    // notification would arrive after the pack's already been
    // opened. Generic copy works in either case.
    welcome_pack: () => ({
      title: "Notifications on — welcome to FieldTalk!",
      body: "We'll let you know when packs drop and matches are about to kick off.",
      url: "/dashboard",
      tag: "welcome_pack",
    }),
    pack_reminder: ({ count = 1 } = {}) => ({
      title:
        count > 1
          ? `You have ${count} sticker packs waiting`
          : "You have a sticker pack waiting",
      body: "Open it now to add new players to your squad.",
      url: "/dashboard",
      // Same tag for any pack-ready notification so a later one
      // quietly replaces the earlier one rather than stacking.
      tag: "pack_reminder",
    }),
    // `title` is the prediction's display name (e.g. "Predict the
    // finish — Group A" or, later, "Brasil x Argentina"). We accept
    // either shape so the cron doesn't have to care whether the
    // upcoming deadline is a group-finish step or a head-to-head one.
    // `url` overrides the default destination — lesson predictions
    // land on /lesson, Centre matches land on /predictions.
    match_starting: ({ predictionTitle = "", stepId = "", url } = {}) => ({
      title: predictionTitle
        ? `${predictionTitle} — closing soon`
        : "Predictions closing soon",
      body: "Lock in your call before submissions close.",
      url: url || "/lesson",
      // Per-step tag so a second "starting soon" for the SAME step
      // (cron overlap) replaces the previous one quietly; different
      // matches still get separate notifications.
      tag: stepId ? `match_starting:${stepId}` : "match_starting",
    }),
    // Predictions Centre — 24h before kickoff. Fires once per
    // (player, match) so users see "Brasil x Argentina — predictions
    // open!" with a deep link to the Centre.
    predictions_open: ({ homeTeam = "", awayTeam = "", matchId = "" } = {}) => ({
      title:
        homeTeam && awayTeam
          ? `${homeTeam} x ${awayTeam} — predictions open!`
          : "A match just opened for predictions",
      body: "Pick the winner, exact score, and first scorer for bonus XP.",
      url: "/predictions",
      tag: matchId ? `predictions_open:${matchId}` : "predictions_open",
    }),
    // Fires after the admin resolves a match. Only sent to players
    // who earned at least 1 XP on that match.
    match_resolved: ({
      homeTeam = "",
      awayTeam = "",
      homeScore = 0,
      awayScore = 0,
      xpTotal = 0,
    } = {}) => ({
      title:
        homeTeam && awayTeam
          ? `${homeTeam} ${homeScore}–${awayScore} ${awayTeam}`
          : "Match resolved",
      body: `+${xpTotal} XP from your predictions. Tap to see how you did.`,
      url: "/predictions",
      tag: "match_resolved",
    }),
  },
  pt: {
    welcome_pack: () => ({
      title: "Notificações ativadas — bem-vindo ao FieldTalk!",
      body: "Vamos te avisar quando os pacotes saírem e os jogos forem começar.",
      url: "/dashboard",
      tag: "welcome_pack",
    }),
    pack_reminder: ({ count = 1 } = {}) => ({
      title:
        count > 1
          ? `Você tem ${count} pacotes esperando`
          : "Você tem um pacote esperando",
      body: "Abra agora para reforçar o seu time.",
      url: "/dashboard",
      tag: "pack_reminder",
    }),
    match_starting: ({ predictionTitle = "", stepId = "", url } = {}) => ({
      title: predictionTitle
        ? `${predictionTitle} — fechando em breve`
        : "Palpites fechando em breve",
      body: "Faça sua aposta antes do fechamento.",
      url: url || "/lesson",
      tag: stepId ? `match_starting:${stepId}` : "match_starting",
    }),
    predictions_open: ({ homeTeam = "", awayTeam = "", matchId = "" } = {}) => ({
      title:
        homeTeam && awayTeam
          ? `${homeTeam} x ${awayTeam} — palpites abertos!`
          : "Um jogo abriu para palpites",
      body: "Escolha vencedor, placar e quem abre o placar para ganhar XP.",
      url: "/predictions",
      tag: matchId ? `predictions_open:${matchId}` : "predictions_open",
    }),
    match_resolved: ({
      homeTeam = "",
      awayTeam = "",
      homeScore = 0,
      awayScore = 0,
      xpTotal = 0,
    } = {}) => ({
      title:
        homeTeam && awayTeam
          ? `${homeTeam} ${homeScore}–${awayScore} ${awayTeam}`
          : "Jogo encerrado",
      body: `+${xpTotal} XP dos seus palpites. Toque para ver como foi.`,
      url: "/predictions",
      tag: "match_resolved",
    }),
  },
};

const DEFAULT_LANG = "en";

/**
 * Resolve a notification kind + language into the concrete
 * { title, body, url, tag } payload. Falls back to English if the
 * requested language doesn't have the kind defined yet, so partial
 * translations are safe.
 */
export function buildNotificationPayload(kind, lang, vars = {}) {
  const langBranch = TEMPLATES[lang] || TEMPLATES[DEFAULT_LANG];
  const fn = langBranch[kind] || TEMPLATES[DEFAULT_LANG][kind];
  if (!fn) {
    return null;
  }
  return fn(vars || {});
}

export const SUPPORTED_KINDS = Object.keys(TEMPLATES[DEFAULT_LANG]);

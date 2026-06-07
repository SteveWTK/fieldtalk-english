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
    welcome_pack: () => ({
      title: "Your first sticker pack is waiting!",
      body: "Open your welcome pack to start your WC2026 album.",
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
    match_starting: ({ predictionTitle = "", stepId = "" } = {}) => ({
      title: predictionTitle
        ? `${predictionTitle} — closing soon`
        : "Predictions closing soon",
      body: "Lock in your call before submissions close.",
      url: "/lesson",
      // Per-step tag so a second "starting soon" for the SAME step
      // (cron overlap) replaces the previous one quietly; different
      // matches still get separate notifications.
      tag: stepId ? `match_starting:${stepId}` : "match_starting",
    }),
  },
  pt: {
    welcome_pack: () => ({
      title: "Seu primeiro pacote de figurinhas chegou!",
      body: "Abra o pacote de boas-vindas e comece seu álbum da WC2026.",
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
    match_starting: ({ predictionTitle = "", stepId = "" } = {}) => ({
      title: predictionTitle
        ? `${predictionTitle} — fechando em breve`
        : "Palpites fechando em breve",
      body: "Faça sua aposta antes do fechamento.",
      url: "/lesson",
      tag: stepId ? `match_starting:${stepId}` : "match_starting",
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

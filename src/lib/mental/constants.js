// src/lib/mental/constants.js
//
// Shared enums, bilingual copy, moods, and colour tones for the
// Mental Training feature. Single source of truth so schema
// constraints, API validation, and UI dropdowns never drift.

import {
  Waves,
  Flame,
  Moon,
  TrendingDown,
  Target,
  HeartPulse,
  Sparkles,
  Zap,
  Mic,
  Timer,
} from "lucide-react";

export const ACTIVITY_TYPES = [
  "meditation",
  "champion_scenario",
  "match_prep",
  "voice_of_champion",
  "silent_timer",
];

// Mood catalog — keys are stable (used in mental_activities.moods
// TEXT[]), labels are bilingual, tones drive card gradients. `Icon`
// is a lucide component reference. Copy + icon register was
// repositioned (2026-09) from a "Buddhist calm" to an elite
// sports-psych voice: pressure, setback, recovery — the moments an
// athlete actually faces.
export const MOODS = [
  { key: "pre_match", pt: "Pressão pré-jogo", en: "Pre-match pressure", tone: "sky", Icon: Waves },
  { key: "pre_training", pt: "Foco antes do treino", en: "Focus before training", tone: "emerald", Icon: Flame },
  { key: "cant_sleep", pt: "Sem conseguir dormir", en: "Can't sleep", tone: "indigo", Icon: Moon },
  { key: "disappointment", pt: "Depois de uma queda", en: "After a setback", tone: "amber", Icon: TrendingDown },
  { key: "big_game_prep", pt: "Preparação para jogo grande", en: "Big game prep", tone: "violet", Icon: Target },
  { key: "wind_down", pt: "Recuperação pós-jogo", en: "Post-match recovery", tone: "teal", Icon: HeartPulse },
  { key: "general", pt: "Qualquer momento", en: "Anytime", tone: "neutral", Icon: Sparkles },
];

export const MOOD_KEYS = MOODS.map((m) => m.key);

// One tone descriptor per activity_type — drives coloured borders on
// hub cards + accent on the player. Global Player DS: mental training
// is a single feature identity, so the pillar's own colour
// (`signal-mental`, violet) leads. Sub-types differentiate by icon +
// chip label first, colour second:
//
//   meditation, voice_of_champion → signal-mental (violet). Core
//     "quiet the mind" practice.
//   champion_scenario           → signal-performance (orange). Tests
//     performance under pressure, sits in the performance bucket.
//   match_prep                  → signal-english (sky). Activation /
//     focus before match — closest neighbour to the football English
//     pillar's own colour, which reads "match-day ready".
//   silent_timer                → slate. It's a tool, not a curated
//     activity, so it doesn't take a signal.
//
// The `glow` field replaces the old `gradient` — a single solid
// signal-tinted blob that blurs behind the card. Per DS "no gradients",
// but a blurred colour wash is atmospheric, not a shadow.
export const ACTIVITY_TONES = {
  meditation: {
    // Labels repositioned (2026-09) from "Guided meditation" to the
    // sport-native "Focus drill" register. PT is "Foco guiado" —
    // preserves the "guided" intent from the original while dropping
    // the spiritual freight of "meditação".
    label: { pt: "Foco guiado", en: "Focus drill" },
    signal: "mental",
    glow: "bg-signal-mental/30",
    border: "border-signal-mental/40",
    chip: "bg-signal-mental/15 text-signal-mental",
    Icon: Waves,
  },
  champion_scenario: {
    label: { pt: "Cenário de campeão", en: "Champion scenario" },
    signal: "performance",
    glow: "bg-signal-performance/30",
    border: "border-signal-performance/40",
    chip: "bg-signal-performance/15 text-signal-performance",
    Icon: Target,
  },
  match_prep: {
    label: { pt: "Ritual pré-jogo", en: "Match prep ritual" },
    signal: "english",
    glow: "bg-signal-english/30",
    border: "border-signal-english/40",
    chip: "bg-signal-english/15 text-signal-english",
    Icon: Zap,
  },
  voice_of_champion: {
    label: { pt: "Voz de campeão", en: "Voice of champions" },
    signal: "mental",
    glow: "bg-signal-mental/30",
    border: "border-signal-mental/40",
    chip: "bg-signal-mental/15 text-signal-mental",
    Icon: Mic,
  },
  silent_timer: {
    // Repositioned from "Silent meditation" to "Solo protocol" —
    // "protocol" reads like a training method, not a spiritual sit.
    label: { pt: "Protocolo solo", en: "Solo protocol" },
    signal: null,
    glow: "bg-primary-600/30",
    border: "border-primary-600",
    chip: "bg-primary-700 text-primary-200",
    Icon: Timer,
  },
};

// Silent-timer presets. Player can pick from these OR type any
// custom minutes value. Bell interval 0 = no interval bells (only
// end-of-session bell rings).
export const SILENT_TIMER_LENGTHS = [3, 5, 10, 15, 20, 30, 45, 60];
export const SILENT_TIMER_BELL_INTERVALS = [0, 3, 5, 10, 15];

// Bundled default bell sound — served from /public so admins don't
// have to upload one before the timer is usable. Admins can override
// via mental_activities.content.bell_sound_url on the silent_timer row.
export const DEFAULT_BELL_SOUND_URL = "/audio/mental/tibetan-bowl.mp3";

// XP awards. Meditations pay slightly more than scenarios/voices
// because they demand more attention; silent timer pays proportional
// to length (capped at 40) to reward genuine practice without
// gaming.
export const XP_REWARDS = {
  meditation: 25,
  champion_scenario: 20,
  match_prep: 25,
  voice_of_champion: 20,
  silent_timer: null, // computed at completion — Math.min(40, minutes * 2)
};

// Bilingual copy dictionary.
//
// Positioning voice — the whole hub was repositioned (2026-09) from
// a "quiet the mind" Buddhist register to an elite sports-psych
// voice: pressure, arousal control, recovery, focus reps. The
// underlying practice mechanics (breath phases, silent timer, guided
// audio) are unchanged — only the copy shifted. See the mental hub
// repositioning proposal note in the project memory for the full
// vocabulary map.
export const COPY = {
  hub: {
    title: { pt: "Mente de Elite", en: "Peak Mind" },
    subtitle: {
      pt: "A mente que carrega você no minuto 90. Treine ela como um profissional.",
      en: "The mind that carries you at minute 90. Train it like the pros.",
    },
    stats: {
      streak: { pt: "Sequência", en: "Streak" },
      streakDays: { pt: "dias", en: "days" },
      minutesThisWeek: {
        pt: "Minutos esta semana",
        en: "Minutes this week",
      },
      minutesAllTime: {
        pt: "Minutos no total",
        en: "Minutes all-time",
      },
      completedAllTime: {
        pt: "Sessões concluídas",
        en: "Sessions banked",
      },
    },
    moodPickerTitle: {
      pt: "Qual é o desafio?",
      en: "What's the moment?",
    },
    moodPickerHint: {
      pt: "Escolha o momento — indicamos a sessão certa.",
      en: "Pick the moment — we'll surface the right session.",
    },
    featured: { pt: "Destaques", en: "Featured" },
    library: { pt: "Biblioteca completa", en: "Full library" },
    filterAll: { pt: "Todos", en: "All" },
    empty: {
      pt: "Nada por aqui ainda. Novas sessões em breve.",
      en: "Nothing here yet. New sessions coming soon.",
    },
    silentTimerCard: {
      title: { pt: "Protocolo solo", en: "Solo protocol" },
      subtitle: {
        pt: "Sua duração, seus sinos, seu ritmo.",
        en: "Your length, your bells, your rhythm.",
      },
    },
  },
  player: {
    close: { pt: "Fechar", en: "Close" },
    start: { pt: "Começar", en: "Begin" },
    pause: { pt: "Pausar", en: "Pause" },
    resume: { pt: "Continuar", en: "Resume" },
    complete: { pt: "Concluir", en: "Complete" },
    languageLabel: { pt: "Idioma", en: "Language" },
    silentSetupTitle: {
      pt: "Configure seu protocolo",
      en: "Set up your protocol",
    },
    silentLength: { pt: "Duração", en: "Length" },
    silentLengthMin: { pt: "min", en: "min" },
    silentCustom: { pt: "Ou digite", en: "Or type" },
    silentBellInterval: {
      pt: "Sinos a cada",
      en: "Bells every",
    },
    silentBellsOff: { pt: "Sem sinos", en: "No bells" },
    silentBegin: { pt: "Começar sessão", en: "Start session" },
    breatheIn: { pt: "Inspire", en: "Inhale" },
    hold: { pt: "Segure", en: "Hold" },
    breatheOut: { pt: "Expire", en: "Exhale" },
    justBreathe: {
      pt: "Feche os olhos se quiser. O sino te chama de volta.",
      en: "Close your eyes if you'd like. The bell calls you back.",
    },
    completedCelebration: {
      pt: "Sessão registrada",
      en: "Session banked",
    },
    xpAwarded: { pt: "+{n} XP", en: "+{n} XP" },
    comprehensionTitle: {
      pt: "Checagem rápida",
      en: "Quick check-in",
    },
    correct: { pt: "Certo!", en: "Correct!" },
    notQuite: { pt: "Quase!", en: "Not quite!" },
    continue: { pt: "Continuar", en: "Continue" },
  },
  admin: {
    title: { pt: "Mente de Elite", en: "Peak Mind" },
    subtitle: {
      pt: "Gerencie sessões, moods e atribuições por unidade.",
      en: "Manage sessions, moods, and per-unit assignments.",
    },
    newActivity: { pt: "Nova atividade", en: "New activity" },
    typeLabel: { pt: "Tipo", en: "Type" },
    titleField: { pt: "Título", en: "Title" },
    subtitleField: { pt: "Subtítulo", en: "Subtitle" },
    durationField: { pt: "Duração (segundos)", en: "Duration (seconds)" },
    audioUrlField: { pt: "URL do áudio", en: "Audio URL" },
    coverImageField: { pt: "Imagem de capa", en: "Cover image" },
    moodsField: { pt: "Moods", en: "Moods" },
    featuredField: { pt: "Destacar", en: "Featured" },
    activeField: { pt: "Ativa", en: "Active" },
    sortOrderField: { pt: "Ordem", en: "Sort order" },
    save: { pt: "Salvar", en: "Save" },
    cancel: { pt: "Cancelar", en: "Cancel" },
    delete: { pt: "Excluir", en: "Delete" },
    unitAssignment: {
      pt: "Atribuição por unidade",
      en: "Per-unit assignment",
    },
    unitAssignmentHint: {
      pt: "Escolha qual atividade aparece como 7ª carta em cada unidade.",
      en: "Pick which activity appears as the 7th card in each unit.",
    },
    noSlot: { pt: "Sem atividade", en: "No activity" },
    meditationContent: {
      intro: { pt: "Introdução (opcional)", en: "Intro (optional)" },
      question: { pt: "Pergunta de compreensão", en: "Comprehension question" },
      questionPrompt: { pt: "Pergunta", en: "Prompt" },
      questionOptions: { pt: "Opções (uma correta)", en: "Options (one correct)" },
      questionExplanation: { pt: "Explicação", en: "Explanation" },
    },
    silentContent: {
      presetsField: {
        pt: "Presets de duração (minutos, separados por vírgula)",
        en: "Duration presets (minutes, comma-separated)",
      },
      defaultLengthField: {
        pt: "Duração padrão (minutos)",
        en: "Default length (minutes)",
      },
      bellIntervalsField: {
        pt: "Intervalos de sinos (minutos, separados por vírgula, 0 = sem intervalos)",
        en: "Bell intervals (minutes, comma-separated, 0 = none)",
      },
      bellSoundUrlField: {
        pt: "URL do som do sino (opcional)",
        en: "Bell sound URL (optional)",
      },
    },
  },
};

/**
 * Look up a bilingual copy value by dot-path. Falls back to pt when
 * a specific language is missing on the leaf.
 */
export function t(path, lang = "pt") {
  const parts = path.split(".");
  let node = COPY;
  for (const p of parts) {
    if (node == null || typeof node !== "object") return path;
    node = node[p];
  }
  if (!node || typeof node !== "object") return path;
  return node[lang] || node.pt || node.en || path;
}

/** { pt, en } bundle → language-specific string, pt fallback. */
export function pickLang(bundle, lang) {
  if (typeof bundle === "string") return bundle;
  if (!bundle || typeof bundle !== "object") return "";
  return bundle[lang] || bundle.pt || bundle.en || "";
}

/**
 * Silent-timer XP calc — capped so someone can't spam the timer
 * for XP farming. Roughly matches lesson XP for a 15-min practice.
 */
export function computeSilentTimerXp(minutes) {
  if (!Number.isFinite(minutes) || minutes < 1) return 0;
  return Math.min(40, Math.floor(minutes * 2));
}

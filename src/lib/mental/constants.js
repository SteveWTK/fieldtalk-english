// src/lib/mental/constants.js
//
// Shared enums, bilingual copy, moods, and colour tones for the
// Mental Training feature. Single source of truth so schema
// constraints, API validation, and UI dropdowns never drift.

export const ACTIVITY_TYPES = [
  "meditation",
  "champion_scenario",
  "match_prep",
  "voice_of_champion",
  "silent_timer",
];

// Mood catalog — keys are stable (used in mental_activities.moods
// TEXT[]), labels are bilingual, tones drive card gradients.
export const MOODS = [
  { key: "pre_match", pt: "Ansioso antes do jogo", en: "Pre-match nerves", tone: "sky", emoji: "🌊" },
  { key: "pre_training", pt: "Foco antes do treino", en: "Focus before training", tone: "emerald", emoji: "🔥" },
  { key: "cant_sleep", pt: "Sem conseguir dormir", en: "Can't sleep", tone: "indigo", emoji: "🌙" },
  { key: "disappointment", pt: "Após uma decepção", en: "After a setback", tone: "amber", emoji: "💔" },
  { key: "big_game_prep", pt: "Visualização de jogo grande", en: "Big game visualization", tone: "violet", emoji: "🎯" },
  { key: "wind_down", pt: "Só descansar a mente", en: "Just wind down", tone: "teal", emoji: "🧘" },
  { key: "general", pt: "Qualquer momento", en: "Anytime", tone: "neutral", emoji: "✨" },
];

export const MOOD_KEYS = MOODS.map((m) => m.key);

// One tone descriptor per activity_type — drives coloured borders on
// hub cards + accent on the player. Deliberately not overlapping with
// the leads-admin palette so mental training feels distinct.
export const ACTIVITY_TONES = {
  meditation: {
    label: { pt: "Meditação guiada", en: "Guided meditation" },
    accent: "teal",
    gradient: "from-teal-400 via-cyan-400 to-blue-400",
    border: "border-teal-400/40",
    chip: "bg-teal-500/15 text-teal-200",
  },
  champion_scenario: {
    label: { pt: "Cenário de campeão", en: "Champion scenario" },
    accent: "amber",
    gradient: "from-amber-400 via-orange-400 to-red-400",
    border: "border-amber-400/40",
    chip: "bg-amber-500/15 text-amber-200",
  },
  match_prep: {
    label: { pt: "Ritual pré-jogo", en: "Match prep ritual" },
    accent: "emerald",
    gradient: "from-emerald-400 via-lime-400 to-yellow-400",
    border: "border-emerald-400/40",
    chip: "bg-emerald-500/15 text-emerald-200",
  },
  voice_of_champion: {
    label: { pt: "Voz de campeão", en: "Voice of champions" },
    accent: "violet",
    gradient: "from-violet-400 via-fuchsia-400 to-pink-400",
    border: "border-violet-400/40",
    chip: "bg-violet-500/15 text-violet-200",
  },
  silent_timer: {
    label: { pt: "Meditação silenciosa", en: "Silent meditation" },
    accent: "slate",
    gradient: "from-slate-400 via-slate-300 to-white",
    border: "border-white/25",
    chip: "bg-white/[0.08] text-white/85",
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
export const COPY = {
  hub: {
    title: { pt: "Treino Mental", en: "Mental Training" },
    subtitle: {
      pt: "Treine sua mente com a mesma seriedade que treina seu corpo.",
      en: "Train your mind with the same seriousness you train your body.",
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
        pt: "Atividades completas",
        en: "Activities completed",
      },
    },
    moodPickerTitle: {
      pt: "Como você está agora?",
      en: "Where's your head at?",
    },
    moodPickerHint: {
      pt: "Escolha um estado — recomendamos a atividade certa.",
      en: "Pick a state — we'll surface the right activity.",
    },
    featured: { pt: "Destaques", en: "Featured" },
    library: { pt: "Biblioteca completa", en: "Full library" },
    filterAll: { pt: "Todos", en: "All" },
    empty: {
      pt: "Nada por aqui ainda. Novas práticas em breve.",
      en: "Nothing here yet. New practices coming soon.",
    },
    silentTimerCard: {
      title: { pt: "Meditação silenciosa", en: "Silent meditation" },
      subtitle: {
        pt: "Sua prática, sua duração, seus sinos.",
        en: "Your practice, your length, your bells.",
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
      pt: "Configure sua meditação",
      en: "Set up your meditation",
    },
    silentLength: { pt: "Duração", en: "Length" },
    silentLengthMin: { pt: "min", en: "min" },
    silentCustom: { pt: "Ou digite", en: "Or type" },
    silentBellInterval: {
      pt: "Sinos a cada",
      en: "Bells every",
    },
    silentBellsOff: { pt: "Sem sinos", en: "No bells" },
    silentBegin: { pt: "Começar a prática", en: "Start practice" },
    breatheIn: { pt: "Inspire", en: "Breathe in" },
    hold: { pt: "Segure", en: "Hold" },
    breatheOut: { pt: "Expire", en: "Breathe out" },
    justBreathe: {
      pt: "Feche os olhos se quiser. O sino te avisa.",
      en: "Close your eyes if you'd like. The bell will call you back.",
    },
    completedCelebration: {
      pt: "Sessão concluída",
      en: "Session complete",
    },
    xpAwarded: { pt: "+{n} XP", en: "+{n} XP" },
    comprehensionTitle: {
      pt: "Uma pergunta rápida",
      en: "One quick question",
    },
    correct: { pt: "Certo!", en: "Correct!" },
    notQuite: { pt: "Quase!", en: "Not quite!" },
    continue: { pt: "Continuar", en: "Continue" },
  },
  admin: {
    title: { pt: "Treino Mental", en: "Mental Training" },
    subtitle: {
      pt: "Gerencie atividades, moods e atribuições por unidade.",
      en: "Manage activities, moods, and per-unit assignments.",
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

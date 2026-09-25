// src/components/demo/DemoExperience.js
//
// Client-side wrapper that composes DemoShell + the beat list + the
// final CTA card. Two variants:
//
//   variant='default'  (unset) — the funnel-facing + direct-sample demo
//                                 for prospects with reasonable English
//                                 confidence. Beat 4 is a memory match
//                                 on football expressions.
//
//   variant='beginner'          — the beginner-audience demo Paul shares
//                                 with players / parents / academies where
//                                 English confidence is low. Vocab anchor
//                                 is a position ("goalkeeper"), listening
//                                 clip is a short in-game shout, and beat
//                                 4 is a football-pitch position tap
//                                 instead of the memory match.

"use client";

import DemoShell from "@/components/demo/DemoShell";
import VocabTapBeat from "@/components/demo/beats/VocabTapBeat";
import ListeningBeat from "@/components/demo/beats/ListeningBeat";
import MindMomentBeat from "@/components/demo/beats/MindMomentBeat";
import VocabGameBeat from "@/components/demo/beats/VocabGameBeat";
import PitchBeat from "@/components/demo/beats/PitchBeat";
import DemoCta from "@/components/demo/DemoCta";
import {
  getBeginnerVocabOptions,
  BEGINNER_LISTENING_CLIP,
} from "@/lib/demo/beginner-content";

/**
 * @param {{
 *   anchor: {id: string, en: string, pt: string, note?: string},
 *   firstName: string | null,
 *   role: string | null,
 *   openingLine: string | null,   // WhatsApp → web callback line
 *   showSelfServeCta?: boolean,   // renders the "explore plans" secondary
 *   variant?: 'default' | 'beginner',
 * }} props
 */
export default function DemoExperience({
  anchor,
  firstName,
  role,
  openingLine,
  showSelfServeCta = false,
  variant = "default",
}) {
  const beats = buildBeats({ variant, anchor, firstName, openingLine });

  return (
    <DemoShell
      beats={beats}
      cta={
        <DemoCta
          role={role}
          firstName={firstName}
          showSelfServeCta={showSelfServeCta}
        />
      }
    />
  );
}

function buildBeats({ variant, anchor, firstName, openingLine }) {
  const opening = {
    key: "opening",
    title: "Boas-vindas",
    targetSeconds: 5,
    render: ({ onDone }) => (
      <OpeningBeat
        firstName={firstName}
        openingLine={openingLine}
        onDone={onDone}
      />
    ),
  };

  const mindMoment = {
    key: "mind_moment",
    title: "Momento mental",
    targetSeconds: 25,
    render: ({ onDone }) => <MindMomentBeat onDone={onDone} />,
  };

  if (variant === "beginner") {
    // Beginner-tuned content: position anchor, in-game shout listening,
    // pitch-tap in place of the memory game.
    const { anchor: beginnerAnchor, options: beginnerOptions } =
      getBeginnerVocabOptions();
    return [
      opening,
      {
        key: "vocab_tap",
        title: "Posições",
        targetSeconds: 15,
        render: ({ onDone }) => (
          <VocabTapBeat
            anchor={beginnerAnchor}
            options={beginnerOptions}
            onDone={onDone}
          />
        ),
      },
      {
        key: "listening",
        title: "Escuta",
        targetSeconds: 20,
        render: ({ onDone }) => (
          <ListeningBeat clip={BEGINNER_LISTENING_CLIP} onDone={onDone} />
        ),
      },
      mindMoment,
      {
        key: "pitch",
        title: "No campo",
        targetSeconds: 30,
        render: ({ onDone }) => <PitchBeat onDone={onDone} />,
      },
    ];
  }

  // Default variant — original 5-beat flow.
  return [
    opening,
    {
      key: "vocab_tap",
      title: "Vocabulário",
      targetSeconds: 15,
      render: ({ onDone }) => <VocabTapBeat anchor={anchor} onDone={onDone} />,
    },
    {
      key: "listening",
      title: "Escuta",
      targetSeconds: 25,
      render: ({ onDone }) => <ListeningBeat onDone={onDone} />,
    },
    mindMoment,
    {
      key: "vocab_game",
      title: "Jogo de memória",
      targetSeconds: 30,
      render: ({ onDone }) => <VocabGameBeat anchor={anchor} onDone={onDone} />,
    },
  ];
}

/**
 * Small opening card — the "you got this / almost got this on WhatsApp"
 * callback that closes the loop. Not a real beat; more like a title
 * card. One "Começar" button advances into the demo proper.
 */
function OpeningBeat({ firstName, openingLine, onDone }) {
  return (
    <div className="flex flex-col items-center text-center">
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-primary-50 mb-4 font-display leading-tight">
        Oi{firstName ? `, ${firstName}` : ""}.
      </h1>
      {openingLine && (
        <p className="text-base sm:text-lg text-primary-200 leading-relaxed max-w-lg mb-6">
          {openingLine}
        </p>
      )}
      <p className="text-sm text-primary-400 leading-relaxed max-w-md mb-8">
        90 segundos. Quatro coisas rápidas — a mesma experiência que seus
        jogadores teriam todo dia no celular.
      </p>
      <button
        type="button"
        onClick={onDone}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-accent-400 hover:bg-accent-300 text-primary-900 text-sm font-semibold transition-colors"
      >
        Começar →
      </button>
    </div>
  );
}

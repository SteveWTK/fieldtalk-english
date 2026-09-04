// src/app/(site)/games/page.js
//
// Game Centre hub. Cards link out to each individual game variant.
// Adding a new Memory Match category: drop a row into GAMES below
// with `href: "/games/memory-match?category=<slug>"`. The game route
// reads the query string and fetches the right vocabulary slice.
//
// Adding a wholly new game type: create
// src/app/(site)/games/<slug>/page.js, add an entry here, and make
// sure the game calls awardXp({ source: `game/<slug>`, … }) on
// completion (see memory-match for the pattern).
"use client";

import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Brain,
  Flag,
  Layout as LayoutIcon,
  Worm,
  Sparkles,
  BookmarkCheck,
} from "lucide-react";

const GAMES = [
  {
    slug: "vocabulary-speed-match",
    href: "/games/vocabulary-speed-match",
    // Personal-vocab practice game — drives spaced repetition off the
    // words the player has saved from lessons. Placed first because
    // it's the most valuable practice surface: the words are ones
    // they've chosen to remember.
    title: "Vocabulary Speed Match",
    body: "Arraste cada palavra em inglês para a sua imagem ou tradução.",
    Icon: BookmarkCheck,
    accent: "emerald",
    xpReward: 25,
    available: true,
  },
  {
    slug: "memory-match-positions",
    href: "/games/memory-match?category=positions",
    title: "Memory Match — Positions",
    body: "Match each English football role to its Portuguese equivalent.",
    Icon: Brain,
    accent: "emerald",
    xpReward: 10,
    available: false,
  },
  {
    slug: "memory-match-flags",
    href: "/games/memory-match?category=flags",
    title: "Memory Match — WC2026 Flags",
    body: "Coming soon: Match each World Cup 2026 nation's flag to its English name.",
    Icon: Flag,
    accent: "amber",
    xpReward: 10,
    available: false,
  },
  {
    slug: "pitch-positions",
    href: "/games/pitch-positions",
    title: "Pitch positions",
    body: "Click around the pitch to nail every position and zone — coming soon.",
    Icon: LayoutIcon,
    accent: "neutral",
    available: false,
  },
  {
    slug: "word-snake",
    href: "/games/word-snake",
    title: "Word Snake",
    body: "Hunt the next word in a chain — coming soon.",
    Icon: Worm,
    accent: "neutral",
    available: false,
  },
];

export default function GamesHubPage() {
  return (
    <div className="min-h-screen bg-[#070707] text-white relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-20%] left-[-15%] w-[60vw] h-[60vw] rounded-full blur-3xl opacity-60"
          style={{
            background:
              "radial-gradient(circle at center, rgba(16,185,129,0.18), rgba(16,185,129,0) 70%)",
          }}
        />
      </div>

      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        <div className="mb-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-sm text-white/65 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to dashboard
          </Link>
        </div>

        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-emerald-300/80 font-semibold mb-2">
            FieldTalk
          </p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Game Centre
          </h1>
          <p className="text-sm text-white/55 mt-2 max-w-2xl leading-relaxed">
            Pratique o vocabulário de futebol em sessões curtas e divertidas.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {GAMES.map((g) => (
            <GameCard key={g.slug} game={g} />
          ))}
        </div>

        <p className="text-xs text-white/40 mt-8 text-center">
          More games coming soon. Got an idea? Let the FieldTalk team know.
        </p>
      </main>
    </div>
  );
}

function GameCard({ game }) {
  const { Icon, accent, available, title, body, href, xpReward } = game;
  const accentClass =
    accent === "emerald"
      ? "border-emerald-400/30 hover:border-emerald-300/60 hover:bg-emerald-500/[0.04]"
      : accent === "amber"
        ? "border-amber-300/30 hover:border-amber-300/60 hover:bg-amber-300/[0.04]"
        : "border-white/10 hover:border-white/25 hover:bg-white/[0.04]";
  const iconBg =
    accent === "emerald"
      ? "bg-emerald-500/15 text-emerald-300"
      : accent === "amber"
        ? "bg-amber-300/15 text-amber-200"
        : "bg-white/[0.06] text-white/75";

  const card = (
    <div
      className={`relative h-full rounded-2xl bg-white/[0.03] border ${accentClass} p-5 transition-colors ${
        available ? "" : "opacity-60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-base text-white truncate">{title}</h3>
            {available && (
              <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </div>
          <p className="text-xs sm:text-sm text-white/55 mt-1 leading-relaxed">
            {body}
          </p>
          {available && xpReward ? (
            <p className="text-[11px] text-emerald-300 mt-2 font-semibold inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3" />+{xpReward} XP per day
            </p>
          ) : (
            !available && (
              <p className="text-[11px] text-white/35 mt-2 font-semibold uppercase tracking-wider">
                Coming soon
              </p>
            )
          )}
        </div>
      </div>
    </div>
  );

  if (!available) return card;
  return (
    <Link href={href} className="group block">
      {card}
    </Link>
  );
}

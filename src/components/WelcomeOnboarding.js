// src/components/WelcomeOnboarding.js
//
// 4-slide welcome flow shown the first time a WC2026 player lands on
// /lesson after signup. Mirrors the brand artwork (dark + pitch
// stripes + emerald accent + a few emojis for football character) and
// runs through:
//
//   1. Welcome      — logo + tagline
//   2. What you'll do — five-step list (vocab, predictions, stickers,
//                       ultimate team, leaderboard)
//   3. Stickers     — explainer + sample-sticker grid using the real
//                     StickerCard component (no placeholder art).
//   4. Ready        — trophy + "Start journey" CTA.
//
// One-shot: dismissal POSTs /api/onboarding/complete which flips
// players.onboarding_completed to true. Admins can re-arm any user
// by toggling that column back to false in the Supabase table editor
// (e.g. for Cultura directors and other invited testers who joined
// before this flow existed).
//
// Translations stay local to this component — adding a third
// language is one extra entry in COPY. If we add many more,
// consider promoting these keys into src/locales/.
"use client";

import { useEffect, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  X,
  Target,
  BookOpen,
  Layers,
  Users2,
  Globe2,
  Zap,
} from "lucide-react";
import StickerCard from "@/components/stickers/StickerCard";
import { useTranslation } from "@/hooks/useTranslation";
import { useLanguage } from "@/lib/contexts/LanguageContext";

// Five card faces for slide 3. Using country_code values the
// StickerCard's palette already knows about so the fallback art
// renders crisply. No image_url means the kit-stripe + shirt-number
// fallback kicks in — exactly what we want for placeholder examples.
const SAMPLE_STICKERS = [
  {
    id: "onb-1",
    name: "Vinícius Jr.",
    country: "Brazil",
    country_code: "bra",
    shirt_number: 7,
    position: "LW",
    rating: 5,
    image_url: null,
  },
  {
    id: "onb-2",
    name: "Messi",
    country: "Argentina",
    country_code: "arg",
    shirt_number: 10,
    position: "RW",
    rating: 5,
    image_url: null,
  },
  {
    id: "onb-3",
    name: "Bellingham",
    country: "England",
    country_code: "eng",
    shirt_number: 5,
    position: "CM",
    rating: 5,
    image_url: null,
  },
  {
    id: "onb-4",
    name: "Mbappé",
    country: "France",
    country_code: "fra",
    shirt_number: 10,
    position: "ST",
    rating: 5,
    image_url: null,
  },
  {
    id: "onb-5",
    name: "Pedri",
    country: "Spain",
    country_code: "esp",
    shirt_number: 8,
    position: "CM",
    rating: 4,
    image_url: null,
  },
];

const COPY = {
  en: {
    skip: "Skip",
    back: "Back",
    next: "Next",
    slide1: {
      badge: "🏆 World Cup 2026 Edition",
      headline: ["Welcome to a", "different", "World Cup experience"],
      subtitle:
        "Learn English the way you love it — with football, stickers and real competition.",
      cta: "Get started",
    },
    slide2: {
      headline: ["Here you", "learn by playing"],
      subtitle: "Five experiences await you:",
      steps: [
        {
          title: "Football vocabulary",
          body: "Learn match-day expressions and the teams of the World Cup in English.",
          Icon: BookOpen,
        },
        {
          title: "Good at predictions?",
          body: "Predict each match's result and rack up bonus XP.",
          Icon: Target,
        },
        {
          title: "Earn sticker packs",
          body: "Complete your virtual album as you collect players.",
          Icon: Layers,
        },
        {
          title: "Build your Ultimate Team",
          body: "Place your players into the squad of your dreams.",
          Icon: Users2,
        },
        {
          title: "World ranking",
          body: "Compete with players from across Brazil and beyond.",
          Icon: Globe2,
        },
      ],
    },
    slide3: {
      headline: ["Collect rare", "stickers"],
      subtitle:
        "Every 200 XP earns you a new pack of 7 players for your virtual album.",
      mystery: "?",
      mysteryLabel: "Surprise!",
      xpBadge: "200 XP = 1 pack of 7 players",
    },
    slide4: {
      headline: ["All set to", "play!"],
      subtitle:
        "Learn English, make predictions, collect players, build your team, and chase the world ranking. Your World Cup starts now.",
      homeTip:
        "📱 On your phone? Add FieldTalk to your home screen from your browser's menu — one tap and you're back in.",
      cta: "🚀 Start your journey",
    },
  },
  pt: {
    skip: "Pular",
    back: "Voltar",
    next: "Próximo",
    slide1: {
      badge: "🏆 Edição Copa do Mundo",
      headline: ["Bem-vindo a uma", "experiência diferente", "da Copa"],
      subtitle:
        "Aprenda inglês do jeito que você ama — com futebol, figurinhas e competição real.",
      cta: "Começar",
    },
    slide2: {
      headline: ["Aqui você", "aprende jogando"],
      subtitle: "Cinco experiências esperam por você:",
      steps: [
        {
          title: "Vocabulário de futebol",
          body: "Aprenda expressões e sobre os times da Copa em inglês.",
          Icon: BookOpen,
        },
        {
          title: "Bom de palpite?",
          body: "Preveja os resultados de cada jogo e acumule XP bônus.",
          Icon: Target,
        },
        {
          title: "Ganhe pacotes de figurinhas",
          body: "Complete seu álbum virtual colecionando jogadores.",
          Icon: Layers,
        },
        {
          title: "Monte seu Ultimate Team",
          body: "Coloque seus jogadores e crie o time dos seus sonhos.",
          Icon: Users2,
        },
        {
          title: "Ranking mundial",
          body: "Dispute com jogadores do Brasil inteiro e mais.",
          Icon: Globe2,
        },
      ],
    },
    slide3: {
      headline: ["Colecione figurinhas", "raras"],
      subtitle:
        "A cada 200 XP você ganha um pacote novo com 7 jogadores para o seu álbum virtual.",
      mystery: "?",
      mysteryLabel: "Surpresa!",
      xpBadge: "200 XP = 1 pacote com 7 jogadores",
    },
    slide4: {
      headline: ["Tudo pronto para", "jogar!"],
      subtitle:
        "Aprenda inglês, dê seus palpites, colecione jogadores, monte seu time e dispute o ranking mundial. Sua Copa começa agora.",
      homeTip:
        "📱 No celular? Adicione o FieldTalk à tela inicial pelo menu do seu navegador — um toque e você volta direto pra jornada.",
      cta: "🚀 Iniciar jornada",
    },
  },
};

export default function WelcomeOnboarding({ userId, onClose }) {
  const { userLanguage } = useTranslation();
  // useLanguage's setLang updates the LanguageContext, localStorage,
  // AND players.preferred_language — so the toggle here also sets
  // the user's app-wide language going forward, not just the modal.
  const { setLang } = useLanguage();
  const copy = COPY[userLanguage === "pt" ? "pt" : "en"];
  const [slide, setSlide] = useState(1);

  const close = () => {
    // Optimistic UX — hide the modal immediately so dismissal feels
    // snappy, then mark the flag in the background. A failed flag
    // write isn't catastrophic; the user simply sees the modal again
    // on their next visit and tries again.
    onClose?.();
    if (userId) {
      fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }).catch((err) => {
        console.warn("[onboarding] mark-complete failed:", err);
      });
    }
  };

  // Lock scrolling while the modal is up.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col text-white"
      role="dialog"
      aria-modal="true"
      style={{
        // Pitch-stripe pattern + emerald bottom glow over a near-black
        // base. Matches the artwork in the original onboarding mock.
        background: `
          radial-gradient(ellipse 80% 60% at 50% 110%, rgba(16,185,129,0.18) 0%, transparent 70%),
          repeating-linear-gradient(0deg, transparent, transparent 48px, rgba(16,185,129,0.04) 48px, rgba(16,185,129,0.04) 50px),
          repeating-linear-gradient(90deg, transparent, transparent 48px, rgba(16,185,129,0.04) 48px, rgba(16,185,129,0.04) 50px),
          #070707`,
      }}
    >
      {/* Language toggle — top left. Updates the global language
          context so the user's choice here persists across the
          whole app (and into players.preferred_language on the
          server). Visible on every slide so the user can switch
          mid-flow if the first slide feels wrong. */}
      <div className="absolute top-4 left-4 z-10 flex gap-1 text-[10px] sm:text-xs">
        <button
          type="button"
          onClick={() => setLang("en")}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            userLanguage === "en"
              ? "bg-emerald-500 text-[#062013]"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          EN
        </button>
        <button
          type="button"
          onClick={() => setLang("pt")}
          className={`px-2.5 py-1 rounded-full font-semibold transition-colors ${
            userLanguage === "pt"
              ? "bg-emerald-500 text-[#062013]"
              : "bg-white/5 text-white/60 hover:text-white"
          }`}
        >
          PT
        </button>
      </div>

      {/* Skip — top right. Disabled on the final slide (CTA is the
          completion path there). */}
      {slide < 4 && (
        <button
          type="button"
          onClick={close}
          className="absolute top-4 right-4 z-10 inline-flex items-center gap-1 text-xs text-white/50 hover:text-white px-3 py-1.5 rounded-full hover:bg-white/5 transition-colors"
        >
          {copy.skip}
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Slide content — vertically centred, comfortable padding, max
          width so it reads as a portrait card on desktop too. */}
      <div className="flex-1 flex items-center justify-center px-5 sm:px-8 py-10">
        <div className="w-full max-w-md mx-auto text-center">
          {slide === 1 && <SlideOne copy={copy.slide1} />}
          {slide === 2 && <SlideTwo copy={copy.slide2} />}
          {slide === 3 && <SlideThree copy={copy.slide3} />}
          {slide === 4 && <SlideFour copy={copy.slide4} />}
        </div>
      </div>

      {/* Footer: progress dots + nav buttons. Sticks to the bottom so
          the controls are predictable across slides. */}
      <div className="relative z-10 px-5 sm:px-8 pb-8 pt-4">
        <div className="max-w-md mx-auto">
          <ProgressDots current={slide} total={4} />
          <div className="mt-5 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => slide > 1 && setSlide(slide - 1)}
              disabled={slide === 1}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold text-white/70 hover:text-white border border-white/10 hover:border-white/30 disabled:opacity-0 disabled:cursor-default transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {copy.back}
            </button>

            {slide < 4 ? (
              <button
                type="button"
                onClick={() => setSlide(slide + 1)}
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#062013] text-sm font-bold tracking-wide transition-colors shadow-[0_6px_28px_rgba(16,185,129,0.35)]"
              >
                {slide === 1 ? copy.slide1.cta : copy.next}
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={close}
                className="inline-flex items-center gap-1.5 px-6 py-3 rounded-full bg-emerald-500 hover:bg-emerald-400 text-[#062013] text-sm font-bold tracking-wide transition-colors shadow-[0_6px_28px_rgba(16,185,129,0.35)]"
              >
                {copy.slide4.cta}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Slides ──────────────────────────────────────────────── */

function SlideOne({ copy }) {
  return (
    <div className="onb-fade-up">
      <div className="mb-5 inline-flex items-baseline gap-0">
        <span className="text-5xl sm:text-6xl mr-2 onb-bounce inline-block">
          ⚽
        </span>
      </div>
      <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none mb-1">
        Field<span className="text-emerald-400">Talk</span>
      </h2>

      <span className="mt-4 inline-block px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-emerald-300 mb-5">
        {copy.badge}
      </span>

      <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-3">
        {copy.headline[0]}{" "}
        <span className="text-emerald-400">{copy.headline[1]}</span>{" "}
        {copy.headline[2]}
      </h1>
      <p className="text-sm sm:text-base text-white/65 max-w-xs sm:max-w-sm mx-auto leading-relaxed">
        {copy.subtitle}
      </p>

      <Animations />
    </div>
  );
}

function SlideTwo({ copy }) {
  return (
    <div className="onb-fade-up">
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-2">
        {copy.headline[0]}{" "}
        <span className="text-emerald-400">{copy.headline[1]}</span>
      </h1>
      <p className="text-sm text-white/55 mb-6">{copy.subtitle}</p>

      <ul className="space-y-2.5 text-left">
        {copy.steps.map((step, i) => (
          <li
            key={i}
            className="onb-stagger flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm"
            style={{ animationDelay: `${(i + 1) * 70}ms` }}
          >
            <span className="font-black text-emerald-400 tabular-nums text-lg w-6 shrink-0">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-white leading-tight">
                {step.title}
              </p>
              <p className="text-xs text-white/55 mt-0.5 leading-snug">
                {step.body}
              </p>
            </div>
            <step.Icon className="w-5 h-5 text-emerald-300/70 shrink-0" />
          </li>
        ))}
      </ul>

      <Animations />
    </div>
  );
}

function SlideThree({ copy }) {
  return (
    <div className="onb-fade-up">
      <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight mb-3">
        {copy.headline[0]}{" "}
        <span className="text-amber-300">{copy.headline[1]}</span>
      </h1>
      <p className="text-sm text-white/65 mb-6 max-w-xs mx-auto leading-relaxed">
        {copy.subtitle}
      </p>

      {/* Sticker grid — 5 real-fallback cards + 1 mystery slot.
          StickerCard with size="sm" renders the country-coloured
          kit-stripe fallback (no image_url needed). */}
      <div className="grid grid-cols-3 gap-2.5 justify-items-center mb-5">
        {SAMPLE_STICKERS.map((sticker, i) => (
          <div
            key={sticker.id}
            className="onb-stagger"
            style={{ animationDelay: `${(i + 1) * 70}ms` }}
          >
            <StickerCard sticker={sticker} size="sm" owned />
          </div>
        ))}
        {/* Mystery card — hints at "more rarities to discover" */}
        <div
          className="onb-stagger w-20 h-28 rounded-xl flex flex-col items-center justify-center gap-1 bg-amber-300/10 border-2 border-dashed border-amber-300/40 shrink-0"
          style={{ animationDelay: "420ms" }}
        >
          <span className="text-2xl font-black text-amber-300">
            {copy.mystery}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-amber-300/80">
            {copy.mysteryLabel}
          </span>
        </div>
      </div>

      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-300/10 border border-amber-300/30 text-xs font-bold text-amber-200">
        <Zap className="w-3.5 h-3.5" />
        {copy.xpBadge}
      </div>

      <Animations />
    </div>
  );
}

function SlideFour({ copy }) {
  return (
    <div className="onb-fade-up">
      <div className="text-6xl sm:text-7xl mb-4 onb-pulse-trophy inline-block">
        🏆
      </div>
      <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-tight mb-3">
        {copy.headline[0]}{" "}
        <span className="text-emerald-400">{copy.headline[1]}</span>
      </h1>
      <p className="text-sm sm:text-base text-white/65 max-w-xs sm:max-w-sm mx-auto leading-relaxed">
        {copy.subtitle}
      </p>

      {/* "Save to home screen" nudge — soft amber pill so it reads as
          a tip rather than a CTA. Mostly relevant on mobile; on desktop
          it doesn't hurt to know about it for any future tablet use. */}
      <div className="mt-5 mx-auto max-w-sm rounded-2xl bg-amber-300/10 border border-amber-300/30 px-4 py-3 text-xs sm:text-sm text-amber-100/90 leading-relaxed">
        {copy.homeTip}
      </div>

      <Animations />
    </div>
  );
}

/* ─── Bits ────────────────────────────────────────────────── */

function ProgressDots({ current, total }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: total }).map((_, i) => {
        const isActive = i + 1 === current;
        return (
          <span
            key={i}
            className={`h-2 rounded-full transition-all ${
              isActive ? "w-7 bg-emerald-400" : "w-2 bg-white/20"
            }`}
          />
        );
      })}
    </div>
  );
}

// Styled-jsx animations bundled at the end. Keeps the file
// self-contained — no global CSS edits required.
function Animations() {
  return (
    <style jsx global>{`
      @keyframes onb-fade-up {
        from {
          opacity: 0;
          transform: translateY(24px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }
      @keyframes onb-stagger {
        from {
          opacity: 0;
          transform: translateY(12px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes onb-bounce {
        0%,
        100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-8px);
        }
      }
      @keyframes onb-pulse-trophy {
        0%,
        100% {
          transform: scale(1);
          filter: drop-shadow(0 0 28px rgba(255, 215, 0, 0.45));
        }
        50% {
          transform: scale(1.08);
          filter: drop-shadow(0 0 44px rgba(255, 215, 0, 0.8));
        }
      }
      .onb-fade-up {
        animation: onb-fade-up 0.55s cubic-bezier(0.22, 0.68, 0, 1.2) both;
      }
      .onb-stagger {
        opacity: 0;
        animation: onb-stagger 0.5s ease-out forwards;
      }
      .onb-bounce {
        animation: onb-bounce 2s ease-in-out infinite;
      }
      .onb-pulse-trophy {
        animation: onb-pulse-trophy 1.8s ease-in-out infinite;
      }
    `}</style>
  );
}

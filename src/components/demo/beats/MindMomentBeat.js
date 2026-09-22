// src/components/demo/beats/MindMomentBeat.js
//
// Beat 3 (~20s): one 4-7-8 breathing cycle with a minimal living-orb
// that scales in / holds / scales out. Mimics the MeditationPlayer's
// silent mode without the auth-gated XP writes.
//
// Purpose in the sales flow: prove the resilience layer exists without
// making the lead sit through a chapter of content. The message is:
// "your player also needs THIS, and it's already inside the app."

"use client";

import { useEffect, useState } from "react";
import { Sparkles, ArrowRight } from "lucide-react";
import Button from "@/components/ui/button";

const IN_S = 4;
const HOLD_S = 7;
const OUT_S = 8;
const TOTAL_S = IN_S + HOLD_S + OUT_S;

const PHASES = [
  { key: "in", label: "Inspira", from: 0, to: IN_S },
  { key: "hold", label: "Segura", from: IN_S, to: IN_S + HOLD_S },
  { key: "out", label: "Solta", from: IN_S + HOLD_S, to: TOTAL_S },
];

export default function MindMomentBeat({ onDone }) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return undefined;
    if (elapsed >= TOTAL_S) return undefined;
    const id = setInterval(() => {
      setElapsed((e) => Math.min(TOTAL_S, e + 0.1));
    }, 100);
    return () => clearInterval(id);
  }, [running, elapsed]);

  const finished = elapsed >= TOTAL_S;
  const phase = PHASES.find((p) => elapsed < p.to) || PHASES[PHASES.length - 1];

  // Orb scale: expand during "in", hold at max during "hold", shrink
  // during "out". Values are CSS scale factors.
  const scale = (() => {
    if (phase.key === "in") {
      return 0.6 + 0.4 * ((elapsed - phase.from) / (phase.to - phase.from));
    }
    if (phase.key === "hold") {
      return 1;
    }
    return 1 - 0.4 * ((elapsed - phase.from) / (phase.to - phase.from));
  })();

  return (
    <div className="flex flex-col items-center text-center">
      <p className="text-sm text-primary-300 leading-relaxed mb-2 max-w-md">
        Um momento antes de um jogo grande. Ou de uma entrevista grande.
      </p>
      <p className="text-[11px] text-primary-500 mb-8">
        Um ciclo 4-7-8 — 19 segundos.
      </p>

      {/* Orb */}
      <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center mb-6">
        <div
          className="absolute inset-0 rounded-full bg-gradient-to-br from-accent-400/25 via-accent-400/10 to-transparent blur-2xl transition-transform"
          style={{
            transform: `scale(${scale.toFixed(3)})`,
            transitionDuration: "0.1s",
            transitionTimingFunction: "linear",
          }}
        />
        <div
          className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full border border-accent-400/40 bg-gradient-to-br from-accent-400/20 to-primary-800 flex items-center justify-center transition-transform"
          style={{
            transform: `scale(${scale.toFixed(3)})`,
            transitionDuration: "0.1s",
            transitionTimingFunction: "linear",
          }}
        >
          <div className="text-center">
            {running ? (
              <>
                <p className="text-xs uppercase tracking-[0.3em] text-primary-400 font-semibold mb-1">
                  {phase.label}
                </p>
                <p className="text-3xl font-black tracking-tight text-primary-50 tabular-nums font-display">
                  {Math.max(0, Math.ceil(phase.to - elapsed))}
                </p>
              </>
            ) : (
              <Sparkles className="w-10 h-10 text-accent-300 mx-auto" />
            )}
          </div>
        </div>
      </div>

      {!running && !finished && (
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => setRunning(true)}
        >
          Começar
        </Button>
      )}

      {finished && (
        <>
          <p className="text-sm text-accent-300 font-semibold mb-4">
            Pronto para o próximo passo.
          </p>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={onDone}
            Icon={ArrowRight}
          >
            Próximo
          </Button>
        </>
      )}

      {running && !finished && (
        <button
          type="button"
          onClick={onDone}
          className="text-[11px] text-primary-500 hover:text-primary-300 transition-colors mt-2"
        >
          Pular momento
        </button>
      )}
    </div>
  );
}

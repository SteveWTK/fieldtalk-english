// src/components/demo/DemoShell.js
//
// Wrapper around the 4-beat demo. Owns:
//   - beat index + "next" progression
//   - progress dots
//   - a soft ~90s countdown chip (elapsed, not enforcing)
//   - a "Skip demo →" escape hatch (goes straight to the CTA card)
//
// Each beat is a self-contained child that calls `onDone` when the
// user finishes the interaction. The shell handles the transition.
// No auth, no XP writes — this is a public sales surface, not a
// lesson runtime.

"use client";

import { useEffect, useMemo, useState } from "react";
import { Clock, SkipForward } from "lucide-react";

/**
 * @param {{
 *   beats: Array<{
 *     key: string,
 *     title: string,
 *     targetSeconds: number,
 *     render: (args: { onDone: () => void, elapsed: number }) => import("react").ReactNode,
 *   }>,
 *   cta: import("react").ReactNode, // the final card shown after all beats complete
 *   onFirstInteraction?: () => void,
 * }} props
 */
export default function DemoShell({ beats, cta, onFirstInteraction }) {
  const totalBeats = beats.length;
  const [beatIdx, setBeatIdx] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [skipped, setSkipped] = useState(false);

  // Kick off the timer on first paint. Elapsed drives the timer chip
  // and lets beats show a subtle "time in beat" if they want.
  useEffect(() => {
    setStartedAt(Date.now());
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - Date.now()) / 1000) + 1);
    }, 250);
    return () => clearInterval(id);
  }, []);

  // Recompute elapsed each interval tick — using a fresh Date now.
  useEffect(() => {
    if (!startedAt) return undefined;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 250);
    return () => clearInterval(id);
  }, [startedAt]);

  const targetTotal = useMemo(
    () => beats.reduce((a, b) => a + (b.targetSeconds || 0), 0),
    [beats],
  );

  const done = skipped || beatIdx >= totalBeats;
  const currentBeat = !done ? beats[beatIdx] : null;

  function advance() {
    // On first advance, ping the outer page — used to stamp
    // funnel_demo_started_at if we want conversion attribution later.
    if (beatIdx === 0 && onFirstInteraction) {
      try {
        onFirstInteraction();
      } catch {
        /* silent */
      }
    }
    setBeatIdx((i) => i + 1);
  }

  function skipToCta() {
    setSkipped(true);
  }

  return (
    <div className="min-h-screen bg-primary-900 text-primary-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header: progress + timer + skip */}
        <div className="flex items-center justify-between mb-6 gap-4">
          <ProgressDots current={beatIdx} total={totalBeats} skipped={skipped} />
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 text-[11px] text-primary-400 tabular-nums font-mono">
              <Clock className="w-3.5 h-3.5" />
              {formatMMSS(elapsed)} / ~{formatMMSS(targetTotal)}
            </div>
            {!done && (
              <button
                type="button"
                onClick={skipToCta}
                className="inline-flex items-center gap-1 text-[11px] text-primary-400 hover:text-primary-100 transition-colors"
                title="Skip to the sign-up card"
              >
                <SkipForward className="w-3.5 h-3.5" />
                Pular
              </button>
            )}
          </div>
        </div>

        {/* Beat body */}
        <div className="rounded-panel border border-primary-700 bg-primary-panel p-5 sm:p-8 min-h-[420px] flex flex-col">
          {currentBeat ? (
            <>
              <p className="text-[10px] uppercase tracking-[0.3em] text-accent-400/80 font-semibold mb-2">
                {beatIdx + 1} · {currentBeat.title}
              </p>
              <div className="flex-1 flex flex-col justify-center">
                {currentBeat.render({ onDone: advance, elapsed })}
              </div>
            </>
          ) : (
            cta
          )}
        </div>
      </div>
    </div>
  );
}

function ProgressDots({ current, total, skipped }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const active = !skipped && i === current;
        const passed = skipped || i < current;
        return (
          <span
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              active
                ? "w-6 bg-accent-400"
                : passed
                  ? "w-4 bg-accent-400/50"
                  : "w-4 bg-primary-700"
            }`}
          />
        );
      })}
    </div>
  );
}

function formatMMSS(s) {
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// src/components/ui/metric-bar.js
//
// The Global Player MetricBar — the ONLY chart primitive we ship.
// A 6px track with a signal-coloured fill and a label / percentage
// row above.
//
// Signals:
//   english      → sky-400   (Inglês de campo)
//   mental       → violet-400 (Blindagem mental)
//   performance  → orange-400 (Desempenho)
//   alert        → red-400   (errors, expiring)
//   accent (default) → lime-400 (Prontidão global — the composite
//                     readiness score. Reserved for that role.)
//
// Per DS: no donuts, no rings, no gauges — bars only.
//
// Motion: bars mount at width 0 and grow to their target value with
// the `ui` duration token (220ms brand-curve). This is Stage 5 spec
// verbatim — "Animate metric-bar widths from 0 on mount with the
// `ui` token." A one-tick delay lets the width transition register
// even on the very first render, so a fresh MetricBar visibly fills
// in rather than snapping to full. Value changes AFTER mount also
// animate through the same transition.
"use client";

import { useEffect, useState } from "react";

const SIGNAL_FILL = {
  english: "bg-signal-english",
  mental: "bg-signal-mental",
  performance: "bg-signal-performance",
  alert: "bg-signal-alert",
  accent: "bg-accent-400",
};

const SIGNAL_TEXT = {
  english: "text-signal-english",
  mental: "text-signal-mental",
  performance: "text-signal-performance",
  alert: "text-signal-alert",
  accent: "text-accent-400",
};

/**
 * @param {{
 *   label: React.ReactNode,
 *   value: number,          // 0–100, clamped
 *   signal?: 'english' | 'mental' | 'performance' | 'alert' | 'accent',
 *   suffix?: string,        // defaults to '%'
 *   className?: string,
 * }} props
 */
function MetricBar({
  label,
  value,
  signal = "accent",
  suffix = "%",
  className = "",
}) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const fill = SIGNAL_FILL[signal] || SIGNAL_FILL.accent;
  const valueText = signal === "accent" ? SIGNAL_TEXT.accent : "text-primary-100";

  // Mount-from-0 animation. `mounted` starts false; a
  // requestAnimationFrame-deferred setter flips it true on the next
  // paint so the browser has a chance to render width:0 before the
  // transition kicks in. Without the rAF hop, React commits both
  // width:0 and width:pct in the same frame and the browser skips
  // the transition entirely.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const renderedPct = mounted ? pct : 0;

  return (
    <div className={`flex flex-col gap-1.5 ${className}`.trim()}>
      <div className="flex items-baseline justify-between text-xs font-sans text-primary-400">
        <span>{label}</span>
        <span className={`tabular-nums font-medium ${valueText}`}>
          {pct}{suffix}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-primary-700 overflow-hidden">
        <div
          className={`h-1.5 rounded-full ${fill} transition-[width] duration-ui ease-brand`}
          style={{ width: `${renderedPct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={typeof label === "string" ? label : undefined}
        />
      </div>
    </div>
  );
}

export default MetricBar;
export { MetricBar };

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
"use client";

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
  // The value colour matches the fill when signal === accent (the
  // lime composite score), but stays neutral primary-100 for the
  // other signals so the row doesn't turn into a colour-block.
  const valueText = signal === "accent" ? SIGNAL_TEXT.accent : "text-primary-100";

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
          style={{ width: `${pct}%` }}
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

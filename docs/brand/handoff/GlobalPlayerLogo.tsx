import * as React from "react";

type Variant = "open" | "crest";
type Tone = "tonal" | "mono";

const CREST_D = "M50 5 L91 20 V57 C91 82 72 96 50 103 C28 96 9 82 9 57 V20 Z";
const CREST_BARS = ["M28 66 L50 50 L72 66", "M28 52 L50 36 L72 52", "M28 38 L50 22 L72 38"];
const OPEN_BARS = ["M14 62 L50 44 L86 62", "M14 46 L50 28 L86 46", "M14 30 L50 12 L86 30"];

export interface GlobalPlayerLogoProps extends React.SVGProps<SVGSVGElement> {
  /** "open" (default, product UI) or "crest" (documents, ceremonial) */
  variant?: Variant;
  /** "tonal" = slate→lime ramp; "mono" = single currentColor ink (print, embroidery, tiny sizes) */
  tone?: Tone;
  /** Rendered height in px. Open bars min 16, crest min 32. */
  size?: number;
  /** Play the "Sweep" entrance. Ignored under prefers-reduced-motion. */
  animate?: boolean;
}

export function GlobalPlayerLogo({
  variant = "open",
  tone = "tonal",
  size = 28,
  animate = false,
  ...rest
}: GlobalPlayerLogoProps) {
  const crest = variant === "crest";
  const paths = crest ? CREST_BARS : OPEN_BARS;
  const vb = crest ? "0 0 100 108" : "0 0 100 74";
  const ratio = crest ? 100 / 108 : 100 / 74;
  // heavier stroke keeps the bars legible below ~28px
  const base = crest ? 7 : size < 28 ? 12 : 9;
  const tonal = ["#475569", "#94a3b8", "#a3e635"];
  const stroke = (i: number) => (tone === "mono" ? "currentColor" : tonal[i]);

  return (
    <svg
      viewBox={vb}
      height={size}
      width={size * ratio}
      role="img"
      aria-label="Global Player"
      {...rest}
    >
      {crest && (
        <path d={CREST_D} fill="none" stroke={tone === "mono" ? "currentColor" : "#f8fafc"} strokeWidth={3.2} />
      )}
      {paths.map((d, i) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={stroke(i)}
          strokeWidth={base}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={animate ? { animation: `gp-sweep 780ms cubic-bezier(.16,1,.3,1) ${i * 90}ms both` } : undefined}
        />
      ))}
    </svg>
  );
}

/** Mark + "GLOBAL PLAYER" wordmark, horizontal. */
export function GlobalPlayerLockup({
  size = 28,
  variant = "open",
  animate = false,
}: Pick<GlobalPlayerLogoProps, "size" | "variant" | "animate">) {
  return (
    <span className="flex items-center gap-3">
      <GlobalPlayerLogo size={size} variant={variant} animate={animate} />
      <span className="font-display font-black tracking-wordmark text-primary-50" style={{ fontSize: size * 0.54 }}>
        GLOBAL PLAYER
      </span>
    </span>
  );
}

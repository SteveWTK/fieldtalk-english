// Global Player — additions to tailwind.config theme.extend
// primary (slate) and accent (lime) scales are unchanged from the existing config.
module.exports = {
  colors: {
    signal: {
      english: "#38bdf8",     // Inglês de campo
      mental: "#c084fc",      // Blindagem mental
      performance: "#fb923c", // Desempenho
      alert: "#f87171",
    },
  },
  fontFamily: {
    display: ["Archivo", "system-ui", "sans-serif"],
    sans: ["Instrument Sans", "system-ui", "sans-serif"],
  },
  letterSpacing: {
    wordmark: "0.15em",
    eyebrow: "0.30em",
    label: "0.26em",
  },
  borderRadius: { control: "8px", card: "12px", panel: "16px" },
  transitionTimingFunction: { brand: "cubic-bezier(.22,1,.36,1)" },
  transitionDuration: { micro: "120ms", ui: "220ms", entrance: "620ms" },
  keyframes: {
    "gp-sweep": {
      from: { opacity: "0", transform: "translateX(-30px) scaleX(.86)" },
      "70%": { transform: "translateX(3px) scaleX(1.02)" },
      to: { opacity: "1", transform: "translateX(0) scaleX(1)" },
    },
  },
  animation: { "gp-sweep": "gp-sweep 780ms cubic-bezier(.16,1,.3,1) both" },
};

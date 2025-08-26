/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // FieldTalk custom colors
        // 1. Rich, deep blues with energetic coral - feels premium yet approachable
        primary: {
          50: "#eff8ff",
          100: "#daf0ff",
          200: "#bee4ff",
          300: "#91d2ff",
          400: "#5db5ff",
          500: "#1d4ed8", // Main brand color
          600: "#1e40af",
          700: "#1e3a8a",
          800: "#1e3a8a",
          900: "#1e293b",
        },
        accent: {
          50: "#fff1f0",
          100: "#ffe0dd",
          200: "#ffc6c0",
          300: "#ff9d94",
          400: "#ff6b5a", // Energetic coral
          500: "#ff4d32",
          600: "#ed2f17",
          700: "#c8220e",
          800: "#a51e10",
          900: "#881e13",
        },
        // 2. Deep emerald with sophisticated gold - very premium football feel
        // primary: {
        //   50: "#ecfdf5",
        //   100: "#d1fae5",
        //   200: "#a7f3d0",
        //   300: "#6ee7b7",
        //   400: "#34d399",
        //   500: "#047857", // Rich emerald
        //   600: "#059669",
        //   700: "#047857",
        //   800: "#065f46",
        //   900: "#064e3b",
        // },
        // accent: {
        //   50: "#fffbeb",
        //   100: "#fef3c7",
        //   200: "#fde68a",
        //   300: "#fcd34d",
        //   400: "#f59e0b", // Warm gold
        //   500: "#d97706",
        //   600: "#b45309",
        //   700: "#92400e",
        //   800: "#78350f",
        //   900: "#451a03",
        // },
        // 3. Contemporary, high-tech feel - perfect for modern football
        primary: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          400: "#94a3b8",
          500: "#475569", // Sophisticated slate
          600: "#334155",
          700: "#1e293b",
          800: "#0f172a",
          900: "#020617",
        },
        accent: {
          50: "#f7fee7",
          100: "#ecfccb",
          200: "#d9f99d",
          300: "#bef264",
          400: "#a3e635", // Electric lime
          500: "#84cc16",
          600: "#65a30d",
          700: "#4d7c0f",
          800: "#365314",
          900: "#1a2e05",
        },
        // 4. Premium, distinctive - like top European clubs
        // primary: {
        //   50: "#faf5ff",
        //   100: "#f3e8ff",
        //   200: "#e9d5ff",
        //   300: "#d8b4fe",
        //   400: "#c084fc",
        //   500: "#7c3aed", // Rich purple
        //   600: "#6d28d9",
        //   700: "#5b21b6",
        //   800: "#4c1d95",
        //   900: "#3730a3",
        // },
        // accent: {
        //   50: "#fff7ed",
        //   100: "#ffedd5",
        //   200: "#fed7aa",
        //   300: "#fdba74",
        //   400: "#fb923c",
        //   500: "#f97316", // Vibrant orange
        //   600: "#ea580c",
        //   700: "#c2410c",
        //   800: "#9a3412",
        //   900: "#7c2d12",
        // },
        // 5. Classic football colors with modern sophistication
        // primary: {
        //   50: "#f0fdf4",
        //   100: "#dcfce7",
        //   200: "#bbf7d0",
        //   300: "#86efac",
        //   400: "#4ade80",
        //   500: "#16a34a", // Deep forest green
        //   600: "#059669",
        //   700: "#047857",
        //   800: "#065f46",
        //   900: "#14532d",
        // },
        // accent: {
        //   50: "#fffbeb",
        //   100: "#fef3c7",
        //   200: "#fde68a",
        //   300: "#fcd34d",
        //   400: "#fbbf24", // Rich amber
        //   500: "#f59e0b",
        //   600: "#d97706",
        //   700: "#b45309",
        //   800: "#92400e",
        //   900: "#78350f",
        // },
        // 6. Fresh, energetic - perfect for young academy players
        // primary: {
        //   50: "#f0fdfa",
        //   100: "#ccfbf1",
        //   200: "#99f6e4",
        //   300: "#5eead4",
        //   400: "#2dd4bf",
        //   500: "#0d9488", // Deep teal
        //   600: "#0f766e",
        //   700: "#115e59",
        //   800: "#134e4a",
        //   900: "#042f2e",
        // },
        // accent: {
        //   50: "#fef2f2",
        //   100: "#fee2e2",
        //   200: "#fecaca",
        //   300: "#fca5a5",
        //   400: "#f87171",
        //   500: "#ef4444", // Vibrant coral red
        //   600: "#dc2626",
        //   700: "#b91c1c",
        //   800: "#991b1b",
        //   900: "#7f1d1d",
        // },
        fieldtalk: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        growth: {
          50: "#f0fdf4",
          100: "#dcfce7",
          200: "#bbf7d0",
          300: "#86efac",
          400: "#4ade80",
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
          800: "#166534",
          900: "#14532d",
        },
        attention: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
      },
      fontFamily: {
        heading: ["Poppins", "sans-serif"],
        body: ["Inter", "sans-serif"],
        display: ["Montserrat", "sans-serif"],
      },
    },
  },
  plugins: [],
};

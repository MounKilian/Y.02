import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "ui-monospace", "monospace"],
        display: ['"JetBrains Mono"', "Inter", "sans-serif"],
      },
      colors: {
        bg: {
          DEFAULT: "#07090d",
          soft: "#0c0f15",
          card: "#11151c",
          ring: "#1c2230",
        },
        accent: {
          DEFAULT: "#22d3ee",
          soft: "#67e8f9",
          glow: "#a5f3fc",
        },
        term: {
          green: "#3fb950",
          purple: "#bc8cff",
          orange: "#ffa657",
          pink: "#ff7b72",
          blue: "#79c0ff",
          comment: "#6e7681",
        },
      },
      boxShadow: {
        glow: "0 0 40px -10px rgba(34,211,238,0.4)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.5)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        blink: {
          "0%, 49%": { opacity: "1" },
          "50%, 100%": { opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out forwards",
        shimmer: "shimmer 2.4s linear infinite",
        blink: "blink 1s steps(1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;

/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ink: {
          DEFAULT: "rgb(var(--ink) / <alpha-value>)",
          soft: "rgb(var(--ink-soft) / <alpha-value>)",
          faint: "rgb(var(--ink-faint) / <alpha-value>)",
        },
        paper: {
          DEFAULT: "rgb(var(--paper) / <alpha-value>)",
          soft: "rgb(var(--paper-soft) / <alpha-value>)",
          card: "rgb(var(--paper-card) / <alpha-value>)",
        },
        scholar: {
          DEFAULT: "rgb(var(--scholar) / <alpha-value>)",
          deep: "rgb(var(--scholar-deep) / <alpha-value>)",
        },
        gold: {
          DEFAULT: "rgb(var(--gold) / <alpha-value>)",
          soft: "rgb(var(--gold-soft) / <alpha-value>)",
        },
        rust: {
          DEFAULT: "rgb(var(--rust) / <alpha-value>)",
          soft: "rgb(var(--rust-soft) / <alpha-value>)",
        },
        line: "rgb(var(--line) / <alpha-value>)",
      },
      fontFamily: {
        display: ['"Fraunces"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        glow: "0 0 0 0.5px rgb(var(--gold) / 0.4), 0 0 24px -4px rgb(var(--gold) / 0.35)",
        breathe: "0 0 0 0 rgb(var(--rust) / 0.55)",
        card: "0 1px 0 0 rgb(var(--line) / 0.6), 0 12px 32px -16px rgb(var(--ink) / 0.18)",
      },
      keyframes: {
        "breathe": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgb(var(--rust) / 0.55)" },
          "50%": { boxShadow: "0 0 0 14px rgb(var(--rust) / 0)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-bar": {
          "0%, 100%": { opacity: "0.4", transform: "scaleY(0.6)" },
          "50%": { opacity: "1", transform: "scaleY(1)" },
        },
        "caret": {
          "0%, 100%": { opacity: "0.2" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        breathe: "breathe 1.8s ease-out infinite",
        "fade-up": "fade-up 0.5s ease both",
        "pulse-bar": "pulse-bar 1.2s ease-in-out infinite",
        caret: "caret 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

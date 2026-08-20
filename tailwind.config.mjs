/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Manrope", "-apple-system", "Segoe UI", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      colors: {
        bg: "var(--mt-bg)",
        surface: "var(--mt-surface)",
        "surface-alt": "var(--mt-surface-alt)",
        sidebar: "var(--mt-sidebar)",
        topbar: "var(--mt-topbar)",
        border: "var(--mt-border)",
        "border-soft": "var(--mt-border-soft)",
        text: "var(--mt-text)",
        "text-secondary": "var(--mt-text-secondary)",
        "text-muted": "var(--mt-text-muted)",
        "text-faint": "var(--mt-text-faint)",
        accent: {
          green: "#34d399",
          "green-hover": "#4ade9f",
          red: "#fb7185",
          blue: "#60a5fa",
          purple: "#a78bfa",
          "purple-hover": "#bda4ff",
          yellow: "#fbbf24",
          "yellow-hover": "#fcd34d",
          teal: "#2dd4bf",
          pink: "#f472b6",
          orange: "#f97362",
          "orange-alt": "#fb923c",
        },
      },
      borderRadius: {
        card: "16px",
        control: "10px",
        chip: "7px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.5), 0 16px 36px -22px rgba(0,0,0,.9)",
      },
      keyframes: {
        mtFade: { from: { opacity: 0, transform: "translateY(10px)" }, to: { opacity: 1, transform: "none" } },
        mtPop: { from: { opacity: 0, transform: "translateY(14px) scale(.985)" }, to: { opacity: 1, transform: "none" } },
        mtVeil: { from: { opacity: 0 }, to: { opacity: 1 } },
        mtGrow: { from: { transform: "scaleX(0)" }, to: { transform: "scaleX(1)" } },
      },
      animation: {
        mtFade: "mtFade .35s ease both",
        mtPop: "mtPop .25s cubic-bezier(.22,1,.36,1) both",
        mtVeil: "mtVeil .18s ease both",
        mtGrow: "mtGrow .8s cubic-bezier(.22,1,.36,1) both",
      },
    },
  },
  plugins: [],
};

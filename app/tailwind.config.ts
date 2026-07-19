import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // APECHAIN navy canvas
        bg: "#020315",
        "bg-2": "#050b20",
        panel: "#0b1430",
        "panel-2": "#111d43",
        "panel-blue": "#19275c",
        line: "#1a3570",
        "line-soft": "#233a6b",
        text: "#e9eeff",
        muted: "#9fb0ce",
        "muted-2": "#7d89b8",
        // brand blue (APECHAIN ≈ WC26 #304FFE)
        brand: "#0054fa",
        "brand-2": "#4785fc",
        cyan: "#80c8e6",
        // World Cup 2026 host teal (pixel-checker / accents)
        teal: "#57b6b2",
        // semantic (our proof identity + market states + World Cup gold)
        accent: "#37d67a",
        "accent-dim": "#1f9d55",
        danger: "#ff5c72",
        gold: "#f5c451",
      },
      fontFamily: {
        display: ["var(--font-display)", "Arial Narrow", "sans-serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.05em",
        widest: "0.1em",
        eyebrow: "0.3em",
      },
      lineHeight: {
        tighter: "0.85",
      },
      borderRadius: {
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,0.5), 0 12px 40px -18px rgba(0,0,0,0.8)",
        glow: "0 0 0 1px rgba(55,214,122,0.35), 0 0 40px -6px rgba(55,214,122,0.45)",
        "glow-blue": "0 0 0 1px rgba(71,133,252,0.4), 0 0 44px -6px rgba(0,84,250,0.5)",
        "glow-gold": "0 0 0 1px rgba(245,196,81,0.4), 0 0 32px -4px rgba(245,196,81,0.4)",
        "glow-white": "0 0 24px 0 rgba(255,255,255,0.55)",
      },
      keyframes: {
        "flash-up": { "0%": { color: "#37d67a" }, "100%": { color: "#e9eeff" } },
        "flash-down": { "0%": { color: "#ff5c72" }, "100%": { color: "#e9eeff" } },
        "blur-out": {
          "0%": { opacity: "0", filter: "blur(16px)" },
          "100%": { opacity: "1", filter: "blur(0)" },
        },
        "glow-pulse": {
          "0%": { boxShadow: "0 0 0 0 rgba(55,214,122,0)" },
          "40%": { boxShadow: "0 0 40px 6px rgba(55,214,122,0.45)" },
          "100%": { boxShadow: "0 0 0 0 rgba(55,214,122,0)" },
        },
        shimmer: { "100%": { transform: "translateX(100%)" } },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "gradient-x": {
          "0%,100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        roll: {
          "0%": { transform: "translateX(0) rotate(0deg)", opacity: "0" },
          "12%": { opacity: "1" },
          "88%": { opacity: "1" },
          "100%": { transform: "translateX(var(--roll-x, 120px)) rotate(540deg)", opacity: "0" },
        },
      },
      animation: {
        "flash-up": "flash-up 0.5s ease-out",
        "flash-down": "flash-down 0.5s ease-out",
        "blur-out": "blur-out 0.9s ease-in-out both",
        "glow-pulse": "glow-pulse 1.2s ease-out",
        "fade-up": "fade-up 0.5s ease-out both",
        float: "float 7s ease-in-out infinite",
        "spin-slow": "spin-slow 60s linear infinite",
        "gradient-x": "gradient-x 6s ease infinite",
        roll: "roll 0.85s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;

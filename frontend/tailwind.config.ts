import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ── Dark theme: E8 Midnight Teal palette ───────────────────────
        midnight: {
          900: "#070c12",   // deepest background
          800: "#0b131b",   // base dark bg
          700: "#0d1722",   // card background base
          600: "#111f2e",   // elevated card
          500: "#162435",   // border / divider
        },
        // ── Light theme: Sky palette ───────────────────────────────────
        sky: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        // ── Accent: Electric Cyan ──────────────────────────────────────
        cyan: {
          50:  "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#00f2fe",   // primary electric cyan accent
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
        // ── Bid: Emerald ───────────────────────────────────────────────
        emerald: {
          50:  "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",   // primary bid/supply
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
          950: "#022c22",
        },
        // ── Ask: Rose ─────────────────────────────────────────────────
        rose: {
          50:  "#fff1f2",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#f43f5e",
          600: "#e11d48",   // primary ask/demand
          700: "#be123c",
          800: "#9f1239",
          900: "#881337",
          950: "#4c0519",
        },
        // ── Legacy aliases (kept for backward compat) ──────────────────
        background: "#070c12",
        panel: "rgba(13, 23, 34, 0.8)",
        border: "rgba(22, 36, 53, 0.9)",
        textMain: "#f1f5f9",
        textMuted: "#94a3b8",
      },
      fontFamily: {
        sans:    ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "Outfit", "sans-serif"],
        mono: [
          "var(--font-jetbrains)",
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        // E8 glow shadows
        "glow-cyan":    "0 0 20px rgba(0, 242, 254, 0.25), 0 0 60px rgba(0, 242, 254, 0.08)",
        "glow-emerald": "0 0 20px rgba(16, 185, 129, 0.3), 0 0 60px rgba(16, 185, 129, 0.08)",
        "glow-rose":    "0 0 20px rgba(225, 29, 72, 0.3),  0 0 60px rgba(225, 29, 72, 0.08)",
        "glow-sky":     "0 0 20px rgba(14, 165, 233, 0.25), 0 0 60px rgba(14, 165, 233, 0.08)",
        // Card & panel
        "glass":        "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
        "glass-light":  "0 4px 24px rgba(14, 165, 233, 0.08), 0 1px 4px rgba(0,0,0,0.06)",
        "panel":        "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "card":         "0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)",
        // Legacy
        "glow-accent":  "0 0 15px rgba(0, 242, 254, 0.3)",
        "glow-success": "0 0 15px rgba(16, 185, 129, 0.3)",
        "glow-danger":  "0 0 15px rgba(225, 29, 72, 0.3)",
      },
      animation: {
        // Tick-flash
        "flash-green":    "flashGreen 0.5s ease-out",
        "flash-red":      "flashRed 0.5s ease-out",
        // UI
        "pulse-slow":     "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":        "fadeIn 0.3s ease-out",
        "fade-up":        "fadeUp 0.5s ease-out both",
        "slide-down":     "slideDown 0.2s ease-out",
        "slide-in-right": "slideInRight 250ms ease-out",
        // Marquee ticker
        "marquee":        "marquee 30s linear infinite",
        "marquee-fast":   "marquee 15s linear infinite",
        // Ambient glow pulse
        "glow-pulse":     "glowPulse 4s ease-in-out infinite",
        // Spin for theme toggle
        "spin-in":        "spinIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        // Hero floating card
        "float":          "float 6s ease-in-out infinite",
        "float-delayed":  "float 6s ease-in-out 2s infinite",
      },
      keyframes: {
        flashGreen: {
          "0%":   { backgroundColor: "rgba(16, 185, 129, 0.3)", color: "#fff" },
          "100%": { backgroundColor: "transparent" },
        },
        flashRed: {
          "0%":   { backgroundColor: "rgba(225, 29, 72, 0.3)", color: "#fff" },
          "100%": { backgroundColor: "transparent" },
        },
        fadeIn: {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        fadeUp: {
          "0%":   { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%":   { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%":   { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        slideInRight: {
          from: { transform: "translateX(100%)" },
          to:   { transform: "translateX(0%)" },
        },
        glowPulse: {
          "0%, 100%": { opacity: "0.4" },
          "50%":      { opacity: "0.8" },
        },
        spinIn: {
          "0%":   { transform: "rotate(-180deg) scale(0.5)", opacity: "0" },
          "100%": { transform: "rotate(0deg) scale(1)",      opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%":      { transform: "translateY(-12px)" },
        },
      },
      spacing: {
        navbar:  "64px",
        ticker:  "52px",
      },
      minHeight: {
        carousel: "400px",
      },
      borderRadius: {
        card: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

export default config;

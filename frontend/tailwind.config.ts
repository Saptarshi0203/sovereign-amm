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
        // ── Dual-theme neutrals ─────────────────────────────────────────
        // Every existing `slate-*` / `white` class resolves through CSS
        // variables (see globals.css): deep violet-black tones in dark mode,
        // clean elevated neutrals in light mode. Components keep their class
        // names; the palette flips underneath them.
        slate: {
          50: "rgb(var(--c-slate-50) / <alpha-value>)",
          100: "rgb(var(--c-slate-100) / <alpha-value>)",
          200: "rgb(var(--c-slate-200) / <alpha-value>)",
          300: "rgb(var(--c-slate-300) / <alpha-value>)",
          400: "rgb(var(--c-slate-400) / <alpha-value>)",
          500: "rgb(var(--c-slate-500) / <alpha-value>)",
          600: "rgb(var(--c-slate-600) / <alpha-value>)",
          700: "rgb(var(--c-slate-700) / <alpha-value>)",
          800: "rgb(var(--c-slate-800) / <alpha-value>)",
          900: "rgb(var(--c-slate-900) / <alpha-value>)",
          950: "rgb(var(--c-slate-950) / <alpha-value>)",
        },
        white: "rgb(var(--c-white) / <alpha-value>)",
        // `sky` is the legacy informational accent — remapped to the brand violet.
        sky: {
          50: "#f5f3ff",
          100: "#ede9fe",
          200: "#ddd6fe",
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
          700: "#6d28d9",
          800: "#5b21b6",
          900: "#4c1d95",
          950: "#2e1065",
        },
        // ── Brand accents ───────────────────────────────────────────────
        violet: {
          50: "#f5f3ff", 100: "#ede9fe", 200: "#ddd6fe", 300: "#c4b5fd", 400: "#a78bfa",
          500: "#8b5cf6", 600: "#7c3aed", 700: "#6d28d9", 800: "#5b21b6", 900: "#4c1d95", 950: "#2e1065",
        },
        magenta: {
          300: "#f0abfc", 400: "#e879f9", 500: "#d946ef", 600: "#c026d3", 700: "#a21caf",
        },
        indigo: {
          300: "#a5b4fc", 400: "#818cf8", 500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 900: "#312e81", 950: "#1e1b4b",
        },
        // Bid / supply — emerald (semantic, theme-invariant)
        emerald: {
          50: "#ecfdf5", 100: "#d1fae5", 200: "#a7f3d0", 300: "#6ee7b7", 400: "#34d399",
          500: "#10b981", 600: "#059669", 700: "#047857", 800: "#065f46", 900: "#064e3b", 950: "#022c22",
        },
        // Ask / demand — rose (semantic, theme-invariant)
        rose: {
          50: "#fff1f2", 100: "#ffe4e6", 200: "#fecdd3", 300: "#fda4af", 400: "#fb7185",
          500: "#f43f5e", 600: "#e11d48", 700: "#be123c", 800: "#9f1239", 900: "#881337", 950: "#4c0519",
        },
        // Legacy tokens
        background: "rgb(var(--c-slate-950) / <alpha-value>)",
        panel: "rgb(var(--c-slate-900) / 0.6)",
        border: "rgb(var(--c-slate-700) / 0.8)",
        textMain: "rgb(var(--c-slate-100) / <alpha-value>)",
        textMuted: "rgb(var(--c-slate-400) / <alpha-value>)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #7c3aed 0%, #a855f7 45%, #d946ef 100%)",
        "brand-gradient-soft": "linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(217,70,239,0.15) 100%)",
        "hero-glow": "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.35) 0%, rgba(139,92,246,0.08) 35%, transparent 70%)",
        "grid-dots": "radial-gradient(circle, rgb(var(--c-slate-500)) 1px, transparent 1px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        display: ["var(--font-outfit)", "Outfit", "sans-serif"],
        mono: [
          "var(--font-jetbrains)",
          "JetBrains Mono",
          "Fira Code",
          "Fira Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
      boxShadow: {
        "glow-violet": "0 0 24px rgba(139, 92, 246, 0.35)",
        "glow-magenta": "0 0 24px rgba(217, 70, 239, 0.3)",
        glass: "0 8px 40px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255,255,255,0.04)",
        "glass-light": "0 10px 40px rgba(76, 29, 149, 0.08), 0 1px 3px rgba(15, 23, 42, 0.06)",
        "glow-emerald": "0 0 15px rgba(16, 185, 129, 0.3)",
        "glow-rose": "0 0 15px rgba(225, 29, 72, 0.3)",
        panel: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        card: "0 1px 3px rgba(0,0,0,0.5), 0 1px 2px rgba(0,0,0,0.3)",
        // Legacy glow shadows
        "glow-accent": "0 0 15px rgba(0, 229, 255, 0.3)",
        "glow-success": "0 0 15px rgba(0, 255, 102, 0.3)",
        "glow-danger": "0 0 15px rgba(255, 0, 85, 0.3)",
      },
      animation: {
        "flash-green": "flashGreen 0.5s ease-out",
        "flash-red": "flashRed 0.5s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-down": "slideDown 0.2s ease-out",
        "marquee": "marquee 30s linear infinite",
        "marquee-fast": "marquee 15s linear infinite",
        "slide-in-right": "slideInRight 250ms ease-out",
        float: "float 7s ease-in-out infinite",
        "float-slow": "float 11s ease-in-out infinite",
        shimmer: "shimmer 6s linear infinite",
      },
      keyframes: {
        flashGreen: {
          "0%": { backgroundColor: "rgba(16, 185, 129, 0.3)", color: "#fff" },
          "100%": { backgroundColor: "transparent" },
        },
        flashRed: {
          "0%": { backgroundColor: "rgba(225, 29, 72, 0.3)", color: "#fff" },
          "100%": { backgroundColor: "transparent" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        marquee: {
          "0%": { transform: "translateX(0%)" },
          "100%": { transform: "translateX(-50%)" },
        },
        slideInRight: {
          from: { transform: "translateX(100%)" },
          to: { transform: "translateX(0%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(-14px) rotate(1deg)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
      },
      spacing: {
        navbar: "64px", // Fixed navbar height
        ticker: "52px", // Ticker tape height
      },
      minHeight: {
        carousel: "400px",
      },
      borderRadius: {
        card: "0.5rem", // Consistent card border radius (8px)
      },
    },
  },
  plugins: [],
};

export default config;

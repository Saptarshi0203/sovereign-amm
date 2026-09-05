import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#05050A", // Deep void
        panel: "rgba(20, 20, 30, 0.4)", // Translucent glass base
        border: "rgba(255, 255, 255, 0.1)",
        textMain: "#E0E5EC",
        textMuted: "#8b949e",
        accent: "#00E5FF", // Neon Cyan
        success: "#00FF66", // Neon Green
        danger: "#FF0055", // Neon Red
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        display: ['var(--font-outfit)', 'sans-serif'],
        mono: ['var(--font-jetbrains)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        'glow-accent': '0 0 15px rgba(0, 229, 255, 0.3)',
        'glow-success': '0 0 15px rgba(0, 255, 102, 0.3)',
        'glow-danger': '0 0 15px rgba(255, 0, 85, 0.3)',
        'panel': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      },
      animation: {
        'flash-green': 'flashGreen 0.5s ease-out',
        'flash-red': 'flashRed 0.5s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        flashGreen: {
          '0%': { backgroundColor: 'rgba(0, 255, 102, 0.3)', color: '#fff' },
          '100%': { backgroundColor: 'transparent' },
        },
        flashRed: {
          '0%': { backgroundColor: 'rgba(255, 0, 85, 0.3)', color: '#fff' },
          '100%': { backgroundColor: 'transparent' },
        }
      }
    },
  },
  plugins: [],
};
export default config;
